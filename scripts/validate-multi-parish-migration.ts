import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

interface CheckResult {
  name: string;
  ok: boolean;
  message: string;
}

const migrationPath = path.join(
  process.cwd(),
  "migrations",
  "0005_multi_community_phase1.sql"
);

const scopedTables = [
  "schedules",
  "mass_configurations",
  "mass_times_config",
  "special_events",
  "questionnaires",
  "substitution_requests",
  "questionnaire_responses",
];

const expectedColumns: Record<string, string[]> = {
  users: ["home_community_id"],
  schedules: ["community_id"],
  mass_configurations: ["community_id"],
  mass_times_config: ["community_id"],
  special_events: ["community_id"],
  questionnaires: ["community_id"],
  substitution_requests: ["community_id"],
  questionnaire_responses: ["community_id"],
};

const expectedIndexes = [
  "idx_users_home_community",
  "idx_schedules_community_date",
  "idx_mass_config_community",
  "idx_mass_times_community",
  "idx_special_events_community",
  "idx_questionnaires_community",
  "idx_subst_requests_community",
  "idx_quest_responses_community",
];

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  console.log(`
Usage:
  STAGING_DATABASE_URL=postgres://... npm run release:check:multi-parish

Apply the current multi-community migration in staging, then validate:
  STAGING_DATABASE_URL=postgres://... \\
  CONFIRM_STAGING_MIGRATION=true \\
  npm run release:check:multi-parish -- --apply
`);
}

function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.STAGING_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("Defina STAGING_DATABASE_URL ou DATABASE_URL.");
  }

  return databaseUrl;
}

function connect(databaseUrl: string) {
  return postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes("sslmode=require") ? "require" : undefined,
  });
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

async function countRows(sql: postgres.Sql, tableName: string): Promise<number> {
  const rows = await sql.unsafe<{ count: string }[]>(
    `SELECT COUNT(*)::text AS count FROM ${tableName}`
  );
  return Number(rows[0]?.count ?? 0);
}

async function countNulls(
  sql: postgres.Sql,
  tableName: string,
  columnName: string
): Promise<number> {
  const rows = await sql.unsafe<{ missing: string }[]>(
    `SELECT COUNT(*)::text AS missing FROM ${tableName} WHERE ${columnName} IS NULL`
  );
  return Number(rows[0]?.missing ?? 0);
}

async function applyMigration(sql: postgres.Sql) {
  if (process.env.CONFIRM_STAGING_MIGRATION !== "true") {
    throw new Error(
      "--apply exige CONFIRM_STAGING_MIGRATION=true para evitar aplicar migration por engano."
    );
  }

  const migrationSql = await fs.readFile(migrationPath, "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(migrationSql);
  });
}

async function validateSchema(sql: postgres.Sql): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  const communitiesExists = await tableExists(sql, "communities");
  checks.push({
    name: "table:communities",
    ok: communitiesExists,
    message: communitiesExists ? "present" : "missing",
  });

  const columns = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY(${Object.keys(expectedColumns)})
  `;
  const presentColumns = new Set(
    columns.map((column) => `${column.table_name}.${column.column_name}`)
  );

  for (const [table, columnNames] of Object.entries(expectedColumns)) {
    const exists = await tableExists(sql, table);
    if (!exists) {
      checks.push({
        name: `columns:${table}`,
        ok: false,
        message: "table missing",
      });
      continue;
    }

    for (const column of columnNames) {
      const key = `${table}.${column}`;
      checks.push({
        name: `column:${key}`,
        ok: presentColumns.has(key),
        message: presentColumns.has(key) ? "present" : "missing",
      });
    }
  }

  const indexes = await sql<{ indexname: string }[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = ANY(${expectedIndexes})
  `;
  const presentIndexes = new Set(indexes.map((index) => index.indexname));

  for (const index of expectedIndexes) {
    checks.push({
      name: `index:${index}`,
      ok: presentIndexes.has(index),
      message: presentIndexes.has(index) ? "present" : "missing",
    });
  }

  return checks;
}

async function validateBackfill(sql: postgres.Sql): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  if (!(await tableExists(sql, "communities"))) {
    return [
      {
        name: "backfill:communities",
        ok: false,
        message: "table missing",
      },
    ];
  }

  const defaultCommunity = await sql<{
    communities_count: string;
    matriz_count: string;
    sao_judas_count: string;
  }[]>`
    SELECT
      COUNT(*)::text AS communities_count,
      COUNT(*) FILTER (WHERE is_matriz = true)::text AS matriz_count,
      COUNT(*) FILTER (WHERE slug = 'sao-judas')::text AS sao_judas_count
    FROM communities
  `;

  checks.push({
    name: "communities-seeded",
    ok: Number(defaultCommunity[0]?.communities_count ?? 0) >= 4,
    message: `${defaultCommunity[0]?.communities_count ?? 0} community row(s)`,
  });
  checks.push({
    name: "matriz-community",
    ok: Number(defaultCommunity[0]?.matriz_count ?? 0) === 1,
    message: `${defaultCommunity[0]?.matriz_count ?? 0} matriz community row(s)`,
  });
  checks.push({
    name: "sao-judas-community",
    ok: Number(defaultCommunity[0]?.sao_judas_count ?? 0) === 1,
    message: `${defaultCommunity[0]?.sao_judas_count ?? 0} sao-judas row(s)`,
  });

  if (await tableExists(sql, "users")) {
    const count = await countRows(sql, "users");
    const missing = await countNulls(sql, "users", "home_community_id");
    checks.push({
      name: "backfill:users.home_community_id",
      ok: missing === 0,
      message: `${missing}/${count} users missing home_community_id`,
    });
  }

  for (const table of scopedTables) {
    if (!(await tableExists(sql, table))) {
      checks.push({
        name: `backfill:${table}`,
        ok: false,
        message: "table missing",
      });
      continue;
    }

    const count = await countRows(sql, table);
    const missing = await countNulls(sql, table, "community_id");
    checks.push({
      name: `backfill:${table}.community_id`,
      ok: missing === 0,
      message: `${missing}/${count} rows missing community_id`,
    });
  }

  return checks;
}

function printResults(results: CheckResult[]) {
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name} - ${result.message}`);
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const databaseUrl = getDatabaseUrl();
  const sql = connect(databaseUrl);

  try {
    if (hasFlag("apply")) {
      console.log(`Applying migration: ${migrationPath}`);
      await applyMigration(sql);
    }

    const results = [
      ...(await validateSchema(sql)),
      ...(await validateBackfill(sql)),
    ];
    printResults(results);

    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      throw new Error(`${failed.length} multi-community validation check(s) failed.`);
    }

    console.log("Multi-community migration validation passed.");
  } finally {
    await sql.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
