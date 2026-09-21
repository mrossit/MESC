import postgres from "postgres";

type JsonRow = Record<string, unknown>;

type ImportTable = {
  table: string;
  required: boolean;
  omitOnInitialUsersImport?: string[];
};

type TableImportReport = {
  table: string;
  sourceRows: number;
  columns: number;
  upserted: number;
};

const IMPORT_TABLES: ImportTable[] = [
  { table: "communities", required: true },
  { table: "families", required: true },
  {
    table: "users",
    required: true,
    // These self-references can point to a user in a later batch.
    omitOnInitialUsersImport: ["spouse_minister_id", "approved_by_id"],
  },
  { table: "family_relationships", required: true },
  { table: "questionnaires", required: true },
  { table: "questionnaire_responses", required: true },
  { table: "mass_times_config", required: true },
  { table: "schedules", required: true },
  { table: "substitution_requests", required: true },
];

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
]);

const BATCH_SIZE = 100;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url]");
}

function connectionUrl() {
  const source = process.env.CURRENT_MESC_DATABASE_URL?.trim();
  const target = process.env.VERCEL === "1"
    ? process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim()
    : process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();

  if (!source) throw new Error("CURRENT_MESC_DATABASE_URL is not configured.");
  if (!target) throw new Error("Native database connection is not configured.");

  const sourceHost = new URL(source).hostname;
  const targetHost = new URL(target).hostname;
  if (sourceHost === targetHost) throw new Error("Source and destination database hosts must differ.");
  if (!targetHost.includes("supabase")) throw new Error("Destination is not the configured Supabase database.");

  return { source, target };
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

async function columnsFor(sql: postgres.Sql, tableName: string) {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `;
  return rows.map((row) => row.column_name).filter((column) => !NEVER_IMPORT_COLUMNS.has(column));
}

function normalizedRows(tableName: string, rows: JsonRow[]) {
  if (tableName !== "users") return rows;

  return rows.map((row) => ({
    ...row,
    role: row.role === "coordenador" ? "coordenador_comunidade" : row.role,
  }));
}

async function readSourceRows(source: postgres.Sql, tableName: string, columns: string[]) {
  return source.unsafe<JsonRow[]>(
    `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM public.${quoteIdentifier(tableName)} ORDER BY id`,
  );
}

async function upsertRows(target: postgres.Sql, tableName: string, columns: string[], rows: JsonRow[]) {
  if (rows.length === 0) return 0;

  const values = rows.flatMap((row) => columns.map((column) => row[column] ?? null));
  const placeholders = rows.map((_, rowIndex) => {
    const start = rowIndex * columns.length;
    return `(${columns.map((_, columnIndex) => `$${start + columnIndex + 1}`).join(", ")})`;
  });
  const updateColumns = columns.filter((column) => column !== "id" && column !== "created_at");
  const updateStatement = updateColumns.length > 0
    ? `DO UPDATE SET ${updateColumns.map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(", ")}`
    : "DO NOTHING";

  const result = await target.unsafe(
    `INSERT INTO public.${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")})
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (id) ${updateStatement}`,
    values as any[],
  );
  return result.count;
}

async function updateUserCrossReferences(target: postgres.Sql, rows: JsonRow[]) {
  const referenceRows = rows.filter((row) => row.spouse_minister_id || row.approved_by_id);
  let updated = 0;

  for (let start = 0; start < referenceRows.length; start += BATCH_SIZE) {
    const batch = referenceRows.slice(start, start + BATCH_SIZE);
    const values = batch.flatMap((row) => [row.id, row.spouse_minister_id ?? null, row.approved_by_id ?? null]);
    const placeholders = batch.map((_, index) => {
      const startIndex = index * 3;
      return `($${startIndex + 1}, $${startIndex + 2}, $${startIndex + 3})`;
    });
    const result = await target.unsafe(
      `UPDATE public.users AS destination
       SET spouse_minister_id = source.spouse_minister_id,
           approved_by_id = source.approved_by_id
       FROM (VALUES ${placeholders.join(", ")})
         AS source(id, spouse_minister_id, approved_by_id)
       WHERE destination.id = source.id`,
      values as any[],
    );
    updated += result.count;
  }

  return updated;
}

export type CurrentMescImportResult = {
  mode: "dry-run" | "apply";
  tables: TableImportReport[];
  userCrossReferences: number;
};

/**
 * Reads only from the legacy database and writes idempotent upserts to the native
 * Supabase project. It intentionally never carries device/session/push data.
 */
export async function importCurrentMescProductionData(mode: "dry-run" | "apply"): Promise<CurrentMescImportResult> {
  const { source: sourceUrl, target: targetUrl } = connectionUrl();
  const source = postgres(sourceUrl, { max: 1, prepare: false });
  const target = postgres(targetUrl, { max: 1, prepare: false });
  const reports: TableImportReport[] = [];
  let userRows: JsonRow[] = [];

  try {
    for (const entry of IMPORT_TABLES) {
      const sourceHasTable = await tableExists(source, entry.table);
      if (!sourceHasTable) {
        if (entry.required) throw new Error(`Required source table is missing: ${entry.table}`);
        continue;
      }
      if (!(await tableExists(target, entry.table))) {
        throw new Error(`Required native table is missing: ${entry.table}`);
      }

      const sourceColumns = await columnsFor(source, entry.table);
      const targetColumns = new Set(await columnsFor(target, entry.table));
      const missingColumns = sourceColumns.filter((column) => !targetColumns.has(column));
      if (missingColumns.length > 0) {
        throw new Error(`Native ${entry.table} is missing source columns: ${missingColumns.join(", ")}`);
      }
      if (!sourceColumns.includes("id")) throw new Error(`Source ${entry.table} has no id column.`);

      const rows = normalizedRows(entry.table, await readSourceRows(source, entry.table, sourceColumns));
      if (entry.table === "users") userRows = rows;
      const importColumns = sourceColumns.filter((column) => !entry.omitOnInitialUsersImport?.includes(column));

      let upserted = 0;
      if (mode === "apply") {
        await target.begin(async (transaction) => {
          for (let start = 0; start < rows.length; start += BATCH_SIZE) {
            upserted += await upsertRows(transaction, entry.table, importColumns, rows.slice(start, start + BATCH_SIZE));
          }
        });
      }

      reports.push({ table: entry.table, sourceRows: rows.length, columns: importColumns.length, upserted });
    }

    const userCrossReferences = mode === "apply" ? await updateUserCrossReferences(target, userRows) : 0;
    return { mode, tables: reports, userCrossReferences };
  } catch (error) {
    throw new Error(sanitizeError(error));
  } finally {
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
}
