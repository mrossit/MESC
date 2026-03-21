import { storage } from "../storage";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

// Interface for web-push module
interface WebPushModule {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (subscription: { endpoint: string; keys: { auth: string; p256dh: string } }, payload: string) => Promise<void>;
}

// Interface for push notification errors
interface PushError {
  statusCode?: number;
  code?: number;
  message?: string;
}

let webpush: WebPushModule | null = null;
try {
  // @ts-expect-error - web-push module has no type declarations
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

// Códigos de erro que indicam subscription inválida/expirada e deve ser removida
const INVALID_SUBSCRIPTION_STATUS_CODES = [
  401, // Unauthorized - chaves inválidas
  403, // Forbidden - subscription não autorizada
  404, // Not Found - endpoint não existe mais
  410, // Gone - subscription expirou explicitamente
];

// Máximo de subscriptions por usuário (evita acúmulo de endpoints mortos)
const MAX_SUBSCRIPTIONS_PER_USER = 3;

// Subscriptions sem atualização há mais de este período são consideradas stale
const STALE_SUBSCRIPTION_DAYS = 45;

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

  const allSubscriptions = await storage.getPushSubscriptionsByUserIds(uniqueUserIds);
  console.log('[PUSH] Subscriptions encontradas:', allSubscriptions.length);

  if (allSubscriptions.length === 0) {
    console.warn('[PUSH] Nenhuma subscription encontrada para os userIds fornecidos');
    return;
  }

  // Filtrar subscriptions stale (sem atualização há muito tempo)
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_SUBSCRIPTION_DAYS);

  const freshSubscriptions = [];
  const staleSubscriptions = [];

  for (const sub of allSubscriptions) {
    const updatedAt = sub.updatedAt ? new Date(sub.updatedAt) : (sub.createdAt ? new Date(sub.createdAt) : new Date(0));
    if (updatedAt < staleCutoff) {
      staleSubscriptions.push(sub);
    } else {
      freshSubscriptions.push(sub);
    }
  }

  // Remover subscriptions stale do banco em background
  if (staleSubscriptions.length > 0) {
    console.log(`[PUSH] Removendo ${staleSubscriptions.length} subscriptions stale (sem atualização há +${STALE_SUBSCRIPTION_DAYS} dias)`);
    Promise.all(
      staleSubscriptions.map(sub => {
        console.log(`[PUSH] Removendo stale: userId=${sub.userId}, endpoint=${sub.endpoint.substring(0, 50)}...`);
        return storage.removePushSubscriptionByEndpoint(sub.endpoint);
      })
    ).catch(err => console.error('[PUSH] Erro ao remover subscriptions stale:', err));
  }

  if (freshSubscriptions.length === 0) {
    console.warn('[PUSH] Todas as subscriptions estão stale, nenhuma notificação enviada');
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
    freshSubscriptions.map(async (subscription) => {
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
      } catch (error: unknown) {
        const pushError = error as PushError;
        const statusCode = pushError?.statusCode ?? pushError?.code;
        if (statusCode && INVALID_SUBSCRIPTION_STATUS_CODES.includes(statusCode)) {
          console.warn(`[PUSH] Subscription inválida (HTTP ${statusCode}), removendo: endpoint=${subscription.endpoint.substring(0, 50)}... userId=${subscription.userId}`);
          await storage.removePushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          console.error("[PUSH] Failed to send notification to userId:", subscription.userId, 'statusCode:', statusCode, error);
        }
        return { success: false, userId: subscription.userId, error: statusCode };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`[PUSH] Resumo: Sucesso: ${successCount} | Falha: ${failCount} | Stale removidas: ${staleSubscriptions.length}`);
}

/**
 * Limpa subscriptions antigas de um usuário, mantendo apenas as N mais recentes.
 * Chamado no momento do subscribe para evitar acúmulo.
 */
export async function cleanupUserSubscriptions(userId: string): Promise<number> {
  const userSubs = await storage.getPushSubscriptionsByUserIds([userId]);

  if (userSubs.length <= MAX_SUBSCRIPTIONS_PER_USER) {
    return 0;
  }

  // Ordenar por updated_at DESC (mais recentes primeiro)
  const sorted = userSubs.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  // Remover as mais antigas além do limite
  const toRemove = sorted.slice(MAX_SUBSCRIPTIONS_PER_USER);
  let removed = 0;

  for (const sub of toRemove) {
    try {
      await storage.removePushSubscriptionByEndpoint(sub.endpoint);
      console.log(`[PUSH] Cleanup: removida subscription antiga userId=${userId}, endpoint=${sub.endpoint.substring(0, 50)}...`);
      removed++;
    } catch (err) {
      console.error('[PUSH] Erro ao remover subscription no cleanup:', err);
    }
  }

  return removed;
}
