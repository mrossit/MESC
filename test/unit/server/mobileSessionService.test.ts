import { describe, expect, it } from "vitest";
import type { MobileDevice } from "../../../shared/schema";
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  isExpired,
  normalizeMobilePlatform,
  sanitizeMobileDevice,
} from "../../../server/services/mobileSessionService";

describe("mobileSessionService", () => {
  it("generates opaque refresh tokens with stable hashes", () => {
    const tokenA = generateRefreshToken();
    const tokenB = generateRefreshToken();

    expect(tokenA).toMatch(/^mesc_rt_/);
    expect(tokenB).toMatch(/^mesc_rt_/);
    expect(tokenA).not.toBe(tokenB);
    expect(hashRefreshToken(tokenA)).toHaveLength(64);
    expect(hashRefreshToken(tokenA)).toBe(hashRefreshToken(tokenA));
    expect(hashRefreshToken(tokenA)).not.toBe(hashRefreshToken(tokenB));
  });

  it("sets refresh token expiry to 30 days", () => {
    const now = new Date("2026-06-20T12:00:00Z");
    const expiresAt = getRefreshTokenExpiry(now);

    expect(expiresAt.toISOString()).toBe("2026-07-20T12:00:00.000Z");
  });

  it("detects expired dates from Date or string values", () => {
    const now = new Date("2026-06-20T12:00:00Z");

    expect(isExpired(new Date("2026-06-20T11:59:59Z"), now)).toBe(true);
    expect(isExpired("2026-06-20T12:00:00Z", now)).toBe(true);
    expect(isExpired("2026-06-20T12:00:01Z", now)).toBe(false);
  });

  it("normalizes mobile platform values conservatively", () => {
    expect(normalizeMobilePlatform("ios")).toBe("ios");
    expect(normalizeMobilePlatform("android")).toBe("android");
    expect(normalizeMobilePlatform("web")).toBe("unknown");
    expect(normalizeMobilePlatform(undefined)).toBe("unknown");
  });

  it("sanitizes device payload without exposing push token", () => {
    const sanitized = sanitizeMobileDevice({
      id: "device-db-1",
      userId: "user-1",
      deviceId: "device-local-1",
      platform: "ios",
      appVersion: "1.0.0",
      pushToken: "secret-push-token",
      pushProvider: "apns",
      pushEnabled: true,
      notificationPreferences: {},
      biometricCapable: true,
      biometricEnabled: false,
      lastSeenAt: new Date("2026-06-20T12:00:00Z"),
      revokedAt: null,
      createdAt: new Date("2026-06-19T12:00:00Z"),
      updatedAt: new Date("2026-06-20T12:00:00Z"),
    } as MobileDevice);

    expect(sanitized).toEqual({
      id: "device-db-1",
      deviceId: "device-local-1",
      platform: "ios",
      appVersion: "1.0.0",
      pushEnabled: true,
      pushProvider: "apns",
      biometricCapable: true,
      biometricEnabled: false,
      lastSeenAt: "2026-06-20T12:00:00.000Z",
      revokedAt: null,
      createdAt: "2026-06-19T12:00:00.000Z",
    });
    expect(sanitized).not.toHaveProperty("pushToken");
    expect(sanitized).not.toHaveProperty("userId");
  });
});
