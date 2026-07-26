import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_CONFIRMATION = "true";
const MIGRATION_FILE = "migrations/0012_native_data_api_rls_hardening.sql";

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || process.env.NATIVE_DATABASE_URL?.trim();
}

function guard(url: string) {
  if (process.env.CONFIRM_NATIVE_RLS_HARDENING !== REQUIRED_CONFIRMATION) {
    throw new Error(
      "Migration recusada. Defina CONFIRM_NATIVE_RLS_HARDENING=true para confirmar o banco nativo.",
    );
  }

  const productionHostMarker = process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";
  const host = new URL(url).hostname;
  if (host.includes(productionHostMarker) && process.env.ALLOW_CURRENT_MESC_DB !== "true") {
    throw new Error("Migration recusada: host parece ser o banco atual do MESC/Replit.");
  }
}

async function main() {
  const url = databaseUrl();
  if (!url) {
    throw new Error("Defina DATABASE_URL ou NATIVE_DATABASE_URL para o banco nativo.");
  }

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

main().catch((error) => {
  console.error("Failed to apply native RLS hardening migration:", error);
  process.exit(1);
});
