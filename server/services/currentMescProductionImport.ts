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
  // Legacy PWA telemetry and soft-delete markers are not part of the native schema.
  "last_seen",
  "avatar_url",
  "last_seen_schedules",
  "deleted_at",
  "is_deleted",
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

function scheduleSlotKey(row: JsonRow) {
  const communityId = String(row.community_id ?? "");
  const date = String(row.date ?? "").slice(0, 10);
  const time = String(row.time ?? "").slice(0, 8);
  const position = String(row.position ?? "");
  return `${communityId}|${date}|${time}|${position}`;
}

function scheduleRecency(row: JsonRow) {
  const timestamp = Date.parse(String(row.updated_at ?? row.created_at ?? ""));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function reconcileScheduleIds(target: postgres.Sql, rows: JsonRow[]) {
  const existingRows = await target<{ id: string; community_id: string; date: string; time: string; position: number }[]>`
    SELECT id, community_id, date::text AS date, time::text AS time, position
    FROM public.schedules
  `;
  const existingBySlot = new Map(existingRows.map((row) => [scheduleSlotKey(row), row.id]));
  const canonicalSourceBySlot = new Map<string, JsonRow>();
  for (const row of rows) {
    const slot = scheduleSlotKey(row);
    const current = canonicalSourceBySlot.get(slot);
    if (!current || scheduleRecency(row) > scheduleRecency(current)) {
      canonicalSourceBySlot.set(slot, row);
    }
  }

  const sourceToNative = new Map<string, string>();
  let remapped = 0;
  let consolidatedSourceDuplicates = 0;
  const nativeIdBySlot = new Map<string, string>();

  for (const [slot, canonicalSource] of canonicalSourceBySlot) {
    const sourceId = typeof canonicalSource.id === "string" ? canonicalSource.id : "";
    const nativeId = existingBySlot.get(slot) ?? sourceId;
    if (nativeId) nativeIdBySlot.set(slot, nativeId);
  }

  for (const row of rows) {
    const sourceId = typeof row.id === "string" ? row.id : "";
    const slot = scheduleSlotKey(row);
    const nativeId = nativeIdBySlot.get(slot);
    if (!sourceId || !nativeId || sourceId === nativeId) continue;

    sourceToNative.set(sourceId, nativeId);
    remapped += 1;
    if (canonicalSourceBySlot.get(slot)?.id !== sourceId) consolidatedSourceDuplicates += 1;
  }

  const reconciledRows = [...canonicalSourceBySlot.entries()].map(([slot, row]) => ({
    ...row,
    id: nativeIdBySlot.get(slot) ?? row.id,
  }));

  return { rows: reconciledRows, sourceToNative, remapped, consolidatedSourceDuplicates };
}

async function ensureCommunityScopedScheduleUniqueness(target: postgres.Sql) {
  const [existing] = await target<{ ready: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'uq_schedules_community_date_time_position'
    ) AS ready
  `;
  if (existing?.ready) return false;

  // Matches migration 0011: a slot is unique inside a community, never globally.
  await target.begin(async (transaction) => {
    await transaction.unsafe(
      "ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS uq_schedules_date_time_position",
    );
    await transaction.unsafe("DROP INDEX IF EXISTS public.uq_schedules_date_time_position");
    await transaction.unsafe(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_community_date_time_position ON public.schedules(community_id, date, time, position)",
    );
  });
  return true;
}

function remapSubstitutionScheduleIds(rows: JsonRow[], scheduleIds: ReadonlyMap<string, string>) {
  return rows.map((row) => {
    const scheduleId = typeof row.schedule_id === "string" ? row.schedule_id : "";
    const nativeScheduleId = scheduleIds.get(scheduleId);
    return nativeScheduleId ? { ...row, schedule_id: nativeScheduleId } : row;
  });
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
  remappedScheduleSlots: number;
  consolidatedScheduleDuplicates: number;
  appliedScheduleScopeMigration: boolean;
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
  let scheduleIds = new Map<string, string>();
  let remappedScheduleSlots = 0;
  let consolidatedScheduleDuplicates = 0;
  let appliedScheduleScopeMigration = false;

  try {
    if (mode === "apply") {
      appliedScheduleScopeMigration = await ensureCommunityScopedScheduleUniqueness(target);
    }

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

      const sourceRows = normalizedRows(entry.table, await readSourceRows(source, entry.table, sourceColumns));
      let rows = sourceRows;
      if (entry.table === "users") userRows = sourceRows;
      if (entry.table === "schedules") {
        const reconciled = await reconcileScheduleIds(target, sourceRows);
        rows = reconciled.rows;
        scheduleIds = reconciled.sourceToNative;
        remappedScheduleSlots = reconciled.remapped;
        consolidatedScheduleDuplicates = reconciled.consolidatedSourceDuplicates;
      }
      if (entry.table === "substitution_requests") {
        rows = remapSubstitutionScheduleIds(sourceRows, scheduleIds);
      }
      const importColumns = sourceColumns.filter((column) => !entry.omitOnInitialUsersImport?.includes(column));

      let upserted = 0;
      if (mode === "apply") {
        // Supabase poolers enforce a transaction timeout. Keep each write batch
        // atomic while allowing a large historical import to resume safely.
        for (let start = 0; start < rows.length; start += BATCH_SIZE) {
          const batch = rows.slice(start, start + BATCH_SIZE);
          await target.begin(async (transaction) => {
            upserted += await upsertRows(transaction, entry.table, importColumns, batch);
          });
        }
      }

      reports.push({ table: entry.table, sourceRows: sourceRows.length, columns: importColumns.length, upserted });
    }

    const userCrossReferences = mode === "apply" ? await updateUserCrossReferences(target, userRows) : 0;
    return {
      mode,
      tables: reports,
      userCrossReferences,
      remappedScheduleSlots,
      consolidatedScheduleDuplicates,
      appliedScheduleScopeMigration,
    };
  } catch (error) {
    throw new Error(sanitizeError(error));
  } finally {
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
}
