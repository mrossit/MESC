import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_CONFIRMATION = "true";
const MIGRATION_FILE = "migrations/0010_native_adoration_draws_baseline.sql";

function databaseUrl() {
  return process.env.DATABASE_URL?.trim();
}

function guard(url: string) {
  if (process.env.CONFIRM_NATIVE_ADORATION_MIGRATION !== REQUIRED_CONFIRMATION) {
    throw new Error(
      "Migration recusada. Defina CONFIRM_NATIVE_ADORATION_MIGRATION=true para confirmar o banco nativo.",
    );
  }

  const productionHostMarker = process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";
  const host = new URL(url).hostname;
  if (host.includes(productionHostMarker) && process.env.ALLOW_CURRENT_MESC_DB !== "true") {
    throw new Error("Migration recusada: host parece ser o banco atual do MESC/Replit.");
  }
}

async function applyPostgres(url: string) {
  guard(url);
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1, prepare: false });

  try {
    const migration = readFileSync(resolve(process.cwd(), MIGRATION_FILE), "utf8");
    await sql.unsafe(migration);
    console.log(`Applied ${MIGRATION_FILE}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function applySqlite() {
  const Database = await import("better-sqlite3");
  const sqlite = new Database.default("local.db");
  const usersTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();
  const userReference = usersTable ? " REFERENCES users(id)" : "";

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS adoration_draws (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_ministers_to_draw INTEGER NOT NULL,
        created_by TEXT NOT NULL${userReference},
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS adoration_draw_results (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        draw_id TEXT NOT NULL REFERENCES adoration_draws(id) ON DELETE CASCADE,
        minister_id TEXT NOT NULL${userReference},
        monday_of_week INTEGER NOT NULL,
        is_voluntary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(draw_id, minister_id, monday_of_week)
      );

      CREATE INDEX IF NOT EXISTS idx_adoration_draws_month_year
        ON adoration_draws(year, month);

      CREATE INDEX IF NOT EXISTS idx_adoration_draw_results_draw
        ON adoration_draw_results(draw_id);

      CREATE INDEX IF NOT EXISTS idx_adoration_draw_results_minister
        ON adoration_draw_results(minister_id);
    `);
    console.log(`Applied ${MIGRATION_FILE} to local SQLite local.db.`);
  } finally {
    sqlite.close();
  }
}

async function main() {
  const url = databaseUrl();
  if (url) {
    await applyPostgres(url);
    return;
  }

  await applySqlite();
}

main().catch((error) => {
  console.error("Failed to apply native adoration migration:", error);
  process.exit(1);
});
