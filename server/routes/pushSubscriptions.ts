import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { authenticateToken as requireAuth, type AuthRequest } from "../auth";
import { csrfProtection } from "../middleware/csrf";
import { pushConfig, cleanupUserSubscriptions } from "../utils/pushNotifications";
import { z } from "zod";

const router = Router();

// Schema for push subscription
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

// Get VAPID public key (needed for frontend subscription)
router.get("/vapid-public-key", (req, res) => {
  if (!pushConfig.enabled || !pushConfig.publicKey) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  
  res.json({ publicKey: pushConfig.publicKey });
});

// Subscribe to push notifications
router.post("/subscribe", csrfProtection, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!pushConfig.enabled) {
      return res.status(503).json({ error: "Push notifications not available" });
    }

    const validatedData = pushSubscriptionSchema.parse(req.body);
    const userId = req.user!.id;

    // Usar upsert para SEMPRE atualizar as chaves de criptografia.
    // O browser pode gerar novas chaves a qualquer momento (re-registro do SW,
    // atualização do browser, etc). Se não atualizarmos, web-push falha
    // silenciosamente ao tentar enviar com chaves stale.
    await storage.upsertPushSubscription(userId, {
      endpoint: validatedData.endpoint,
      keys: {
        auth: validatedData.keys.auth,
        p256dh: validatedData.keys.p256dh
      }
    });

    // Limpar subscriptions antigas do usuário (mantém apenas as N mais recentes)
    const removed = await cleanupUserSubscriptions(userId);
    if (removed > 0) {
      console.log(`[PUSH API] Cleanup: ${removed} subscriptions antigas removidas para userId: ${userId}`);
    }

    console.log(`[PUSH API] Subscription upserted for userId: ${userId}, endpoint: ${validatedData.endpoint.substring(0, 60)}...`);
    res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error: unknown) {
    console.error("[PUSH API] Subscribe error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid subscription data" });
    }
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", csrfProtection, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint required" });
    }

    await storage.removePushSubscriptionByEndpoint(endpoint);
    res.json({ success: true, message: "Unsubscribed from push notifications" });
  } catch (error) {
    console.error("[PUSH API] Unsubscribe error:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Get user's current subscriptions (for debugging/UI state)
router.get("/subscriptions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscriptions = await storage.getPushSubscriptionsByUserIds([userId]);
    
    res.json({
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        createdAt: sub.createdAt
      }))
    });
  } catch (error) {
    console.error("[PUSH API] Get subscriptions error:", error);
    res.status(500).json({ error: "Failed to get subscriptions" });
  }
});

export default router;
