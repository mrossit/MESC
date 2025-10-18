import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticateToken as requireAuth, AuthRequest, requireRole } from "../auth";
import { db } from "../db";
import { storage } from "../storage";
import { notifications, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { pushConfig, sendPushNotificationToUsers } from "../utils/pushNotifications";

const router = Router();

// Schema para criar notificação
const createNotificationSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  recipientIds: z.array(z.string()).optional(), // IDs específicos ou vazio para todos
  recipientRole: z.enum(["ministro", "coordenador", "gestor", "all"]).optional(),
  actionUrl: z.string().url().optional(),
});

const rawPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

const pushSubscriptionSchema = z.union([
  z.object({ subscription: rawPushSubscriptionSchema }),
  rawPushSubscriptionSchema
]);

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
});

// Mapeamento dos tipos do frontend para o banco
function mapNotificationType(frontendType: "info" | "warning" | "success" | "error"): "schedule" | "substitution" | "formation" | "announcement" | "reminder" {
  switch (frontendType) {
    case "info":
      return "announcement";
    case "warning":
      return "reminder";
    case "success":
      return "announcement";
    case "error":
      return "reminder";
    default:
      return "announcement";
  }
}

// Configuração de push
router.get("/push/config", requireAuth, (req: AuthRequest, res: Response) => {
  res.json({
    enabled: pushConfig.enabled,
    publicKey: pushConfig.publicKey
  });
});

// Registrar subscription push
router.post("/push/subscribe", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!pushConfig.enabled) {
      return res.status(503).json({ error: "Notificações push não estão configuradas no servidor" });
    }

    const parsed = pushSubscriptionSchema.parse(req.body);
    const subscription = "subscription" in parsed ? parsed.subscription : parsed;

    await storage.upsertPushSubscription(req.user!.id, {
      endpoint: subscription.endpoint,
      keys: subscription.keys
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      console.error("Erro ao registrar push subscription:", error);
      res.status(500).json({ error: "Erro ao registrar subscription push" });
    }
  }
});

// Remover subscription push
router.post("/push/unsubscribe", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = unsubscribeSchema.parse(req.body);
    await storage.removePushSubscription(req.user!.id, endpoint);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      console.error("Erro ao remover push subscription:", error);
      res.status(500).json({ error: "Erro ao remover subscription push" });
    }
  }
});

// Listar notificações do usuário
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await storage.getUserNotifications(req.user!.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
});

// Contar notificações não lidas
router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // 🔥 EMERGENCY FIX: Add multiple safety layers

    // Check if user exists
    if (!req.user || !req.user.id) {
      console.warn('[NOTIFICATIONS] No user in request');
      return res.json({ count: 0 });
    }

    // Storage doesn't have getUnreadNotificationCount, use getUserNotifications and filter
    const allNotifications = await storage.getUserNotifications(req.user.id);

    // Safely count unread
    if (!allNotifications || !Array.isArray(allNotifications)) {
      console.warn('[NOTIFICATIONS] Invalid notifications data');
      return res.json({ count: 0 });
    }

    const count = allNotifications.filter(n => n && !n.read).length;
    res.json({ count });
  } catch (error) {
    // Always return safe default on ANY error
    console.error('[NOTIFICATIONS] Error counting notifications:', error);
    res.json({ count: 0 });
  }
});

// Marcar notificação como lida
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se a notificação pertence ao usuário
    const notification = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, req.user!.id)
      ))
      .limit(1);
    
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }
    
    await storage.markNotificationAsRead(id);
    res.json({ message: "Notificação marcada como lida" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisição" });
  }
});

// Marcar todas as notificações como lidas
router.patch("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Storage doesn't have markAllNotificationsAsRead, get all and mark each
    const userNotifications = await storage.getUserNotifications(req.user!.id);
    const unreadNotifications = userNotifications.filter(n => !n.read);
    
    await Promise.all(unreadNotifications.map(n => storage.markNotificationAsRead(n.id)));
    
    res.json({ message: "Todas as notificações foram marcadas como lidas" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisição" });
  }
});

// Criar notificação de convite para missa (apenas coordenadores e reitores)
router.post("/mass-invite", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { massId, date, time, location, message, urgencyLevel } = req.body;
    
    console.log("Recebido pedido de notificação para missa:", { massId, date, time, location, urgencyLevel });
    
    // Título baseado no nível de urgência
    const title = urgencyLevel === "critical" 
      ? "🔴 URGENTE: Convocação para Missa"
      : urgencyLevel === "high"
      ? "⚠️ IMPORTANTE: Ministros Necessários"
      : "📢 Convite para Servir na Missa";
    
    // Buscar todos os usuários com papel de ministro ativos
    // Mudança: buscar por role 'ministro' E também incluir coordenadores/reitores que são ministros
    const ministers = await db.select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(
        eq(users.status, "active")
      );
    
    console.log(`Encontrados ${ministers.length} usuários ativos`);
    
    // Mapear urgência para tipo do banco
    const mappedType = urgencyLevel === "critical" || urgencyLevel === "high" ? "reminder" : "announcement";
    
    // Criar notificação para cada usuário ativo (ministros, coordenadores e reitores)
    const notificationPromises = ministers.map((minister: { id: string; name: string; role: string }) =>
      storage.createNotification({
        userId: minister.id,
        title,
        message: message || `Precisamos de ministros para a missa de ${date} às ${time} na ${location}. Por favor, confirme sua disponibilidade.`,
        type: mappedType,
        read: false,
        actionUrl: '/schedules'
      })
    );
    
    const results = await Promise.all(notificationPromises);
    console.log(`Criadas ${results.length} notificações`);

    if (pushConfig.enabled) {
      await sendPushNotificationToUsers(
        ministers.map((minister) => minister.id),
        {
          title,
          body: message || `Precisamos de ministros para a missa de ${date} às ${time} na ${location}. Por favor, confirme sua disponibilidade.`,
          url: '/schedules',
          data: {
            massId,
            urgencyLevel
          }
        }
      );
    }
    
    // Registrar atividade (using console.log since storage.logActivity doesn't exist)
    console.log(`[Activity Log] mass_invite_sent: Enviou convite para missa de ${date} às ${time}`, {
      userId: req.user!.id,
      massId,
      date,
      time,
      location,
      recipientCount: ministers.length,
      urgencyLevel 
    });
    
    res.json({ 
      message: "Convite enviado com sucesso",
      recipientCount: ministers.length 
    });
  } catch (error) {
    console.error("Erro ao enviar convite para missa:", error);
    res.status(500).json({ error: "Erro ao enviar convite", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Criar nova notificação (apenas coordenadores e reitores)
router.post("/", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const data = createNotificationSchema.parse(req.body);
    
    let recipientUserIds: string[] = [];
    
    // Determinar destinatários
    if (data.recipientIds && data.recipientIds.length > 0) {
      // IDs específicos fornecidos
      recipientUserIds = data.recipientIds;
    } else if (data.recipientRole) {
      // Buscar usuários por role
      let recipients;
      
      if (data.recipientRole === "all") {
        // Todos os usuários ativos
        recipients = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.status, "active"));
      } else {
        // Role específica
        recipients = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.role, data.recipientRole),
            eq(users.status, "active")
          ));
      }
      
      recipientUserIds = recipients.map((r: any) => r.id);
    } else {
      // Por padrão, enviar para todos os ministros ativos
      const recipients = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.role, "ministro"),
          eq(users.status, "active")
        ));
      recipientUserIds = recipients.map((r: any) => r.id);
    }
    
    // Adicionar o remetente à lista de destinatários para que receba uma cópia
    if (!recipientUserIds.includes(req.user!.id)) {
      recipientUserIds.push(req.user!.id);
    }

    recipientUserIds = Array.from(new Set(recipientUserIds));
    
    // Criar notificações para cada destinatário
    const mappedType = mapNotificationType(data.type);
    
    const notificationPromises = recipientUserIds.map(userId =>
      storage.createNotification({
        userId,
        title: data.title,
        message: data.message,
        type: mappedType,
        read: false,
        actionUrl: data.actionUrl ?? null
      })
    );
    
    await Promise.all(notificationPromises);

    if (pushConfig.enabled) {
      await sendPushNotificationToUsers(recipientUserIds, {
        title: data.title,
        body: data.message,
        url: data.actionUrl ?? '/communication'
      });
    }
    
    // Registrar atividade (using console.log since storage.logActivity doesn't exist)
    console.log(`[Activity Log] notification_sent: Enviou comunicado: ${data.title}`, {
      userId: req.user!.id,
      recipientCount: recipientUserIds.length,
      type: data.type 
    });
    
    res.json({ 
      message: "Notificação enviada com sucesso",
      recipientCount: recipientUserIds.length 
    });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      res.status(500).json({ error: "Erro ao criar notificação" });
    }
  }
});

// Deletar notificação (própria ou coordenadores podem deletar qualquer uma)
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se o usuário é coordenador/reitor
    const user = await storage.getUser(req.user!.id);
    const isCoordinator = user && ['coordenador', 'gestor'].includes(user.role);
    
    let notification;
    if (isCoordinator) {
      // Coordenadores podem deletar qualquer notificação
      notification = await db.select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);
    } else {
      // Usuários comuns só podem deletar suas próprias notificações
      notification = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, req.user!.id)
        ))
        .limit(1);
    }
    
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }
    
    await db.delete(notifications).where(eq(notifications.id, id));
    
    // Registrar atividade (using console.log since storage.logActivity doesn't exist)
    console.log(`[Activity Log] notification_deleted: Excluiu notificação: ${notification[0].title}`, {
      userId: req.user!.id,
      notificationId: id,
      isAdminDelete: isCoordinator && notification[0].userId !== req.user!.id
    });
    
    res.json({ message: "Notificação excluída com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir notificação" });
  }
});

export default router;
