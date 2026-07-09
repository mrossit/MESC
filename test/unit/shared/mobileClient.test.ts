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
    expect(mobileEndpoints.biometricSession()).toBe("/auth/biometric-session");
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
    expect(mobileEndpoints.account()).toBe("/account");
    expect(mobileEndpoints.formationOverview()).toBe("/formation/overview");
    expect(mobileEndpoints.formationLesson("track/with slash", "module/with slash", 3))
      .toBe("/formation/track%2Fwith%20slash/module%2Fwith%20slash/3");
    expect(mobileEndpoints.completeFormationLesson("lesson/with slash"))
      .toBe("/formation/lessons/lesson%2Fwith%20slash/complete");
    expect(mobileEndpoints.formationAdminStudio()).toBe("/formation/admin/studio");
    expect(mobileEndpoints.formationAdminLessons()).toBe("/formation/admin/lessons");
    expect(mobileEndpoints.formationAdminLesson("lesson/with slash"))
      .toBe("/formation/admin/lessons/lesson%2Fwith%20slash");
    expect(mobileEndpoints.formationAdminLessonSections("lesson/with slash"))
      .toBe("/formation/admin/lessons/lesson%2Fwith%20slash/sections");
    expect(mobileEndpoints.adminCommunityHome({ month: "2026-07" }))
      .toBe("/admin/community/home?month=2026-07");
    expect(mobileEndpoints.adminScheduleReadiness({ month: "2026-07" }))
      .toBe("/admin/schedules/readiness?month=2026-07");
    expect(mobileEndpoints.adminScheduleGeneratePreview())
      .toBe("/admin/schedules/generate-preview");
    expect(mobileEndpoints.adminSchedulePublish())
      .toBe("/admin/schedules/publish");
    expect(mobileEndpoints.adminQuestionnaireResponses("questionnaire/with slash"))
      .toBe("/admin/questionnaires/questionnaire%2Fwith%20slash/responses");
    expect(mobileEndpoints.adminQuestionnaireReminders("questionnaire/with slash"))
      .toBe("/admin/questionnaires/questionnaire%2Fwith%20slash/reminders");
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
          notificationPreferences: {},
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

  it("calls formation endpoints with native auth and idempotency", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: MobileFetch = async (input, init) => {
      requests.push({ input, init });

      if (input.endsWith("/formation/overview")) {
        return new Response(JSON.stringify({
          success: true,
          overview: {
            tracks: [],
            summary: {
              totalTracks: 0,
              totalModules: 0,
              totalLessons: 0,
              completedLessons: 0,
              inProgressLessons: 0,
              percentageCompleted: 0,
              lastUpdated: "2026-07-01T00:00:00.000Z",
            },
          },
        }), { status: 200 });
      }

      if (input.endsWith("/formation/track-1/module-1/2")) {
        return new Response(JSON.stringify({
          success: true,
          lesson: {
            id: "lesson-2",
            moduleId: "module-1",
            trackId: "track-1",
            title: "Rito da comunhao",
            description: null,
            lessonNumber: 2,
            estimatedDuration: 12,
            contentType: "text",
            contentUrl: null,
            videoUrl: null,
            documentUrl: null,
          },
          sections: [],
          progress: {
            status: "in_progress",
            progressPercentage: 40,
            timeSpent: 5,
            completedSections: [],
          },
        }), { status: 200 });
      }

      if (input.endsWith("/formation/admin/studio")) {
        return new Response(JSON.stringify({
          success: true,
          community: {
            id: "community-1",
            name: "Sao Judas",
            slug: "sao-judas",
            colorHex: "#8B0000",
            parishName: "Santuario Sao Judas Tadeu",
            isMatriz: true,
          },
          studio: {
            tracks: [],
            summary: {
              totalTracks: 0,
              totalModules: 0,
              totalLessons: 0,
              activeLessons: 0,
              videoLessons: 0,
              lastUpdated: "2026-07-01T00:00:00.000Z",
            },
          },
        }), { status: 200 });
      }

      if (input.endsWith("/formation/admin/lessons") || input.endsWith("/formation/admin/lessons/lesson-2")) {
        return new Response(JSON.stringify({
          success: true,
          lesson: {
            id: "lesson-2",
            moduleId: "module-1",
            trackId: "track-1",
            title: "Rito da comunhao",
            description: "Aula atualizada",
            orderIndex: 2,
            lessonNumber: 2,
            estimatedDuration: 12,
            isActive: true,
            videoUrl: "https://video.example/rito",
            documentUrl: null,
            sectionsCount: 1,
            updatedAt: "2026-07-01T00:00:00.000Z",
          },
          sections: [],
        }), { status: input.endsWith("/formation/admin/lessons") ? 201 : 200 });
      }

      if (input.endsWith("/formation/admin/lessons/lesson-2/sections")) {
        return new Response(JSON.stringify({
          success: true,
          section: { id: "section-1" },
          lesson: {
            id: "lesson-2",
            moduleId: "module-1",
            trackId: "track-1",
            title: "Rito da comunhao",
            description: "Aula atualizada",
            orderIndex: 2,
            lessonNumber: 2,
            estimatedDuration: 12,
            isActive: true,
            videoUrl: "https://video.example/rito",
            documentUrl: null,
            sectionsCount: 1,
            updatedAt: "2026-07-01T00:00:00.000Z",
          },
          sections: [],
        }), { status: 201 });
      }

      return new Response(JSON.stringify({
        success: true,
        progress: {
          status: "completed",
          progressPercentage: 100,
          timeSpent: 5,
          completedSections: ["section-1"],
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

    await client.getFormationOverview();
    await client.getFormationLesson({ trackId: "track-1", moduleId: "module-1", lessonNumber: 2 });
    await client.completeFormationLesson("lesson-2", {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });
    await client.getFormationAdminStudio();
    await client.createFormationAdminLesson({
      moduleId: "77777777-7777-4777-8777-777777777777",
      title: "Nova aula",
      sectionContent: "Conteudo",
      videoUrl: "https://video.example/aula",
    }, {
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    });
    await client.updateFormationAdminLesson("lesson-2", { title: "Aula atualizada" }, {
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    });
    await client.createFormationAdminSection("lesson-2", { title: "Novo conteúdo", content: "Texto" }, {
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
    });

    expect(requests[0].input).toBe("https://example.test/api/mobile/v1/formation/overview");
    expect(requests[0].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
    });

    expect(requests[1].input).toBe("https://example.test/api/mobile/v1/formation/track-1/module-1/2");
    expect(requests[1].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
    });

    expect(requests[2].input).toBe("https://example.test/api/mobile/v1/formation/lessons/lesson-2/complete");
    expect(requests[2].init.method).toBe("POST");
    expect(requests[2].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
      [MOBILE_IDEMPOTENCY_HEADER]: "11111111-1111-4111-8111-111111111111",
      "Content-Type": "application/json",
    });

    expect(requests[3].input).toBe("https://example.test/api/mobile/v1/formation/admin/studio");
    expect(requests[3].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
    });

    expect(requests[4].input).toBe("https://example.test/api/mobile/v1/formation/admin/lessons");
    expect(requests[4].init.method).toBe("POST");
    expect(requests[4].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
      [MOBILE_IDEMPOTENCY_HEADER]: "22222222-2222-4222-8222-222222222222",
      "Content-Type": "application/json",
    });

    expect(requests[5].input).toBe("https://example.test/api/mobile/v1/formation/admin/lessons/lesson-2");
    expect(requests[5].init.method).toBe("PATCH");
    expect(requests[5].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
      [MOBILE_IDEMPOTENCY_HEADER]: "33333333-3333-4333-8333-333333333333",
      "Content-Type": "application/json",
    });

    expect(requests[6].input).toBe("https://example.test/api/mobile/v1/formation/admin/lessons/lesson-2/sections");
    expect(requests[6].init.method).toBe("POST");
    expect(requests[6].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Community-Id": "community-1",
      "X-Device-Id": "ios-device-1",
      [MOBILE_IDEMPOTENCY_HEADER]: "44444444-4444-4444-8444-444444444444",
      "Content-Type": "application/json",
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
    await client.deleteAccount({
      confirmation: "EXCLUIR MINHA CONTA",
      password: "MobileDemo123!",
    });

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

    expect(requests[2].input).toBe("https://example.test/api/mobile/v1/account");
    expect(requests[2].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Device-Id": "ios-device-1",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(requests[2].init.body))).toEqual({
      confirmation: "EXCLUIR MINHA CONTA",
      password: "MobileDemo123!",
    });
  });

  it("creates a biometric mobile session with auth and device context", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: MobileFetch = async (input, init) => {
      requests.push({ input, init });

      return new Response(JSON.stringify({
        success: true,
        auth: {
          tokenType: "Bearer",
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
          refreshTokenExpiresAt: "2026-07-21T00:00:00.000Z",
          sessionToken: "session-token-2",
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
          notificationPreferences: {},
          biometricCapable: true,
          biometricEnabled: true,
          lastSeenAt: null,
          revokedAt: null,
          createdAt: null,
          registered: true,
        },
      }), { status: 200 });
    };

    const client = new MescMobileApiClient({
      baseUrl: "https://example.test",
      accessToken: "access-token-1",
      deviceId: "ios-device-1",
      platform: "ios",
      appVersion: "1.0.0",
      fetch: fetcher,
    });

    await client.createBiometricSession();

    expect(requests[0].input).toBe("https://example.test/api/mobile/v1/auth/biometric-session");
    expect(requests[0].init.headers).toMatchObject({
      Authorization: "Bearer access-token-1",
      "X-Device-Id": "ios-device-1",
      "X-Platform": "ios",
      "X-App-Version": "1.0.0",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(requests[0].init.body))).toEqual({
      deviceId: "ios-device-1",
      platform: "ios",
      appVersion: "1.0.0",
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
            notificationPreferences: {
              emailNotifications: true,
              reminderHours: 24,
            },
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
    await expect(client.getCurrentDevice()).resolves.toMatchObject({
      device: {
        pushEnabled: true,
        notificationPreferences: {
          emailNotifications: true,
          reminderHours: 24,
        },
      },
    });
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
      ["GET", "https://example.test/api/mobile/v1/devices/current"],
      ["PUT", "https://example.test/api/mobile/v1/devices/current"],
      ["DELETE", "https://example.test/api/mobile/v1/devices/device-db-1"],
    ]);
    expect(JSON.parse(String(requests[5].init.body))).toEqual({
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
            month: 7,
            year: 2026,
            responses: 1,
            pending: 0,
            target: 1,
            responseRate: 100,
            deepLink: "/questionnaire-responses",
          },
          coverage: [],
          substitutions: [],
        }), { status: 200 });
      }

      if (input.endsWith("/admin/schedules/readiness?month=2026-07")) {
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
          readiness: {
            canPreview: true,
            canPublish: false,
            blockers: [],
            publishBlockers: ["Questionario precisa estar encerrado para publicacao definitiva"],
            warnings: ["1 ministro(s) ainda nao responderam"],
          },
          ministers: {
            active: 12,
            ready: 10,
            needsAttention: 2,
            blocked: 0,
          },
          questionnaire: {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Disponibilidade Julho",
            month: 7,
            year: 2026,
            status: "published",
            deadline: null,
            targetCount: 12,
            responseCount: 11,
            pendingCount: 1,
            responseRate: 92,
          },
          massConfig: {
            configuredSlots: 3,
          },
          existingSchedules: {
            total: 0,
            draft: 0,
            scheduled: 0,
            published: 0,
            completed: 0,
          },
        }), { status: 200 });
      }

      if (input.endsWith("/admin/schedules/generate-preview")) {
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
          generatedAt: "2026-06-24T12:00:00.000Z",
          questionnaire: {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Disponibilidade Julho",
            month: 7,
            year: 2026,
            status: "published",
            responseCount: 11,
          },
          summary: {
            totalMasses: 1,
            totalAssignments: 2,
            totalVacancies: 0,
            averageConfidence: 88,
            lowConfidenceMasses: 0,
          },
          schedules: [{
            date: "2026-07-05",
            time: "10:00",
            type: "missa_dominical",
            displayName: "Missa Dominical",
            location: "Igreja Matriz",
            requiredMinisters: 2,
            maxMinisters: 2,
            assignedMinisters: 2,
            vacancies: 0,
            confidence: 88,
            status: "covered",
            ministers: [],
            backupMinisters: [],
          }],
        }), { status: 200 });
      }

      if (input.endsWith("/admin/schedules/publish")) {
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
          publishedAt: "2026-06-24T12:05:00.000Z",
          questionnaire: {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Disponibilidade Julho",
            month: 7,
            year: 2026,
            status: "closed",
            responseCount: 11,
          },
          summary: {
            totalMasses: 1,
            totalAssignments: 2,
            totalVacancies: 0,
            averageConfidence: 88,
            lowConfidenceMasses: 0,
            publishedAssignments: 2,
            notificationsQueued: 2,
            replacedSchedules: 0,
          },
          schedules: [],
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

      if (input.endsWith("/admin/questionnaires/33333333-3333-4333-8333-333333333333/reminders")) {
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
          },
          reminder: {
            target: "data_quality",
            dryRun: false,
            deliveredCount: 1,
            recipientCount: 1,
            skippedCount: 0,
            recipients: [{
              id: "user-1",
              name: "Ministro Demo",
              email: "ministro@example.test",
              responded: true,
              dataQualityStatus: "needs_attention",
              notificationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            }],
          },
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
    await expect(client.getAdminScheduleReadiness({ month: "2026-07" }))
      .resolves.toMatchObject({ readiness: { canPreview: true }, questionnaire: { responseRate: 92 } });
    await expect(client.generateAdminSchedulePreview({ month: "2026-07" }))
      .resolves.toMatchObject({ summary: { totalMasses: 1, averageConfidence: 88 } });
    await expect(client.publishAdminSchedule(
      { month: "2026-07", replaceExisting: false },
      { idempotencyKey: "22222222-2222-4222-8222-222222222222" },
    ))
      .resolves.toMatchObject({ summary: { publishedAssignments: 2, notificationsQueued: 2 } });
    await expect(client.getAdminQuestionnaireResponses("33333333-3333-4333-8333-333333333333"))
      .resolves.toMatchObject({ summary: { pendingCount: 0 } });
    await expect(client.sendAdminQuestionnaireReminders(
      "33333333-3333-4333-8333-333333333333",
      { target: "data_quality" },
      { idempotencyKey: "11111111-1111-4111-8111-111111111111" },
    )).resolves.toMatchObject({ reminder: { deliveredCount: 1 } });
    await expect(client.listAdminMinisters())
      .resolves.toMatchObject({ summary: { ready: 1 } });

    expect(requests.map((request) => [request.init.method, request.input])).toEqual([
      ["GET", "https://example.test/api/mobile/v1/admin/community/home?month=2026-07"],
      ["GET", "https://example.test/api/mobile/v1/admin/schedules/readiness?month=2026-07"],
      ["POST", "https://example.test/api/mobile/v1/admin/schedules/generate-preview"],
      ["POST", "https://example.test/api/mobile/v1/admin/schedules/publish"],
      ["GET", "https://example.test/api/mobile/v1/admin/questionnaires/33333333-3333-4333-8333-333333333333/responses"],
      ["POST", "https://example.test/api/mobile/v1/admin/questionnaires/33333333-3333-4333-8333-333333333333/reminders"],
      ["GET", "https://example.test/api/mobile/v1/admin/ministers"],
    ]);
    expect(JSON.parse(String(requests[2].init.body))).toEqual({
      month: "2026-07",
    });
    expect(requests[3].init.headers).toMatchObject({
      [MOBILE_IDEMPOTENCY_HEADER]: "22222222-2222-4222-8222-222222222222",
    });
    expect(JSON.parse(String(requests[3].init.body))).toEqual({
      month: "2026-07",
      replaceExisting: false,
    });
    expect(requests[5].init.headers).toMatchObject({
      [MOBILE_IDEMPOTENCY_HEADER]: "11111111-1111-4111-8111-111111111111",
    });
    expect(JSON.parse(String(requests[5].init.body))).toEqual({
      target: "data_quality",
    });
  });
});
