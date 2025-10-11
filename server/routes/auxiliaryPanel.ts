import { Router, Response } from "express";
import { db } from "../db";
import {
  schedules,
  users,
  massExecutionLogs,
  standbyMinisters,
  ministerCheckIns,
  notifications
} from "@shared/schema";
import { authenticateToken as requireAuth, AuthRequest } from "../auth";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { format, addHours, subHours, isWithinInterval, parseISO } from 'date-fns';

const router = Router();

/**
 * Helper: Check if user is auxiliary (position 1 or 2) for a specific schedule
 */
async function isAuxiliaryForMass(userId: string, scheduleId: string): Promise<boolean> {
  const assignment = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.id, scheduleId),
        eq(schedules.ministerId, userId),
        inArray(schedules.position, [1, 2])
      )
    )
    .limit(1);

  return assignment.length > 0;
}

/**
 * Helper: Check if current time is within allowed window for auxiliary operations
 * (-1 hour before mass to +2 hours after mass)
 */
function isWithinAllowedWindow(massDate: string, massTime: string): boolean {
  try {
    const massDateTime = parseISO(`${massDate}T${massTime}`);
    const now = new Date();
    const windowStart = subHours(massDateTime, 1);
    const windowEnd = addHours(massDateTime, 2);

    return isWithinInterval(now, { start: windowStart, end: windowEnd });
  } catch (error) {
    console.error('Error checking time window:', error);
    return false;
  }
}

/**
 * GET /api/auxiliary/panel/:scheduleId
 * Get full schedule information for auxiliary panel
 */
router.get("/panel/:scheduleId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // First, get the schedule to check mass time
    const massSchedule = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (massSchedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    const schedule = massSchedule[0];

    // Check if user is auxiliary for this mass
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);

    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso permitido apenas para Auxiliares 1 e 2 desta missa" });
    }

    // Check if within allowed time window
    if (!isWithinAllowedWindow(schedule.date, schedule.time)) {
      return res.status(403).json({
        message: "Painel do Auxiliar disponível apenas de 1h antes até 2h depois da missa",
        allowedWindow: {
          start: format(subHours(parseISO(`${schedule.date}T${schedule.time}`), 1), 'HH:mm'),
          end: format(addHours(parseISO(`${schedule.date}T${schedule.time}`), 2), 'HH:mm')
        }
      });
    }

    // Get all ministers assigned to this mass
    const allAssignments = await db
      .select({
        id: schedules.id,
        ministerId: schedules.ministerId,
        position: schedules.position,
        ministerName: users.name,
        ministerPhone: users.phone,
        ministerWhatsapp: users.whatsapp,
        onSiteAdjustments: schedules.onSiteAdjustments
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          eq(schedules.date, schedule.date),
          eq(schedules.time, schedule.time),
          eq(schedules.status, 'scheduled')
        )
      )
      .orderBy(schedules.position);

    // Get check-in status
    const checkIns = await db
      .select()
      .from(ministerCheckIns)
      .where(eq(ministerCheckIns.scheduleId, scheduleId));

    // Get standby ministers
    const standbyList = await db
      .select({
        id: standbyMinisters.id,
        ministerId: standbyMinisters.ministerId,
        ministerName: users.name,
        ministerPhone: users.phone,
        ministerWhatsapp: users.whatsapp,
        confirmedAvailable: standbyMinisters.confirmedAvailable,
        calledAt: standbyMinisters.calledAt,
        response: standbyMinisters.response,
        assignedPosition: standbyMinisters.assignedPosition
      })
      .from(standbyMinisters)
      .leftJoin(users, eq(standbyMinisters.ministerId, users.id))
      .where(eq(standbyMinisters.scheduleId, scheduleId));

    // Get execution log if exists
    const executionLog = await db
      .select()
      .from(massExecutionLogs)
      .where(eq(massExecutionLogs.scheduleId, scheduleId))
      .limit(1);

    // Calculate current time relative to mass
    const massDateTime = parseISO(`${schedule.date}T${schedule.time}`);
    const now = new Date();
    const minutesUntilMass = Math.floor((massDateTime.getTime() - now.getTime()) / (1000 * 60));

    // Determine current view phase
    let currentPhase: 'pre-mass' | 'during-mass' | 'post-mass';
    if (minutesUntilMass > 30) {
      currentPhase = 'pre-mass';
    } else if (minutesUntilMass > -30) {
      currentPhase = 'during-mass';
    } else {
      currentPhase = 'post-mass';
    }

    res.json({
      success: true,
      data: {
        massInfo: {
          id: scheduleId,
          date: schedule.date,
          time: schedule.time,
          type: schedule.type,
          location: schedule.location
        },
        currentPhase,
        minutesUntilMass,
        assignments: allAssignments.map(a => ({
          id: a.id,
          ministerId: a.ministerId,
          ministerName: a.ministerName,
          phone: a.ministerPhone,
          whatsapp: a.ministerWhatsapp,
          position: a.position,
          onSiteAdjustments: a.onSiteAdjustments,
          checkInStatus: checkIns.find(c => c.ministerId === a.ministerId)?.status || 'not-checked-in',
          checkInTime: checkIns.find(c => c.ministerId === a.ministerId)?.checkedInAt
        })),
        standbyMinisters: standbyList,
        executionLog: executionLog.length > 0 ? executionLog[0] : null,
        statistics: {
          totalPositions: allAssignments.length,
          checkedIn: checkIns.filter(c => c.status === 'present').length,
          absent: checkIns.filter(c => c.status === 'absent').length,
          standbyCalled: standbyList.filter(s => s.calledAt !== null).length
        }
      }
    });

  } catch (error: any) {
    console.error("[AUXILIARY_PANEL] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao carregar painel do auxiliar"
    });
  }
});

/**
 * GET /api/auxiliary/standby/:scheduleId
 * Get available standby ministers for emergency calls
 */
router.get("/standby/:scheduleId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Check if user is auxiliary
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    // Get mass date/time
    const massInfo = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (massInfo.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    const { date, time } = massInfo[0];

    // Find ministers who marked "disponível para cobrir" for this date
    // (This would need to query questionnaire responses)
    const availableStandby = await db
      .select({
        ministerId: users.id,
        ministerName: users.name,
        phone: users.phone,
        whatsapp: users.whatsapp,
        totalServices: users.totalServices,
        lastService: users.lastService
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          eq(users.role, 'ministro')
        )
      )
      .limit(20);

    // Filter out ministers already assigned to this mass
    const assignedMinisters = await db
      .select({ ministerId: schedules.ministerId })
      .from(schedules)
      .where(
        and(
          eq(schedules.date, date),
          eq(schedules.time, time)
        )
      );

    const assignedIds = new Set(assignedMinisters.map(a => a.ministerId).filter(Boolean));
    const standbyOptions = availableStandby.filter(m => !assignedIds.has(m.ministerId));

    res.json({
      success: true,
      data: standbyOptions.slice(0, 10) // Top 10 most suitable
    });

  } catch (error: any) {
    console.error("[AUXILIARY_STANDBY] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao buscar ministros suplentes"
    });
  }
});

/**
 * POST /api/auxiliary/check-in
 * Mark minister as present
 */
router.post("/check-in", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId, ministerId, status, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Verify auxiliary permissions
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    // Get minister's position
    const assignment = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.id, scheduleId),
          eq(schedules.ministerId, ministerId)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ message: "Ministro não encontrado nesta escala" });
    }

    const position = assignment[0].position || 0;

    // Create or update check-in
    const existingCheckIn = await db
      .select()
      .from(ministerCheckIns)
      .where(
        and(
          eq(ministerCheckIns.scheduleId, scheduleId),
          eq(ministerCheckIns.ministerId, ministerId)
        )
      )
      .limit(1);

    if (existingCheckIn.length > 0) {
      // Update existing
      await db
        .update(ministerCheckIns)
        .set({
          status,
          notes,
          checkedInAt: new Date()
        })
        .where(eq(ministerCheckIns.id, existingCheckIn[0].id));
    } else {
      // Create new
      await db.insert(ministerCheckIns).values({
        scheduleId,
        ministerId,
        position,
        status,
        notes,
        checkedInBy: userId
      });
    }

    // Broadcast update via WebSocket
    // TODO: Implement WebSocket broadcast

    res.json({
      success: true,
      message: `Ministro marcado como ${status}`
    });

  } catch (error: any) {
    console.error("[AUXILIARY_CHECKIN] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao registrar presença"
    });
  }
});

/**
 * PUT /api/auxiliary/redistribute
 * Save position changes during mass
 */
router.put("/redistribute", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId, changes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Verify auxiliary permissions
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    // Validate changes format
    if (!Array.isArray(changes)) {
      return res.status(400).json({ message: "Formato de mudanças inválido" });
    }

    // Apply each change
    const appliedChanges = [];
    for (const change of changes) {
      const { ministerId, fromPosition, toPosition, reason } = change;

      // Update position
      await db
        .update(schedules)
        .set({ position: toPosition })
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.ministerId, ministerId),
            eq(schedules.position, fromPosition)
          )
        );

      appliedChanges.push({
        type: 'position_change',
        ministerId,
        fromPosition,
        toPosition,
        timestamp: new Date().toISOString(),
        details: reason
      });
    }

    // Log changes to execution log
    const existingLog = await db
      .select()
      .from(massExecutionLogs)
      .where(eq(massExecutionLogs.scheduleId, scheduleId))
      .limit(1);

    if (existingLog.length > 0) {
      const currentChanges = existingLog[0].changesMade || [];
      await db
        .update(massExecutionLogs)
        .set({
          changesMade: [...currentChanges, ...appliedChanges]
        })
        .where(eq(massExecutionLogs.id, existingLog[0].id));
    } else {
      await db.insert(massExecutionLogs).values({
        scheduleId,
        auxiliaryId: userId,
        changesMade: appliedChanges
      });
    }

    res.json({
      success: true,
      message: `${appliedChanges.length} mudanças aplicadas com sucesso`
    });

  } catch (error: any) {
    console.error("[AUXILIARY_REDISTRIBUTE] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao redistribuir posições"
    });
  }
});

/**
 * POST /api/auxiliary/call-standby
 * Send urgent notification to standby minister
 */
router.post("/call-standby", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId, ministerId, position } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Verify auxiliary permissions
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    // Get mass info
    const massInfo = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (massInfo.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    const { date, time } = massInfo[0];

    // Get auxiliary name
    const auxiliary = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const auxiliaryName = auxiliary[0]?.name || 'Auxiliar';

    // Record standby call
    await db.insert(standbyMinisters).values({
      scheduleId,
      ministerId,
      calledAt: new Date(),
      calledBy: userId,
      response: 'pending',
      assignedPosition: position
    });

    // Send urgent notification
    await db.insert(notifications).values({
      userId: ministerId,
      type: 'schedule',
      title: '🚨 Chamada Urgente de Suplência',
      message: `${auxiliaryName} está convocando você para a missa de ${format(parseISO(date), 'dd/MM/yyyy')} às ${time}. Posição: ${position}`,
      priority: 'high',
      data: {
        scheduleId,
        position,
        calledBy: userId,
        massDate: date,
        massTime: time
      }
    });

    // TODO: Send push notification and WhatsApp message

    res.json({
      success: true,
      message: "Suplente convocado com sucesso"
    });

  } catch (error: any) {
    console.error("[AUXILIARY_CALL_STANDBY] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao convocar suplente"
    });
  }
});

/**
 * POST /api/auxiliary/mass-report
 * Submit post-mass report
 */
router.post("/mass-report", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      scheduleId,
      attendance,
      massQuality,
      comments,
      incidents,
      highlights
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Verify auxiliary permissions
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    // Check if report already exists
    const existingLog = await db
      .select()
      .from(massExecutionLogs)
      .where(eq(massExecutionLogs.scheduleId, scheduleId))
      .limit(1);

    if (existingLog.length > 0) {
      // Update existing
      await db
        .update(massExecutionLogs)
        .set({
          attendance,
          massQuality,
          comments,
          incidents,
          highlights
        })
        .where(eq(massExecutionLogs.id, existingLog[0].id));
    } else {
      // Create new
      await db.insert(massExecutionLogs).values({
        scheduleId,
        auxiliaryId: userId,
        attendance,
        massQuality,
        comments,
        incidents,
        highlights
      });
    }

    // Update minister attendance records
    if (attendance && Array.isArray(attendance)) {
      for (const record of attendance) {
        if (record.absent) {
          // Update user's last service date only if they showed up
          continue;
        }

        if (record.checkedIn && record.ministerId) {
          await db
            .update(users)
            .set({
              lastService: new Date(),
              totalServices: sql`${users.totalServices} + 1`
            })
            .where(eq(users.id, record.ministerId));
        }
      }
    }

    // Notify coordinators if there were incidents
    if (incidents && incidents.length > 0) {
      const coordinators = await db
        .select()
        .from(users)
        .where(
          and(
            inArray(users.role, ['coordenador', 'gestor']),
            eq(users.status, 'active')
          )
        );

      for (const coordinator of coordinators) {
        await db.insert(notifications).values({
          userId: coordinator.id,
          type: 'announcement',
          title: 'Relatório de Missa com Incidentes',
          message: `O auxiliar reportou ${incidents.length} incidente(s) na missa de ${scheduleId}`,
          data: { scheduleId, incidents }
        });
      }
    }

    res.json({
      success: true,
      message: "Relatório enviado com sucesso"
    });

  } catch (error: any) {
    console.error("[AUXILIARY_REPORT] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao enviar relatório"
    });
  }
});

export default router;
