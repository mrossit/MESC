import { storage } from "../storage";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

let webpush: any = null;
try {
  const module = await import("web-push");
  webpush = module.default ?? module;
} catch (error) {
  console.warn("[PUSH] web-push module not available. Push notifications disabled.", error);
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const pushConfig = {
  enabled: Boolean(webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
  publicKey: VAPID_PUBLIC_KEY || null
};

export async function sendPushNotificationToUsers(userIds: string[], payload: PushPayload) {
  if (!pushConfig.enabled || !webpush) {
    return;
  }

  if (!userIds || userIds.length === 0) {
    return;
  }

  const uniqueUserIds = Array.from(new Set(userIds));
  const subscriptions = await storage.getPushSubscriptionsByUserIds(uniqueUserIds);

  if (subscriptions.length === 0) {
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? payload.data?.url ?? "/communication",
    tag: payload.tag,
    data: payload.data ?? {}
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.authKey,
          p256dh: subscription.p256dhKey
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (error: any) {
        const statusCode = error?.statusCode ?? error?.code;
        if (statusCode === 404 || statusCode === 410) {
          console.warn("[PUSH] Subscription expired, removing:", subscription.endpoint);
          await storage.removePushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          console.error("[PUSH] Failed to send notification:", error);
        }
      }
    })
  );
}
