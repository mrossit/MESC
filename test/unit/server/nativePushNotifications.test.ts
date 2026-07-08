import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mobileNotificationData } from "../../../shared/mobileNotificationEvents";

type MockNativeDevice = {
  id: string;
  userId: string;
  platform: string;
  pushToken: string | null;
  pushProvider: string | null;
  notificationPreferences: Record<string, unknown> | null;
};

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

const http2Mock = vi.hoisted(() => ({
  connect: vi.fn(),
  requests: [] as Array<{ headers: Record<string, unknown>; body: string }>,
}));

const jwtMock = vi.hoisted(() => ({
  sign: vi.fn(() => "signed-apns-jwt"),
}));

vi.mock("../../../server/db", () => ({
  db: dbMock,
}));

vi.mock("http2", () => ({
  default: {
    connect: http2Mock.connect,
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: jwtMock.sign,
  },
}));

function setApnsEnvironment() {
  process.env.APNS_KEY_ID = "TESTKEYID";
  process.env.APNS_TEAM_ID = "TESTTEAMID";
  process.env.APNS_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----";
  process.env.APNS_BUNDLE_ID = "app.saojudastadeu.mesc";
}

function clearNativePushEnvironment() {
  delete process.env.APNS_KEY_ID;
  delete process.env.APNS_TEAM_ID;
  delete process.env.APNS_PRIVATE_KEY;
  delete process.env.APNS_BUNDLE_ID;
  delete process.env.IOS_BUNDLE_ID;
  delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.FCM_PROJECT_ID;
  delete process.env.FCM_CLIENT_EMAIL;
  delete process.env.FCM_PRIVATE_KEY;
}

function mockDevices(devices: MockNativeDevice[]) {
  const where = vi.fn().mockResolvedValue(devices);
  const from = vi.fn(() => ({ where }));
  dbMock.select.mockReturnValue({ from });

  return { from, where };
}

function mockApnsSuccess() {
  http2Mock.connect.mockImplementation(() => ({
    request: vi.fn((headers: Record<string, unknown>) => {
      const request = new EventEmitter() as EventEmitter & {
        setEncoding: ReturnType<typeof vi.fn>;
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };
      const sentRequest = { headers, body: "" };
      http2Mock.requests.push(sentRequest);

      request.setEncoding = vi.fn();
      request.write = vi.fn((chunk: string) => {
        sentRequest.body += chunk;
      });
      request.end = vi.fn(() => {
        request.emit("response", { ":status": 200 });
        request.emit("end");
      });

      return request;
    }),
    close: vi.fn(),
  }));
}

describe("nativePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    clearNativePushEnvironment();
    http2Mock.requests = [];
    mockApnsSuccess();
  });

  it("skips native delivery when APNS and FCM credentials are not configured", async () => {
    const { sendNativePushNotificationToUsers } = await import("../../../server/utils/nativePushNotifications");

    const result = await sendNativePushNotificationToUsers(["user-1"], {
      title: "Teste",
      body: "Mensagem",
    });

    expect(result).toEqual({ sent: 0, failed: 0, skipped: true });
    expect(dbMock.select).not.toHaveBeenCalled();
    expect(http2Mock.connect).not.toHaveBeenCalled();
  });

  it("respects event notification preferences before sending APNS notifications", async () => {
    setApnsEnvironment();
    mockDevices([
      {
        id: "device-opted-in",
        userId: "user-1",
        platform: "ios",
        pushToken: "apns-token-1",
        pushProvider: "apns",
        notificationPreferences: { schedule_published: true },
      },
      {
        id: "device-event-disabled",
        userId: "user-2",
        platform: "ios",
        pushToken: "apns-token-2",
        pushProvider: "apns",
        notificationPreferences: { schedule_published: false },
      },
      {
        id: "device-legacy-disabled",
        userId: "user-3",
        platform: "ios",
        pushToken: "apns-token-3",
        pushProvider: "apns",
        notificationPreferences: { schedules: false },
      },
      {
        id: "device-defaults-on",
        userId: "user-4",
        platform: "ios",
        pushToken: "apns-token-4",
        pushProvider: "apns",
        notificationPreferences: {},
      },
    ]);

    const { sendNativePushNotificationToUsers } = await import("../../../server/utils/nativePushNotifications");
    const result = await sendNativePushNotificationToUsers(
      ["user-1", "user-2", "user-3", "user-4"],
      {
        title: "Nova escala publicada",
        body: "A escala de julho esta disponivel.",
        data: mobileNotificationData("schedule_published", { month: "2026-07" }),
      },
    );

    expect(result).toEqual({ sent: 2, failed: 0, skipped: false });
    expect(http2Mock.requests).toHaveLength(2);
    expect(http2Mock.requests.map((request) => request.headers[":path"])).toEqual([
      "/3/device/apns-token-1",
      "/3/device/apns-token-4",
    ]);
  });

  it("lets event-specific preferences override legacy grouped preferences", async () => {
    setApnsEnvironment();
    mockDevices([
      {
        id: "device-event-enabled",
        userId: "user-1",
        platform: "ios",
        pushToken: "apns-token-1",
        pushProvider: "apns",
        notificationPreferences: {
          schedules: false,
          schedule_published: true,
        },
      },
    ]);

    const { sendNativePushNotificationToUsers } = await import("../../../server/utils/nativePushNotifications");
    const result = await sendNativePushNotificationToUsers(["user-1"], {
      title: "Nova escala publicada",
      body: "A escala de julho esta disponivel.",
      data: mobileNotificationData("schedule_published"),
    });

    expect(result).toEqual({ sent: 1, failed: 0, skipped: false });
    expect(http2Mock.requests).toHaveLength(1);
    expect(http2Mock.requests[0].body).toContain("Nova escala publicada");
  });

  it("does not filter notifications that do not declare a mobile event key", async () => {
    setApnsEnvironment();
    mockDevices([
      {
        id: "device-legacy-disabled",
        userId: "user-1",
        platform: "ios",
        pushToken: "apns-token-1",
        pushProvider: "apns",
        notificationPreferences: { schedules: false, announcements: false },
      },
    ]);

    const { sendNativePushNotificationToUsers } = await import("../../../server/utils/nativePushNotifications");
    const result = await sendNativePushNotificationToUsers(["user-1"], {
      title: "Aviso",
      body: "Mensagem operacional.",
      data: { source: "manual" },
    });

    expect(result).toEqual({ sent: 1, failed: 0, skipped: false });
    expect(http2Mock.requests).toHaveLength(1);
  });
});
