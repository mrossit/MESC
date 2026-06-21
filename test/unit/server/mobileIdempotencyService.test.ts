import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import {
  beginMobileIdempotency,
  buildMobileRequestFingerprint,
  completeMobileIdempotency,
  MobileIdempotencyError,
  releaseMobileIdempotency,
} from "../../../server/services/mobileIdempotencyService";

describe("mobileIdempotencyService", () => {
  it("builds stable request fingerprints regardless of object key order", () => {
    const first = buildMobileRequestFingerprint({
      method: "post",
      path: "/api/mobile/v1/substitutions",
      communityId: "community-a",
      body: {
        reason: "Nao poderei servir",
        scheduleId: "schedule-1",
      },
    });

    const second = buildMobileRequestFingerprint({
      method: "POST",
      path: "/api/mobile/v1/substitutions",
      communityId: "community-a",
      body: {
        scheduleId: "schedule-1",
        reason: "Nao poderei servir",
      },
    });

    expect(first).toHaveLength(64);
    expect(second).toBe(first);
  });

  it("stores completed responses for safe mobile retries", async () => {
    const userId = `user-${randomUUID()}`;
    const idempotencyKey = randomUUID();
    const requestHash = buildMobileRequestFingerprint({
      method: "POST",
      path: "/api/mobile/v1/questionnaires/questionnaire-1/response",
      communityId: "community-a",
      body: { responses: [{ questionId: "q1", answer: "sim" }] },
    });

    const started = await beginMobileIdempotency({
      userId,
      idempotencyKey,
      method: "POST",
      path: "/api/mobile/v1/questionnaires/questionnaire-1/response",
      requestHash,
    });

    expect(started.kind).toBe("started");
    if (started.kind !== "started") return;

    await completeMobileIdempotency({
      recordId: started.recordId,
      responseStatus: 200,
      responseBody: {
        success: true,
        response: { id: "response-1" },
      },
    });

    const replay = await beginMobileIdempotency({
      userId,
      idempotencyKey,
      method: "POST",
      path: "/api/mobile/v1/questionnaires/questionnaire-1/response",
      requestHash,
    });

    expect(replay).toEqual({
      kind: "replay",
      idempotencyKey,
      responseStatus: 200,
      responseBody: {
        success: true,
        response: { id: "response-1" },
      },
    });

    await releaseMobileIdempotency(started.recordId);
  });

  it("rejects an idempotency key reused for a different mutation", async () => {
    const userId = `user-${randomUUID()}`;
    const idempotencyKey = randomUUID();
    const firstHash = buildMobileRequestFingerprint({
      method: "POST",
      path: "/api/mobile/v1/substitutions",
      communityId: "community-a",
      body: { scheduleId: "schedule-1" },
    });
    const secondHash = buildMobileRequestFingerprint({
      method: "POST",
      path: "/api/mobile/v1/substitutions",
      communityId: "community-a",
      body: { scheduleId: "schedule-2" },
    });

    const started = await beginMobileIdempotency({
      userId,
      idempotencyKey,
      method: "POST",
      path: "/api/mobile/v1/substitutions",
      requestHash: firstHash,
    });

    expect(started.kind).toBe("started");

    await expect(beginMobileIdempotency({
      userId,
      idempotencyKey,
      method: "POST",
      path: "/api/mobile/v1/substitutions",
      requestHash: secondHash,
    })).rejects.toMatchObject({
      status: 409,
      message: "Idempotency-Key ja usado para outra mutacao",
    } satisfies Partial<MobileIdempotencyError>);

    if (started.kind === "started") {
      await releaseMobileIdempotency(started.recordId);
    }
  });

  it("rejects an identical retry while the first request is still in progress", async () => {
    const userId = `user-${randomUUID()}`;
    const idempotencyKey = randomUUID();
    const requestHash = buildMobileRequestFingerprint({
      method: "POST",
      path: "/api/mobile/v1/schedules/schedule-1/confirm",
      communityId: "community-a",
      body: { status: "confirmed" },
    });

    const started = await beginMobileIdempotency({
      userId,
      idempotencyKey,
      method: "POST",
      path: "/api/mobile/v1/schedules/schedule-1/confirm",
      requestHash,
    });

    await expect(beginMobileIdempotency({
      userId,
      idempotencyKey,
      method: "POST",
      path: "/api/mobile/v1/schedules/schedule-1/confirm",
      requestHash,
    })).rejects.toMatchObject({
      status: 409,
      message: "Mutacao identica ainda em processamento. Tente novamente em instantes.",
    } satisfies Partial<MobileIdempotencyError>);

    if (started.kind === "started") {
      await releaseMobileIdempotency(started.recordId);
    }
  });
});
