import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { db, storage } from "../db-config";
import { notifications, users } from "@shared/schema-simple";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Schema para criar notificação
const createNotificationSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  recipientIds: z.array(z.string()).optional(), // IDs específicos ou vazio para todos
  recipientRole: z.enum(["ministro", "coordenador", "gestor", "all"]).optional(),
});

// Listar notificações do usuário
router.get("/", requireAuth(), async (req: Request, res: Response) => {
  try {
    const notifications = await storage.getUserNotifications(req.session.userId!);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
});

// Contar notificações não lidas
router.get("/unread-count", requireAuth(), async (req: Request, res: Response) => {
  try {
    const count = await storage.getUnreadNotificationCount(req.session.userId!);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Erro ao contar notificações" });
  }
});

// Marcar notificação como lida
router.patch("/:id/read", requireAuth(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se a notificação pertence ao usuário
    const notification = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, req.session.userId!)
      ))
      .limit(1);
    
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }
    
    const success = await storage.markNotificationAsRead(id);
    if (success) {
      res.json({ message: "Notificação marcada como lida" });
    } else {
      res.status(500).json({ error: "Erro ao marcar notificação como lida" });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisição" });
  }
});

// Marcar todas as notificações como lidas
router.patch("/read-all", requireAuth(), async (req: Request, res: Response) => {
  try {
    const success = await storage.markAllNotificationsAsRead(req.session.userId!);
    if (success) {
      res.json({ message: "Todas as notificações foram marcadas como lidas" });
    } else {
      res.status(500).json({ error: "Erro ao marcar notificações como lidas" });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisição" });
  }
});

// Criar notificação de convite para missa (apenas coordenadores e reitores)
router.post("/mass-invite", requireAuth(["coordenador", "gestor"]), async (req: Request, res: Response) => {
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
    
    // Criar notificação para cada usuário ativo (ministros, coordenadores e reitores)
    const notificationPromises = ministers.map(minister =>
      storage.createNotification({
        userId: minister.id,
        title,
        message: message || `Precisamos de ministros para a missa de ${date} às ${time} na ${location}. Por favor, confirme sua disponibilidade.`,
        type: urgencyLevel === "critical" ? "error" : urgencyLevel === "high" ? "warning" : "info",
        read: false,
      })
    );
    
    const results = await Promise.all(notificationPromises);
    console.log(`Criadas ${results.length} notificações`);
    
    // Registrar atividade
    await storage.logActivity({
      userId: req.session.userId!,
      action: "mass_invite_sent",
      description: `Enviou convite para missa de ${date} às ${time}`,
      metadata: JSON.stringify({ 
        massId,
        date,
        time,
        location,
        recipientCount: ministers.length,
        urgencyLevel 
      })
    });
    
    res.json({ 
      message: "Convite enviado com sucesso",
      recipientCount: ministers.length 
    });
  } catch (error) {
    console.error("Erro ao enviar convite para missa:", error);
    res.status(500).json({ error: "Erro ao enviar convite", details: error.message });
  }
});

// Criar nova notificação (apenas coordenadores e reitores)
router.post("/", requireAuth(["coordenador", "gestor"]), async (req: Request, res: Response) => {
  try {
    const data = createNotificationSchema.parse(req.body);
    
    let recipientUserIds: string[] = [];
    
    // Determinar destinatários
    if (data.recipientIds && data.recipientIds.length > 0) {
      // IDs específicos fornecidos
      recipientUserIds = data.recipientIds;
    } else if (data.recipientRole) {
      // Buscar usuários por role
      let query = db.select({ id: users.id }).from(users);
      
      if (data.recipientRole === "all") {
        // Todos os usuários ativos
        query = query.where(eq(users.status, "active"));
      } else {
        // Role específica
        query = query.where(and(
          eq(users.role, data.recipientRole),
          eq(users.status, "active")
        ));
      }
      
      const recipients = await query;
      recipientUserIds = recipients.map(r => r.id);
    } else {
      // Por padrão, enviar para todos os ministros ativos
      const recipients = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.role, "ministro"),
          eq(users.status, "active")
        ));
      recipientUserIds = recipients.map(r => r.id);
    }
    
    // Criar notificações para cada destinatário
    const notificationPromises = recipientUserIds.map(userId =>
      storage.createNotification({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        read: false,
      })
    );
    
    await Promise.all(notificationPromises);
    
    // Registrar atividade
    await storage.logActivity({
      userId: req.session.userId!,
      action: "notification_sent",
      description: `Enviou comunicado: ${data.title}`,
      metadata: JSON.stringify({ 
        recipientCount: recipientUserIds.length,
        type: data.type 
      })
    });
    
    res.json({ 
      message: "Notificação enviada com sucesso",
      recipientCount: recipientUserIds.length 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      res.status(500).json({ error: "Erro ao criar notificação" });
    }
  }
});

// Deletar notificação (própria ou coordenadores podem deletar qualquer uma)
router.delete("/:id", requireAuth(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se o usuário é coordenador/reitor
    const user = await storage.getUser(req.session.userId!);
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
          eq(notifications.userId, req.session.userId!)
        ))
        .limit(1);
    }
    
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }
    
    await db.delete(notifications).where(eq(notifications.id, id));
    
    // Registrar atividade
    await storage.logActivity({
      userId: req.session.userId!,
      action: "notification_deleted",
      description: `Excluiu notificação: ${notification[0].title}`,
      metadata: JSON.stringify({ 
        notificationId: id,
        isAdminDelete: isCoordinator && notification[0].userId !== req.session.userId!
      })
    });
    
    res.json({ message: "Notificação excluída com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir notificação" });
  }
});

export default router;