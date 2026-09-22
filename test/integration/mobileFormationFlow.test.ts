import express from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedMobileP0Demo } from "../../scripts/seed-mobile-p0-demo";
import { db } from "../../server/db";
import seedFormation from "../../server/seeds/formation-seed";
import { formationLessonProgress } from "../../shared/schema";
import { MescMobileApiClient } from "../../shared/mobileClient";
import {
  MOBILE_P0_DEMO_IDS,
  MOBILE_P0_DEMO_PASSWORD,
} from "../fixtures/mobileP0DemoData";

const describeWithPostgresDatabase =
  process.env.DATABASE_URL && process.env.MESC_MOBILE_E2E_DATABASE === "true"
    ? describe
    : describe.skip;

describeWithPostgresDatabase("mobile formation integration flow", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "mobile-formation-test-secret";
    await seedMobileP0Demo();
    await seedFormation();

    const { default: mobileRoutes } = await import("../../server/routes/mobile");
    const app = express();
    app.use(express.json());
    app.use("/api/mobile/v1", mobileRoutes);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind mobile formation test server");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("opens an official lesson, records section progress and completes the lesson", async () => {
    const client = new MescMobileApiClient({
      baseUrl,
      deviceId: `mobile-formation-ios-${randomUUID()}`,
      platform: "ios",
      appVersion: "formation-smoke",
    });

    const login = await client.login({
      email: "mobile.ministro.a@example.test",
      password: MOBILE_P0_DEMO_PASSWORD,
      keepSignedIn: true,
    });
    expect(login.success).toBe(true);

    const initialOverview = await client.getFormationOverview();
    const initialLesson = initialOverview.overview.tracks
      .flatMap((track) => track.modules)
      .flatMap((module) => module.lessons)[0];
    expect(initialLesson).toBeDefined();

    await db.delete(formationLessonProgress).where(
      and(
        eq(formationLessonProgress.userId, MOBILE_P0_DEMO_IDS.ministerA),
        eq(formationLessonProgress.lessonId, initialLesson.id),
      ),
    );

    const overview = await client.getFormationOverview();
    const track = overview.overview.tracks[0];
    const module = track.modules[0];
    const lesson = module.lessons[0];
    expect(lesson.progress.status).toBe("not_started");

    const detail = await client.getFormationLesson({
      trackId: track.id,
      moduleId: module.id,
      lessonNumber: lesson.lessonNumber,
    });
    expect(detail.lesson.id).toBe(lesson.id);
    expect(detail.sections.length).toBeGreaterThan(0);

    const firstSection = detail.sections[0];
    const sectionResult = await client.completeFormationLessonSection(lesson.id, firstSection.id, {
      idempotencyKey: randomUUID(),
    });
    expect(sectionResult.progress.completedSections).toContain(firstSection.id);

    const completionKey = randomUUID();
    const completed = await client.completeFormationLesson(lesson.id, {
      idempotencyKey: completionKey,
    });
    expect(completed.progress).toMatchObject({
      status: "completed",
      progressPercentage: 100,
    });

    const replayed = await client.completeFormationLesson(lesson.id, {
      idempotencyKey: completionKey,
    });
    expect(replayed).toEqual(completed);

    const finalOverview = await client.getFormationOverview();
    const finalLesson = finalOverview.overview.tracks
      .flatMap((item) => item.modules)
      .flatMap((item) => item.lessons)
      .find((item) => item.id === lesson.id);
    expect(finalLesson?.progress).toMatchObject({
      status: "completed",
      progressPercentage: 100,
    });
  });
});
