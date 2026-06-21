import { describe, expect, it } from "vitest";
import {
  buildMissionPendingActions,
  calculateScheduleUrgency,
  isLocalScheduleDateTimePast,
  parseMobileIdempotencyKey,
  parseJwtExpirySeconds,
  parseMobileMonth,
  resolveMobileCommunityScope,
  sanitizeMobileUser,
  toDateOnly,
} from "../../../server/services/mobileContractService";

describe("mobileContractService", () => {
  it("sanitizes mobile user payload without sensitive or admin-only fields", () => {
    const user = sanitizeMobileUser({
      id: "user-1",
      email: "ministro@example.com",
      name: "Ministro Teste",
      role: "ministro",
      homeCommunityId: "community-1",
      requiresPasswordChange: null,
      photoUrl: "/uploads/profile.png",
    });

    expect(user).toEqual({
      id: "user-1",
      email: "ministro@example.com",
      name: "Ministro Teste",
      role: "ministro",
      homeCommunityId: "community-1",
      requiresPasswordChange: false,
      photoUrl: "/uploads/profile.png",
    });
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("reliabilityScore");
    expect(user).not.toHaveProperty("observations");
  });

  it("parses mobile month into API date boundaries", () => {
    expect(parseMobileMonth("2026-02")).toEqual({
      year: 2026,
      month: 2,
      isoMonth: "2026-02",
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  it("falls back to current month when month is omitted", () => {
    const range = parseMobileMonth(undefined, new Date("2026-06-20T12:00:00Z"));

    expect(range.isoMonth).toBe("2026-06");
    expect(range.startDate).toBe("2026-06-01");
    expect(range.endDate).toBe("2026-06-30");
  });

  it("converts jwt expiry strings to seconds", () => {
    expect(parseJwtExpirySeconds("30m")).toBe(1800);
    expect(parseJwtExpirySeconds("24h")).toBe(86400);
    expect(parseJwtExpirySeconds("7d")).toBe(604800);
    expect(parseJwtExpirySeconds("900")).toBe(900);
    expect(parseJwtExpirySeconds("not-valid")).toBeNull();
  });

  it("builds pending actions for Minha Missao", () => {
    const actions = buildMissionPendingActions({
      questionnaire: {
        id: "questionnaire-1",
        title: "Disponibilidade de Junho",
        deadline: new Date("2026-06-25T12:00:00Z"),
      },
      substitution: {
        id: "substitution-1",
        status: "pending",
        scheduleId: "schedule-1",
      },
      unreadNoticesCount: 2,
    });

    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({
      id: "questionnaire-1",
      type: "questionnaire",
      priority: "high",
      deepLink: "/questionnaires/questionnaire-1",
    });
    expect(actions[1]).toMatchObject({
      id: "substitution-1",
      type: "substitution",
      priority: "high",
      deepLink: "/substitutions/substitution-1",
    });
    expect(actions[2]).toMatchObject({
      id: "notices-unread",
      type: "notice",
      priority: "normal",
      deepLink: "/notices",
    });
  });

  it("normalizes date-only strings without timezone drift", () => {
    expect(toDateOnly("2026-06-20")).toBe("2026-06-20");
    expect(toDateOnly("2026-06-20T03:00:00.000Z")).toBe("2026-06-20");
  });

  it("does not throw when local fallback returns invalid dates", async () => {
    const { toIsoDate } = await import("../../../server/services/mobileContractService");

    expect(toIsoDate(new Date("not-valid"))).toBeNull();
    expect(toDateOnly(new Date("not-valid"))).toBeNull();
  });

  it("classifies schedule urgency from local date and time", () => {
    const now = new Date(2026, 5, 20, 12, 0, 0);

    expect(calculateScheduleUrgency("2026-06-20", "20:00", now)).toBe("critical");
    expect(calculateScheduleUrgency("2026-06-21", "08:00", now)).toBe("high");
    expect(calculateScheduleUrgency("2026-06-22", "20:00", now)).toBe("medium");
    expect(calculateScheduleUrgency("2026-06-24", "20:00", now)).toBe("low");
  });

  it("detects past schedule datetimes using local calendar values", () => {
    const now = new Date(2026, 5, 20, 12, 0, 0);

    expect(isLocalScheduleDateTimePast("2026-06-20", "11:59", now)).toBe(true);
    expect(isLocalScheduleDateTimePast("2026-06-20", "12:01", now)).toBe(false);
  });

  it("accepts only UUID-formatted idempotency keys", () => {
    expect(parseMobileIdempotencyKey("  8A552C33-6EC1-4D72-9C1E-75D6AA79C899  "))
      .toBe("8a552c33-6ec1-4d72-9c1e-75d6aa79c899");
    expect(parseMobileIdempotencyKey(["8a552c33-6ec1-4d72-9c1e-75d6aa79c899"]))
      .toBe("8a552c33-6ec1-4d72-9c1e-75d6aa79c899");
    expect(parseMobileIdempotencyKey("not-a-uuid")).toBeNull();
    expect(parseMobileIdempotencyKey("")).toBeNull();
    expect(parseMobileIdempotencyKey(undefined)).toBeNull();
  });

  it("keeps community-scoped users inside their home community", () => {
    const user = {
      role: "ministro",
      homeCommunityId: "community-a",
    };

    expect(resolveMobileCommunityScope(user)).toEqual({
      allowed: true,
      activeCommunityId: "community-a",
      scope: "home",
    });

    expect(resolveMobileCommunityScope(user, "community-a")).toEqual({
      allowed: true,
      activeCommunityId: "community-a",
      scope: "home",
    });

    expect(resolveMobileCommunityScope(user, "community-b")).toEqual({
      allowed: false,
      status: 403,
      message: "Comunidade fora do escopo do usuario",
      scope: "home",
    });
  });

  it("allows parish-wide roles to select another active community", () => {
    expect(resolveMobileCommunityScope({
      role: "coordenador_paroquial",
      homeCommunityId: "community-a",
    }, "community-b")).toEqual({
      allowed: true,
      activeCommunityId: "community-b",
      scope: "parish",
    });

    expect(resolveMobileCommunityScope({
      role: "gestor",
      homeCommunityId: "community-a",
    })).toEqual({
      allowed: true,
      activeCommunityId: "community-a",
      scope: "parish",
    });
  });

  it("requires an explicit community when a parish-wide user has no home community", () => {
    expect(resolveMobileCommunityScope({
      role: "coordenador_paroquial",
      homeCommunityId: "",
    })).toEqual({
      allowed: false,
      status: 400,
      message: "Informe X-Community-Id para selecionar a comunidade ativa",
      scope: "parish",
    });
  });
});
