import postgres from "postgres";

type CheckResult = {
  label: string;
  ok: boolean;
  details?: string;
};

const args = process.argv.slice(2);

function optionValues(name: string) {
  const prefix = `--${name}=`;
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
      continue;
    }
    if (arg === `--${name}` && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    }
  }

  return values.filter(Boolean);
}

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("Defina DATABASE_URL para validar a prontidao nativa de escala.");
  }
  return value;
}

function report(results: CheckResult[]) {
  for (const result of results) {
    console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.label}${result.details ? ` - ${result.details}` : ""}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    throw new Error(`Native schedule readiness validation failed with ${failures.length} issue(s).`);
  }
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

async function main() {
  const sql = postgres(databaseUrl(), { max: 1, prepare: false });
  const slugs = optionValues("community-slug");
  const results: CheckResult[] = [];

  try {
    for (const table of ["communities", "mass_times_config", "mass_configurations", "special_events"]) {
      const exists = await tableExists(sql, table);
      results.push({ label: `table ${table}`, ok: exists });
    }

    const communityRows = slugs.length > 0
      ? await sql<{ id: string; slug: string; name: string }[]>`
          SELECT id, slug, name
          FROM communities
          WHERE slug IN ${sql(slugs)}
          ORDER BY is_matriz DESC, name ASC
        `
      : await sql<{ id: string; slug: string; name: string }[]>`
          SELECT id, slug, name
          FROM communities
          WHERE active = true
            AND is_matriz = true
          ORDER BY name ASC
        `;

    results.push({
      label: "target communities",
      ok: communityRows.length > 0,
      details: communityRows.map((row) => row.slug).join(", ") || "none",
    });

    for (const community of communityRows) {
      const [counts] = await sql<{
        legacy: number;
        dynamic: number;
        events: number;
      }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM mass_times_config WHERE community_id = ${community.id} AND is_active = true) AS legacy,
          (SELECT COUNT(*)::int FROM mass_configurations WHERE community_id = ${community.id} AND is_active = true) AS dynamic,
          (SELECT COUNT(*)::int FROM special_events WHERE community_id = ${community.id} AND is_active = true) AS events
      `;

      results.push(
        {
          label: `legacy mass slots ${community.slug}`,
          ok: Number(counts?.legacy ?? 0) >= 1,
          details: `${counts?.legacy ?? 0}`,
        },
        {
          label: `dynamic mass configs ${community.slug}`,
          ok: Number(counts?.dynamic ?? 0) >= 1,
          details: `${counts?.dynamic ?? 0}`,
        },
        {
          label: `special events ${community.slug}`,
          ok: Number(counts?.events ?? 0) >= 1,
          details: `${counts?.events ?? 0}`,
        },
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  report(results);
  console.log("Native schedule readiness validation passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
