import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredMobileAuthSession,
  getOrCreateMobileDeviceId,
  hasStoredMobileRefreshToken,
  MOBILE_AUTH_STORAGE_KEYS,
  readStoredMobileAuthSession,
  storeMobileAuthResponse,
} from "../../../client/src/lib/mobile-auth-session";
import type { MobileAuthResponse } from "../../../shared/mobileClient";

const authResponse: MobileAuthResponse = {
  success: true,
  auth: {
    tokenType: "Bearer",
    accessToken: "access-token-1",
    refreshToken: "refresh-token-1",
    refreshTokenExpiresAt: "2026-07-21T00:00:00.000Z",
    sessionToken: "session-token-1",
    expiresInSeconds: 86400,
    keepSignedIn: true,
  },
  user: {
    id: "user-1",
    email: "ministro@example.test",
    name: "Ministro Demo",
    role: "ministro",
    homeCommunityId: "community-1",
    requiresPasswordChange: false,
    photoUrl: null,
  },
  communities: [{
    id: "community-1",
    name: "Comunidade Matriz",
    slug: "matriz",
    colorHex: "#8B0000",
    parishName: "Sao Judas Tadeu",
    isMatriz: true,
  }],
  activeCommunityId: "community-1",
  device: {
    id: "device-db-1",
    deviceId: "ios-device-1",
    platform: "ios",
    appVersion: "1.0.0",
    pushEnabled: false,
    pushProvider: null,
    biometricCapable: true,
    biometricEnabled: false,
    lastSeenAt: null,
    revokedAt: null,
    createdAt: null,
    registered: true,
  },
};

describe("mobile auth session storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores access, refresh, device and community data from mobile auth", () => {
    storeMobileAuthResponse(authResponse);

    expect(localStorage.getItem("token")).toBe("access-token-1");
    expect(localStorage.getItem("auth_token")).toBe("access-token-1");
    expect(localStorage.getItem("session_token")).toBe("session-token-1");
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken)).toBe("refresh-token-1");
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId)).toBe("community-1");
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.deviceId)).toBe("ios-device-1");
    expect(hasStoredMobileRefreshToken()).toBe(true);

    expect(readStoredMobileAuthSession()).toMatchObject({
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1",
      activeCommunityId: "community-1",
      deviceId: "ios-device-1",
    });
  });

  it("keeps device id stable and clears mobile secrets without removing the device id", () => {
    const firstDeviceId = getOrCreateMobileDeviceId();
    const secondDeviceId = getOrCreateMobileDeviceId();
    storeMobileAuthResponse(authResponse);

    clearStoredMobileAuthSession();

    expect(secondDeviceId).toBe(firstDeviceId);
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.deviceId)).toBe("ios-device-1");
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken)).toBeNull();
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId)).toBeNull();
  });
});
