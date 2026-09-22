import {
  buildFormationSeedRecords,
  loadMescFormationContent,
} from "../server/services/mescFormationContent";

const expectOfficial = process.argv.includes("--expect-official");

const requiredFormationTables = [
  "formation_tracks",
  "formation_modules",
  "formation_lessons",
  "formation_lesson_sections",
  "formation_lesson_progress",
];

type CheckResult = {
  label: string;
  ok: boolean;
  details?: string;
};

function report(results: CheckResult[]) {
  for (const result of results) {
    console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.label}${result.details ? ` - ${result.details}` : ""}`);
  }

  if (results.some((result) => !result.ok)) {
    throw new Error("A fundação de formação possui validações pendentes.");
  }

  console.log("Formation foundation validation passed.");
}

function sqlValues(values: string[]) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ");
}

async function validatePostgres(databaseUrl: string) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });
  const content = await loadMescFormationContent();
  const expected = buildFormationSeedRecords(content);
  const results: CheckResult[] = [];

  try {
    for (const tableName of requiredFormationTables) {
      const [row] = await sql<{ exists: string | null }[]>`
        SELECT to_regclass(${`public.${tableName}`})::text AS exists
      `;
      results.push({ label: `table ${tableName}`, ok: Boolean(row?.exists) });
    }

    if (expectOfficial) {
      const [counts] = await sql<{
        tracks: number;
        modules: number;
        lessons: number;
        sections: number;
      }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM formation_tracks WHERE id = ${expected.track.id}) AS tracks,
          (SELECT COUNT(*)::int FROM formation_modules WHERE id IN ${sql(expected.modules.map((module) => module.id))}) AS modules,
          (SELECT COUNT(*)::int FROM formation_lessons WHERE id IN ${sql(expected.lessons.map((lesson) => lesson.id))}) AS lessons,
          (SELECT COUNT(*)::int FROM formation_lesson_sections WHERE id IN ${sql(expected.sections.map((section) => section.id))}) AS sections
      `;

      results.push(
        { label: "official formation track", ok: counts.tracks === 1, details: `${counts.tracks}/1` },
        { label: "official formation modules", ok: counts.modules === expected.modules.length, details: `${counts.modules}/${expected.modules.length}` },
        { label: "official formation lessons", ok: counts.lessons === expected.lessons.length, details: `${counts.lessons}/${expected.lessons.length}` },
        { label: "official formation sections", ok: counts.sections === expected.sections.length, details: `${counts.sections}/${expected.sections.length}` },
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
  const content = await loadMescFormationContent();
  const expected = buildFormationSeedRecords(content);
  const results: CheckResult[] = [];

  try {
    for (const tableName of requiredFormationTables) {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tableName);
      results.push({ label: `table ${tableName}`, ok: Boolean(row) });
    }

    if (expectOfficial) {
      const count = (tableName: string, ids: string[]) => {
        const row = sqlite
          .prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE id IN (${sqlValues(ids)})`)
          .get() as { count: number };
        return row.count;
      };

      const tracks = count("formation_tracks", [expected.track.id]);
      const modules = count("formation_modules", expected.modules.map((module) => module.id));
      const lessons = count("formation_lessons", expected.lessons.map((lesson) => lesson.id));
      const sections = count("formation_lesson_sections", expected.sections.map((section) => section.id));

      results.push(
        { label: "official formation track", ok: tracks === 1, details: `${tracks}/1` },
        { label: "official formation modules", ok: modules === expected.modules.length, details: `${modules}/${expected.modules.length}` },
        { label: "official formation lessons", ok: lessons === expected.lessons.length, details: `${lessons}/${expected.lessons.length}` },
        { label: "official formation sections", ok: sections === expected.sections.length, details: `${sections}/${expected.sections.length}` },
      );
    }
  } finally {
    sqlite.close();
  }

  report(results);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    await validatePostgres(databaseUrl);
  } else {
    await validateSqlite();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
