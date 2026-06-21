import { createHash, randomUUID } from "crypto";
import { and, eq, lte } from "drizzle-orm";
import { mobileIdempotencyKeys } from "@shared/schema";
import { db } from "../db";

const IDEMPOTENCY_TTL_HOURS = 24;

let localTablesEnsured = false;

export class MobileIdempotencyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type MobileIdempotencyStart =
  | {
      kind: "started";
      recordId: string;
      idempotencyKey: string;
    }
  | {
      kind: "replay";
      idempotencyKey: string;
      responseStatus: number;
      responseBody: unknown;
    };

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function safeParseResponseBody(value: string | null | undefined): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getIdempotencyExpiry(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCHours(expiresAt.getUTCHours() + IDEMPOTENCY_TTL_HOURS);
  return expiresAt;
}

async function ensureLocalMobileIdempotencyTable() {
  if (localTablesEnsured || process.env.DATABASE_URL) {
    localTablesEnsured = true;
    return;
  }

  try {
    const Database = await import("better-sqlite3");
    const sqlite = new Database.default("local.db");

    const usersTable = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
      .get();
    const existingForeignKeys = sqlite
      .prepare("PRAGMA foreign_key_list(mobile_idempotency_keys)")
      .all();

    if (!usersTable && existingForeignKeys.length > 0) {
      sqlite.exec("DROP TABLE IF EXISTS mobile_idempotency_keys");
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mobile_idempotency_keys (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        response_status INTEGER,
        response_body TEXT,
        locked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, idempotency_key)
      );

      CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_user
        ON mobile_idempotency_keys(user_id);

      CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_status
        ON mobile_idempotency_keys(status);

      CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_expires
        ON mobile_idempotency_keys(expires_at);
    `);
  } catch (error) {
    console.error("[Mobile Idempotency] Failed to ensure local table:", error);
  }

  localTablesEnsured = true;
}

export function buildMobileRequestFingerprint(input: {
  method: string;
  path: string;
  communityId?: string | null;
  body?: unknown;
}) {
  return createHash("sha256")
    .update(stableStringify({
      method: input.method.toUpperCase(),
      path: input.path,
      communityId: input.communityId ?? null,
      body: input.body ?? null,
    }))
    .digest("hex");
}

export async function beginMobileIdempotency(input: {
  userId: string;
  idempotencyKey: string;
  method: string;
  path: string;
  requestHash: string;
}): Promise<MobileIdempotencyStart> {
  await ensureLocalMobileIdempotencyTable();

  const now = new Date();

  await db
    .delete(mobileIdempotencyKeys)
    .where(
      and(
        eq(mobileIdempotencyKeys.userId, input.userId),
        eq(mobileIdempotencyKeys.idempotencyKey, input.idempotencyKey),
        lte(mobileIdempotencyKeys.expiresAt, now),
      ),
    );

  const [created] = await db
    .insert(mobileIdempotencyKeys)
    .values({
      id: randomUUID(),
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      method: input.method.toUpperCase(),
      path: input.path,
      requestHash: input.requestHash,
      status: "in_progress",
      lockedAt: now,
      expiresAt: getIdempotencyExpiry(now),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [mobileIdempotencyKeys.userId, mobileIdempotencyKeys.idempotencyKey],
    })
    .returning();

  if (created) {
    return {
      kind: "started",
      recordId: created.id,
      idempotencyKey: input.idempotencyKey,
    };
  }

  const [existing] = await db
    .select()
    .from(mobileIdempotencyKeys)
    .where(
      and(
        eq(mobileIdempotencyKeys.userId, input.userId),
        eq(mobileIdempotencyKeys.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new MobileIdempotencyError(409, "Mutacao mobile em conflito. Tente novamente.");
  }

  if (existing.requestHash !== input.requestHash) {
    throw new MobileIdempotencyError(
      409,
      "Idempotency-Key ja usado para outra mutacao",
    );
  }

  if (existing.status === "completed" && existing.responseStatus) {
    return {
      kind: "replay",
      idempotencyKey: input.idempotencyKey,
      responseStatus: existing.responseStatus,
      responseBody: safeParseResponseBody(existing.responseBody),
    };
  }

  throw new MobileIdempotencyError(
    409,
    "Mutacao identica ainda em processamento. Tente novamente em instantes.",
  );
}

export async function completeMobileIdempotency(input: {
  recordId: string;
  responseStatus: number;
  responseBody: unknown;
}) {
  await ensureLocalMobileIdempotencyTable();

  const now = new Date();

  await db
    .update(mobileIdempotencyKeys)
    .set({
      status: "completed",
      responseStatus: input.responseStatus,
      responseBody: JSON.stringify(input.responseBody),
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(mobileIdempotencyKeys.id, input.recordId));
}

export async function releaseMobileIdempotency(recordId: string) {
  await ensureLocalMobileIdempotencyTable();

  await db
    .delete(mobileIdempotencyKeys)
    .where(eq(mobileIdempotencyKeys.id, recordId));
}
