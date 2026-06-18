#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import postgres from "postgres";
import { v5 as uuidv5 } from "uuid";

type ScheduleRecord = {
  date: string;
  time: string;
  pos: number;
  minister: string;
};

type DbUser = {
  id: string;
  name: string;
  normalizedName: string;
  tokens: string[];
};

type MockUserSample = {
  id: string;
  name: string;
  email: string;
  status: string;
};

type ResolvedMinister =
  | { status: "resolved"; id: string; name: string; fallback?: boolean }
  | { status: "vacant" }
  | { status: "unresolved" };

const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const DEFAULT_SCHEDULE_FILE = "attached_assets/Escala_SaoJudasTadeu_Junho2026.xlsx";
const DEFAULT_USERS_FILE = "attached_assets/users (2)_1759268600377.json";

const args = process.argv.slice(2);

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function option(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];

  return fallback;
}

function databaseUrl(): string {
  const value =
    process.env.RELEASE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.STAGING_DATABASE_URL?.trim() ||
    process.env.PRODUCTION_DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "Defina RELEASE_DATABASE_URL, DATABASE_URL, STAGING_DATABASE_URL ou PRODUCTION_DATABASE_URL."
    );
  }

  return value;
}

function maskUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "(url invalida)";
  }
}

function normalize(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function qualifiedIdentifier(alias: string, identifier: string): string {
  return `${quoteIdentifier(alias)}.${quoteIdentifier(identifier)}`;
}

function textColumn(alias: string, columns: Set<string>, column: string): string {
  if (!columns.has(column)) return "''";
  return `COALESCE(${qualifiedIdentifier(alias, column)}::text, '')`;
}

function mockUserFilter(alias: string, userColumns: Set<string>): string {
  const clauses: string[] = [];

  if (userColumns.has("email")) {
    const email = `LOWER(${textColumn(alias, userColumns, "email")})`;
    clauses.push(`${email} IN ('test.ministro@test.com', 'test.coord@test.com', 'test.gestor@test.com')`);
    clauses.push(`${email} LIKE 'placeholder+%@saojudastadeu.app'`);
    clauses.push(`${email} LIKE '%@example.%'`);
    clauses.push(`${email} LIKE '%@demo.%'`);
    clauses.push(`${email} LIKE '%@test.%'`);
  }

  if (userColumns.has("name")) {
    const name = `LOWER(${textColumn(alias, userColumns, "name")})`;
    clauses.push(`${name} ~ '(^|[[:space:]])(teste|demo|mock|placeholder)([[:space:]]|$)'`);
  }

  return clauses.length ? `(${clauses.join(" OR ")})` : "FALSE";
}

function normalizeRole(role: unknown): unknown {
  return role === "coordenador" ? "coordenador_comunidade" : role;
}

function nextMonthStart(monthStart: string): string {
  const [year, month] = monthStart.split("-").map(Number);
  const next = month === 12 ? [year + 1, 1] : [year, month + 1];
  return `${next[0]}-${String(next[1]).padStart(2, "0")}-01`;
}

function parseScheduleFile(scheduleFile: string): ScheduleRecord[] {
  const parser = path.join(process.cwd(), "scripts", "restore-escala", "parse-escala-xlsx.cjs");
  const outputFile = path.join(os.tmpdir(), `mesc-release-schedule-${process.pid}.json`);

  execFileSync("node", [parser, "--json", outputFile, scheduleFile], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const parsed = JSON.parse(fs.readFileSync(outputFile, "utf8")) as {
    records?: ScheduleRecord[];
  };
  fs.rmSync(outputFile, { force: true });

  return parsed.records ?? [];
}

function loadAliasMap(): Record<string, string> {
  const aliasPath = path.join(process.cwd(), "scripts", "restore-escala", "alias-map.json");
  const alias = JSON.parse(fs.readFileSync(aliasPath, "utf8")) as Record<string, string>;
  delete alias._doc;
  return alias;
}

function resolveMinister(nick: string, alias: Record<string, string>, users: DbUser[]): ResolvedMinister {
  if (/vacante/i.test(nick)) return { status: "vacant" };

  const byNormalized = new Map(users.map((user) => [user.normalizedName, user]));
  const target = alias[nick] || nick;
  const normalizedTarget = normalize(target);

  const exact = byNormalized.get(normalizedTarget);
  if (exact) return { status: "resolved", id: exact.id, name: exact.name };

  const tokens = normalizedTarget.split(" ").filter((token) => token.length >= 2);
  let matches = tokens.length
    ? users.filter((user) =>
        tokens.every((token) =>
          user.tokens.some((userToken) => userToken.length >= 2 && userToken.startsWith(token))
        )
      )
    : [];

  if (matches.length > 1) {
    const firstNameMatches = matches.filter((user) => user.tokens[0]?.startsWith(tokens[0]));
    if (firstNameMatches.length === 1) matches = firstNameMatches;
  }

  if (matches.length === 1) {
    return { status: "resolved", id: matches[0].id, name: matches[0].name, fallback: true };
  }

  return { status: "unresolved" };
}

async function tableColumns(sql: postgres.Sql, tableName: string): Promise<Set<string>> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;

  return new Set(rows.map((row) => row.column_name));
}

async function tableExists(sql: postgres.Sql, tableName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS "exists"
  `;
  return rows[0]?.exists === true;
}

async function countRows(sql: postgres.Sql, query: string, params: unknown[] = []): Promise<number> {
  const rows = await sql.unsafe<{ count: string }[]>(query, params);
  return Number(rows[0]?.count ?? 0);
}

async function getCommunityId(sql: postgres.Sql, slug: string): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    SELECT id
    FROM communities
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (!rows[0]?.id) {
    throw new Error(`Comunidade '${slug}' nao encontrada.`);
  }

  return rows[0].id;
}

async function loadDbUsers(sql: postgres.Sql): Promise<DbUser[]> {
  const rows = await sql<{ id: string; name: string }[]>`
    SELECT id, name
    FROM users
    WHERE name IS NOT NULL
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    normalizedName: normalize(row.name),
    tokens: normalize(row.name).split(" "),
  }));
}

async function auditMockData(
  sql: postgres.Sql,
  userColumns: Set<string>,
  scheduleColumns: Set<string>
): Promise<void> {
  const usersFilter = mockUserFilter("users", userColumns);
  const joinedUsersFilter = mockUserFilter("u", userColumns);
  const hasStatus = userColumns.has("status");
  const hasMinisterId = scheduleColumns.has("minister_id");

  const mockUsers = await countRows(
    sql,
    `SELECT COUNT(*)::text AS count FROM users WHERE ${usersFilter}`
  );
  const activeMockUsers = hasStatus
    ? await countRows(
        sql,
        `SELECT COUNT(*)::text AS count FROM users WHERE status = 'active' AND ${usersFilter}`
      )
    : 0;
  const schedulesWithMockUsers = hasMinisterId
    ? await countRows(
        sql,
        `SELECT COUNT(*)::text AS count
         FROM schedules s
         WHERE EXISTS (
           SELECT 1
           FROM users u
           WHERE u.id = s.minister_id
             AND ${joinedUsersFilter}
         )`
      )
    : 0;

  const sampleSelect = [
    "users.id::text AS id",
    `${textColumn("users", userColumns, "name")} AS name`,
    `${textColumn("users", userColumns, "email")} AS email`,
    `${textColumn("users", userColumns, "status")} AS status`,
  ].join(", ");
  const samples = await sql.unsafe<MockUserSample[]>(
    `SELECT ${sampleSelect}
     FROM users
     WHERE ${usersFilter}
     ORDER BY name ASC
     LIMIT 12`
  );

  console.log("\nMock/placeholder audit:");
  console.log(`- mock_users=${mockUsers}`);
  console.log(`- active_mock_users=${activeMockUsers}`);
  console.log(`- schedules_linked_to_mock_users=${schedulesWithMockUsers}`);

  if (samples.length > 0) {
    console.log("- sample:");
    for (const user of samples) {
      console.log(`  - ${user.name || "(sem nome)"} <${user.email || "sem email"}> status=${user.status || "n/a"}`);
    }
  }

  if (hasFlag("strict-mock-data") && mockUsers > 0) {
    throw new Error("Mock data audit falhou: ha usuarios mock/placeholder no banco alvo.");
  }
}

async function importUsersFromAsset(
  sql: postgres.Sql,
  usersFile: string,
  communityId: string,
  userColumns: Set<string>
): Promise<number> {
  const assetUsers = JSON.parse(fs.readFileSync(usersFile, "utf8")) as Record<string, unknown>[];
  const insertableColumns = [...userColumns].filter((column) => column !== "updated_at");
  let affected = 0;

  for (const assetUser of assetUsers) {
    const row: Record<string, unknown> = {};

    for (const column of insertableColumns) {
      if (assetUser[column] !== undefined) row[column] = assetUser[column];
    }

    if (userColumns.has("role")) row.role = normalizeRole(row.role);
    if (userColumns.has("home_community_id") && !row.home_community_id) {
      row.home_community_id = communityId;
    }

    const columns = Object.keys(row);
    const values = columns.map((column) => row[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const updateColumns = columns.filter(
      (column) =>
        ![
          "id",
          "email",
          "password_hash",
          "created_at",
          "approved_by_id",
        ].includes(column)
    );

    const updateSet = updateColumns.length
      ? updateColumns
          .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
          .join(", ")
      : "id = users.id";

    const result = await sql.unsafe(
      `INSERT INTO users (${columns.map(quoteIdentifier).join(", ")})
       VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
      values
    );
    affected += result.count;
  }

  return affected;
}

async function main() {
  const dbUrl = databaseUrl();
  const monthStart = option("month-start", "2026-06-01");
  const monthEnd = nextMonthStart(monthStart);
  const communitySlug = option("community", "sao-judas");
  const scheduleFile = option("schedule-file", DEFAULT_SCHEDULE_FILE);
  const usersFile = option("users-file", DEFAULT_USERS_FILE);
  const applyUsers = hasFlag("apply-users");
  const applyJuneSchedule = hasFlag("apply-june-schedule");

  const sql = postgres(dbUrl, {
    max: 1,
    ssl: dbUrl.includes("sslmode=require") ? "require" : undefined,
  });

  try {
    console.log("Release data doctor");
    console.log(`Target: ${maskUrl(dbUrl)}`);
    console.log(`Community: ${communitySlug}`);
    console.log(`Month: ${monthStart.slice(0, 7)}`);
    console.log(`Mode: ${applyUsers || applyJuneSchedule ? "APPLY" : "DRY-RUN"}`);

    for (const table of ["users", "schedules", "communities"]) {
      if (!(await tableExists(sql, table))) {
        throw new Error(`Tabela obrigatoria ausente: ${table}`);
      }
    }

    const communityId = await getCommunityId(sql, communitySlug);
    const userColumns = await tableColumns(sql, "users");
    const scheduleColumns = await tableColumns(sql, "schedules");

    const usersTotal = await countRows(sql, "SELECT COUNT(*)::text AS count FROM users");
    const usersActive = await countRows(sql, "SELECT COUNT(*)::text AS count FROM users WHERE status = 'active'");
    const usersWithPhotos = await countRows(
      sql,
      "SELECT COUNT(*)::text AS count FROM users WHERE COALESCE(photo_url, '') <> '' OR COALESCE(image_data, '') <> '' OR COALESCE(profile_image_url, '') <> ''"
    );
    const existingJune = await countRows(
      sql,
      "SELECT COUNT(*)::text AS count FROM schedules WHERE date >= $1 AND date < $2",
      [monthStart, monthEnd]
    );
    const existingJuneDates = await countRows(
      sql,
      "SELECT COUNT(DISTINCT date)::text AS count FROM schedules WHERE date >= $1 AND date < $2",
      [monthStart, monthEnd]
    );

    console.log("\nCurrent database:");
    console.log(`- users_total=${usersTotal}`);
    console.log(`- users_active=${usersActive}`);
    console.log(`- users_with_photo=${usersWithPhotos}`);
    console.log(`- schedules_${monthStart.slice(0, 7)}=${existingJune}`);
    console.log(`- schedule_dates_${monthStart.slice(0, 7)}=${existingJuneDates}`);

    await auditMockData(sql, userColumns, scheduleColumns);

    const scheduleRecords = parseScheduleFile(scheduleFile);
    const alias = loadAliasMap();
    const dbUsers = await loadDbUsers(sql);
    const unresolved = new Set<string>();
    const fallbacks = new Map<string, string>();
    const preparedRows = scheduleRecords.map((record) => {
      const resolved = resolveMinister(record.minister, alias, dbUsers);
      if (resolved.status === "unresolved") unresolved.add(record.minister);
      if (resolved.status === "resolved" && resolved.fallback) {
        fallbacks.set(record.minister, resolved.name);
      }

      const time = record.time.length === 5 ? `${record.time}:00` : record.time;
      return {
        id: uuidv5(`${communityId}|${record.date}|${time}|${record.pos}`, UUID_NAMESPACE),
        date: record.date,
        time,
        position: record.pos,
        ministerId: resolved.status === "resolved" ? resolved.id : null,
        nick: record.minister,
        resolvedName:
          resolved.status === "resolved"
            ? resolved.name
            : resolved.status === "vacant"
              ? "VACANTE"
              : null,
      };
    });

    console.log("\nJune schedule asset:");
    console.log(`- file=${scheduleFile}`);
    console.log(`- parsed_rows=${scheduleRecords.length}`);
    console.log(`- distinct_ministers=${new Set(scheduleRecords.map((record) => record.minister)).size}`);
    console.log(`- unresolved_ministers=${unresolved.size}`);
    console.log(`- fallback_matches=${fallbacks.size}`);
    console.log(`- sample=${preparedRows.slice(0, 3).map((row) => `${row.date} ${row.time} ${row.nick}->${row.resolvedName}`).join(" | ")}`);

    if (fallbacks.size > 0) {
      console.log("\nFallback matches to review:");
      for (const [nick, name] of fallbacks) console.log(`- ${nick} -> ${name}`);
    }

    if (unresolved.size > 0) {
      console.log("\nUnresolved ministers:");
      for (const nick of unresolved) console.log(`- ${nick}`);
    }

    if (applyUsers) {
      console.log("\nApplying users from asset...");
      const affected = await importUsersFromAsset(sql, usersFile, communityId, userColumns);
      console.log(`- users_upserted=${affected}`);
    }

    if (applyJuneSchedule) {
      if (unresolved.size > 0) {
        throw new Error("Importacao abortada: ha ministros nao resolvidos.");
      }
      if (existingJune > 0) {
        throw new Error(
          `Importacao abortada: ${monthStart.slice(0, 7)} ja tem ${existingJune} escalas.`
        );
      }

      const hasDeletedAt = scheduleColumns.has("deleted_at");
      const hasIsDeleted = scheduleColumns.has("is_deleted");
      let inserted = 0;

      console.log("\nApplying June schedule...");
      await sql.begin(async (tx) => {
        for (const row of preparedRows) {
          const columns = [
            "id",
            "community_id",
            "status",
            "created_at",
            "date",
            "time",
            "type",
            "location",
            "minister_id",
            "substitute_id",
            "notes",
            "position",
            "on_site_adjustments",
          ];
          const values: unknown[] = [
            row.id,
            communityId,
            "published",
            new Date(),
            row.date,
            row.time,
            "missa",
            "Sao Judas Tadeu",
            row.ministerId,
            null,
            "Importado da escala oficial de junho/2026",
            row.position,
            null,
          ];

          if (hasDeletedAt) {
            columns.push("deleted_at");
            values.push(null);
          }
          if (hasIsDeleted) {
            columns.push("is_deleted");
            values.push(false);
          }

          const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
          const result = await tx.unsafe(
            `INSERT INTO schedules (${columns.map(quoteIdentifier).join(", ")})
             VALUES (${placeholders})
             ON CONFLICT (id) DO NOTHING`,
            values
          );
          inserted += result.count;
        }
      });

      console.log(`- schedules_inserted=${inserted}`);
    }

    const finalJune = await countRows(
      sql,
      "SELECT COUNT(*)::text AS count FROM schedules WHERE date >= $1 AND date < $2",
      [monthStart, monthEnd]
    );
    const finalJuneDates = await countRows(
      sql,
      "SELECT COUNT(DISTINCT date)::text AS count FROM schedules WHERE date >= $1 AND date < $2",
      [monthStart, monthEnd]
    );
    console.log("\nFinal evidence:");
    console.log(`- schedules_${monthStart.slice(0, 7)}=${finalJune}`);
    console.log(`- schedule_dates_${monthStart.slice(0, 7)}=${finalJuneDates}`);
    console.log("\nData doctor completed.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
