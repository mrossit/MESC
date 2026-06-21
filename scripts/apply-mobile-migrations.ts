/**
 * Applies the MESC Native mobile foundation migrations.
 *
 * - With DATABASE_URL: applies the Postgres SQL migration files 0006, 0007 and 0008.
 * - Without DATABASE_URL: applies SQLite-compatible local DDL to local.db.
 *
 * This intentionally does not call drizzle-kit push.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationFiles = [
  "migrations/0006_account_deletion_compliance.sql",
  "migrations/0007_mobile_device_sessions.sql",
  "migrations/0008_mobile_idempotency_keys.sql",
];

function readPostgresMigrations() {
  return migrationFiles
    .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
    .join("\n\n");
}

async function applyPostgresMigrations(databaseUrl: string) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    console.log("Applying mobile migrations to PostgreSQL...");
    await sql.begin(async (tx) => {
      await tx.unsafe(readPostgresMigrations());
    });
    console.log("Mobile migrations applied to PostgreSQL.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function applySqliteMigrations() {
  const Database = await import("better-sqlite3");
  const sqlite = new Database.default("local.db");

  const usersTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();
  const userReference = usersTable ? " REFERENCES users(id) ON DELETE CASCADE" : "";

  try {
    console.log("Applying mobile migrations to local SQLite local.db...");
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mobile_devices (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL${userReference},
        device_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_version TEXT,
        push_token TEXT,
        push_provider TEXT,
        push_enabled INTEGER NOT NULL DEFAULT 0,
        notification_preferences TEXT DEFAULT '{}',
        biometric_capable INTEGER NOT NULL DEFAULT 0,
        biometric_enabled INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
        revoked_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_id)
      );

      CREATE INDEX IF NOT EXISTS idx_mobile_devices_user ON mobile_devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_devices_device ON mobile_devices(device_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_devices_revoked ON mobile_devices(revoked_at);
      CREATE INDEX IF NOT EXISTS idx_mobile_devices_platform ON mobile_devices(platform);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_devices_user_device
        ON mobile_devices(user_id, device_id);

      CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL${userReference},
        device_db_id TEXT NOT NULL REFERENCES mobile_devices(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        token_family_id TEXT NOT NULL,
        replaced_by_token_id TEXT,
        expires_at TEXT NOT NULL,
        rotated_at TEXT,
        revoked_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS mobile_refresh_tokens_hash_idx
        ON mobile_refresh_tokens(token_hash);

      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_user
        ON mobile_refresh_tokens(user_id);

      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_device
        ON mobile_refresh_tokens(device_db_id);

      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_family
        ON mobile_refresh_tokens(token_family_id);

      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_expires
        ON mobile_refresh_tokens(expires_at);

      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_revoked
        ON mobile_refresh_tokens(revoked_at);

      CREATE TABLE IF NOT EXISTS mobile_idempotency_keys (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL${userReference},
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

      CREATE UNIQUE INDEX IF NOT EXISTS mobile_idempotency_keys_user_key_idx
        ON mobile_idempotency_keys(user_id, idempotency_key);

      CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_user
        ON mobile_idempotency_keys(user_id);

      CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_status
        ON mobile_idempotency_keys(status);

      CREATE INDEX IF NOT EXISTS idx_mobile_idempotency_expires
        ON mobile_idempotency_keys(expires_at);
    `);
    console.log("Mobile migrations applied to local SQLite.");
  } finally {
    sqlite.close();
  }
}

async function main() {
  if (process.env.DATABASE_URL) {
    await applyPostgresMigrations(process.env.DATABASE_URL);
    return;
  }

  await applySqliteMigrations();
}

main().catch((error) => {
  console.error("Failed to apply mobile migrations:", error);
  process.exit(1);
});
