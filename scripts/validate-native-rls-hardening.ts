const hardenedTables = [
  "adoration_draw_results",
  "adoration_draws",
  "badges",
  "families",
  "family_relationships",
  "formation_certificates",
  "formation_lesson_progress",
  "formation_lesson_sections",
  "formation_lessons",
  "formation_materials",
  "formation_modules",
  "formation_progress",
  "formation_tracks",
  "leaderboard_cache",
  "learned_patterns",
  "level_definitions",
  "liturgical_celebrations",
  "liturgical_mass_overrides",
  "liturgical_seasons",
  "liturgical_years",
  "mass_configurations",
  "mass_execution_logs",
  "mass_times_config",
  "material_access_logs",
  "minister_check_ins",
  "password_reset_requests",
  "point_transactions",
  "push_subscriptions",
  "question_mass_mappings",
  "saints",
  "schedule_generations",
  "sessions",
  "special_events",
  "standby_ministers",
  "user_badges",
  "user_points",
];

interface CheckResult {
  label: string;
  ok: boolean;
}

function report(results: CheckResult[]) {
  for (const result of results) {
    console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.label}`);
  }

  if (results.some((result) => !result.ok)) {
    throw new Error("Native RLS hardening validation failed.");
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.NATIVE_DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("Native RLS hardening validation skipped: no PostgreSQL DATABASE_URL configured.");
    return;
  }

  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const rows = await sql<{
      tableName: string;
      rlsEnabled: boolean;
      anonCanSelect: boolean;
      authenticatedCanSelect: boolean;
    }[]>`
      SELECT
        c.relname AS "tableName",
        c.relrowsecurity AS "rlsEnabled",
        has_table_privilege('anon', c.oid, 'SELECT') AS "anonCanSelect",
        has_table_privilege('authenticated', c.oid, 'SELECT') AS "authenticatedCanSelect"
      FROM pg_class c
      INNER JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ${sql(hardenedTables)}
    `;

    const byTable = new Map(rows.map((row) => [row.tableName, row]));
    const results = hardenedTables.flatMap((tableName) => {
      const row = byTable.get(tableName);
      return [
        { label: `table ${tableName} exists`, ok: Boolean(row) },
        { label: `RLS ${tableName}`, ok: row?.rlsEnabled === true },
        { label: `anon denied ${tableName}`, ok: row?.anonCanSelect === false },
        { label: `authenticated denied ${tableName}`, ok: row?.authenticatedCanSelect === false },
      ];
    });

    report(results);
    console.log("Native RLS hardening validation passed.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
