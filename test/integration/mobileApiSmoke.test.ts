import express from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "http";
import { seedMobileP0Demo } from "../../scripts/seed-mobile-p0-demo";
import { db } from "../../server/db";
import { users } from "../../shared/schema";
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

  it("runs login, refresh, mission, questionnaire, confirmation and substitution", async () => {
    const client = new MescMobileApiClient({
      baseUrl,
      deviceId: "mobile-smoke-ios-device",
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

    const questionnaire = await client.getCurrentQuestionnaire({ month: MOBILE_P0_DEMO_MONTH });
    expect(questionnaire.success).toBe(true);
    expect(questionnaire.questionnaire?.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireA);
    expect(questionnaire.questionnaire?.responseStatus).toBe("pending");

    const questionnaireResponse = await client.submitQuestionnaireResponse(
      MOBILE_P0_DEMO_IDS.questionnaireA,
      {
        responses: [
          {
            questionId: "q-availability",
            answer: ["2026-07-05", "2026-07-12"],
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
  });
});
