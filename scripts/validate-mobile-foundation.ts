import { getMobileP0DemoData } from "../test/fixtures/mobileP0DemoData";

const requiredMobileTables = [
  "mobile_devices",
  "mobile_refresh_tokens",
  "mobile_idempotency_keys",
];

const requiredMobileIndexes = [
  "uq_mobile_devices_user_device",
  "mobile_refresh_tokens_hash_idx",
  "mobile_idempotency_keys_user_key_idx",
];

const expectDemo = process.argv.includes("--expect-demo");
const demo = getMobileP0DemoData();

interface CheckResult {
  label: string;
  ok: boolean;
  details?: string;
}

function report(results: CheckResult[]) {
  for (const result of results) {
    const icon = result.ok ? "OK" : "FAIL";
    console.log(`[${icon}] ${result.label}${result.details ? ` - ${result.details}` : ""}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(`Mobile foundation validation failed with ${failures.length} issue(s).`);
    process.exit(1);
  }

  console.log("Mobile foundation validation passed.");
}

function ids(values: string[]) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ");
}

async function validatePostgres(databaseUrl: string) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });
  const results: CheckResult[] = [];

  try {
    for (const tableName of requiredMobileTables) {
      const [row] = await sql<{ exists: string | null }[]>`
        SELECT to_regclass(${`public.${tableName}`})::text AS exists
      `;
      results.push({
        label: `table ${tableName}`,
        ok: Boolean(row?.exists),
      });
    }

    for (const indexName of requiredMobileIndexes) {
      const [row] = await sql<{ exists: string | null }[]>`
        SELECT to_regclass(${`public.${indexName}`})::text AS exists
      `;
      results.push({
        label: `index ${indexName}`,
        ok: Boolean(row?.exists),
      });
    }

    if (expectDemo) {
      const [counts] = await sql<{
        communities: number;
        users: number;
        questionnaires: number;
        schedules: number;
        substitutions: number;
        notifications: number;
      }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM communities WHERE id IN ${sql(demo.communities.map((item) => item.id))}) AS communities,
          (SELECT COUNT(*)::int FROM users WHERE id IN ${sql(demo.users.map((item) => item.id))}) AS users,
          (SELECT COUNT(*)::int FROM questionnaires WHERE id IN ${sql(demo.questionnaires.map((item) => item.id))}) AS questionnaires,
          (SELECT COUNT(*)::int FROM schedules WHERE id IN ${sql(demo.schedules.map((item) => item.id))}) AS schedules,
          (SELECT COUNT(*)::int FROM substitution_requests WHERE id IN ${sql(demo.substitutions.map((item) => item.id))}) AS substitutions,
          (SELECT COUNT(*)::int FROM notifications WHERE id IN ${sql(demo.notifications.map((item) => item.id))}) AS notifications
      `;

      results.push(
        {
          label: "demo communities",
          ok: counts.communities === demo.communities.length,
          details: `${counts.communities}/${demo.communities.length}`,
        },
        {
          label: "demo users",
          ok: counts.users === demo.users.length,
          details: `${counts.users}/${demo.users.length}`,
        },
        {
          label: "demo questionnaires",
          ok: counts.questionnaires === demo.questionnaires.length,
          details: `${counts.questionnaires}/${demo.questionnaires.length}`,
        },
        {
          label: "demo schedules",
          ok: counts.schedules === demo.schedules.length,
          details: `${counts.schedules}/${demo.schedules.length}`,
        },
        {
          label: "demo substitutions",
          ok: counts.substitutions === demo.substitutions.length,
          details: `${counts.substitutions}/${demo.substitutions.length}`,
        },
        {
          label: "demo notifications",
          ok: counts.notifications === demo.notifications.length,
          details: `${counts.notifications}/${demo.notifications.length}`,
        },
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  report(results);
}

async function validateSqlite() {
  const Database = await import("better-sqlite3");
  const sqlite = new Database.default("local.db");
  const results: CheckResult[] = [];

  try {
    for (const tableName of requiredMobileTables) {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tableName);
      results.push({
        label: `table ${tableName}`,
        ok: Boolean(row),
      });
    }

    for (const indexName of requiredMobileIndexes) {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
        .get(indexName);
      results.push({
        label: `index ${indexName}`,
        ok: Boolean(row),
      });
    }

    if (expectDemo) {
      const counts = {
        communities: sqlite
          .prepare(`SELECT COUNT(*) AS count FROM communities WHERE id IN (${ids(demo.communities.map((item) => item.id))})`)
          .get() as { count: number },
        users: sqlite
          .prepare(`SELECT COUNT(*) AS count FROM users WHERE id IN (${ids(demo.users.map((item) => item.id))})`)
          .get() as { count: number },
        questionnaires: sqlite
          .prepare(`SELECT COUNT(*) AS count FROM questionnaires WHERE id IN (${ids(demo.questionnaires.map((item) => item.id))})`)
          .get() as { count: number },
        schedules: sqlite
          .prepare(`SELECT COUNT(*) AS count FROM schedules WHERE id IN (${ids(demo.schedules.map((item) => item.id))})`)
          .get() as { count: number },
        substitutions: sqlite
          .prepare(`SELECT COUNT(*) AS count FROM substitution_requests WHERE id IN (${ids(demo.substitutions.map((item) => item.id))})`)
          .get() as { count: number },
        notifications: sqlite
          .prepare(`SELECT COUNT(*) AS count FROM notifications WHERE id IN (${ids(demo.notifications.map((item) => item.id))})`)
          .get() as { count: number },
      };

      results.push(
        {
          label: "demo communities",
          ok: counts.communities.count === demo.communities.length,
          details: `${counts.communities.count}/${demo.communities.length}`,
        },
        {
          label: "demo users",
          ok: counts.users.count === demo.users.length,
          details: `${counts.users.count}/${demo.users.length}`,
        },
        {
          label: "demo questionnaires",
          ok: counts.questionnaires.count === demo.questionnaires.length,
          details: `${counts.questionnaires.count}/${demo.questionnaires.length}`,
        },
        {
          label: "demo schedules",
          ok: counts.schedules.count === demo.schedules.length,
          details: `${counts.schedules.count}/${demo.schedules.length}`,
        },
        {
          label: "demo substitutions",
          ok: counts.substitutions.count === demo.substitutions.length,
          details: `${counts.substitutions.count}/${demo.substitutions.length}`,
        },
        {
          label: "demo notifications",
          ok: counts.notifications.count === demo.notifications.length,
          details: `${counts.notifications.count}/${demo.notifications.length}`,
        },
      );
    }
  } finally {
    sqlite.close();
  }

  report(results);
}

async function main() {
  if (process.env.DATABASE_URL) {
    await validatePostgres(process.env.DATABASE_URL);
    return;
  }

  await validateSqlite();
}

main().catch((error) => {
  console.error("Failed to validate mobile foundation:", error);
  process.exit(1);
});
