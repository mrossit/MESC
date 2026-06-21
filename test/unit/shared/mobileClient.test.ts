import { describe, expect, it } from "vitest";
import {
  createMobileIdempotencyKey,
  MescMobileApiClient,
  MescMobileApiError,
  mobileEndpoints,
  MOBILE_API_BASE_PATH,
  MOBILE_IDEMPOTENCY_HEADER,
  type MobileFetch,
} from "../../../shared/mobileClient";

describe("mobileClient contract", () => {
  it("builds stable mobile endpoint paths", () => {
    expect(MOBILE_API_BASE_PATH).toBe("/api/mobile/v1");
    expect(mobileEndpoints.appConfig({ platform: "ios" })).toBe("/app/config?platform=ios");
    expect(mobileEndpoints.currentQuestionnaire({ month: "2026-07" }))
      .toBe("/questionnaires/current?month=2026-07");
    expect(mobileEndpoints.submitQuestionnaire("questionnaire/with slash"))
      .toBe("/questionnaires/questionnaire%2Fwith%20slash/response");
    expect(mobileEndpoints.confirmSchedule("schedule-1")).toBe("/schedules/schedule-1/confirm");
  });

  it("sends native contract headers and stores auth state after login", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: MobileFetch = async (input, init) => {
      requests.push({ input, init });

      return new Response(JSON.stringify({
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
        communities: [],
        activeCommunityId: "community-1",
        device: {
          id: "device-db-1",
          deviceId: "ios-device-1",
          platform: "ios",
          appVersion: "1.0.0",
          pushEnabled: false,
          pushProvider: null,
          biometricCapable: false,
          biometricEnabled: false,
          lastSeenAt: null,
          revokedAt: null,
          createdAt: null,
          registered: true,
        },
      }), { status: 200 });
    };

    const client = new MescMobileApiClient({
      baseUrl: "https://example.test/",
      deviceId: "ios-device-1",
      platform: "ios",
      appVersion: "1.0.0",
      fetch: fetcher,
    });

    await client.login({
      email: "ministro@example.test",
      password: "MobileDemo123!",
      keepSignedIn: true,
    });

    await client.getMissionHome(
      { month: "2026-07" },
      {
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      },
    );

    expect(requests[0].input).toBe("https://example.test/api/mobile/v1/auth/login");
    expect(requests[0].init.headers).toMatchObject({
      "X-Device-Id": "ios-device-1",
      "X-Platform": "ios",
      "X-App-Version": "1.0.0",
    });

    expect(requests[1].input)
      .toBe("https://example.test/api/mobile/v1/mission/home?month=2026-07");
    expect(requests[1].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
      [MOBILE_IDEMPOTENCY_HEADER]: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("normalizes API errors with retry hints", async () => {
    const fetcher: MobileFetch = async () =>
      new Response(JSON.stringify({
        success: false,
        message: "Mutacao identica ainda em processamento. Tente novamente em instantes.",
      }), { status: 409 });

    const client = new MescMobileApiClient({
      baseUrl: "https://example.test",
      accessToken: "access-token-1",
      fetch: fetcher,
    });

    await expect(client.requestSubstitution(
      { scheduleId: "55555555-5555-4555-8555-555555555555" },
      { idempotencyKey: "11111111-1111-4111-8111-111111111111" },
    )).rejects.toMatchObject({
      name: "MescMobileApiError",
      status: 409,
      retryable: true,
    } satisfies Partial<MescMobileApiError>);
  });

  it("delegates Idempotency-Key generation to the native UUID provider", () => {
    expect(createMobileIdempotencyKey(() => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))
      .toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
