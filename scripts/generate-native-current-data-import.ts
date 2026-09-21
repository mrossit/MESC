#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

type ManifestEntry = {
  table: string;
  file: string;
  rows: number;
  columns: string[];
};

type Manifest = {
  tables: ManifestEntry[];
};

type JsonRow = Record<string, unknown>;

const IMPORT_ORDER = [
  "communities",
  "families",
  "users",
  "family_relationships",
  "questionnaires",
  "questionnaire_responses",
  "mass_times_config",
  "schedules",
  "substitution_requests",
  "formation_progress",
] as const;

const NEVER_IMPORT_COLUMNS = new Set([
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
  // Legacy PWA telemetry and soft-delete markers are not part of the native schema.
  "last_seen",
  "avatar_url",
  "last_seen_schedules",
  "deleted_at",
  "is_deleted",
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

function positiveInteger(name: string, fallback: number) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new Error(`${name} deve ser um inteiro entre 1 e 500.`);
  }
  return value;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function readJson<T>(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function writePrivateText(file: string, content: string) {
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function upsertSql(tableName: string, columns: string[], rows: JsonRow[]) {
  const payload = Buffer.from(JSON.stringify(rows), "utf8").toString("base64");
  const identifiers = columns.map(quoteIdentifier).join(", ");
  const updateColumns = columns.filter((column) => column !== "id" && column !== "created_at");
  const updateStatement = updateColumns.length > 0
    ? `DO UPDATE SET ${updateColumns.map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(", ")}`
    : "DO NOTHING";

  return `WITH source_rows AS (\n  SELECT *\n  FROM jsonb_populate_recordset(\n    NULL::public.${quoteIdentifier(tableName)},\n    convert_from(decode('${payload}', 'base64'), 'UTF8')::jsonb\n  )\n)\nINSERT INTO public.${quoteIdentifier(tableName)} (${identifiers})\nSELECT ${identifiers}\nFROM source_rows\nON CONFLICT (id) ${updateStatement};\n`;
}

function rowsForNativeTable(tableName: string, rows: JsonRow[]) {
  if (tableName !== "users") return rows;

  return rows.map((row) => ({
    ...row,
    // The mobile API uses the explicit community-coordinator role name.
    role: row.role === "coordenador" ? "coordenador_comunidade" : row.role,
  }));
}

function main() {
  const inputDir = path.resolve(option("input-dir", ""));
  if (!option("input-dir", "")) throw new Error("Informe --input-dir com o pacote privado exportado.");

  const outputDir = path.resolve(option("output-dir", path.join(inputDir, "supabase-upserts")));
  const batchSize = positiveInteger("batch-size", 120);
  const manifest = readJson<Manifest>(path.join(inputDir, "manifest.json"));
  const manifestEntries = new Map(manifest.tables.map((entry) => [entry.table, entry]));

  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(outputDir, 0o700);

  const report: Array<{ table: string; rows: number; batches: number }> = [];
  let sequence = 1;

  for (const tableName of IMPORT_ORDER) {
    const entry = manifestEntries.get(tableName);
    if (!entry || entry.rows === 0) continue;

    const rows = rowsForNativeTable(tableName, readJson<JsonRow[]>(path.join(inputDir, entry.file)));
    const columns = entry.columns.filter((column) => !NEVER_IMPORT_COLUMNS.has(column));
    if (!columns.includes("id")) throw new Error(`${tableName} nao possui coluna id para upsert.`);
    if (rows.length !== entry.rows) throw new Error(`${tableName} diverge da contagem registrada no manifest.`);

    const batches = Math.ceil(rows.length / batchSize);
    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      const fileName = `${String(sequence).padStart(3, "0")}-${tableName}-${String((start / batchSize) + 1).padStart(3, "0")}.sql`;
      writePrivateText(path.join(outputDir, fileName), upsertSql(tableName, columns, batch));
      sequence += 1;
    }
    report.push({ table: tableName, rows: rows.length, batches });
  }

  writePrivateText(path.join(outputDir, "manifest.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: inputDir,
    batchSize,
    tables: report,
  }, null, 2)}\n`);

  console.log(`Pacote de upserts criado em ${outputDir}`);
  for (const item of report) console.log(`- ${item.table}: ${item.rows} registros em ${item.batches} lote(s)`);
}

try {
  main();
} catch (error) {
  console.error("Native current data SQL generation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
