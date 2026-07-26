import { describe, expect, it } from "vitest";
import {
  buildNativeFamilyImportPlan,
  normalizeHistoricalNotification,
  remapLegacyUserReferences,
} from "../../scripts/native-current-data-plan";

describe("native current data import plan", () => {
  it("creates deterministic family groups and reciprocal spouse links", () => {
    const rows = [
      { id: "rel-a", user_id: "minister-a", related_user_id: "minister-b", relationship_type: "spouse" },
      { id: "rel-b", user_id: "minister-b", related_user_id: "minister-a", relationship_type: "spouse" },
      { id: "rel-c", user_id: "minister-c", related_user_id: "minister-d", relationship_type: "mother" },
      { id: "rel-d", user_id: "minister-d", related_user_id: "minister-c", relationship_type: "daughter" },
    ];

    const first = buildNativeFamilyImportPlan(rows);
    const second = buildNativeFamilyImportPlan([...rows].reverse());

    expect(first.families).toEqual(second.families);
    expect(first.families).toHaveLength(2);
    expect(first.families.every((family) => family.prefer_serve_together === false)).toBe(true);
    expect(first.userLinks.find((link) => link.id === "minister-a")).toMatchObject({
      can_serve_as_couple: true,
      spouse_minister_id: "minister-b",
    });
    expect(first.userLinks.find((link) => link.id === "minister-c")).toMatchObject({
      can_serve_as_couple: false,
    });
  });

  it("rejects incomplete spouse links before they reach the native database", () => {
    expect(() => buildNativeFamilyImportPlan([
      { id: "rel-a", user_id: "minister-a", related_user_id: "minister-b", relationship_type: "spouse" },
    ])).toThrow("sem reciprocidade");
  });

  it("keeps legacy notifications as read historical inbox entries", () => {
    const notification = normalizeHistoricalNotification({
      id: "notice-a",
      user_id: "minister-a",
      type: "announcement",
      title: "Aviso antigo",
      message: "Historico",
      read: false,
      created_at: "2025-09-20T10:00:00.000Z",
      data: { category: "general" },
    });

    expect(notification.read).toBe(true);
    expect(notification.read_at).toBe("2025-09-20T10:00:00.000Z");
    expect(notification.data).toEqual({
      category: "general",
      migration: {
        source: "legacy-pwa-export",
        historical: true,
        sourceRead: false,
      },
    });
  });

  it("remaps every user reference when the native identity has a different ID", () => {
    const mapped = remapLegacyUserReferences({
      id: "legacy-questionnaire",
      user_id: "legacy-a",
      minister_id: "legacy-b",
      substitute_id: "legacy-c",
      created_by_id: "legacy-d",
      target_user_ids: ["legacy-a", "legacy-e"],
      notified_user_ids: ["legacy-b"],
      shared_with_family_ids: ["legacy-c"],
    }, new Map([
      ["legacy-a", "native-a"],
      ["legacy-b", "native-b"],
      ["legacy-c", "native-c"],
      ["legacy-d", "native-d"],
      ["legacy-e", "native-e"],
    ]));

    expect(mapped).toMatchObject({
      id: "legacy-questionnaire",
      user_id: "native-a",
      minister_id: "native-b",
      substitute_id: "native-c",
      created_by_id: "native-d",
      target_user_ids: ["native-a", "native-e"],
      notified_user_ids: ["native-b"],
      shared_with_family_ids: ["native-c"],
    });

    expect(remapLegacyUserReferences({ id: "legacy-a" }, new Map([["legacy-a", "native-a"]]), {
      remapRowId: true,
    })).toEqual({ id: "native-a" });
  });
});
