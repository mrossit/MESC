import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredMobileAuthSession,
  ensureMobileBiometricSession,
  getOrCreateMobileDeviceId,
  hasStoredMobileRefreshToken,
  MOBILE_AUTH_STORAGE_KEYS,
  mobileGetProfile,
  mobileGetAdminScheduleReadiness,
  mobileGetCurrentQuestionnaire,
  mobileListNotifications,
  mobileMarkAllNotificationsRead,
  mobileMarkNotificationRead,
  mobileListSubstitutions,
  mobilePublishAdminSchedule,
  refreshMobileAuthSession,
  mobileSendAdminQuestionnaireReminders,
  mobileSubmitQuestionnaireResponse,
  mobileUpdateProfile,
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

  it("stores rotated refresh and session tokens after a mobile refresh", async () => {
    localStorage.setItem("token", "expired-access-token");
    localStorage.setItem("auth_token", "expired-access-token");
    localStorage.setItem("session_token", "expired-session-token");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken, "refresh-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ...authResponse,
        auth: {
          ...authResponse.auth,
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
          sessionToken: "session-token-2",
        },
        device: {
          ...authResponse.device,
          biometricEnabled: true,
        },
      }), { status: 200 }));

    await expect(refreshMobileAuthSession()).resolves.toMatchObject({
      auth: {
        accessToken: "access-token-2",
        refreshToken: "refresh-token-2",
        sessionToken: "session-token-2",
      },
    });

    expect(localStorage.getItem("token")).toBe("access-token-2");
    expect(localStorage.getItem("auth_token")).toBe("access-token-2");
    expect(localStorage.getItem("session_token")).toBe("session-token-2");
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken)).toBe("refresh-token-2");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mobile/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          refreshToken: "refresh-token-1",
          deviceId: "ios-device-1",
        }),
      }),
    );
  });

  it("creates a biometric refresh session when password login did not keep the user signed in", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem("auth_token", "access-token-1");
    localStorage.setItem("session_token", "session-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ...authResponse,
        auth: {
          ...authResponse.auth,
          accessToken: "access-token-biometric",
          refreshToken: "refresh-token-biometric",
          sessionToken: "session-token-biometric",
          keepSignedIn: true,
        },
        device: {
          ...authResponse.device,
          biometricEnabled: true,
        },
      }), { status: 200 }));

    await expect(ensureMobileBiometricSession()).resolves.toMatchObject({
      accessToken: "access-token-biometric",
      refreshToken: "refresh-token-biometric",
      sessionToken: "session-token-biometric",
    });

    expect(localStorage.getItem("token")).toBe("access-token-biometric");
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken)).toBe("refresh-token-biometric");
    expect(localStorage.getItem("session_token")).toBe("session-token-biometric");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mobile/v1/auth/biometric-session",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "Content-Type": "application/json",
          "X-Device-Id": "ios-device-1",
        }),
        body: JSON.stringify({
          deviceId: "ios-device-1",
        }),
      }),
    );
  });

  it("clears expired access and refresh tokens when mobile refresh is rejected", async () => {
    localStorage.setItem("token", "expired-access-token");
    localStorage.setItem("auth_token", "expired-access-token");
    localStorage.setItem("session_token", "expired-session-token");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken, "expired-refresh-token");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.communities, JSON.stringify(authResponse.communities));
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.platform, "ios");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.appVersion, "1.0.0");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: false,
        message: "Sessao mobile expirada",
      }), { status: 401 }));

    await expect(refreshMobileAuthSession()).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("session_token")).toBeNull();
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken)).toBeNull();
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId)).toBeNull();
    expect(localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.deviceId)).toBe("ios-device-1");
    expect(hasStoredMobileRefreshToken()).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mobile/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });

  it("calls mobile contract endpoints with auth headers and idempotency", async () => {
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
        community: authResponse.communities[0],
        substitutions: [{
          id: "substitution-1",
          scheduleId: "schedule-1",
          requesterId: "user-1",
          substituteId: null,
          status: "available",
          reason: "Teste",
          urgency: "medium",
          responseMessage: null,
          schedule: {
            id: "schedule-1",
            date: "2026-07-05",
            time: "10:00",
            type: "Missa Dominical",
            location: "Igreja Matriz",
          },
          requester: {
            id: "user-1",
            name: "Ministro Demo",
            email: "ministro@example.test",
            photoUrl: null,
          },
          substitute: null,
          deepLink: "/schedules/substitutions",
          createdAt: "2026-06-21T12:00:00.000Z",
          updatedAt: "2026-06-21T12:00:00.000Z",
        }],
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

    await expect(mobileListSubstitutions())
      .resolves.toMatchObject({
        substitutions: [{
          id: "substitution-1",
          requester: { name: "Ministro Demo" },
        }],
      });

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
      "/api/mobile/v1/substitutions",
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
      3,
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

  it("loads and updates mobile profile through the mobile contract", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const profile = {
      id: "user-1",
      email: "ministro@example.test",
      name: "Ministro Demo",
      phone: null,
      whatsapp: null,
      role: "ministro",
      status: "active",
      photoUrl: null,
      homeCommunityId: "community-1",
      scheduleDisplayName: null,
      ministryStartDate: null,
      maritalStatus: null,
      preferredPosition: null,
      preferredPositions: [],
      avoidPositions: [],
      preferredTimes: [],
      availableForSpecialEvents: false,
      extraActivities: {},
      requiresPasswordChange: false,
      createdAt: null,
      updatedAt: null,
    };

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        profile,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        profile: {
          ...profile,
          phone: "11999999999",
          scheduleDisplayName: "M. Demo",
        },
      }), { status: 200 }));

    await expect(mobileGetProfile())
      .resolves.toMatchObject({ profile: { id: "user-1" } });
    await expect(mobileUpdateProfile({
      phone: "11999999999",
      scheduleDisplayName: "M. Demo",
    })).resolves.toMatchObject({
      profile: {
        phone: "11999999999",
        scheduleDisplayName: "M. Demo",
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/mobile/v1/profile",
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
      "/api/mobile/v1/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          phone: "11999999999",
          scheduleDisplayName: "M. Demo",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "Content-Type": "application/json",
          "Idempotency-Key": expect.any(String),
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
  });

  it("loads and marks mobile notifications through the mobile contract", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
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
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        notification: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          read: true,
          readAt: "2026-06-21T12:05:00.000Z",
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await expect(mobileListNotifications({ limit: 5 }))
      .resolves.toMatchObject({
        unreadCount: 1,
        notifications: [{ eventKey: "schedule_published" }],
      });
    await expect(mobileMarkNotificationRead("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))
      .resolves.toMatchObject({ notification: { read: true } });
    await expect(mobileMarkAllNotificationsRead())
      .resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/mobile/v1/notifications?limit=5",
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
      "/api/mobile/v1/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/mobile/v1/notifications/read-all",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
  });

  it("loads coordinator schedule readiness through the mobile contract", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        community: authResponse.communities[0],
        month: "2026-07",
        readiness: {
          canPreview: true,
          canPublish: false,
          blockers: [],
          publishBlockers: ["Questionario precisa estar encerrado para publicacao definitiva"],
          warnings: [],
        },
        ministers: {
          active: 12,
          ready: 10,
          needsAttention: 2,
          blocked: 0,
        },
        questionnaire: {
          id: "questionnaire-1",
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
      }), { status: 200 }));

    await expect(mobileGetAdminScheduleReadiness({ month: "2026-07" }))
      .resolves.toMatchObject({
        readiness: { canPreview: true },
        questionnaire: { responseRate: 92 },
      });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/mobile/v1/admin/schedules/readiness?month=2026-07",
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
  });

  it("publishes coordinator schedules with mobile idempotency", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        community: authResponse.communities[0],
        month: "2026-07",
        publishedAt: "2026-06-24T12:05:00.000Z",
        questionnaire: {
          id: "questionnaire-1",
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
      }), { status: 200 }));

    await expect(mobilePublishAdminSchedule(
      { month: "2026-07", replaceExisting: false },
      { idempotencyKey: "22222222-2222-4222-8222-222222222222" },
    )).resolves.toMatchObject({
      summary: {
        publishedAssignments: 2,
        notificationsQueued: 2,
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/mobile/v1/admin/schedules/publish",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ month: "2026-07", replaceExisting: false }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "Content-Type": "application/json",
          "Idempotency-Key": "22222222-2222-4222-8222-222222222222",
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
  });

  it("sends coordinator questionnaire reminders with idempotency", async () => {
    localStorage.setItem("token", "access-token-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, "community-1");
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, "ios-device-1");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        community: authResponse.communities[0],
        questionnaire: {
          id: "questionnaire-1",
          title: "Disponibilidade Julho",
          month: 7,
          year: 2026,
          status: "published",
          deadline: null,
        },
        reminder: {
          target: "pending_questionnaire",
          dryRun: false,
          deliveredCount: 1,
          recipientCount: 1,
          skippedCount: 0,
          recipients: [{
            id: "user-1",
            name: "Ministro Demo",
            email: "ministro@example.test",
            responded: false,
            dataQualityStatus: "needs_attention",
            notificationId: "notification-1",
          }],
        },
      }), { status: 200 }));

    await expect(mobileSendAdminQuestionnaireReminders(
      "questionnaire-1",
      { target: "pending_questionnaire" },
      { idempotencyKey: "11111111-2222-4333-8444-555555555555" },
    )).resolves.toMatchObject({
      reminder: {
        deliveredCount: 1,
        recipients: [{ id: "user-1" }],
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/mobile/v1/admin/questionnaires/questionnaire-1/reminders",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ target: "pending_questionnaire" }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
          "Content-Type": "application/json",
          "Idempotency-Key": "11111111-2222-4333-8444-555555555555",
          "X-Community-Id": "community-1",
          "X-Device-Id": "ios-device-1",
        }),
      }),
    );
  });
});
