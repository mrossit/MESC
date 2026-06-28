import { createHash, randomBytes, randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  mobileDevices,
  mobileRefreshTokens,
  users,
  type MobileDevice,
  type MobileRefreshToken,
  type User,
} from "@shared/schema";
import { db } from "../db";

const REFRESH_TOKEN_PREFIX = "mesc_rt_";
const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_DAYS = 30;

let localTablesEnsured = false;

export class MobileSessionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface MobileDeviceInput {
  userId: string;
  deviceId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  pushToken?: string | null;
  pushProvider?: string | null;
  pushEnabled?: boolean;
  biometricCapable?: boolean;
  biometricEnabled?: boolean;
  notificationPreferences?: Record<string, unknown>;
}

export interface MobileSessionRequest extends MobileDeviceInput {
  keepSignedIn: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface MobileTokenRecord {
  token: MobileRefreshToken;
  device: MobileDevice;
  user: User;
}

export function generateRefreshToken(): string {
  return `${REFRESH_TOKEN_PREFIX}${randomBytes(REFRESH_TOKEN_BYTES).toString("base64url")}`;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getRefreshTokenExpiry(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

export function createServerDeviceId(): string {
  return `server-${randomUUID()}`;
}

export function normalizeMobilePlatform(platform: string | null | undefined): "ios" | "android" | "unknown" {
  if (platform === "ios" || platform === "android") return platform;
  return "unknown";
}

function dbBoolean(value: boolean) {
  return (process.env.DATABASE_URL ? value : value ? 1 : 0) as any;
}

export function isExpired(value: Date | string, now = new Date()): boolean {
  const expiresAt = value instanceof Date ? value : new Date(value);
  return expiresAt.getTime() <= now.getTime();
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function toSafeIsoDate(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function sanitizeMobileDevice(device: MobileDevice) {
  return {
    id: device.id,
    deviceId: device.deviceId,
    platform: device.platform,
    appVersion: device.appVersion,
    pushEnabled: Boolean(device.pushEnabled),
    pushProvider: device.pushProvider,
    notificationPreferences: normalizeRecord(device.notificationPreferences),
    biometricCapable: Boolean(device.biometricCapable),
    biometricEnabled: Boolean(device.biometricEnabled),
    lastSeenAt: toSafeIsoDate(device.lastSeenAt),
    revokedAt: toSafeIsoDate(device.revokedAt),
    createdAt: toSafeIsoDate(device.createdAt),
  };
}

async function ensureLocalMobileTables() {
  if (localTablesEnsured || process.env.DATABASE_URL) {
    localTablesEnsured = true;
    return;
  }

  try {
    const Database = await import("better-sqlite3");
    const sqlite = new Database.default("local.db");

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS mobile_devices (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
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
        UNIQUE(user_id, device_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mobile_devices_user ON mobile_devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_devices_device ON mobile_devices(device_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_devices_revoked ON mobile_devices(revoked_at);
      CREATE INDEX IF NOT EXISTS idx_mobile_devices_platform ON mobile_devices(platform);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_devices_user_device
        ON mobile_devices(user_id, device_id);

      CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        device_db_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        token_family_id TEXT NOT NULL,
        replaced_by_token_id TEXT,
        expires_at TEXT NOT NULL,
        rotated_at TEXT,
        revoked_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(device_db_id) REFERENCES mobile_devices(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_user ON mobile_refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_device ON mobile_refresh_tokens(device_db_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_family ON mobile_refresh_tokens(token_family_id);
      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_expires ON mobile_refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_revoked ON mobile_refresh_tokens(revoked_at);
    `);
  } catch (error) {
    console.error("[Mobile Session] Failed to ensure local mobile tables:", error);
  }

  localTablesEnsured = true;
}

export async function createOrUpdateMobileDevice(input: MobileDeviceInput): Promise<MobileDevice> {
  await ensureLocalMobileTables();

  const now = new Date();
  const deviceId = input.deviceId || createServerDeviceId();
  const platform = normalizeMobilePlatform(input.platform);

  const [existing] = await db
    .select()
    .from(mobileDevices)
    .where(and(eq(mobileDevices.userId, input.userId), eq(mobileDevices.deviceId, deviceId)))
    .limit(1);

  const devicePatch: Partial<typeof mobileDevices.$inferInsert> = {
    platform,
    appVersion: input.appVersion ?? null,
    lastSeenAt: now,
    updatedAt: now,
    revokedAt: null,
  };

  if (input.pushToken !== undefined) devicePatch.pushToken = input.pushToken;
  if (input.pushProvider !== undefined) devicePatch.pushProvider = input.pushProvider;
  if (input.pushEnabled !== undefined) devicePatch.pushEnabled = dbBoolean(input.pushEnabled);
  if (input.biometricCapable !== undefined) devicePatch.biometricCapable = dbBoolean(input.biometricCapable);
  if (input.biometricEnabled !== undefined) devicePatch.biometricEnabled = dbBoolean(input.biometricEnabled);
  if (input.notificationPreferences !== undefined) {
    devicePatch.notificationPreferences = input.notificationPreferences;
  }

  if (existing) {
    const [updated] = await db
      .update(mobileDevices)
      .set(devicePatch)
      .where(eq(mobileDevices.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(mobileDevices)
    .values({
      ...(!process.env.DATABASE_URL ? { id: randomUUID() } : {}),
      userId: input.userId,
      deviceId,
      platform,
      appVersion: input.appVersion ?? null,
      pushToken: input.pushToken ?? null,
      pushProvider: input.pushProvider ?? null,
      pushEnabled: dbBoolean(input.pushEnabled ?? false),
      biometricCapable: dbBoolean(input.biometricCapable ?? false),
      biometricEnabled: dbBoolean(input.biometricEnabled ?? false),
      notificationPreferences: input.notificationPreferences ?? {},
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

async function createMobileRefreshToken(input: {
  userId: string;
  deviceDbId: string;
  tokenFamilyId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await ensureLocalMobileTables();

  const refreshToken = generateRefreshToken();
  const tokenFamilyId = input.tokenFamilyId ?? randomUUID();
  const expiresAt = getRefreshTokenExpiry();

  const [record] = await db
    .insert(mobileRefreshTokens)
    .values({
      ...(!process.env.DATABASE_URL ? { id: randomUUID() } : {}),
      userId: input.userId,
      deviceDbId: input.deviceDbId,
      tokenHash: hashRefreshToken(refreshToken),
      tokenFamilyId,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: new Date(),
    })
    .returning();

  return {
    record,
    refreshToken,
    expiresAt,
  };
}

export async function createMobileSession(input: MobileSessionRequest) {
  const device = await createOrUpdateMobileDevice(input);

  if (!input.keepSignedIn) {
    return {
      device,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    };
  }

  const token = await createMobileRefreshToken({
    userId: input.userId,
    deviceDbId: device.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    device,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.expiresAt,
  };
}

async function revokeTokenFamily(tokenFamilyId: string, userId?: string) {
  const now = new Date();
  await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(mobileRefreshTokens.tokenFamilyId, tokenFamilyId),
        userId ? eq(mobileRefreshTokens.userId, userId) : undefined,
      ),
    );
}

export async function consumeMobileRefreshToken(input: {
  refreshToken: string;
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{
  user: User;
  device: MobileDevice;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}> {
  await ensureLocalMobileTables();

  const tokenHash = hashRefreshToken(input.refreshToken);
  const [record] = await db
    .select({
      token: mobileRefreshTokens,
      device: mobileDevices,
      user: users,
    })
    .from(mobileRefreshTokens)
    .innerJoin(mobileDevices, eq(mobileRefreshTokens.deviceDbId, mobileDevices.id))
    .innerJoin(users, eq(mobileRefreshTokens.userId, users.id))
    .where(eq(mobileRefreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    throw new MobileSessionError(401, "Sessao mobile invalida");
  }

  if (record.token.rotatedAt || record.token.revokedAt) {
    await revokeTokenFamily(record.token.tokenFamilyId, record.token.userId);
    throw new MobileSessionError(401, "Sessao mobile ja utilizada. Entre novamente.");
  }

  if (isExpired(record.token.expiresAt)) {
    await db
      .update(mobileRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(mobileRefreshTokens.id, record.token.id));
    throw new MobileSessionError(401, "Sessao mobile expirada");
  }

  if (record.device.revokedAt) {
    await revokeTokenFamily(record.token.tokenFamilyId, record.token.userId);
    throw new MobileSessionError(401, "Dispositivo revogado. Entre novamente.");
  }

  if (input.deviceId && input.deviceId !== record.device.deviceId) {
    await revokeTokenFamily(record.token.tokenFamilyId, record.token.userId);
    throw new MobileSessionError(401, "Token nao pertence a este dispositivo");
  }

  if (record.user.status !== "active") {
    await revokeTokenFamily(record.token.tokenFamilyId, record.token.userId);
    throw new MobileSessionError(403, "Conta inativa ou pendente. Entre em contato com a coordenacao.");
  }

  const now = new Date();
  const [claimedToken] = await db
    .update(mobileRefreshTokens)
    .set({
      rotatedAt: now,
    })
    .where(and(
      eq(mobileRefreshTokens.id, record.token.id),
      isNull(mobileRefreshTokens.rotatedAt),
      isNull(mobileRefreshTokens.revokedAt),
    ))
    .returning();

  if (!claimedToken) {
    await revokeTokenFamily(record.token.tokenFamilyId, record.token.userId);
    throw new MobileSessionError(401, "Sessao mobile ja utilizada. Entre novamente.");
  }

  const nextToken = await createMobileRefreshToken({
    userId: record.user.id,
    deviceDbId: record.device.id,
    tokenFamilyId: record.token.tokenFamilyId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  await db
    .update(mobileRefreshTokens)
    .set({
      replacedByTokenId: nextToken.record.id,
    })
    .where(eq(mobileRefreshTokens.id, record.token.id));

  const [updatedDevice] = await db
    .update(mobileDevices)
    .set({
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(mobileDevices.id, record.device.id))
    .returning();

  return {
    user: record.user,
    device: updatedDevice ?? record.device,
    refreshToken: nextToken.refreshToken,
    refreshTokenExpiresAt: nextToken.expiresAt,
  };
}

export async function revokeMobileDeviceForUser(input: {
  userId: string;
  deviceDbId?: string;
  deviceId?: string;
}): Promise<boolean> {
  await ensureLocalMobileTables();

  const conditions = [
    eq(mobileDevices.userId, input.userId),
    input.deviceDbId ? eq(mobileDevices.id, input.deviceDbId) : undefined,
    input.deviceId ? eq(mobileDevices.deviceId, input.deviceId) : undefined,
  ];

  const [device] = await db
    .select()
    .from(mobileDevices)
    .where(and(...conditions))
    .limit(1);

  if (!device) return false;

  const now = new Date();
  await db
    .update(mobileDevices)
    .set({ revokedAt: now, updatedAt: now })
    .where(eq(mobileDevices.id, device.id));

  await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: now })
    .where(eq(mobileRefreshTokens.deviceDbId, device.id));

  return true;
}

export async function listMobileDevicesForUser(userId: string) {
  await ensureLocalMobileTables();

  return db
    .select()
    .from(mobileDevices)
    .where(eq(mobileDevices.userId, userId))
    .orderBy(desc(mobileDevices.lastSeenAt));
}
