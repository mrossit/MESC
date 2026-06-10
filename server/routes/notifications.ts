import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticateToken as requireAuth, AuthRequest, requireRole } from "../auth";
import { isAdmin as isAdminRole, expandRoles } from "@shared/roles";
import { notificationRateLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { storage } from "../storage";
import { notifications, users } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { pushConfig, sendPushNotificationToUsers } from "../utils/pushNotifications";
import { notifyUsers } from "../websocket";

const router = Router();

// Validador de URL interna (relativa ou do mesmo domínio)
const internalUrlSchema = z.string().refine(
  (url) => {
    // Permite URLs relativas (começam com /)
    if (url.startsWith('/')) return true;
    // Bloqueia URLs absolutas externas
    try {
      const parsed = new URL(url);
      // Permite apenas se não tiver host (URL relativa) ou se for localhost/replit
      return !parsed.host ||
             parsed.host.includes('localhost') ||
             parsed.host.includes('replit.app') ||
             parsed.host.includes('replit.dev');
    } catch {
      return false;
    }
  },
  { message: "URL deve ser relativa ou do mesmo domínio" }
);

// Schema para criar notificação
const createNotificationSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(255, "Título muito longo"),
  message: z.string().min(1, "Mensagem é obrigatória").max(2000, "Mensagem muito longa"),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  recipientIds: z.array(z.string()).optional(), // IDs específicos ou vazio para todos
  recipientRole: z.enum(["ministro", "coordenador", "coordenador_comunidade", "coordenador_paroquial", "gestor", "reitor", "all"]).optional(),
  actionUrl: internalUrlSchema.optional(),
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

// Listar notificações do usuário (paginado)
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await storage.getUserNotificationsPaginated(req.user!.id, { limit, offset });
    res.json(result);
  } catch (error) {
    console.error('[NOTIFICATIONS] Error fetching notifications:', error);
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
});

// Contar notificações não lidas (otimizado com COUNT no banco)
router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.json({ count: 0 });
    }

    const count = await storage.getUnreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (error) {
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
    console.error('[NOTIFICATIONS] Error marking notification as read:', error);
    res.status(500).json({ error: "Erro ao processar requisição" });
  }
});

// Marcar todas as notificações como lidas (otimizado com batch update)
router.patch("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await storage.markAllNotificationsAsRead(req.user!.id);
    res.json({ message: "Todas as notificações foram marcadas como lidas" });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error marking all as read:', error);
    res.status(500).json({ error: "Erro ao processar requisição" });
  }
});

// Criar notificação de convite para missa (apenas coordenadores e reitores)
// Rate limited: max 10 convites por hora por coordenador
router.post("/mass-invite", requireAuth, requireRole(['coordenador', 'gestor']), notificationRateLimiter, async (req: AuthRequest, res: Response) => {
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
        ministers.map((minister: { id: string; name: string; role: string }) => minister.id),
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
// Rate limited: max 10 notificações por hora por coordenador
router.post("/", requireAuth, requireRole(['coordenador', 'gestor']), notificationRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = createNotificationSchema.parse(req.body);

    console.log('[NOTIFICAÇÕES] Dados recebidos:', {
      title: data.title,
      type: data.type,
      recipientIds: data.recipientIds,
      recipientRole: data.recipientRole,
      senderId: req.user!.id
    });

    let recipientUserIds: string[] = [];

    // Determinar destinatários
    if (data.recipientIds && data.recipientIds.length > 0) {
      // IDs específicos fornecidos
      recipientUserIds = data.recipientIds;
      console.log('[NOTIFICAÇÕES] Usando IDs específicos:', recipientUserIds.length, 'destinatários');
    } else if (data.recipientRole) {
      // Buscar usuários por role
      let recipients;

      if (data.recipientRole === "all") {
        // Todos os usuários ativos
        recipients = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.status, "active"));
        console.log('[NOTIFICAÇÕES] Buscou TODOS os usuários ativos:', recipients.length);
      } else {
        // Role específica
        // expandRoles: alvo "coordenador" atinge todas as variantes (comunidade/paroquial)
        recipients = await db.select({ id: users.id })
          .from(users)
          .where(and(
            inArray(users.role, expandRoles([data.recipientRole])),
            eq(users.status, "active")
          ));
        console.log('[NOTIFICAÇÕES] Buscou usuários com role', data.recipientRole, ':', recipients.length);
      }

      recipientUserIds = recipients.map((r: { id: string }) => r.id);
      console.log('[NOTIFICAÇÕES] IDs dos destinatários:', recipientUserIds);
    } else {
      // Por padrão, enviar para todos os ministros ativos
      const recipients = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.role, "ministro"),
          eq(users.status, "active")
        ));
      recipientUserIds = recipients.map((r: { id: string }) => r.id);
      console.log('[NOTIFICAÇÕES] Sem filtro, usando ministros ativos por padrão:', recipientUserIds.length);
    }

    console.log('[NOTIFICAÇÕES] Destinatários antes de adicionar remetente:', recipientUserIds.length);

    // Adicionar o remetente à lista de destinatários para que receba uma cópia
    if (!recipientUserIds.includes(req.user!.id)) {
      recipientUserIds.push(req.user!.id);
      console.log('[NOTIFICAÇÕES] Remetente adicionado à lista');
    } else {
      console.log('[NOTIFICAÇÕES] Remetente já estava na lista');
    }

    recipientUserIds = Array.from(new Set(recipientUserIds));
    console.log('[NOTIFICAÇÕES] Total de destinatários únicos:', recipientUserIds.length);
    
    // Criar notificações para cada destinatário
    const mappedType = mapNotificationType(data.type);

    console.log('[NOTIFICAÇÕES] Criando notificações no banco para', recipientUserIds.length, 'destinatários');
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

    const createdNotifications = await Promise.all(notificationPromises);
    console.log('[NOTIFICAÇÕES] Notificações criadas no banco:', createdNotifications.length);

    // Enviar via WebSocket para atualização em tempo real
    if (createdNotifications.length > 0) {
      const firstNotification = createdNotifications[0];
      notifyUsers(recipientUserIds, {
        id: firstNotification.id,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl ?? null,
        createdAt: firstNotification.createdAt?.toISOString() ?? new Date().toISOString()
      });
      console.log('[NOTIFICAÇÕES] WebSocket: notificação enviada para', recipientUserIds.length, 'usuários conectados');
    }

    // Enviar push notification para dispositivos móveis/desktop
    if (pushConfig.enabled) {
      console.log('[NOTIFICAÇÕES] Push notifications habilitado, enviando para', recipientUserIds.length, 'destinatários');
      await sendPushNotificationToUsers(recipientUserIds, {
        title: data.title,
        body: data.message,
        url: data.actionUrl ?? '/communication'
      });
      console.log('[NOTIFICAÇÕES] Envio de push notifications concluído');
    } else {
      console.log('[NOTIFICAÇÕES] Push notifications DESABILITADO (VAPID keys não configuradas)');
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
    const isCoordinator = user && isAdminRole(user.role);
    
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
    console.error('[NOTIFICATIONS] Error deleting notification:', error);
    res.status(500).json({ error: "Erro ao excluir notificação" });
  }
});

// Limpar notificações expiradas (apenas coordenadores/gestores)
// Endpoint administrativo para manutenção do banco
router.delete("/cleanup/expired", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const deletedCount = await storage.deleteExpiredNotifications();

    console.log(`[NOTIFICATIONS] Cleanup: ${deletedCount} expired notifications deleted by ${req.user!.id}`);

    res.json({
      message: `${deletedCount} notificações expiradas removidas`,
      deletedCount
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error cleaning expired notifications:', error);
    res.status(500).json({ error: "Erro ao limpar notificações expiradas" });
  }
});

export default router;
