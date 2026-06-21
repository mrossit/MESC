import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredMobileAuthSession,
  getOrCreateMobileDeviceId,
  hasStoredMobileRefreshToken,
  MOBILE_AUTH_STORAGE_KEYS,
  mobileGetCurrentQuestionnaire,
  mobileSubmitQuestionnaireResponse,
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("calls questionnaire endpoints with mobile auth headers and idempotency", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        community: authResponse.communities[0],
        month: "2026-07",
        questionnaire: {
          id: "questionnaire-1",
          title: "Disponibilidade Julho",
          description: null,
          month: 7,
          year: 2026,
          status: "published",
          questions: [],
          deadline: null,
          responseStatus: "pending",
          response: null,
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        response: {
          id: "response-1",
          questionnaireId: "questionnaire-1",
          submittedAt: "2026-06-21T12:00:00.000Z",
          updatedAt: "2026-06-21T12:00:00.000Z",
          processingWarnings: [],
          unmappedResponses: [],
        },
      }), { status: 200 }));

    await expect(mobileGetCurrentQuestionnaire({ month: "2026-07" }))
      .resolves.toMatchObject({ questionnaire: { id: "questionnaire-1" } });

    await expect(mobileSubmitQuestionnaireResponse(
      "questionnaire-1",
      { responses: [{ questionId: "available_sundays", answer: ["Domingo 05/07"] }] },
      { idempotencyKey: "idem-1" },
    )).resolves.toMatchObject({ response: { id: "response-1" } });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/mobile/v1/questionnaires/current?month=2026-07",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/mobile/v1/questionnaires/questionnaire-1/response",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          responses: [{ questionId: "available_sundays", answer: ["Domingo 05/07"] }],
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "Idempotency-Key": "idem-1",
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
  });
});
