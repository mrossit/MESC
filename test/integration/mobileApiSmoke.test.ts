import express from "express";
import { randomUUID } from "crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "http";
import { seedMobileP0Demo } from "../../scripts/seed-mobile-p0-demo";
import { db } from "../../server/db";
import {
  massTimesConfig,
  questionnaireResponses,
  questionnaires,
  schedules,
  substitutionRequests,
  users,
} from "../../shared/schema";
import {
  MOBILE_P0_DEMO_IDS,
  MOBILE_P0_DEMO_MONTH,
  MOBILE_P0_DEMO_PASSWORD,
} from "../fixtures/mobileP0DemoData";
import {
  createMobileIdempotencyKey,
  MescMobileApiClient,
} from "../../shared/mobileClient";

const describeWithLocalDatabase = process.env.DATABASE_URL ? describe.skip : describe;

describeWithLocalDatabase("mobile API MVP smoke flow", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "mobile-api-smoke-test-secret";
    await seedMobileP0Demo();

    const [{ default: mobileRoutes }] = await Promise.all([
      import("../../server/routes/mobile"),
    ]);

    const app = express();
    app.use(express.json());
    app.use("/api/mobile/v1", mobileRoutes);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind mobile API smoke server");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (!server) return;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it("runs login, refresh, mission, notifications, questionnaire, confirmation and substitution", async () => {
    const ministerDeviceId = `mobile-smoke-ios-device-${randomUUID()}`;
    const substituteDeviceId = `mobile-smoke-substitute-ios-device-${randomUUID()}`;
    const client = new MescMobileApiClient({
      baseUrl,
      deviceId: ministerDeviceId,
      platform: "ios",
      appVersion: "1.0.0-smoke",
    });

    const login = await client.login({
      email: "mobile.ministro.a@example.test",
      password: MOBILE_P0_DEMO_PASSWORD,
      keepSignedIn: true,
    });

    expect(login.success).toBe(true);
    expect(login.auth.accessToken).toEqual(expect.any(String));
    expect(login.auth.refreshToken).toEqual(expect.any(String));
    expect(login.activeCommunityId).toBe(MOBILE_P0_DEMO_IDS.communityA);

    const currentDevice = await client.getCurrentDevice();
    expect(currentDevice.success).toBe(true);
    expect(currentDevice.device).toMatchObject({
      deviceId: ministerDeviceId,
      pushEnabled: false,
      notificationPreferences: {},
    });

    const updatedDevice = await client.updateCurrentDevice({
      pushEnabled: true,
      notificationPreferences: {
        emailNotifications: true,
        reminderHours: 24,
        schedules: true,
        questionnaires: true,
        substitutions: true,
        announcements: true,
      },
    });

    expect(updatedDevice.success).toBe(true);
    expect(updatedDevice.device).toMatchObject({
      deviceId: ministerDeviceId,
      pushEnabled: true,
      notificationPreferences: {
        emailNotifications: true,
        reminderHours: 24,
      },
    });

    const mergedDevicePreferences = await client.updateCurrentDevice({
      notificationPreferences: {
        schedules: false,
      },
    });

    expect(mergedDevicePreferences.success).toBe(true);
    expect(mergedDevicePreferences.device).toMatchObject({
      deviceId: ministerDeviceId,
      pushEnabled: true,
      notificationPreferences: {
        emailNotifications: true,
        reminderHours: 24,
        schedules: false,
      },
    });

    const refresh = await client.refresh({
      refreshToken: login.auth.refreshToken!,
    });

    expect(refresh.success).toBe(true);
    expect(refresh.auth.accessToken).toEqual(expect.any(String));
    expect(refresh.auth.refreshToken).toEqual(expect.any(String));
    expect(refresh.auth.refreshToken).not.toBe(login.auth.refreshToken);

    await expect(client.refresh({
      refreshToken: login.auth.refreshToken!,
    })).rejects.toMatchObject({
      status: 401,
      retryable: false,
    });

    await db
      .update(users)
      .set({
        requiresPasswordChange: 1 as any,
        photoUrl: "https://example.test/mobile-demo-photo.jpg",
      })
      .where(eq(users.id, MOBILE_P0_DEMO_IDS.ministerA));

    const me = await client.getMe();
    expect(me.success).toBe(true);
    expect(me.user.requiresPasswordChange).toBe(true);
    expect(me.user.photoUrl).toBe("https://example.test/mobile-demo-photo.jpg");

    await db
      .update(users)
      .set({
        requiresPasswordChange: 0 as any,
        photoUrl: null,
      })
      .where(eq(users.id, MOBILE_P0_DEMO_IDS.ministerA));

    const mission = await client.getMissionHome({ month: MOBILE_P0_DEMO_MONTH });
    expect(mission.success).toBe(true);
    expect(mission.community.id).toBe(MOBILE_P0_DEMO_IDS.communityA);
    expect(mission.nextMission?.id).toBe(MOBILE_P0_DEMO_IDS.scheduleA);

    const monthlySchedules = await client.getSchedulesMonth({ month: MOBILE_P0_DEMO_MONTH });
    expect(monthlySchedules.success).toBe(true);
    expect(monthlySchedules.publicSchedule.exportFormats).toEqual(["html", "pdf", "excel"]);
    const publicScheduleAFromMonth = monthlySchedules.publicSchedule.assignments.find((item) =>
      item.scheduleId === MOBILE_P0_DEMO_IDS.scheduleA
    );
    expect(publicScheduleAFromMonth).toMatchObject({
      scheduleId: MOBILE_P0_DEMO_IDS.scheduleA,
      ministerId: MOBILE_P0_DEMO_IDS.ministerA,
      source: "schedule",
      isCurrentUser: true,
    });
    const publicScheduleIdsFromMonth = monthlySchedules.publicSchedule.assignments.map((item) => item.scheduleId);
    expect(publicScheduleIdsFromMonth).toContain(MOBILE_P0_DEMO_IDS.scheduleAForSubstitution);
    expect(publicScheduleIdsFromMonth).not.toContain(MOBILE_P0_DEMO_IDS.scheduleB);

    const scheduleAFromMonth = monthlySchedules.schedules.find((item) =>
      item.id === MOBILE_P0_DEMO_IDS.scheduleA
    );
    expect(scheduleAFromMonth).toMatchObject({
      id: MOBILE_P0_DEMO_IDS.scheduleA,
      confirmationStatus: null,
      canConfirm: true,
      canRequestSubstitution: false,
    });
    const scheduleOpenForSubstitutionFromMonth = monthlySchedules.schedules.find((item) =>
      item.id === MOBILE_P0_DEMO_IDS.scheduleAForSubstitution
    );
    expect(scheduleOpenForSubstitutionFromMonth).toMatchObject({
      id: MOBILE_P0_DEMO_IDS.scheduleAForSubstitution,
      canRequestSubstitution: true,
    });

    const missionFromPreviousMonth = await client.getMissionHome({ month: "2026-06" });
    expect(missionFromPreviousMonth.success).toBe(true);
    expect(missionFromPreviousMonth.pendingActions).toContainEqual(
      expect.objectContaining({
        id: MOBILE_P0_DEMO_IDS.questionnaireA,
        type: "questionnaire",
        deepLink: "/questionnaire",
      }),
    );

    const notificationList = await client.listNotifications({ limit: 1 });
    expect(notificationList.success).toBe(true);
    expect(notificationList.unreadCount).toBe(1);
    expect(notificationList.notifications.map((item) => item.id))
      .toEqual([MOBILE_P0_DEMO_IDS.notificationAUnread]);
    expect(notificationList.notifications[0].eventKey).toBe("schedule_published");

    const readNotification = await client.markNotificationRead(MOBILE_P0_DEMO_IDS.notificationAUnread);
    expect(readNotification.success).toBe(true);
    expect(readNotification.notification.read).toBe(true);

    const notificationListAfterRead = await client.listNotifications({ limit: 5 });
    expect(notificationListAfterRead.unreadCount).toBe(0);
    expect(notificationListAfterRead.notifications.map((item) => item.id))
      .not.toContain(MOBILE_P0_DEMO_IDS.notificationBUnread);

    await expect(client.markAllNotificationsRead()).resolves.toEqual({ success: true });

    const questionnaire = await client.getCurrentQuestionnaire({ month: MOBILE_P0_DEMO_MONTH });
    expect(questionnaire.success).toBe(true);
    expect(questionnaire.questionnaire?.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireA);
    expect(questionnaire.questionnaire?.responseStatus).toBe("pending");

    const questionnaireFromPreviousMonth = await client.getCurrentQuestionnaire({ month: "2026-06" });
    expect(questionnaireFromPreviousMonth.success).toBe(true);
    expect(questionnaireFromPreviousMonth.month).toBe(MOBILE_P0_DEMO_MONTH);
    expect(questionnaireFromPreviousMonth.questionnaire?.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireA);

    const questionnaireResponse = await client.submitQuestionnaireResponse(
      MOBILE_P0_DEMO_IDS.questionnaireA,
      {
        responses: [
          {
            questionId: "monthly_availability",
            answer: "Sim",
          },
          {
            questionId: "available_sundays",
            answer: ["Domingo 05/07", "Domingo 12/07"],
          },
          {
            questionId: "main_service_time",
            answer: "10:00",
          },
        ],
      },
      { idempotencyKey: createMobileIdempotencyKey(randomUUID) },
    );

    expect(questionnaireResponse.success).toBe(true);
    expect(questionnaireResponse.response.questionnaireId)
      .toBe(MOBILE_P0_DEMO_IDS.questionnaireA);

    const confirmation = await client.confirmSchedule(
      MOBILE_P0_DEMO_IDS.scheduleA,
      { status: "confirmed", notes: "Smoke MVP mobile" },
      { idempotencyKey: createMobileIdempotencyKey(randomUUID) },
    );

    expect(confirmation.success).toBe(true);
    expect(confirmation.confirmation.status).toBe("confirmed");
    expect(confirmation.schedule.id).toBe(MOBILE_P0_DEMO_IDS.scheduleA);

    const monthlySchedulesAfterConfirmation = await client.getSchedulesMonth({ month: MOBILE_P0_DEMO_MONTH });
    const confirmedScheduleFromMonth = monthlySchedulesAfterConfirmation.schedules.find((item) =>
      item.id === MOBILE_P0_DEMO_IDS.scheduleA
    );
    expect(confirmedScheduleFromMonth).toMatchObject({
      id: MOBILE_P0_DEMO_IDS.scheduleA,
      confirmationStatus: "confirmed",
      canConfirm: false,
    });

    const smokeClaimScheduleId = "10101010-1010-4010-8010-101010101010";
    await db.delete(substitutionRequests).where(eq(substitutionRequests.scheduleId, smokeClaimScheduleId));
    await db.delete(schedules).where(eq(schedules.id, smokeClaimScheduleId));
    await db.insert(schedules).values({
      id: smokeClaimScheduleId,
      communityId: MOBILE_P0_DEMO_IDS.communityA,
      date: "2026-07-19",
      time: "15:00",
      type: "missa",
      location: "Igreja Matriz",
      ministerId: MOBILE_P0_DEMO_IDS.ministerA,
      position: 3,
      status: "published",
      notes: "Escala isolada para smoke de aceite de substituicao",
      createdAt: new Date("2026-06-21T12:00:00.000Z"),
    });

    const claimableSubstitution = await client.requestSubstitution(
      {
        scheduleId: smokeClaimScheduleId,
        reason: "Smoke test de aceite",
      },
      { idempotencyKey: createMobileIdempotencyKey(randomUUID) },
    );

    expect(claimableSubstitution.success).toBe(true);
    expect(claimableSubstitution.substitution.status).toBe("available");

    const substituteClient = new MescMobileApiClient({
      baseUrl,
      deviceId: substituteDeviceId,
      platform: "ios",
      appVersion: "1.0.0-smoke",
    });

    const substituteLogin = await substituteClient.login({
      email: "mobile.coord.a@example.test",
      password: MOBILE_P0_DEMO_PASSWORD,
      keepSignedIn: true,
    });

    expect(substituteLogin.success).toBe(true);
    expect(substituteLogin.activeCommunityId).toBe(MOBILE_P0_DEMO_IDS.communityA);

    const coordinatorHome = await substituteClient.getAdminCommunityHome({ month: MOBILE_P0_DEMO_MONTH });
    expect(coordinatorHome.success).toBe(true);
    expect(coordinatorHome.questionnaire).toMatchObject({
      id: MOBILE_P0_DEMO_IDS.questionnaireA,
      month: 7,
      year: 2026,
      responses: 1,
      pending: 0,
      target: 1,
      responseRate: 100,
    });

    const coordinatorHomeFromPreviousMonth = await substituteClient.getAdminCommunityHome({ month: "2026-06" });
    expect(coordinatorHomeFromPreviousMonth.month).toBe(MOBILE_P0_DEMO_MONTH);
    expect(coordinatorHomeFromPreviousMonth.questionnaire).toMatchObject({
      id: MOBILE_P0_DEMO_IDS.questionnaireA,
      month: 7,
      year: 2026,
      responses: 1,
    });
    expect(coordinatorHome.metrics).toMatchObject({
      questionnaireResponses: 1,
      questionnairePending: 0,
      questionnaireTarget: 1,
      profileBlocked: 0,
    });

    const coordinatorResponses = await substituteClient.getAdminQuestionnaireResponses(
      MOBILE_P0_DEMO_IDS.questionnaireA,
    );
    expect(coordinatorResponses.success).toBe(true);
    expect(coordinatorResponses.summary).toMatchObject({
      targetCount: 1,
      respondedCount: 1,
      pendingCount: 0,
      responseRate: 100,
      dataQuality: {
        ready: 0,
        needsAttention: 1,
        blocked: 0,
      },
    });
    expect(coordinatorResponses.ministers).toHaveLength(1);
    expect(coordinatorResponses.ministers[0]).toMatchObject({
      id: MOBILE_P0_DEMO_IDS.ministerA,
      responded: true,
      availability: "Disponivel",
      dataQuality: {
        status: "needs_attention",
      },
    });
    expect(coordinatorResponses.responses[0]).toMatchObject({
      userId: MOBILE_P0_DEMO_IDS.ministerA,
      canSubstitute: false,
      preferredMassTimes: ["10:00"],
      dataQuality: {
        status: "needs_attention",
      },
    });

    const reminderIdempotencyKey = createMobileIdempotencyKey(randomUUID);
    const questionnaireReminder = await substituteClient.sendAdminQuestionnaireReminders(
      MOBILE_P0_DEMO_IDS.questionnaireA,
      { target: "data_quality" },
      { idempotencyKey: reminderIdempotencyKey },
    );

    expect(questionnaireReminder.success).toBe(true);
    expect(questionnaireReminder.reminder).toMatchObject({
      target: "data_quality",
      deliveredCount: 1,
      recipientCount: 1,
      skippedCount: 0,
      recipients: [{
        id: MOBILE_P0_DEMO_IDS.ministerA,
        responded: true,
        dataQualityStatus: "needs_attention",
      }],
    });
    expect(questionnaireReminder.reminder.recipients[0].notificationId)
      .toEqual(expect.any(String));

    await expect(substituteClient.sendAdminQuestionnaireReminders(
      MOBILE_P0_DEMO_IDS.questionnaireA,
      { target: "data_quality" },
      { idempotencyKey: reminderIdempotencyKey },
    )).resolves.toEqual(questionnaireReminder);

    const notificationsAfterReminder = await client.listNotifications({ limit: 5 });
    expect(notificationsAfterReminder.unreadCount).toBe(1);
    expect(notificationsAfterReminder.notifications[0]).toMatchObject({
      eventKey: "coordinator_announcement",
      type: "reminder",
      deepLink: "/questionnaire",
      read: false,
    });

    const coordinatorMinisters = await substituteClient.listAdminMinisters();
    expect(coordinatorMinisters.success).toBe(true);
    expect(coordinatorMinisters.summary).toMatchObject({
      total: 3,
      blocked: 0,
    });
    expect(coordinatorMinisters.ministers.map((minister) => minister.id))
      .toEqual([
        MOBILE_P0_DEMO_IDS.ministerA,
        MOBILE_P0_DEMO_IDS.coordinatorA,
        MOBILE_P0_DEMO_IDS.parishCoordinator,
      ]);

    const claimedSubstitution = await substituteClient.claimSubstitution(
      claimableSubstitution.substitution.id,
      { message: "Aceito pelo smoke mobile" },
      { idempotencyKey: createMobileIdempotencyKey(randomUUID) },
    );

    expect(claimedSubstitution.success).toBe(true);
    expect(claimedSubstitution.substitution.status).toBe("approved");
    expect(claimedSubstitution.substitution.substitute?.id).toBe(MOBILE_P0_DEMO_IDS.coordinatorA);

    const [claimedSchedule] = await db
      .select({
        ministerId: schedules.ministerId,
        substituteId: schedules.substituteId,
      })
      .from(schedules)
      .where(eq(schedules.id, smokeClaimScheduleId))
      .limit(1);

    expect(claimedSchedule.ministerId).toBe(MOBILE_P0_DEMO_IDS.coordinatorA);
    expect(claimedSchedule.substituteId).toBe(MOBILE_P0_DEMO_IDS.ministerA);

    const substitution = await client.requestSubstitution(
      {
        scheduleId: MOBILE_P0_DEMO_IDS.scheduleAForSubstitution,
        reason: "Smoke test de substituicao",
      },
      { idempotencyKey: createMobileIdempotencyKey(randomUUID) },
    );

    expect(substitution.success).toBe(true);
    expect(substitution.substitution.scheduleId)
      .toBe(MOBILE_P0_DEMO_IDS.scheduleAForSubstitution);
    expect(substitution.substitution.status).toBe("available");
    expect(substitution.substitution.requester?.id).toBe(MOBILE_P0_DEMO_IDS.ministerA);

    const substitutions = await client.listSubstitutions();
    expect(substitutions.success).toBe(true);
    expect(substitutions.substitutions.some((item) =>
      item.id === substitution.substitution.id &&
      item.requester?.id === MOBILE_P0_DEMO_IDS.ministerA,
    )).toBe(true);

    const smokePublishQuestionnaireId = "20260705-2026-4000-8000-000000000001";
    const smokePublishResponseId = "20260705-2026-4000-8000-000000000002";
    const smokePublishTimestamp = new Date("2026-06-29T12:00:00.000Z");

    await db
      .delete(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, smokePublishQuestionnaireId));
    await db
      .delete(questionnaires)
      .where(eq(questionnaires.id, smokePublishQuestionnaireId));

    const [sourceQuestionnaire] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, MOBILE_P0_DEMO_IDS.questionnaireA))
      .limit(1);
    const [sourceResponse] = await db
      .select()
      .from(questionnaireResponses)
      .where(and(
        eq(questionnaireResponses.questionnaireId, MOBILE_P0_DEMO_IDS.questionnaireA),
        eq(questionnaireResponses.userId, MOBILE_P0_DEMO_IDS.ministerA),
      ))
      .limit(1);

    if (!sourceQuestionnaire || !sourceResponse) {
      throw new Error("Smoke publish setup failed: source questionnaire response not found");
    }

    await db.insert(questionnaires).values({
      ...sourceQuestionnaire,
      id: smokePublishQuestionnaireId,
      title: "Disponibilidade Julho - Smoke Publish",
      status: "closed",
      deadline: smokePublishTimestamp,
      createdAt: smokePublishTimestamp,
      updatedAt: smokePublishTimestamp,
    } as any);
    await db.insert(questionnaireResponses).values({
      ...sourceResponse,
      id: smokePublishResponseId,
      questionnaireId: smokePublishQuestionnaireId,
      submittedAt: smokePublishTimestamp,
      updatedAt: smokePublishTimestamp,
    } as any);

    await db
      .delete(substitutionRequests)
      .where(eq(substitutionRequests.communityId, MOBILE_P0_DEMO_IDS.communityB));
    await db
      .delete(schedules)
      .where(eq(schedules.communityId, MOBILE_P0_DEMO_IDS.communityB));
    await db
      .delete(massTimesConfig)
      .where(eq(massTimesConfig.communityId, MOBILE_P0_DEMO_IDS.communityA));
    await db.insert(massTimesConfig).values({
      id: "20260705-0000-4000-8000-000000000001",
      communityId: MOBILE_P0_DEMO_IDS.communityA,
      dayOfWeek: 0,
      time: "08:00",
      minMinisters: 1,
      maxMinisters: 1,
      isActive: 1 as any,
      specialEvent: 0 as any,
      eventName: null,
      createdAt: new Date("2026-06-28T12:00:00.000Z"),
      updatedAt: new Date("2026-06-28T12:00:00.000Z"),
    });

    const publishIdempotencyKey = createMobileIdempotencyKey(randomUUID);
    const publishedSchedule = await substituteClient.publishAdminSchedule(
      { month: MOBILE_P0_DEMO_MONTH, replaceExisting: true },
      { idempotencyKey: publishIdempotencyKey },
    );

    expect(publishedSchedule.success).toBe(true);
    expect(publishedSchedule.community.id).toBe(MOBILE_P0_DEMO_IDS.communityA);
    expect(publishedSchedule.summary.publishedAssignments).toBeGreaterThan(0);
    expect(publishedSchedule.summary.replacedSchedules).toBeGreaterThan(0);
    expect(publishedSchedule.summary.notificationsQueued).toBeGreaterThan(0);

    await expect(substituteClient.publishAdminSchedule(
      { month: MOBILE_P0_DEMO_MONTH, replaceExisting: true },
      { idempotencyKey: publishIdempotencyKey },
    )).resolves.toEqual(publishedSchedule);

    await db
      .delete(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, smokePublishQuestionnaireId));
    await db
      .delete(questionnaires)
      .where(eq(questionnaires.id, smokePublishQuestionnaireId));

    const publishedRows = await db
      .select({
        communityId: schedules.communityId,
        status: schedules.status,
      })
      .from(schedules)
      .where(and(
        eq(schedules.communityId, MOBILE_P0_DEMO_IDS.communityA),
        gte(schedules.date, "2026-07-01"),
        lte(schedules.date, "2026-07-31"),
      ));

    expect(publishedRows.length).toBe(publishedSchedule.summary.publishedAssignments);
    expect(publishedRows.every((row) => row.communityId === MOBILE_P0_DEMO_IDS.communityA)).toBe(true);
    expect(publishedRows.every((row) => row.status === "published")).toBe(true);
  });
});
