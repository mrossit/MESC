#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

type ExportTable = {
  table: string;
  file: string;
  required?: boolean;
};

const NATIVE_STAGING_PROJECT_REF = "sdochgpfjosmhrbztthr";
const EXPORT_TABLES: ExportTable[] = [
  { table: "users", file: "users.json", required: true },
  { table: "questionnaires", file: "questionnaires.json", required: true },
  { table: "questionnaire_responses", file: "questionnaire_responses.json", required: true },
  { table: "schedules", file: "schedules.json", required: true },
  { table: "schedule_confirmations", file: "schedule_confirmations.json" },
  { table: "substitution_requests", file: "substitution_requests.json" },
  { table: "notifications", file: "notifications.json" },
  { table: "families", file: "families.json" },
  { table: "family_relationships", file: "family_relationships.json" },
  { table: "mass_times_config", file: "mass_times_config.json" },
  { table: "formation_progress", file: "formation_progress.json" },
];

const NEVER_EXPORT_COLUMNS = new Set([
  "image_data",
  "image_content_type",
  "session_token",
  "refresh_token",
  "token_hash",
  "ip_address",
  "user_agent",
  "endpoint",
  "p256dh_key",
  "auth_key",
  "push_token",
  "device_id",
]);

const args = process.argv.slice(2);

function option(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function sourceDatabaseUrl() {
  return process.env.CURRENT_MESC_DATABASE_URL?.trim() || process.env.SOURCE_DATABASE_URL?.trim() || "";
}

function guardExport(dbUrl: string) {
  if (process.env.CONFIRM_CURRENT_MESC_EXPORT !== "true") {
    throw new Error("Export recusado. Defina CONFIRM_CURRENT_MESC_EXPORT=true.");
  }

  const host = new URL(dbUrl).hostname;
  if (host.includes(NATIVE_STAGING_PROJECT_REF) && process.env.ALLOW_NATIVE_SOURCE_EXPORT !== "true") {
    throw new Error("Export recusado: a origem parece ser o Supabase nativo, nao o banco atual do MESC.");
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

async function tableColumns(sql: postgres.Sql, tableName: string) {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `;
  return rows.map((row) => row.column_name).filter((column) => !NEVER_EXPORT_COLUMNS.has(column));
}

function writePrivateJson(file: string, value: unknown) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

async function main() {
  const dbUrl = sourceDatabaseUrl();
  if (!dbUrl) throw new Error("Defina CURRENT_MESC_DATABASE_URL ou SOURCE_DATABASE_URL.");
  guardExport(dbUrl);

  const defaultOutput = path.join("data-exports", `mesc-current-${new Date().toISOString().slice(0, 10)}`);
  const outputDir = path.resolve(option("output-dir", defaultOutput));
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(outputDir, 0o700);

  const sql = postgres(dbUrl, { max: 1, prepare: false });
  const manifest: Array<{ table: string; file: string; rows: number; columns: string[]; sha256: string }> = [];

  try {
    for (const entry of EXPORT_TABLES) {
      if (!(await tableExists(sql, entry.table))) {
        if (entry.required) throw new Error(`Tabela obrigatoria ausente na origem: ${entry.table}`);
        console.log(`- ${entry.table}: ausente, ignorada`);
        continue;
      }

      const columns = await tableColumns(sql, entry.table);
      if (columns.length === 0) throw new Error(`Tabela sem colunas exportaveis: ${entry.table}`);
      const rows = await sql.unsafe<Record<string, unknown>[]>(
        `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(entry.table)}${columns.includes("id") ? " ORDER BY id" : ""}`,
      );
      const content = `${JSON.stringify(rows, null, 2)}\n`;
      writePrivateJson(path.join(outputDir, entry.file), rows);
      manifest.push({
        table: entry.table,
        file: entry.file,
        rows: rows.length,
        columns,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
      console.log(`- ${entry.table}: ${rows.length} registros`);
    }

    writePrivateJson(path.join(outputDir, "manifest.json"), {
      generatedAt: new Date().toISOString(),
      source: "current-mesc",
      excludedColumns: [...NEVER_EXPORT_COLUMNS].sort(),
      tables: manifest,
    });
    console.log(`Pacote privado criado em ${outputDir}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Current MESC export failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
