import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "http";
import { seedMobileP0Demo } from "../../scripts/seed-mobile-p0-demo";
import {
  getMobileP0DemoData,
  MOBILE_P0_DEMO_IDS,
  MOBILE_P0_DEMO_MONTH,
} from "../fixtures/mobileP0DemoData";

const describeWithLocalDatabase = process.env.DATABASE_URL ? describe.skip : describe;

describeWithLocalDatabase("mobile API community scope integration", () => {
  const demo = getMobileP0DemoData();
  let server: Server;
  let baseUrl: string;
  let generateToken: (user: {
    id: string;
    email: string;
    name: string;
    role: string;
    homeCommunityId: string;
  }) => string;

  function tokenFor(userId: string) {
    const user = demo.users.find((item) => item.id === userId);
    if (!user) throw new Error(`Unknown demo user: ${userId}`);

    return generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      homeCommunityId: user.homeCommunityId,
    });
  }

  async function mobileGet(path: string, input: {
    userId: string;
    communityId?: string;
  }) {
    const response = await fetch(`${baseUrl}/api/mobile/v1${path}`, {
      headers: {
        Authorization: `Bearer ${tokenFor(input.userId)}`,
        ...(input.communityId ? { "X-Community-Id": input.communityId } : {}),
      },
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = "mobile-api-community-scope-test-secret";
    await seedMobileP0Demo();

    const [{ default: mobileRoutes }, auth] = await Promise.all([
      import("../../server/routes/mobile"),
      import("../../server/auth"),
    ]);
    generateToken = auth.generateToken;

    const app = express();
    app.use(express.json());
    app.use("/api/mobile/v1", mobileRoutes);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind mobile API test server");
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

  it("keeps a minister inside the home community for schedules", async () => {
    const allowed = await mobileGet(`/schedules/month?month=${MOBILE_P0_DEMO_MONTH}`, {
      userId: MOBILE_P0_DEMO_IDS.ministerA,
    });

    expect(allowed.status).toBe(200);
    const visibleScheduleIds = allowed.body.schedules.map((schedule: { id: string }) => schedule.id);
    expect(visibleScheduleIds).toContain(MOBILE_P0_DEMO_IDS.scheduleA);
    expect(visibleScheduleIds).toContain(MOBILE_P0_DEMO_IDS.scheduleAForSubstitution);
    expect(visibleScheduleIds).not.toContain(MOBILE_P0_DEMO_IDS.scheduleB);

    const forbidden = await mobileGet(`/schedules/month?month=${MOBILE_P0_DEMO_MONTH}`, {
      userId: MOBILE_P0_DEMO_IDS.ministerA,
      communityId: MOBILE_P0_DEMO_IDS.communityB,
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.message).toBe("Comunidade fora do escopo do usuario");
  });

  it("prevents a community coordinator from reading another community", async () => {
    const allowed = await mobileGet("/admin/ministers", {
      userId: MOBILE_P0_DEMO_IDS.coordinatorA,
      communityId: MOBILE_P0_DEMO_IDS.communityA,
    });

    expect(allowed.status).toBe(200);
    const visibleIds = allowed.body.ministers.map((minister: { id: string }) => minister.id);
    expect(visibleIds).toContain(MOBILE_P0_DEMO_IDS.ministerA);
    expect(visibleIds).not.toContain(MOBILE_P0_DEMO_IDS.ministerB);

    const forbidden = await mobileGet("/admin/ministers", {
      userId: MOBILE_P0_DEMO_IDS.coordinatorA,
      communityId: MOBILE_P0_DEMO_IDS.communityB,
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.message).toBe("Comunidade fora do escopo do usuario");

    const forbiddenResponses = await mobileGet(
      `/admin/questionnaires/${MOBILE_P0_DEMO_IDS.questionnaireB}/responses`,
      {
        userId: MOBILE_P0_DEMO_IDS.coordinatorA,
        communityId: MOBILE_P0_DEMO_IDS.communityB,
      },
    );

    expect(forbiddenResponses.status).toBe(403);
    expect(forbiddenResponses.body.message).toBe("Comunidade fora do escopo do usuario");
  });

  it("allows a parish coordinator to switch active community without leaking the previous one", async () => {
    const response = await mobileGet("/admin/ministers", {
      userId: MOBILE_P0_DEMO_IDS.parishCoordinator,
      communityId: MOBILE_P0_DEMO_IDS.communityB,
    });

    expect(response.status).toBe(200);
    expect(response.body.community.id).toBe(MOBILE_P0_DEMO_IDS.communityB);
    const visibleIds = response.body.ministers.map((minister: { id: string }) => minister.id);
    expect(visibleIds).toContain(MOBILE_P0_DEMO_IDS.ministerB);
    expect(visibleIds).not.toContain(MOBILE_P0_DEMO_IDS.ministerA);
  });

  it("returns the questionnaire only for the active community", async () => {
    const communityA = await mobileGet(`/questionnaires/current?month=${MOBILE_P0_DEMO_MONTH}`, {
      userId: MOBILE_P0_DEMO_IDS.ministerA,
    });

    expect(communityA.status).toBe(200);
    expect(communityA.body.community.id).toBe(MOBILE_P0_DEMO_IDS.communityA);
    expect(communityA.body.questionnaire.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireA);

    const communityB = await mobileGet(`/questionnaires/current?month=${MOBILE_P0_DEMO_MONTH}`, {
      userId: MOBILE_P0_DEMO_IDS.parishCoordinator,
      communityId: MOBILE_P0_DEMO_IDS.communityB,
    });

    expect(communityB.status).toBe(200);
    expect(communityB.body.community.id).toBe(MOBILE_P0_DEMO_IDS.communityB);
    expect(communityB.body.questionnaire.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireB);

    const communityAFallback = await mobileGet("/questionnaires/current?month=2026-06", {
      userId: MOBILE_P0_DEMO_IDS.ministerA,
    });

    expect(communityAFallback.status).toBe(200);
    expect(communityAFallback.body.month).toBe(MOBILE_P0_DEMO_MONTH);
    expect(communityAFallback.body.community.id).toBe(MOBILE_P0_DEMO_IDS.communityA);
    expect(communityAFallback.body.questionnaire.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireA);

    const communityBFallback = await mobileGet("/questionnaires/current?month=2026-06", {
      userId: MOBILE_P0_DEMO_IDS.parishCoordinator,
      communityId: MOBILE_P0_DEMO_IDS.communityB,
    });

    expect(communityBFallback.status).toBe(200);
    expect(communityBFallback.body.month).toBe(MOBILE_P0_DEMO_MONTH);
    expect(communityBFallback.body.community.id).toBe(MOBILE_P0_DEMO_IDS.communityB);
    expect(communityBFallback.body.questionnaire.id).toBe(MOBILE_P0_DEMO_IDS.questionnaireB);
  });

  it("does not leak substitution requests across communities", async () => {
    const response = await mobileGet("/substitutions", {
      userId: MOBILE_P0_DEMO_IDS.ministerA,
    });

    expect(response.status).toBe(200);
    expect(response.body.community.id).toBe(MOBILE_P0_DEMO_IDS.communityA);
    const visibleSubstitutionIds = response.body.substitutions.map((substitution: { id: string }) => substitution.id);
    expect(visibleSubstitutionIds).toContain(MOBILE_P0_DEMO_IDS.substitutionA);
    expect(visibleSubstitutionIds).not.toContain(MOBILE_P0_DEMO_IDS.substitutionB);
  });
});
