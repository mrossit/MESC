import http2 from "http2";
import jwt from "jsonwebtoken";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { mobileDevices } from "@shared/schema";
import {
  extractMobileNotificationEventKey,
  type MobileNotificationEventKey,
} from "@shared/mobileNotificationEvents";
import { db } from "../db";

type NativePushProvider = "apns" | "fcm";

type NativePushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

type NativePushDevice = {
  id: string;
  userId: string;
  platform: string;
  pushToken: string | null;
  pushProvider: string | null;
  notificationPreferences: Record<string, unknown> | null;
};

type NativePushResult = {
  provider: NativePushProvider;
  success: boolean;
  userId: string;
  deviceId: string;
  error?: string;
};

type FcmServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

const APNS_PRODUCTION_HOST = "https://api.push.apple.com";
const APNS_SANDBOX_HOST = "https://api.sandbox.push.apple.com";
const FCM_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

const LEGACY_NOTIFICATION_PREFERENCE_KEYS: Partial<Record<MobileNotificationEventKey, string>> = {
  questionnaire_published: "questionnaires",
  questionnaire_closed: "questionnaires",
  schedule_published: "schedules",
  schedule_reminder: "schedules",
  sanctuary_event_published: "announcements",
  substitution_requested: "substitutions",
  substitute_accepted: "substitutions",
  coordinator_announcement: "announcements",
};

let cachedFcmAccessToken: { value: string; expiresAt: number } | null = null;

function normalizePrivateKey(value?: string | null) {
  return value?.replace(/\\n/g, "\n").trim() || "";
}

function getFcmServiceAccount(): FcmServiceAccount {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return JSON.parse(raw) as FcmServiceAccount;
    } catch (error) {
      console.warn("[NATIVE_PUSH] Invalid FCM service account JSON.", error);
    }
  }

  return {
    project_id: process.env.FCM_PROJECT_ID,
    client_email: process.env.FCM_CLIENT_EMAIL,
    private_key: normalizePrivateKey(process.env.FCM_PRIVATE_KEY),
  };
}

function getApnsConfig() {
  const environment = process.env.APNS_ENV === "sandbox" ? "sandbox" : "production";

  return {
    enabled: Boolean(
      process.env.APNS_KEY_ID
      && process.env.APNS_TEAM_ID
      && process.env.APNS_PRIVATE_KEY
      && (process.env.APNS_BUNDLE_ID || process.env.IOS_BUNDLE_ID),
    ),
    keyId: process.env.APNS_KEY_ID ?? "",
    teamId: process.env.APNS_TEAM_ID ?? "",
    privateKey: normalizePrivateKey(process.env.APNS_PRIVATE_KEY),
    bundleId: process.env.APNS_BUNDLE_ID || process.env.IOS_BUNDLE_ID || "app.saojudastadeu.mesc",
    endpoint: environment === "sandbox" ? APNS_SANDBOX_HOST : APNS_PRODUCTION_HOST,
  };
}

function getFcmConfig() {
  const account = getFcmServiceAccount();

  return {
    enabled: Boolean(account.project_id && account.client_email && account.private_key),
    projectId: account.project_id ?? "",
    clientEmail: account.client_email ?? "",
    privateKey: normalizePrivateKey(account.private_key),
  };
}

export const nativePushConfig = {
  get enabled() {
    return getApnsConfig().enabled || getFcmConfig().enabled;
  },
  get apnsEnabled() {
    return getApnsConfig().enabled;
  },
  get fcmEnabled() {
    return getFcmConfig().enabled;
  },
};

function compactData(data: Record<string, unknown> = {}) {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  return result;
}

function booleanPreference(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isNativePushEnabledForPayload(device: NativePushDevice, payload: NativePushPayload) {
  const eventKey = extractMobileNotificationEventKey(payload.data);
  if (!eventKey) return true;

  const preferences = device.notificationPreferences ?? {};
  const eventPreference = booleanPreference(preferences[eventKey]);
  if (eventPreference !== null) return eventPreference;

  const legacyPreferenceKey = LEGACY_NOTIFICATION_PREFERENCE_KEYS[eventKey];
  const legacyPreference = legacyPreferenceKey
    ? booleanPreference(preferences[legacyPreferenceKey])
    : null;

  return legacyPreference ?? true;
}

function buildApnsPayload(payload: NativePushPayload) {
  return {
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
      },
      sound: "default",
    },
    url: payload.url ?? payload.data?.url ?? "/communication",
    tag: payload.tag,
    data: payload.data ?? {},
  };
}

function buildFcmMessage(token: string, payload: NativePushPayload) {
  return {
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...compactData(payload.data),
        url: String(payload.url ?? payload.data?.url ?? "/communication"),
        tag: payload.tag ?? "mesc-notification",
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "mesc_general",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    },
  };
}

async function getFcmAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcmAccessToken && cachedFcmAccessToken.expiresAt > now + 60) {
    return cachedFcmAccessToken.value;
  }

  const config = getFcmConfig();
  const assertion = jwt.sign(
    {
      iss: config.clientEmail,
      scope: FCM_SCOPE,
      aud: FCM_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    config.privateKey,
    { algorithm: "RS256" },
  );

  const response = await fetch(FCM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = await response.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "Falha ao autenticar no FCM.");
  }

  cachedFcmAccessToken = {
    value: body.access_token,
    expiresAt: now + (body.expires_in ?? 3600),
  };

  return body.access_token;
}

function createApnsJwt() {
  const config = getApnsConfig();
  return jwt.sign(
    {
      iss: config.teamId,
      iat: Math.floor(Date.now() / 1000),
    },
    config.privateKey,
    {
      algorithm: "ES256",
      header: {
        alg: "ES256",
        kid: config.keyId,
      },
    },
  );
}

async function sendApnsNotification(token: string, payload: NativePushPayload) {
  const config = getApnsConfig();
  const client = http2.connect(config.endpoint);
  const body = JSON.stringify(buildApnsPayload(payload));

  try {
    await new Promise<void>((resolve, reject) => {
      let responseBody = "";
      let statusCode = 0;

      const request = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${createApnsJwt()}`,
        "apns-topic": config.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      });

      request.setEncoding("utf8");
      request.on("response", (headers) => {
        statusCode = Number(headers[":status"] ?? 0);
      });
      request.on("data", (chunk) => {
        responseBody += chunk;
      });
      request.on("error", reject);
      request.on("end", () => {
        if (statusCode >= 200 && statusCode < 300) {
          resolve();
          return;
        }

        reject(new Error(`APNS HTTP ${statusCode}: ${responseBody || "sem corpo"}`));
      });

      request.write(body);
      request.end();
    });
  } finally {
    client.close();
  }
}

async function sendFcmNotification(token: string, payload: NativePushPayload) {
  const config = getFcmConfig();
  const accessToken = await getFcmAccessToken();
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildFcmMessage(token, payload)),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`FCM HTTP ${response.status}: ${body || "sem corpo"}`);
  }
}

async function loadNativePushDevices(userIds: string[]): Promise<NativePushDevice[]> {
  return db
    .select({
      id: mobileDevices.id,
      userId: mobileDevices.userId,
      platform: mobileDevices.platform,
      pushToken: mobileDevices.pushToken,
      pushProvider: mobileDevices.pushProvider,
      notificationPreferences: mobileDevices.notificationPreferences,
    })
    .from(mobileDevices)
    .where(and(
      inArray(mobileDevices.userId, userIds),
      eq(mobileDevices.pushEnabled, true),
      isNotNull(mobileDevices.pushToken),
      isNull(mobileDevices.revokedAt),
    ));
}

export async function sendNativePushNotificationToUsers(userIds: string[], payload: NativePushPayload) {
  if (!nativePushConfig.enabled) {
    console.info("[NATIVE_PUSH] APNS/FCM credentials not configured; native remote delivery skipped.");
    return { sent: 0, failed: 0, skipped: true };
  }

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const devices = await loadNativePushDevices(uniqueUserIds);
  if (devices.length === 0) {
    console.info("[NATIVE_PUSH] No active native devices with push tokens for target users.");
    return { sent: 0, failed: 0, skipped: false };
  }

  const eligibleDevices = devices.filter((device) => isNativePushEnabledForPayload(device, payload));
  if (eligibleDevices.length === 0) {
    console.info("[NATIVE_PUSH] No active native devices opted in for this notification event.");
    return { sent: 0, failed: 0, skipped: false };
  }

  const results: NativePushResult[] = await Promise.all(eligibleDevices.map(async (device) => {
    const token = device.pushToken ?? "";
    const provider = device.pushProvider === "fcm" || device.platform === "android" ? "fcm" : "apns";

    try {
      if (provider === "apns") {
        if (!nativePushConfig.apnsEnabled) throw new Error("APNS não configurado.");
        await sendApnsNotification(token, payload);
      } else {
        if (!nativePushConfig.fcmEnabled) throw new Error("FCM não configurado.");
        await sendFcmNotification(token, payload);
      }

      return { provider, success: true, userId: device.userId, deviceId: device.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.warn(`[NATIVE_PUSH] Failed to send ${provider} notification to device ${device.id}: ${message}`);
      return { provider, success: false, userId: device.userId, deviceId: device.id, error: message };
    }
  }));

  const sent = results.filter((result) => result.success).length;
  const failed = results.length - sent;
  console.info(`[NATIVE_PUSH] Summary: sent=${sent}, failed=${failed}, devices=${results.length}`);

  return { sent, failed, skipped: false };
}
