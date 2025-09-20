import { Router, Request, Response } from 'express';
import webpush from 'web-push';
import { db } from '../db';
import { users, notifications, pushSubscriptions } from '@shared/schema';
import { eq, inArray, and, desc, count, gte } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken } from '../auth';

const router = Router();

// Configuração do Web Push - apenas se as chaves estiverem configuradas
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Só configurar se as chaves estiverem definidas
if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:admin@mesc-sjt.com.br',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (error) {
    console.warn('⚠️  Erro ao configurar VAPID keys:', error.message);
  }
}

// Schema de validação
const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

const NotificationSchema = z.object({
  title: z.string(),
  body: z.string(),
  type: z.enum(['schedule', 'substitution', 'reminder', 'announcement', 'formation', 'approval', 'system']).optional(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional(),
  vibrate: z.array(z.number()).optional(),
  requireInteraction: z.boolean().optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
    icon: z.string().optional()
  })).optional(),
  data: z.record(z.any()).optional()
});

// GET /api/push/vapid-public-key - Retorna a chave pública VAPID
router.get('/vapid-public-key', (req: Request, res: Response) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST /api/push/subscribe - Salva a inscrição do usuário
router.post('/subscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const subscription = SubscriptionSchema.parse(req.body);
    const userId = req.user!.id;

    // Salva ou atualiza a inscrição no banco
    await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent'] || 'unknown',
        createdAt: new Date()
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updatedAt: new Date()
        }
      });

    res.json({ success: true, message: 'Inscrição salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar inscrição:', error);
    res.status(400).json({ error: 'Erro ao salvar inscrição' });
  }
});

// POST /api/push/unsubscribe - Remove a inscrição do usuário
router.post('/unsubscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user!.id;

    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );

    res.json({ success: true, message: 'Inscrição removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover inscrição:', error);
    res.status(400).json({ error: 'Erro ao remover inscrição' });
  }
});

// POST /api/push/send - Envia notificação para um usuário específico
router.post('/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, notification } = req.body;
    const validatedNotification = NotificationSchema.parse(notification);

    // Verifica permissão (apenas gestores e coordenadores)
    if (!['gestor', 'coordenador'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Sem permissão para enviar notificações' });
    }

    // Busca as inscrições do usuário
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Usuário não tem inscrições ativas' });
    }

    // Salva a notificação no banco
    const [savedNotification] = await db
      .insert(notifications)
      .values({
        userId,
        type: validatedNotification.type || 'system',
        title: validatedNotification.title,
        message: validatedNotification.body,
        data: validatedNotification.data,
        priority: validatedNotification.requireInteraction ? 'high' : 'normal',
        createdAt: new Date()
      })
      .returning();

    // Prepara o payload da notificação
    const payload = JSON.stringify({
      ...validatedNotification,
      timestamp: Date.now(),
      notificationId: savedNotification.id
    });

    // Envia para todas as inscrições do usuário
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
        return { success: true, endpoint: sub.endpoint };
      } catch (error: any) {
        // Se a inscrição expirou, remove do banco
        if (error.statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        }
        return { success: false, endpoint: sub.endpoint, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Notificação enviada para ${successful}/${subscriptions.length} dispositivos`,
      results
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    res.status(400).json({ error: 'Erro ao enviar notificação' });
  }
});

// POST /api/push/send-multiple - Envia notificação para múltiplos usuários
router.post('/send-multiple', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userIds, notification } = req.body;
    const validatedNotification = NotificationSchema.parse(notification);

    // Verifica permissão
    if (!['gestor', 'coordenador'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Sem permissão para enviar notificações' });
    }

    // Busca todas as inscrições dos usuários
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Nenhuma inscrição encontrada' });
    }

    // Salva notificações no banco para cada usuário
    const notificationPromises = userIds.map(async (userId: string) => {
      const [notification] = await db
        .insert(notifications)
        .values({
          userId,
          type: validatedNotification.type || 'system',
          title: validatedNotification.title,
          message: validatedNotification.body,
          data: validatedNotification.data,
          priority: validatedNotification.requireInteraction ? 'high' : 'normal',
          createdAt: new Date()
        })
        .returning();
      return notification;
    });

    await Promise.all(notificationPromises);

    // Envia push para todas as inscrições
    const payload = JSON.stringify({
      ...validatedNotification,
      timestamp: Date.now()
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
        return { success: true, userId: sub.userId };
      } catch (error: any) {
        if (error.statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        }
        return { success: false, userId: sub.userId, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Notificação enviada para ${successful}/${subscriptions.length} dispositivos`,
      results
    });
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    res.status(400).json({ error: 'Erro ao enviar notificações' });
  }
});

// POST /api/push/send-role - Envia notificação para todos de um role
router.post('/send-role', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { role, notification } = req.body;
    const validatedNotification = NotificationSchema.parse(notification);

    // Verifica permissão
    if (req.user!.role !== 'gestor') {
      return res.status(403).json({ error: 'Apenas gestores podem enviar para roles' });
    }

    // Busca todos os usuários do role
    const usersInRole = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, role));

    const userIds = usersInRole.map(u => u.id);

    if (userIds.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado para o role' });
    }

    // Usa a função de envio múltiplo
    req.body.userIds = userIds;
    return router.handle(req, res);
  } catch (error) {
    console.error('Erro ao enviar para role:', error);
    res.status(400).json({ error: 'Erro ao enviar notificação para role' });
  }
});

// GET /api/push/test - Envia notificação de teste
router.post('/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Busca as inscrições do usuário
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Você não tem inscrições ativas' });
    }

    const testNotification = {
      title: '🔔 Teste de Notificação',
      body: 'Esta é uma notificação de teste do sistema MESC. Se você está vendo isso, as notificações estão funcionando corretamente!',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        type: 'test',
        timestamp: Date.now()
      }
    };

    const payload = JSON.stringify(testNotification);

    // Envia para todas as inscrições
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            payload
          );
          return { success: true };
        } catch (error) {
          return { success: false, error };
        }
      })
    );

    const successful = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Teste enviado para ${successful}/${subscriptions.length} dispositivos`
    });
  } catch (error) {
    console.error('Erro ao enviar teste:', error);
    res.status(400).json({ error: 'Erro ao enviar notificação de teste' });
  }
});

// GET /api/push/stats - Estatísticas de push
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Verifica permissão
    if (!['gestor', 'coordenador'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Sem permissão para ver estatísticas' });
    }

    // Total de inscrições
    const totalSubscriptions = await db
      .select({ count: count() })
      .from(pushSubscriptions);

    // Inscrições por usuário
    const subscriptionsByUser = await db
      .select({
        userId: pushSubscriptions.userId,
        count: count()
      })
      .from(pushSubscriptions)
      .groupBy(pushSubscriptions.userId);

    // Notificações enviadas (últimas 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentNotifications = await db
      .select({
        type: notifications.type,
        count: count()
      })
      .from(notifications)
      .where(gte(notifications.createdAt, thirtyDaysAgo))
      .groupBy(notifications.type);

    res.json({
      totalSubscriptions: totalSubscriptions[0].count,
      uniqueUsers: subscriptionsByUser.length,
      subscriptionsByUser,
      recentNotifications
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;