import { describe, expect, it } from "vitest";
import {
  extractMobileNotificationEventKey,
  MOBILE_NOTIFICATION_EVENT_DEFINITIONS,
  MOBILE_NOTIFICATION_EVENT_KEYS,
  mobileNotificationData,
} from "../../../shared/mobileNotificationEvents";
import { getMobileP0DemoData } from "../../fixtures/mobileP0DemoData";

describe("mobile notification events", () => {
  it("codifies the minimum MVP notification triggers", () => {
    expect(MOBILE_NOTIFICATION_EVENT_KEYS).toEqual([
      "questionnaire_published",
      "coordinator_announcement",
      "questionnaire_closed",
      "schedule_published",
      "substitution_requested",
      "sanctuary_event_published",
      "substitute_accepted",
      "formation_available",
      "schedule_reminder",
    ]);

    for (const eventKey of MOBILE_NOTIFICATION_EVENT_KEYS) {
      expect(MOBILE_NOTIFICATION_EVENT_DEFINITIONS[eventKey]).toMatchObject({
        eventKey,
        type: expect.any(String),
        defaultPriority: expect.any(String),
        defaultDeepLink: expect.stringMatching(/^\//),
      });
    }
  });

  it("builds and extracts event keys from notification data safely", () => {
    const data = mobileNotificationData("schedule_published", {
      month: "2026-07",
    });

    expect(data).toEqual({
      eventKey: "schedule_published",
      month: "2026-07",
    });
    expect(extractMobileNotificationEventKey(data)).toBe("schedule_published");
    expect(extractMobileNotificationEventKey(JSON.stringify(data))).toBe("schedule_published");
    expect(extractMobileNotificationEventKey({ eventKey: "unknown" })).toBeNull();
    expect(extractMobileNotificationEventKey("not-json")).toBeNull();
  });

  it("keeps the mobile demo seed covering every MVP event", () => {
    const demoEvents = new Set(
      getMobileP0DemoData().notifications.map((notification) =>
        extractMobileNotificationEventKey(notification.data),
      ),
    );

    expect([...demoEvents].sort()).toEqual([...MOBILE_NOTIFICATION_EVENT_KEYS].sort());
  });
});
