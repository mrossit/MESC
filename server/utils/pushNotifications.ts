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
  console.log('[PUSH] Iniciando envio para', userIds.length, 'userIds');

  if (!pushConfig.enabled || !webpush) {
    console.warn('[PUSH] Push desabilitado ou web-push não disponível');
    return;
  }

  if (!userIds || userIds.length === 0) {
    console.warn('[PUSH] Nenhum userIds fornecido');
    return;
  }

  const uniqueUserIds = Array.from(new Set(userIds));
  console.log('[PUSH] UserIds únicos:', uniqueUserIds.length);
  console.log('[PUSH] Lista de UserIds:', uniqueUserIds);

  const subscriptions = await storage.getPushSubscriptionsByUserIds(uniqueUserIds);
  console.log('[PUSH] Subscriptions encontradas:', subscriptions.length);
  console.log('[PUSH] Subscriptions por userId:', subscriptions.map(s => ({ userId: s.userId, endpoint: s.endpoint.substring(0, 50) + '...' })));

  if (subscriptions.length === 0) {
    console.warn('[PUSH] Nenhuma subscription encontrada para os userIds fornecidos');
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? payload.data?.url ?? "/communication",
    tag: payload.tag,
    data: payload.data ?? {}
  });

  const results = await Promise.all(
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
        console.log('[PUSH] Notificação enviada com sucesso para userId:', subscription.userId);
        return { success: true, userId: subscription.userId };
      } catch (error: any) {
        const statusCode = error?.statusCode ?? error?.code;
        if (statusCode === 404 || statusCode === 410) {
          console.warn("[PUSH] Subscription expired, removing:", subscription.endpoint, 'userId:', subscription.userId);
          await storage.removePushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          console.error("[PUSH] Failed to send notification to userId:", subscription.userId, error);
        }
        return { success: false, userId: subscription.userId, error: statusCode };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log('[PUSH] Resumo: Sucesso:', successCount, '| Falha:', failCount);
}
