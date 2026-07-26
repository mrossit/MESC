#!/usr/bin/env tsx
import fs from "node:fs";
import postgres from "postgres";

type JsonRow = Record<string, unknown>;

type AssetBundle = {
  users: JsonRow[];
  questionnaires: JsonRow[];
  responses: JsonRow[];
  schedules: JsonRow[];
  massTimes: JsonRow[];
};

type TableSummary = {
  before: number;
  upserted: number;
  after: number;
};

const DEFAULT_USERS_FILE = "attached_assets/users (2)_1759268600377.json";
const DEFAULT_QUESTIONNAIRES_FILE = "attached_assets/questionnaires (1)_1759268600377.json";
const DEFAULT_RESPONSES_FILE = "attached_assets/questionnaire_responses (1)_1759268600377.json";
const DEFAULT_SCHEDULES_FILE = "attached_assets/schedules_1759268600377.json";
const DEFAULT_MASS_TIMES_FILE = "attached_assets/mass_times_config (1)_1759268600376.json";
const NATIVE_STAGING_PROJECT_REF = "sdochgpfjosmhrbztthr";
const USER_RELATION_COLUMNS = new Set(["family_id", "spouse_minister_id"]);
const USER_PHOTO_COLUMNS = new Set([
  "photo_url",
  "profile_image_url",
  "image_data",
  "image_content_type",
]);

const args = process.argv.slice(2);

function hasFlag(name: string) {
  return args.includes(`--${name}`);
}

function option(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];

  return fallback;
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || process.env.NATIVE_DATABASE_URL?.trim() || "";
}

function guardWrite(dbUrl: string) {
  if (process.env.CONFIRM_NATIVE_CURRENT_DATA_IMPORT !== "true") {
    throw new Error("Import recusado. Defina CONFIRM_NATIVE_CURRENT_DATA_IMPORT=true.");
  }

  const host = new URL(dbUrl).hostname;
  const productionHostMarker = process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";
  if (host.includes(productionHostMarker) && process.env.ALLOW_CURRENT_MESC_DB !== "true") {
    throw new Error("Import recusado: host parece ser o banco atual do MESC/Replit.");
  }

  if (!host.includes(NATIVE_STAGING_PROJECT_REF) && process.env.ALLOW_OTHER_NATIVE_DB !== "true") {
    throw new Error(
      `Import recusado: host nao parece ser o Supabase nativo staging (${NATIVE_STAGING_PROJECT_REF}).`,
    );
  }
}

function readJsonRows(file: string): JsonRow[] {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Arquivo ${file} nao contem um array JSON.`);
  }
  return parsed as JsonRow[];
}

function loadAssets(): AssetBundle {
  return {
    users: readJsonRows(option("users-file", DEFAULT_USERS_FILE)),
    questionnaires: readJsonRows(option("questionnaires-file", DEFAULT_QUESTIONNAIRES_FILE)),
    responses: readJsonRows(option("responses-file", DEFAULT_RESPONSES_FILE)),
    schedules: readJsonRows(option("schedules-file", DEFAULT_SCHEDULES_FILE)),
    massTimes: readJsonRows(option("mass-times-file", DEFAULT_MASS_TIMES_FILE)),
  };
}

function normalizeRole(role: unknown) {
  return role === "coordenador" ? "coordenador_comunidade" : role;
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return value ?? null;
  return value.slice(0, 10);
}

function cleanTime(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return value ?? null;
  return value.length === 5 ? `${value}:00` : value.slice(0, 8);
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function valuePresent(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function countMissing(rows: JsonRow[], field: string) {
  return rows.filter((row) => !valuePresent(row[field])).length;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function printAssetAudit(assets: AssetBundle) {
  const users = assets.users;
  const activeUsers = users.filter((user) => user.status === "active");
  const ministers = activeUsers.filter((user) => user.role === "ministro");
  const questionnairesByPeriod = assets.questionnaires
    .map((questionnaire) => `${questionnaire.year}-${String(questionnaire.month).padStart(2, "0")} ${questionnaire.status}`)
    .join(", ");

  const responseUsers = new Set(assets.responses.map((response) => response.user_id));
  const userIds = new Set(users.map((user) => user.id));
  const questionnaireIds = new Set(assets.questionnaires.map((questionnaire) => questionnaire.id));
  const scheduleUsers = new Set(assets.schedules.map((schedule) => schedule.minister_id).filter(Boolean));
  const missingResponseUsers = [...responseUsers].filter((id) => !userIds.has(id));
  const missingResponseQuestionnaires = assets.responses.filter((response) => !questionnaireIds.has(response.questionnaire_id));
  const missingScheduleUsers = [...scheduleUsers].filter((id) => !userIds.has(id));
  const scheduleDates = new Set(assets.schedules.map((schedule) => cleanDate(schedule.date)));

  console.log("\nAssets atuais:");
  console.log(`- users=${users.length} active=${activeUsers.length} ministers=${ministers.length}`);
  console.log(`- questionnaires=${assets.questionnaires.length} periods=${questionnairesByPeriod || "none"}`);
  console.log(`- questionnaire_responses=${assets.responses.length} distinct_users=${responseUsers.size}`);
  console.log(`- schedules=${assets.schedules.length} distinct_dates=${scheduleDates.size}`);
  console.log(`- legacy_mass_times=${assets.massTimes.length}`);

  console.log("\nLacunas cadastrais em ministros ativos:");
  console.log(`- sem telefone=${countMissing(ministers, "phone")}`);
  console.log(`- sem whatsapp=${countMissing(ministers, "whatsapp")}`);
  console.log(`- sem nascimento=${countMissing(ministers, "birth_date")}`);
  console.log(`- sem batismo=${countMissing(ministers, "baptism_date")}`);
  console.log(`- sem crisma=${countMissing(ministers, "confirmation_date")}`);
  console.log(`- sem data de ingresso=${countMissing(ministers, "ministry_start_date")}`);
  console.log(`- sem horario preferido=${countMissing(ministers, "preferred_times")}`);
  console.log(`- sem foto=${ministers.filter((user) => !valuePresent(user.photo_url) && !valuePresent(user.image_data) && !valuePresent(user.profile_image_url)).length}`);

  console.log("\nIntegridade dos exports:");
  console.log(`- responses_missing_users=${missingResponseUsers.length}`);
  console.log(`- responses_missing_questionnaires=${missingResponseQuestionnaires.length}`);
  console.log(`- schedules_missing_users=${missingScheduleUsers.length}`);
}

async function tableExists(sql: postgres.Sql, tableName: string) {
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

async function tableColumns(sql: postgres.Sql, tableName: string) {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;
  return new Set(rows.map((row) => row.column_name));
}

async function countRows(sql: postgres.Sql, tableName: string, communityId?: string) {
  if (communityId) {
    const rows = await sql.unsafe<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(tableName)} WHERE community_id = $1`,
      [communityId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  const rows = await sql.unsafe<{ count: string }[]>(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(tableName)}`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function getCommunity(sql: postgres.Sql, slug: string) {
  const rows = await sql<{ id: string; slug: string; name: string }[]>`
    SELECT id, slug, name
    FROM communities
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (!rows[0]) throw new Error(`Comunidade nativa '${slug}' nao encontrada.`);
  return rows[0];
}

function rowForTable(
  source: JsonRow,
  columns: Set<string>,
  overrides: JsonRow = {},
  excludedColumns = new Set<string>(),
) {
  const row: JsonRow = {};
  for (const column of columns) {
    if (!excludedColumns.has(column) && source[column] !== undefined) row[column] = source[column];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (columns.has(key)) row[key] = value;
  }
  return row;
}

function scheduleRows(assetRows: JsonRow[], columns: Set<string>, communityId: string) {
  const counters = new Map<string, number>();

  return assetRows.map((source) => {
    const date = cleanDate(source.date);
    const time = cleanTime(source.time);
    const key = `${date}|${time}`;
    const position = counters.get(key) ?? 0;
    counters.set(key, position + 1);

    return rowForTable(source, columns, {
      community_id: communityId,
      date,
      time,
      position,
    });
  });
}

function userRows(assetRows: JsonRow[], columns: Set<string>, communityId: string) {
  const excludedColumns = new Set(USER_RELATION_COLUMNS);
  if (!hasFlag("include-photos")) {
    for (const column of USER_PHOTO_COLUMNS) excludedColumns.add(column);
  }

  return assetRows.map((source) => rowForTable(
    source,
    columns,
    {
      home_community_id: communityId,
      role: normalizeRole(source.role),
    },
    excludedColumns,
  ));
}

function questionnaireRows(assetRows: JsonRow[], columns: Set<string>, communityId: string) {
  return assetRows.map((source) => rowForTable(source, columns, {
    community_id: communityId,
  }));
}

function responseRows(assetRows: JsonRow[], columns: Set<string>, communityId: string) {
  return assetRows.map((source) => rowForTable(source, columns, {
    community_id: communityId,
  }));
}

async function upsertRows(
  sql: postgres.Sql,
  tableName: string,
  rows: JsonRow[],
  updateExclusions: string[],
) {
  let affected = 0;
  for (const row of rows) {
    const columns = Object.keys(row).filter((column) => row[column] !== undefined);
    if (columns.length === 0) continue;

    const values = columns.map((column) => row[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const updateColumns = columns.filter((column) => !updateExclusions.includes(column));
    const updateSet = updateColumns.length
      ? updateColumns.map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(", ")
      : "id = EXCLUDED.id";

    const result = await sql.unsafe(
      `INSERT INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")})
       VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
      values,
    );
    affected += result.count;
  }

  return affected;
}

async function importTable(
  sql: postgres.Sql,
  tableName: string,
  rows: JsonRow[],
  communityId: string | undefined,
  write: boolean,
  updateExclusions: string[],
): Promise<TableSummary> {
  const before = await countRows(sql, tableName, communityId);
  let upserted = 0;

  if (write) {
    upserted = await upsertRows(sql, tableName, rows, updateExclusions);
  }

  const after = await countRows(sql, tableName, communityId);
  return { before, upserted, after };
}

async function main() {
  const write = hasFlag("write");
  const communitySlug = option("community-slug", "mobile-demo-matriz");
  const dbUrl = databaseUrl();
  const assets = loadAssets();

  console.log("Native current data doctor");
  console.log(`Mode: ${write ? "APPLY" : "DRY-RUN"}`);
  console.log(`Community slug: ${communitySlug}`);
  console.log(`Profile photos: ${hasFlag("include-photos") ? "included" : "excluded by default"}`);
  printAssetAudit(assets);

  if (!dbUrl) {
    if (write) throw new Error("Defina DATABASE_URL ou NATIVE_DATABASE_URL para importar.");
    console.log("\nSem DATABASE_URL: dry-run limitado aos assets locais.");
    return;
  }

  if (write) guardWrite(dbUrl);

  const sql = postgres(dbUrl, { max: 1, prepare: false });
  try {
    for (const table of ["communities", "users", "questionnaires", "questionnaire_responses", "schedules"]) {
      if (!(await tableExists(sql, table))) throw new Error(`Tabela obrigatoria ausente: ${table}`);
    }

    const community = await getCommunity(sql, communitySlug);
    const userColumns = await tableColumns(sql, "users");
    const questionnaireColumns = await tableColumns(sql, "questionnaires");
    const responseColumns = await tableColumns(sql, "questionnaire_responses");
    const scheduleColumns = await tableColumns(sql, "schedules");

    const preparedUsers = userRows(assets.users, userColumns, community.id);
    const preparedQuestionnaires = questionnaireRows(assets.questionnaires, questionnaireColumns, community.id);
    const preparedResponses = responseRows(assets.responses, responseColumns, community.id);
    const preparedSchedules = scheduleRows(assets.schedules, scheduleColumns, community.id);

    console.log(`\nBanco alvo: ${community.name} (${community.slug})`);
    const summaries = {
      users: await importTable(sql, "users", preparedUsers, undefined, write, ["id", "email", "created_at"]),
      questionnaires: await importTable(sql, "questionnaires", preparedQuestionnaires, community.id, write, ["id", "created_at"]),
      questionnaireResponses: await importTable(sql, "questionnaire_responses", preparedResponses, community.id, write, ["id", "created_at"]),
      schedules: await importTable(sql, "schedules", preparedSchedules, community.id, write, ["id", "created_at"]),
    };

    console.log("\nResumo do banco:");
    for (const [name, summary] of Object.entries(summaries)) {
      console.log(`- ${name}: before=${summary.before} upserted=${summary.upserted} after=${summary.after}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Native current data doctor failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
