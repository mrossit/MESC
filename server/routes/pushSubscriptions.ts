import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { authenticateToken as requireAuth, type AuthRequest } from "../auth";
import { csrfProtection } from "../middleware/csrf";
import { pushConfig } from "../utils/pushNotifications";
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

    // Check if subscription already exists
    const existing = await storage.getPushSubscriptionByEndpoint(validatedData.endpoint);
    
    if (existing) {
      // Update existing subscription with new user if needed
      if (existing.userId !== userId) {
        await storage.removePushSubscriptionByEndpoint(validatedData.endpoint);
        await storage.createPushSubscription({
          userId,
          endpoint: validatedData.endpoint,
          p256dhKey: validatedData.keys.p256dh,
          authKey: validatedData.keys.auth
        });
      }
      return res.json({ success: true, message: "Subscription updated" });
    }

    // Create new subscription
    await storage.createPushSubscription({
      userId,
      endpoint: validatedData.endpoint,
      p256dhKey: validatedData.keys.p256dh,
      authKey: validatedData.keys.auth
    });

    res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error: any) {
    console.error("[PUSH API] Subscribe error:", error);
    if (error.name === "ZodError") {
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
