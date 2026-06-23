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
    expect(mobileEndpoints.claimSubstitution("substitution/with slash"))
      .toBe("/substitutions/substitution%2Fwith%20slash/claim");
    expect(mobileEndpoints.notifications({ limit: 5 })).toBe("/notifications?limit=5");
    expect(mobileEndpoints.readNotification("notification/with slash"))
      .toBe("/notifications/notification%2Fwith%20slash/read");
    expect(mobileEndpoints.revokeDevice("device/with slash")).toBe("/devices/device%2Fwith%20slash");
    expect(mobileEndpoints.adminCommunityHome({ month: "2026-07" }))
      .toBe("/admin/community/home?month=2026-07");
    expect(mobileEndpoints.adminQuestionnaireResponses("questionnaire/with slash"))
      .toBe("/admin/questionnaires/questionnaire%2Fwith%20slash/responses");
    expect(mobileEndpoints.adminMinisters()).toBe("/admin/ministers");
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

  it("exposes mobile auth me and logout endpoints with device context", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: MobileFetch = async (input, init) => {
      requests.push({ input, init });

      if (input.endsWith("/auth/me")) {
        return new Response(JSON.stringify({
          success: true,
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
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        revoked: true,
      }), { status: 200 });
    };

    const client = new MescMobileApiClient({
      baseUrl: "https://example.test",
      accessToken: "access-token-1",
      communityId: "community-1",
      deviceId: "ios-device-1",
      platform: "ios",
      fetch: fetcher,
    });

    await client.getMe();
    await client.logout();

    expect(requests[0].input).toBe("https://example.test/api/mobile/v1/auth/me");
    expect(requests[0].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
    });

    expect(requests[1].input).toBe("https://example.test/api/mobile/v1/auth/logout");
    expect(requests[1].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Device-Id": "ios-device-1",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(requests[1].init.body))).toEqual({
      deviceId: "ios-device-1",
    });
  });

  it("delegates Idempotency-Key generation to the native UUID provider", () => {
    expect(createMobileIdempotencyKey(() => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))
      .toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("exposes notification and device endpoints through typed client methods", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: MobileFetch = async (input, init) => {
      requests.push({ input, init });

      if (input.endsWith("/notifications?limit=5")) {
        return new Response(JSON.stringify({
          success: true,
          notifications: [{
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            type: "schedule",
            eventKey: "schedule_published",
            title: "Escala publicada",
            message: "Confira sua escala.",
            priority: "normal",
            read: false,
            readAt: null,
            deepLink: "/dashboard",
            createdAt: "2026-06-21T12:00:00.000Z",
          }],
          unreadCount: 1,
        }), { status: 200 });
      }

      if (input.endsWith("/devices")) {
        return new Response(JSON.stringify({ success: true, devices: [] }), { status: 200 });
      }

      if (input.endsWith("/devices/current")) {
        return new Response(JSON.stringify({
          success: true,
          device: {
            id: "device-db-1",
            deviceId: "ios-device-1",
            platform: "ios",
            appVersion: "1.0.0",
            pushEnabled: true,
            pushProvider: "apns",
            biometricCapable: true,
            biometricEnabled: true,
            lastSeenAt: null,
            revokedAt: null,
            createdAt: null,
          },
        }), { status: 200 });
      }

      if (input.endsWith("/devices/device-db-1")) {
        return new Response(JSON.stringify({ success: true, revoked: true }), { status: 200 });
      }

      if (input.endsWith("/notifications/read-all")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        notification: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          read: true,
          readAt: "2026-06-21T12:05:00.000Z",
        },
      }), { status: 200 });
    };

    const client = new MescMobileApiClient({
      baseUrl: "https://example.test",
      accessToken: "access-token-1",
      communityId: "community-1",
      deviceId: "ios-device-1",
      platform: "ios",
      fetch: fetcher,
    });

    await expect(client.listNotifications({ limit: 5 })).resolves.toMatchObject({
      unreadCount: 1,
      notifications: [{ eventKey: "schedule_published" }],
    });
    await expect(client.markNotificationRead("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))
      .resolves.toMatchObject({ notification: { read: true } });
    await expect(client.markAllNotificationsRead()).resolves.toEqual({ success: true });
    await expect(client.listDevices()).resolves.toEqual({ success: true, devices: [] });
    await expect(client.updateCurrentDevice({
      pushToken: "push-token-1",
      pushProvider: "apns",
      pushEnabled: true,
      biometricCapable: true,
      biometricEnabled: true,
    })).resolves.toMatchObject({ device: { pushEnabled: true } });
    await expect(client.revokeDevice("device-db-1")).resolves.toEqual({ success: true, revoked: true });

    expect(requests.map((request) => [request.init.method, request.input])).toEqual([
      ["GET", "https://example.test/api/mobile/v1/notifications?limit=5"],
      ["PATCH", "https://example.test/api/mobile/v1/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read"],
      ["PATCH", "https://example.test/api/mobile/v1/notifications/read-all"],
      ["GET", "https://example.test/api/mobile/v1/devices"],
      ["PUT", "https://example.test/api/mobile/v1/devices/current"],
      ["DELETE", "https://example.test/api/mobile/v1/devices/device-db-1"],
    ]);
    expect(JSON.parse(String(requests[4].init.body))).toEqual({
      pushToken: "push-token-1",
      pushProvider: "apns",
      pushEnabled: true,
      biometricCapable: true,
      biometricEnabled: true,
    });
  });

  it("exposes coordinator dashboard, questionnaire responses and minister readiness endpoints", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: MobileFetch = async (input, init) => {
      requests.push({ input, init });

      if (input.endsWith("/admin/community/home?month=2026-07")) {
        return new Response(JSON.stringify({
          success: true,
          community: {
            id: "community-1",
            name: "Comunidade",
            slug: "comunidade",
            colorHex: "#722F37",
            parishName: "Paroquia",
            isMatriz: true,
          },
          month: "2026-07",
          metrics: {
            activeMinisters: 1,
            publishedAssignments: 0,
            pendingSubstitutions: 0,
            questionnaireResponses: 1,
            questionnairePending: 0,
            questionnaireTarget: 1,
            profileReady: 1,
            profileNeedsAttention: 0,
            profileBlocked: 0,
          },
          questionnaire: {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Disponibilidade Julho",
            responses: 1,
            pending: 0,
            target: 1,
            responseRate: 100,
            deepLink: "/admin/questionnaires/33333333-3333-4333-8333-333333333333/responses",
          },
          coverage: [],
          substitutions: [],
        }), { status: 200 });
      }

      if (input.endsWith("/admin/questionnaires/33333333-3333-4333-8333-333333333333/responses")) {
        return new Response(JSON.stringify({
          success: true,
          community: {
            id: "community-1",
            name: "Comunidade",
            slug: "comunidade",
            colorHex: "#722F37",
            parishName: "Paroquia",
            isMatriz: true,
          },
          questionnaire: {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Disponibilidade Julho",
            month: 7,
            year: 2026,
            status: "published",
            deadline: null,
            questions: [],
          },
          summary: {
            targetCount: 1,
            respondedCount: 1,
            pendingCount: 0,
            responseRate: 100,
            dataQuality: { ready: 1, needsAttention: 0, blocked: 0 },
          },
          ministers: [],
          responses: [],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        community: {
          id: "community-1",
          name: "Comunidade",
          slug: "comunidade",
          colorHex: "#722F37",
          parishName: "Paroquia",
          isMatriz: true,
        },
        summary: { total: 1, ready: 1, needsAttention: 0, blocked: 0 },
        ministers: [],
      }), { status: 200 });
    };

    const client = new MescMobileApiClient({
      baseUrl: "https://example.test",
      accessToken: "access-token-1",
      communityId: "community-1",
      deviceId: "ios-device-1",
      platform: "ios",
      fetch: fetcher,
    });

    await expect(client.getAdminCommunityHome({ month: "2026-07" }))
      .resolves.toMatchObject({ questionnaire: { responseRate: 100 } });
    await expect(client.getAdminQuestionnaireResponses("33333333-3333-4333-8333-333333333333"))
      .resolves.toMatchObject({ summary: { pendingCount: 0 } });
    await expect(client.listAdminMinisters())
      .resolves.toMatchObject({ summary: { ready: 1 } });

    expect(requests.map((request) => [request.init.method, request.input])).toEqual([
      ["GET", "https://example.test/api/mobile/v1/admin/community/home?month=2026-07"],
      ["GET", "https://example.test/api/mobile/v1/admin/questionnaires/33333333-3333-4333-8333-333333333333/responses"],
      ["GET", "https://example.test/api/mobile/v1/admin/ministers"],
    ]);
  });
});
