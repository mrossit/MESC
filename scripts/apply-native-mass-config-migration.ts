import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_CONFIRMATION = "true";
const MIGRATION_FILE = "migrations/0009_native_mass_configuration_baseline.sql";

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("Defina DATABASE_URL para aplicar a migration nativa de configuracao de missas.");
  }
  return value;
}

function guard(databaseUrl: string) {
  if (process.env.CONFIRM_NATIVE_MASS_CONFIG_MIGRATION !== REQUIRED_CONFIRMATION) {
    throw new Error(
      "Migration recusada. Defina CONFIRM_NATIVE_MASS_CONFIG_MIGRATION=true para confirmar o banco nativo.",
    );
  }

  const productionHostMarker = process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";
  const host = new URL(databaseUrl).hostname;
  if (host.includes(productionHostMarker) && process.env.ALLOW_CURRENT_MESC_DB !== "true") {
    throw new Error("Migration recusada: host parece ser o banco atual do MESC/Replit.");
  }
}

async function main() {
  const url = databaseUrl();
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
  console.error("Failed to apply native mass config migration:", error);
  process.exit(1);
});
