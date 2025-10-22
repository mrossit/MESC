import { Router } from "express";
import { db } from "../db";
import { substitutionRequests, schedules, users, questionnaireResponses, questionnaires } from "@shared/schema";
import { eq, and, sql, gte, desc, count, notInArray, inArray } from "drizzle-orm";
import { authenticateToken as requireAuth, AuthRequest } from "../auth";

const router = Router();

// Calcular urgência baseada no tempo até a missa
function calculateUrgency(massDateStr: string, massTime: string): "low" | "medium" | "high" | "critical" {
  const now = new Date();
  const [year, month, day] = massDateStr.split('-').map(Number);
  const [hours, minutes] = massTime.split(':').map(Number);
  // Use Date.UTC to create a UTC date, then convert to local Date object
  // This ensures consistent timezone handling
  const massDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilMass < 12) return "critical";
  if (hoursUntilMass < 24) return "high";
  if (hoursUntilMass < 72) return "medium";
  return "low";
}

// Verificar se solicitação deve ser auto-aprovada (> 12h antes)
function shouldAutoApprove(massDateStr: string, massTime: string): boolean {
  const now = new Date();
  const [year, month, day] = massDateStr.split('-').map(Number);
  const [hours, minutes] = massTime.split(':').map(Number);
  // Use Date.UTC to create a UTC date, then convert to local Date object
  // This ensures consistent timezone handling
  const massDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilMass >= 12;
}

// Contar substituições do ministro no mês atual
async function countMonthlySubstitutions(requesterId: string): Promise<number> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await db
    .select({ count: count() })
    .from(substitutionRequests)
    .where(
      and(
        eq(substitutionRequests.requesterId, requesterId),
        gte(substitutionRequests.createdAt, firstDayOfMonth),
        sql`${substitutionRequests.createdAt} <= ${lastDayOfMonth}`
      )
    );

  return result[0]?.count || 0;
}

// Buscar suplente disponível automaticamente
async function findAvailableSubstitute(massDate: string, massTime: string): Promise<string | null> {
  try {
    // 1. Buscar o questionário ativo do mês/ano da missa
    const [year, month] = massDate.split('-').map(Number);

    const [activeQuestionnaire] = await db
      .select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.year, year),
          eq(questionnaires.month, month),
          eq(questionnaires.status, 'published')
        )
      )
      .limit(1);

    if (!activeQuestionnaire) {
      console.log('Nenhum questionário ativo encontrado para', year, month);
      return null;
    }

    // 2. Buscar ministros já escalados para aquela data/hora
    const scheduledMinisters = await db
      .select({ ministerId: schedules.ministerId })
      .from(schedules)
      .where(
        and(
          eq(schedules.date, massDate),
          eq(schedules.time, massTime),
          eq(schedules.status, 'scheduled')
        )
      );

    const scheduledMinisterIds = scheduledMinisters
      .map((s: any) => s.ministerId)
      .filter((id: any) => id !== null) as string[];

    // 3. Buscar respostas de ministros que indicaram disponibilidade
    // Converter data para formato do domingo (YYYY-MM-DD)
    console.log('scheduledMinisterIds:', scheduledMinisterIds);

    const baseConditions = [
      eq(questionnaireResponses.questionnaireId, activeQuestionnaire.id),
      eq(users.status, 'active'),
      eq(users.role, 'ministro')
    ];

    // Só adiciona notInArray se houver ministros escalados
    if (scheduledMinisterIds.length > 0) {
      baseConditions.push(notInArray(questionnaireResponses.userId, scheduledMinisterIds));
    }

    const availableResponses = await db
      .select({
        userId: questionnaireResponses.userId,
        availableSundays: questionnaireResponses.availableSundays,
        preferredMassTimes: questionnaireResponses.preferredMassTimes,
        canSubstitute: questionnaireResponses.canSubstitute,
        userName: users.name,
        lastService: users.lastService
      })
      .from(questionnaireResponses)
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(and(...baseConditions));

    // 4. Filtrar ministros que indicaram disponibilidade para aquela data
    const eligibleMinisters = availableResponses.filter((response: any) => {
      // Verificar se o ministro marcou disponibilidade para aquele domingo
      const availableSundays = response.availableSundays as string[] || [];
      const isDateAvailable = availableSundays.includes(massDate);

      // Verificar se pode substituir
      const canSubstitute = response.canSubstitute ?? false;

      return isDateAvailable && canSubstitute;
    });

    if (eligibleMinisters.length === 0) {
      console.log('Nenhum suplente elegível encontrado para', massDate, massTime);
      return null;
    }

    // 5. Priorizar por:
    // - Menos serviços recentes (lastService mais antigo ou null)
    // - Que preferiu este horário
    eligibleMinisters.sort((a: any, b: any) => {
      // Primeiro, verificar se preferiu o horário
      const aPreferredTimes = (a.preferredMassTimes as string[]) || [];
      const bPreferredTimes = (b.preferredMassTimes as string[]) || [];
      const aPreferred = aPreferredTimes.includes(massTime);
      const bPreferred = bPreferredTimes.includes(massTime);

      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;

      // Depois, ordenar por lastService (mais antigo primeiro)
      const aLastService = a.lastService ? new Date(a.lastService).getTime() : 0;
      const bLastService = b.lastService ? new Date(b.lastService).getTime() : 0;

      return aLastService - bLastService;
    });

    const selectedSubstitute = eligibleMinisters[0];
    console.log(`✅ Suplente automático encontrado: ${selectedSubstitute.userName} (${selectedSubstitute.userId})`);

    return selectedSubstitute.userId;

  } catch (error: any) {
    console.error('❌ Erro ao buscar suplente disponível:', error);
    console.error('Stack trace:', error.stack);
    console.error('Params:', { massDate, massTime });
    return null;
  }
}

// POST /api/substitutions - Criar solicitação de substituição
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scheduleId, substituteId, reason } = req.body;
    const requesterId = req.user!.id;
    console.log('[Substitutions] Criando solicitação:', { scheduleId, substituteId, reason, requesterId });

    // Validar dados obrigatórios
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: "ID da escala é obrigatório"
      });
    }

    // Buscar informações da escala
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Escala não encontrada"
      });
    }

    // Verificar se a data/hora da missa já passou
    // Usar UTC para evitar problemas de timezone
    const [year, month, day] = schedule.date.split('-').map(Number);
    const [hours, minutes] = schedule.time.split(':').map(Number);
    // Use Date.UTC to create a UTC date, then convert to local Date object
    // This ensures consistent timezone handling across the application
    const massDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

    const now = new Date();
    console.log('[Substitutions] Verificando data:', {
      scheduleDate: schedule.date,
      scheduleTime: schedule.time,
      massDateTime: massDateTime.toISOString(),
      now: now.toISOString(),
      isPast: massDateTime < now
    });

    if (massDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Não é possível solicitar substituição para missa que já passou"
      });
    }

    // Verificar se o ministro é o escalado
    if (schedule.ministerId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: "Você não está escalado para esta data"
      });
    }

    // Verificar se já existe solicitação pendente para esta escala
    const [existingRequest] = await db
      .select()
      .from(substitutionRequests)
      .where(
        and(
          eq(substitutionRequests.scheduleId, scheduleId),
          inArray(substitutionRequests.status, ['pending', 'available'])
        )
      )
      .limit(1);

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Já existe uma solicitação pendente para esta escala"
      });
    }

    // Calcular urgência
    const urgency = calculateUrgency(schedule.date, schedule.time);

    // Verificar contador mensal de substituições
    const monthlyCount = await countMonthlySubstitutions(requesterId);

    // Usar o substituteId fornecido ou null
    const finalSubstituteId = substituteId || null;

    // Status:
    // - Se tem substituteId (indicação direta) → 'pending' (aguarda aceitação do indicado)
    // - Se NÃO tem substituteId (aberto) → 'available' (vai para quadro público)
    const status = finalSubstituteId ? "pending" : "available";

    // Criar solicitação
    const [newRequest] = await db
      .insert(substitutionRequests)
      .values({
        scheduleId,
        requesterId,
        substituteId: finalSubstituteId,
        reason: reason || null,
        status,
        urgency,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Buscar dados completos para retorno (incluindo dados do suplente se houver)
    const requestQuery = db
      .select({
        request: substitutionRequests,
        assignment: schedules,
        requestingUser: {
          id: users.id,
          name: users.name,
          email: users.email,
          profilePhoto: users.photoUrl
        }
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
      .where(eq(substitutionRequests.id, newRequest.id))
      .limit(1);

    const [requestWithDetails] = await requestQuery;

    // Buscar dados do suplente, se houver
    let substituteUser = null;
    if (finalSubstituteId) {
      const [substitute] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          whatsapp: users.whatsapp
        })
        .from(users)
        .where(eq(users.id, finalSubstituteId))
        .limit(1);

      substituteUser = substitute || null;
    }

    // Mapear 'time' para 'massTime' para compatibilidade com o frontend
    const responseData = {
      ...requestWithDetails,
      assignment: {
        ...requestWithDetails.assignment,
        massTime: requestWithDetails.assignment.time
      },
      substituteUser
    };

    // Mensagem baseada no status
    const message = finalSubstituteId
      ? "Solicitação criada. Aguardando resposta do ministro indicado."
      : "Solicitação publicada no quadro de substituições. Outros ministros poderão se prontificar.";

    // Send real-time notification to coordinators
    const { notifySubstitutionRequest } = await import('../websocket');
    notifySubstitutionRequest({
      ...responseData,
      urgency,
      hoursUntil: Math.round((massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60))
    });

    res.json({
      success: true,
      message,
      data: responseData,
      monthlyCount: monthlyCount + 1
    });

  } catch (error: any) {
    console.error("[Substitutions] Erro ao criar solicitação de substituição:", error);
    console.error("[Substitutions] Stack trace:", error.stack);
    console.error("[Substitutions] Request body:", req.body);
    console.error("[Substitutions] User:", req.user);
    res.status(500).json({
      success: false,
      message: "Erro ao criar solicitação de substituição",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/substitutions - Listar solicitações
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const isCoordinator = userRole === 'coordenador' || userRole === 'gestor';

    let requests;

    if (isCoordinator) {
      // Coordenadores veem todas as solicitações
      requests = await db
        .select({
          request: substitutionRequests,
          assignment: schedules,
          requestingUser: {
            id: users.id,
            name: users.name,
            email: users.email,
            profilePhoto: users.photoUrl
          }
        })
        .from(substitutionRequests)
        .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
        .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
        .orderBy(desc(substitutionRequests.createdAt));
    } else {
      // Ministros veem:
      // 1. Suas próprias solicitações
      // 2. Solicitações direcionadas a eles (pending com substituteId = userId)
      // 3. Solicitações abertas (available) que qualquer ministro pode aceitar
      requests = await db
        .select({
          request: substitutionRequests,
          assignment: schedules,
          requestingUser: {
            id: users.id,
            name: users.name,
            email: users.email,
            profilePhoto: users.photoUrl
          }
        })
        .from(substitutionRequests)
        .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
        .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
        .where(
          sql`${substitutionRequests.requesterId} = ${userId}
            OR ${substitutionRequests.substituteId} = ${userId}
            OR ${substitutionRequests.status} = 'available'`
        )
        .orderBy(desc(substitutionRequests.createdAt));
    }

    // Mapear 'time' para 'massTime' para compatibilidade com o frontend
    const mappedRequests = requests.map((req: any) => ({
      ...req,
      assignment: {
        ...req.assignment,
        massTime: req.assignment.time
      }
    }));

    res.json(mappedRequests);

  } catch (error) {
    console.error("Erro ao listar solicitações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar solicitações"
    });
  }
});

// GET /api/substitutions/available/:scheduleId - Listar substitutos disponíveis
router.get("/available/:scheduleId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scheduleId } = req.params;
    console.log('[Substitutions] Buscando substitutos disponíveis para schedule:', scheduleId);

    // Buscar informações da escala
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      console.log('[Substitutions] Escala não encontrada:', scheduleId);
      return res.status(404).json({
        success: false,
        message: "Escala não encontrada"
      });
    }

    console.log('[Substitutions] Escala encontrada:', { date: schedule.date, time: schedule.time });

    // Buscar ministros disponíveis que:
    // 1. Não estão escalados no mesmo horário
    // 2. Estão com status ativo
    const availableSubstitutes = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        photoUrl: users.photoUrl
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          eq(users.role, 'ministro'),
          // Não está escalado no mesmo horário
          sql`NOT EXISTS (
            SELECT 1 FROM ${schedules} s
            WHERE s.minister_id = ${users.id}
            AND s.date = ${schedule.date}
            AND s.time = ${schedule.time}
          )`
        )
      )
      .limit(20);

    console.log('[Substitutions] Substitutos encontrados:', availableSubstitutes.length);

    res.json({
      success: true,
      data: availableSubstitutes
    });

  } catch (error: any) {
    console.error("[Substitutions] Erro ao buscar substitutos disponíveis:", error);
    console.error("[Substitutions] Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar substitutos disponíveis",
      error: error.message
    });
  }
});

// POST /api/substitutions/:id/respond - Aceitar/Rejeitar solicitação
router.post("/:id/respond", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { response, responseMessage } = req.body; // response: "accepted" | "rejected"
    const userId = req.user!.id;

    if (!response || !["accepted", "rejected"].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Resposta inválida. Use 'accepted' ou 'rejected'"
      });
    }

    // Buscar solicitação
    const [request] = await db
      .select()
      .from(substitutionRequests)
      .where(eq(substitutionRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada"
      });
    }

    // Verificar se o usuário tem permissão para responder
    const isSubstitute = request.substituteId === userId;
    const isCoordinator = req.user!.role === 'coordenador' || req.user!.role === 'gestor';

    if (!isSubstitute && !isCoordinator) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para responder esta solicitação"
      });
    }

    // Verificar se já foi respondida
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Esta solicitação já foi respondida"
      });
    }

    const newStatus = response === "accepted" ? "approved" : "rejected";

    // Atualizar solicitação
    await db
      .update(substitutionRequests)
      .set({
        status: newStatus,
        approvedBy: userId,
        approvedAt: new Date(),
        responseMessage: responseMessage || null,
        updatedAt: new Date()
      })
      .where(eq(substitutionRequests.id, id));

    // Se aceito, atualizar a escala
    if (newStatus === "approved" && request.substituteId) {
      await db
        .update(schedules)
        .set({
          ministerId: request.substituteId,
          substituteId: request.requesterId
        })
        .where(eq(schedules.id, request.scheduleId));
    }

    res.json({
      success: true,
      message: response === "accepted"
        ? "Substituição aceita com sucesso"
        : "Substituição rejeitada"
    });

  } catch (error) {
    console.error("Erro ao responder solicitação:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao responder solicitação"
    });
  }
});

// POST /api/substitutions/:id/claim - Reivindicar substituição aberta (available)
router.post("/:id/claim", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { message } = req.body;

    // Buscar solicitação
    const [request] = await db
      .select()
      .from(substitutionRequests)
      .where(eq(substitutionRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada"
      });
    }

    // Verificar se a solicitação está aberta (available)
    if (request.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: "Esta solicitação não está mais disponível"
      });
    }

    // Verificar se o usuário não é o solicitante original
    if (request.requesterId === userId) {
      return res.status(400).json({
        success: false,
        message: "Você não pode reivindicar sua própria solicitação"
      });
    }

    // Buscar informações da escala
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, request.scheduleId))
      .limit(1);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Escala não encontrada"
      });
    }

    // Verificar se o usuário já está escalado naquela data/hora
    const conflictingSchedule = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, userId),
          eq(schedules.date, schedule.date),
          eq(schedules.time, schedule.time),
          eq(schedules.status, 'scheduled')
        )
      )
      .limit(1);

    if (conflictingSchedule.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Você já está escalado neste horário"
      });
    }

    // Atualizar solicitação como aprovada com o substituto
    await db
      .update(substitutionRequests)
      .set({
        status: 'approved',
        substituteId: userId,
        approvedBy: userId,
        approvedAt: new Date(),
        responseMessage: message || null,
        updatedAt: new Date()
      })
      .where(eq(substitutionRequests.id, id));

    // Atualizar a escala com o novo ministro
    await db
      .update(schedules)
      .set({
        ministerId: userId,
        substituteId: request.requesterId
      })
      .where(eq(schedules.id, request.scheduleId));

    res.json({
      success: true,
      message: "Substituição aceita com sucesso!"
    });

  } catch (error) {
    console.error("Erro ao reivindicar substituição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reivindicar substituição"
    });
  }
});

// DELETE /api/substitutions/:id - Cancelar solicitação
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Buscar solicitação
    const [request] = await db
      .select()
      .from(substitutionRequests)
      .where(eq(substitutionRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada"
      });
    }

    // Verificar se o usuário é o solicitante ou coordenador
    const isRequester = request.requesterId === userId;
    const isCoordinator = req.user!.role === 'coordenador' || req.user!.role === 'gestor';

    if (!isRequester && !isCoordinator) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para cancelar esta solicitação"
      });
    }

    // Apenas solicitações pendentes ou disponíveis podem ser canceladas
    if (request.status !== 'pending' && request.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: "Apenas solicitações pendentes ou disponíveis podem ser canceladas"
      });
    }

    // Atualizar status para cancelado
    await db
      .update(substitutionRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(substitutionRequests.id, id));

    res.json({
      success: true,
      message: "Solicitação cancelada com sucesso"
    });

  } catch (error) {
    console.error("Erro ao cancelar solicitação:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao cancelar solicitação"
    });
  }
});

export default router;
