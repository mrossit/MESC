/**
 * Schedule Confirmations Routes
 *
 * Handles minister confirmation of scheduled masses
 */

import { Router, Response } from "express";
import { z } from "zod";
import { authenticateToken as requireAuth, AuthRequest, requireRole } from "../auth";
import { db } from "../db";
import { scheduleConfirmations, schedules, users, notifications } from "@shared/schema";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendPushNotificationToUsers } from "../utils/pushNotifications";
import { notifyUsers } from "../websocket";

const router = Router();

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

// Confirmation status type
type ConfirmationStatus = 'pending' | 'confirmed' | 'declined' | 'no_response' | 'no_show';

// Schemas
const createConfirmationSchema = z.object({
  scheduleId: z.string().uuid(),
  ministerId: z.string(),
});

const bulkCreateConfirmationSchema = z.object({
  scheduleIds: z.array(z.string().uuid()),
  sendNotifications: z.boolean().default(true),
});

const respondConfirmationSchema = z.object({
  status: z.enum(['confirmed', 'declined']),
  declineReason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/confirmations
 * List all confirmations (with filters)
 */
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const { scheduleId, ministerId, status, startDate, endDate } = req.query;

    let query = db
      .select({
        id: scheduleConfirmations.id,
        scheduleId: scheduleConfirmations.scheduleId,
        ministerId: scheduleConfirmations.ministerId,
        status: scheduleConfirmations.status,
        requestedAt: scheduleConfirmations.requestedAt,
        respondedAt: scheduleConfirmations.respondedAt,
        reminderCount: scheduleConfirmations.reminderCount,
        declineReason: scheduleConfirmations.declineReason,
        notes: scheduleConfirmations.notes,
        // Schedule info
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
        schedulePosition: schedules.position,
        // Minister info
        ministerName: users.name,
        ministerPhone: users.phone,
      })
      .from(scheduleConfirmations)
      .innerJoin(schedules, eq(scheduleConfirmations.scheduleId, schedules.id))
      .innerJoin(users, eq(scheduleConfirmations.ministerId, users.id))
      .$dynamic();

    // Apply filters
    const conditions = [];

    // Ministros can only see their own confirmations
    if (userRole === 'ministro') {
      conditions.push(eq(scheduleConfirmations.ministerId, userId));
    } else if (ministerId) {
      conditions.push(eq(scheduleConfirmations.ministerId, ministerId as string));
    }

    if (scheduleId) {
      conditions.push(eq(scheduleConfirmations.scheduleId, scheduleId as string));
    }

    if (status) {
      conditions.push(eq(scheduleConfirmations.status, status as ConfirmationStatus));
    }

    if (startDate) {
      conditions.push(gte(schedules.date, startDate as string));
    }

    if (endDate) {
      conditions.push(lte(schedules.date, endDate as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const confirmationsList = await query.orderBy(desc(schedules.date), schedules.time);

    res.json(confirmationsList);

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_LIST] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
});

/**
 * GET /api/confirmations/pending
 * Get pending confirmations for the current user
 */
router.get("/pending", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    const pendingConfirmations = await db
      .select({
        id: scheduleConfirmations.id,
        scheduleId: scheduleConfirmations.scheduleId,
        status: scheduleConfirmations.status,
        requestedAt: scheduleConfirmations.requestedAt,
        reminderCount: scheduleConfirmations.reminderCount,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
        schedulePosition: schedules.position,
        scheduleLocation: schedules.location,
      })
      .from(scheduleConfirmations)
      .innerJoin(schedules, eq(scheduleConfirmations.scheduleId, schedules.id))
      .where(
        and(
          eq(scheduleConfirmations.ministerId, userId),
          eq(scheduleConfirmations.status, 'pending'),
          gte(schedules.date, today)
        )
      )
      .orderBy(schedules.date, schedules.time);

    res.json(pendingConfirmations);

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_PENDING] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
});

/**
 * GET /api/confirmations/schedule/:scheduleId
 * Get confirmation status for a specific schedule
 */
router.get("/schedule/:scheduleId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;

    const confirmations = await db
      .select({
        id: scheduleConfirmations.id,
        ministerId: scheduleConfirmations.ministerId,
        status: scheduleConfirmations.status,
        requestedAt: scheduleConfirmations.requestedAt,
        respondedAt: scheduleConfirmations.respondedAt,
        declineReason: scheduleConfirmations.declineReason,
        ministerName: users.name,
        ministerPhone: users.phone,
        position: schedules.position,
      })
      .from(scheduleConfirmations)
      .innerJoin(users, eq(scheduleConfirmations.ministerId, users.id))
      .innerJoin(schedules, eq(scheduleConfirmations.scheduleId, schedules.id))
      .where(eq(scheduleConfirmations.scheduleId, scheduleId))
      .orderBy(schedules.position);

    // Calculate summary
    type ConfirmationRecord = typeof confirmations[number];
    const summary = {
      total: confirmations.length,
      confirmed: confirmations.filter((c: ConfirmationRecord) => c.status === 'confirmed').length,
      declined: confirmations.filter((c: ConfirmationRecord) => c.status === 'declined').length,
      pending: confirmations.filter((c: ConfirmationRecord) => c.status === 'pending').length,
      noResponse: confirmations.filter((c: ConfirmationRecord) => c.status === 'no_response').length,
    };

    res.json({ confirmations, summary });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_SCHEDULE] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
});

/**
 * POST /api/confirmations
 * Create confirmation request for a specific minister/schedule
 */
router.post("/", requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const parsed = createConfirmationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
    }

    const { scheduleId, ministerId } = parsed.data;

    // Check if schedule exists
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    // Check if confirmation already exists
    const [existing] = await db
      .select()
      .from(scheduleConfirmations)
      .where(
        and(
          eq(scheduleConfirmations.scheduleId, scheduleId),
          eq(scheduleConfirmations.ministerId, ministerId)
        )
      );

    if (existing) {
      return res.status(409).json({ message: "Confirmação já existe para este ministro/escala" });
    }

    // Create confirmation
    const [confirmation] = await db
      .insert(scheduleConfirmations)
      .values({
        scheduleId,
        ministerId,
        status: 'pending',
        requestedBy: userId,
      })
      .returning();

    // Get minister info for notification
    const [minister] = await db
      .select()
      .from(users)
      .where(eq(users.id, ministerId));

    // Create notification
    await db.insert(notifications).values({
      userId: ministerId,
      type: 'schedule',
      title: '📋 Confirmação de Presença',
      message: `Por favor confirme sua presença na missa de ${format(parseISO(schedule.date), 'dd/MM/yyyy', { locale: ptBR })} às ${schedule.time}`,
      priority: 'medium',
      actionUrl: '/confirmations',
      data: { scheduleId, confirmationId: confirmation.id }
    });

    // Send push notification
    await sendPushNotificationToUsers([ministerId], {
      title: '📋 Confirmação de Presença',
      body: `Confirme sua presença na missa de ${format(parseISO(schedule.date), 'dd/MM', { locale: ptBR })} às ${schedule.time}`,
      url: '/confirmations',
      data: { scheduleId, confirmationId: confirmation.id }
    });

    // Notify via WebSocket
    notifyUsers([ministerId], {
      id: confirmation.id,
      title: '📋 Confirmação de Presença',
      message: 'Você tem uma nova solicitação de confirmação',
      type: 'schedule',
      actionUrl: '/confirmations',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      confirmation,
      message: "Confirmação criada e notificação enviada"
    });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_CREATE] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao criar confirmação" });
  }
});

/**
 * POST /api/confirmations/bulk
 * Create confirmation requests for all ministers in multiple schedules
 */
router.post("/bulk", requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const parsed = bulkCreateConfirmationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
    }

    const { scheduleIds, sendNotifications } = parsed.data;

    // Get all schedules with their ministers
    const schedulesWithMinisters = await db
      .select({
        scheduleId: schedules.id,
        ministerId: schedules.ministerId,
        date: schedules.date,
        time: schedules.time,
      })
      .from(schedules)
      .where(inArray(schedules.id, scheduleIds));

    // Get existing confirmations
    const existingConfirmations = await db
      .select()
      .from(scheduleConfirmations)
      .where(inArray(scheduleConfirmations.scheduleId, scheduleIds));

    type ExistingConfirmation = typeof existingConfirmations[number];
    const existingSet = new Set(
      existingConfirmations.map((c: ExistingConfirmation) => `${c.scheduleId}-${c.ministerId}`)
    );

    // Filter out existing and create new
    type ScheduleWithMinister = typeof schedulesWithMinisters[number];
    const toCreate = schedulesWithMinisters
      .filter((s: ScheduleWithMinister) => s.ministerId && !existingSet.has(`${s.scheduleId}-${s.ministerId}`))
      .map((s: ScheduleWithMinister) => ({
        scheduleId: s.scheduleId,
        ministerId: s.ministerId!,
        status: 'pending' as const,
        requestedBy: userId,
      }));

    if (toCreate.length === 0) {
      return res.json({
        success: true,
        created: 0,
        message: "Todas as confirmações já existem"
      });
    }

    // Insert all confirmations
    const created = await db
      .insert(scheduleConfirmations)
      .values(toCreate)
      .returning();

    // Send notifications if requested
    if (sendNotifications) {
      type ToCreateItem = typeof toCreate[number];
      const ministerIdSet = new Set<string>();
      toCreate.forEach((c: ToCreateItem) => ministerIdSet.add(c.ministerId));
      const ministerIds: string[] = Array.from(ministerIdSet);

      // Create notifications for each minister
      for (const ministerId of ministerIds) {
        await db.insert(notifications).values({
          userId: ministerId,
          type: 'schedule',
          title: '📋 Confirmação de Presença',
          message: `Você tem ${toCreate.filter((c: ToCreateItem) => c.ministerId === ministerId).length} missa(s) aguardando confirmação`,
          priority: 'medium',
          actionUrl: '/confirmations',
        });
      }

      // Send push notifications
      await sendPushNotificationToUsers(ministerIds, {
        title: '📋 Confirmação de Presença',
        body: 'Você tem missas aguardando confirmação de presença',
        url: '/confirmations',
      });
    }

    res.status(201).json({
      success: true,
      created: created.length,
      message: `${created.length} confirmações criadas`
    });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_BULK] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao criar confirmações em lote" });
  }
});

/**
 * PATCH /api/confirmations/:id
 * Minister responds to confirmation (confirm/decline)
 */
router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const parsed = respondConfirmationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
    }

    const { status, declineReason, notes } = parsed.data;

    // Get confirmation
    const [confirmation] = await db
      .select()
      .from(scheduleConfirmations)
      .where(eq(scheduleConfirmations.id, id));

    if (!confirmation) {
      return res.status(404).json({ message: "Confirmação não encontrada" });
    }

    // Check permission: only the minister or coordinators can respond
    if (confirmation.ministerId !== userId && !['gestor', 'coordenador'].includes(req.user?.role || '')) {
      return res.status(403).json({ message: "Sem permissão para responder esta confirmação" });
    }

    // Update confirmation
    const [updated] = await db
      .update(scheduleConfirmations)
      .set({
        status,
        respondedAt: new Date(),
        declineReason: status === 'declined' ? declineReason : null,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(scheduleConfirmations.id, id))
      .returning();

    // Get schedule info for notification
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, confirmation.scheduleId));

    // Notify coordinators if declined
    if (status === 'declined' && schedule) {
      const coordinators = await db
        .select()
        .from(users)
        .where(inArray(users.role, ['gestor', 'coordenador']));

      type CoordinatorRecord = typeof coordinators[number];
      const coordIds = coordinators.map((c: CoordinatorRecord) => c.id);

      // Get minister name
      const [minister] = await db
        .select()
        .from(users)
        .where(eq(users.id, confirmation.ministerId));

      await sendPushNotificationToUsers(coordIds, {
        title: '⚠️ Confirmação Recusada',
        body: `${minister?.name} recusou a missa de ${format(parseISO(schedule.date), 'dd/MM', { locale: ptBR })} às ${schedule.time}`,
        url: `/schedules?date=${schedule.date}`,
        data: { scheduleId: schedule.id, ministerId: confirmation.ministerId }
      });
    }

    res.json({
      success: true,
      confirmation: updated,
      message: status === 'confirmed' ? 'Presença confirmada!' : 'Presença recusada'
    });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_RESPOND] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao responder confirmação" });
  }
});

/**
 * POST /api/confirmations/:id/reminder
 * Send reminder for a specific confirmation
 */
router.post("/:id/reminder", requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get confirmation with schedule info
    const [confirmation] = await db
      .select({
        id: scheduleConfirmations.id,
        ministerId: scheduleConfirmations.ministerId,
        reminderCount: scheduleConfirmations.reminderCount,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
      })
      .from(scheduleConfirmations)
      .innerJoin(schedules, eq(scheduleConfirmations.scheduleId, schedules.id))
      .where(eq(scheduleConfirmations.id, id));

    if (!confirmation) {
      return res.status(404).json({ message: "Confirmação não encontrada" });
    }

    // Update reminder count
    await db
      .update(scheduleConfirmations)
      .set({
        reminderSentAt: new Date(),
        reminderCount: (confirmation.reminderCount || 0) + 1,
      })
      .where(eq(scheduleConfirmations.id, id));

    // Send notification
    await db.insert(notifications).values({
      userId: confirmation.ministerId,
      type: 'reminder',
      title: '⏰ Lembrete de Confirmação',
      message: `Por favor confirme sua presença na missa de ${format(parseISO(confirmation.scheduleDate), 'dd/MM/yyyy', { locale: ptBR })} às ${confirmation.scheduleTime}`,
      priority: 'high',
      actionUrl: '/confirmations',
    });

    // Send push
    await sendPushNotificationToUsers([confirmation.ministerId], {
      title: '⏰ Lembrete de Confirmação',
      body: `Confirme sua presença na missa de ${format(parseISO(confirmation.scheduleDate), 'dd/MM', { locale: ptBR })}`,
      url: '/confirmations',
    });

    res.json({
      success: true,
      message: "Lembrete enviado"
    });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_REMINDER] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao enviar lembrete" });
  }
});

/**
 * POST /api/confirmations/send-reminders
 * Send reminders for all pending confirmations
 */
router.post("/send-reminders", requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    const { daysAhead = 3 } = req.body;
    const today = format(new Date(), 'yyyy-MM-dd');
    const targetDate = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');

    // Get pending confirmations for upcoming masses
    const pendingConfirmations = await db
      .select({
        id: scheduleConfirmations.id,
        ministerId: scheduleConfirmations.ministerId,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
      })
      .from(scheduleConfirmations)
      .innerJoin(schedules, eq(scheduleConfirmations.scheduleId, schedules.id))
      .where(
        and(
          eq(scheduleConfirmations.status, 'pending'),
          gte(schedules.date, today),
          lte(schedules.date, targetDate)
        )
      );

    if (pendingConfirmations.length === 0) {
      return res.json({
        success: true,
        sent: 0,
        message: "Nenhuma confirmação pendente para enviar lembretes"
      });
    }

    // Group by minister
    const byMinister: Record<string, typeof pendingConfirmations> = {};
    for (const conf of pendingConfirmations) {
      if (!byMinister[conf.ministerId]) {
        byMinister[conf.ministerId] = [];
      }
      byMinister[conf.ministerId].push(conf);
    }

    // Send reminders
    let sent = 0;
    for (const [ministerId, confs] of Object.entries(byMinister)) {
      const count = confs.length;

      await db.insert(notifications).values({
        userId: ministerId,
        type: 'reminder',
        title: '⏰ Confirmações Pendentes',
        message: `Você tem ${count} missa(s) aguardando confirmação de presença`,
        priority: 'high',
        actionUrl: '/confirmations',
      });

      // Update reminder count for all confirmations
      for (const conf of confs) {
        await db
          .update(scheduleConfirmations)
          .set({
            reminderSentAt: new Date(),
            reminderCount: sql`${scheduleConfirmations.reminderCount} + 1`,
          })
          .where(eq(scheduleConfirmations.id, conf.id));
      }

      sent++;
    }

    // Send push notifications
    const ministerIds = Object.keys(byMinister);
    await sendPushNotificationToUsers(ministerIds, {
      title: '⏰ Confirmações Pendentes',
      body: 'Você tem missas aguardando confirmação de presença',
      url: '/confirmations',
    });

    res.json({
      success: true,
      sent,
      message: `Lembretes enviados para ${sent} ministro(s)`
    });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_SEND_REMINDERS] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao enviar lembretes" });
  }
});

/**
 * GET /api/confirmations/stats
 * Get confirmation statistics
 */
router.get("/stats", requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const conditions = [];
    if (startDate) {
      conditions.push(gte(schedules.date, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(schedules.date, endDate as string));
    }

    const stats = await db
      .select({
        status: scheduleConfirmations.status,
        count: sql<number>`count(*)`,
      })
      .from(scheduleConfirmations)
      .innerJoin(schedules, eq(scheduleConfirmations.scheduleId, schedules.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(scheduleConfirmations.status);

    const result: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      declined: 0,
      no_response: 0,
      no_show: 0,
      total: 0,
    };

    for (const stat of stats) {
      result[stat.status] = Number(stat.count);
      result.total += Number(stat.count);
    }

    res.json(result);

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_STATS] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao buscar estatísticas" });
  }
});

/**
 * DELETE /api/confirmations/:id
 * Delete a confirmation (coordinators only)
 */
router.delete("/:id", requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(scheduleConfirmations).where(eq(scheduleConfirmations.id, id));

    res.json({
      success: true,
      message: "Confirmação removida"
    });

  } catch (error: unknown) {
    console.error("[CONFIRMATIONS_DELETE] Error:", error);
    res.status(500).json({ message: getErrorMessage(error) || "Erro ao remover confirmação" });
  }
});

export default router;
