import { Router } from "express";
import { db } from "../db";
import { substitutionRequests, schedules, users, questionnaireResponses, questionnaires } from "@shared/schema";
import { eq, and, sql, gte, desc, count, notInArray, inArray } from "drizzle-orm";
import { authenticateToken as requireAuth, AuthRequest } from "../auth";
import { isAdmin as isAdminRole } from "@shared/roles";
import { communityIdFromSchedule } from "../utils/communityContext";
import { scheduleCache } from "../services/scheduleCache";
import { trackSubstitutionRequest, trackSubstitutionFulfillment } from "../services/reliabilityScoreService";
import { sendPushNotificationToUsers } from "../utils/pushNotifications";
import { storage } from "../storage";
import { notifyUsers } from "../websocket";

const router = Router();

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

// Calcular urgência baseada no tempo até a missa
function calculateUrgency(massDateStr: string, massTime: string): "low" | "medium" | "high" | "critical" {
  if (!massDateStr || !massTime) return "low";

  const now = new Date();
  const dateParts = massDateStr.split('-').map(Number);
  const timeParts = massTime.split(':').map(Number);

  const year = dateParts[0] || 0;
  const month = dateParts[1] || 1;
  const day = dateParts[2] || 1;
  const hours = timeParts[0] || 0;
  const minutes = timeParts[1] || 0;

  // Validar que os valores são números válidos
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    return "low";
  }

  // Criar data em HORÁRIO LOCAL (não UTC) - as datas da missa são em horário local
  const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilMass < 12) return "critical";
  if (hoursUntilMass < 24) return "high";
  if (hoursUntilMass < 72) return "medium";
  return "low";
}

// Verificar se solicitação deve ser auto-aprovada (sempre aprovado agora)
function shouldAutoApprove(massDateStr: string, massTime: string): boolean {
  // 🔧 ALTERAÇÃO: Removida a trava de 12h. 
  // Todas as substituições agora são auto-aprovadas se houver um substituto.
  return true;
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
    const dateParts = massDate?.split('-').map(Number) || [];
    const year = dateParts[0] || new Date().getFullYear();
    const month = dateParts[1] || (new Date().getMonth() + 1);

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

    type ScheduledMinisterRow = typeof scheduledMinisters[number];
    const scheduledMinisterIds = scheduledMinisters
      .map((s: ScheduledMinisterRow) => s.ministerId)
      .filter((id: string | null): id is string => id !== null);

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
    type AvailableResponseRow = typeof availableResponses[number];
    const eligibleMinisters = availableResponses.filter((response: AvailableResponseRow) => {
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
    eligibleMinisters.sort((a: AvailableResponseRow, b: AvailableResponseRow) => {
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

  } catch (error: unknown) {
    console.error('❌ Erro ao buscar suplente disponível:', error);
    console.error('Stack trace:', getErrorStack(error));
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
    // Usar horário LOCAL (não UTC) - as datas da missa são em horário local
    const dateParts = schedule.date?.split('-').map(Number) || [];
    const timeParts = schedule.time?.split(':').map(Number) || [];

    const year = dateParts[0] || 2024;
    const month = dateParts[1] || 1;
    const day = dateParts[2] || 1;
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;

    // Criar data em HORÁRIO LOCAL para comparação correta
    const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

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

    // 🔧 REMOVIDO: Bloqueio por tempo de antecedência. 
    // Agora o sistema permite pedidos mesmo no dia da missa.
    // A urgência será calculada e exibida como 'critical'.

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
        communityId: await communityIdFromSchedule(scheduleId), // herda do schedule pai
        reason: reason || null,
        status,
        urgency,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // 🤖 ADAPTIVE LEARNING: Track substitution request for reliability scoring
    await trackSubstitutionRequest(requesterId, scheduleId);

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

    // Notificar o substituto indicado (push + in-app)
    if (finalSubstituteId) {
      const requesterName = requestWithDetails.requestingUser?.name || 'Um ministro';
      const formattedDate = schedule.date ?
        new Date(schedule.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) :
        'data não definida';

      // Criar notificação in-app
      await storage.createNotification({
        userId: finalSubstituteId,
        title: '📋 Pedido de Substituição',
        message: `${requesterName} solicitou que você o substitua na missa de ${formattedDate} às ${schedule.time || 'horário não definido'}. Responda o mais breve possível.`,
        type: 'substitution',
        read: false,
        actionUrl: '/substitutions'
      });

      // Enviar push notification
      await sendPushNotificationToUsers([finalSubstituteId], {
        title: '📋 Pedido de Substituição',
        body: `${requesterName} solicitou que você o substitua na missa de ${formattedDate} às ${schedule.time || ''}`,
        url: '/substitutions'
      });

      // Notificar via WebSocket para atualização em tempo real
      notifyUsers([finalSubstituteId], {
        id: 'sub-request-' + newRequest.id,
        title: '📋 Pedido de Substituição',
        message: `${requesterName} solicitou que você o substitua na missa de ${formattedDate} às ${schedule.time || ''}`,
        type: 'warning',
        actionUrl: '/substitutions',
        createdAt: new Date().toISOString()
      });

      console.log(`[PUSH] Notificação de substituição enviada para ${finalSubstituteId}`);
    }

    // Invalidate cache for the affected schedule month
    scheduleCache.invalidateByDate(schedule.date);
    console.log(`[CACHE] Invalidated cache after creating substitution request for ${schedule.date}`);

    res.json({
      success: true,
      message,
      data: responseData,
      monthlyCount: monthlyCount + 1
    });

  } catch (error: unknown) {
    console.error("[Substitutions] Erro ao criar solicitação de substituição:", error);
    console.error("[Substitutions] Stack trace:", getErrorStack(error));
    console.error("[Substitutions] Request body:", req.body);
    console.error("[Substitutions] User:", req.user);
    res.status(500).json({
      success: false,
      message: "Erro ao criar solicitação de substituição",
      error: getErrorMessage(error),
      details: process.env.NODE_ENV === 'development' ? getErrorStack(error) : undefined
    });
  }
});

// GET /api/substitutions - Listar solicitações
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const isCoordinator = isAdminRole(userRole);

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

    // Enriquecer com dados dos substitutos
    type RequestRow = typeof requests[number];
    const enrichedRequests = await Promise.all(
      requests.map(async (reqRow: RequestRow) => {
        let substituteUser = null;

        // Se há um substituto, buscar os dados dele
        if (reqRow.request.substituteId) {
          const [substitute] = await db
            .select({
              id: users.id,
              name: users.name
            })
            .from(users)
            .where(eq(users.id, reqRow.request.substituteId))
            .limit(1);

          if (substitute) {
            substituteUser = substitute;
          }
        }

        return {
          ...reqRow,
          substituteUser
        };
      })
    );

    // Mapear 'time' para 'massTime' para compatibilidade com o frontend
    type EnrichedRequestRow = typeof enrichedRequests[number];
    const mappedRequests = enrichedRequests.map((reqRow: EnrichedRequestRow) => ({
      ...reqRow,
      assignment: {
        ...reqRow.assignment,
        massTime: reqRow.assignment.time
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

  } catch (error: unknown) {
    console.error("[Substitutions] Erro ao buscar substitutos disponíveis:", error);
    console.error("[Substitutions] Stack trace:", getErrorStack(error));
    res.status(500).json({
      success: false,
      message: "Erro ao buscar substitutos disponíveis",
      error: getErrorMessage(error)
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

    // Verificar se o usuário é o substituto indicado
    const isSubstitute = request.substituteId === userId;

    if (!isSubstitute) {
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

    // Buscar dados da escala para invalidar cache
    const [schedule] = await db
      .select({ date: schedules.date })
      .from(schedules)
      .where(eq(schedules.id, request.scheduleId))
      .limit(1);

    // Phase 1 - Data Integrity: Wrap in transaction to ensure atomicity
    await db.transaction(async (tx: typeof db) => {
      // Atualizar solicitação
      await tx
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
      // CRITICAL: Both updates must succeed or both must fail (transaction ensures this)
      if (newStatus === "approved" && request.substituteId) {
        await tx
          .update(schedules)
          .set({
            ministerId: request.substituteId,
            substituteId: request.requesterId
          })
          .where(eq(schedules.id, request.scheduleId));
      }
    });

    // 🤖 ADAPTIVE LEARNING: Track substitution fulfillment for reliability scoring
    if (newStatus === "approved" && request.substituteId) {
      await trackSubstitutionFulfillment(request.substituteId, request.scheduleId);
    }

    // Invalidate cache for the affected schedule month
    if (schedule) {
      scheduleCache.invalidateByDate(schedule.date);
      console.log(`[CACHE] Invalidated cache after responding to substitution for ${schedule.date}`);
    }

    // Notificar o solicitante sobre a resposta (push + in-app)
    const [substituteUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const substituteName = substituteUser?.name || 'O ministro';
    const formattedDate = schedule?.date ?
      new Date(schedule.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) :
      'data não definida';

    const notificationTitle = newStatus === "approved"
      ? '✅ Substituição Aceita'
      : '❌ Substituição Recusada';
    const notificationMessage = newStatus === "approved"
      ? `${substituteName} aceitou substituir você na missa de ${formattedDate}. Você está liberado desta escala.`
      : `${substituteName} não pode substituir você na missa de ${formattedDate}. Procure outro substituto.`;

    // Criar notificação in-app
    await storage.createNotification({
      userId: request.requesterId,
      title: notificationTitle,
      message: notificationMessage,
      type: 'substitution',
      read: false,
      actionUrl: '/substitutions'
    });

    // Enviar push notification
    await sendPushNotificationToUsers([request.requesterId], {
      title: notificationTitle,
      body: notificationMessage,
      url: '/substitutions'
    });

    // Notificar via WebSocket
    notifyUsers([request.requesterId], {
      id: 'sub-response-' + id,
      title: notificationTitle,
      message: notificationMessage,
      type: newStatus === "approved" ? 'success' : 'warning',
      actionUrl: '/substitutions',
      createdAt: new Date().toISOString()
    });

    console.log(`[PUSH] Notificação de resposta de substituição enviada para ${request.requesterId}`);

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

    // Verificar se a solicitação está aberta (available ou pending sem substituteId)
    // pending sem substituteId = edge case de dados antigos que devem ser tratados como available
    const isAvailable = request.status === 'available' ||
                        (request.status === 'pending' && !request.substituteId);

    if (!isAvailable) {
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

    // Verificar se a missa já passou
    // Usar parsing local da data para evitar bug de timezone
    // new Date("2025-10-05") cria em UTC, mas precisamos em horário local (Brasil UTC-3)
    const dateParts = schedule.date.split('-').map(Number);
    const scheduleDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduleDate < today) {
      return res.status(400).json({
        success: false,
        message: "Não é possível aceitar substituição para missa que já passou"
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

    // Wrap updates in transaction to ensure atomicity and prevent race conditions
    await db.transaction(async (tx: typeof db) => {
      // Re-verify status inside transaction (optimistic locking)
      const [currentRequest] = await tx
        .select()
        .from(substitutionRequests)
        .where(eq(substitutionRequests.id, id))
        .limit(1);

      const stillAvailable = currentRequest &&
        (currentRequest.status === 'available' ||
         (currentRequest.status === 'pending' && !currentRequest.substituteId));

      if (!stillAvailable) {
        throw new Error('SUBSTITUTION_ALREADY_CLAIMED');
      }

      // Atualizar solicitação como aprovada com o substituto
      await tx
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
      await tx
        .update(schedules)
        .set({
          ministerId: userId,
          substituteId: request.requesterId
        })
        .where(eq(schedules.id, request.scheduleId));
    });

    // Invalidate cache for the affected schedule month
    scheduleCache.invalidateByDate(schedule.date);
    console.log(`[CACHE] Invalidated cache after claiming substitution for ${schedule.date}`);

    // Notificar o solicitante que alguém se ofereceu (push + in-app)
    const [claimerUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const claimerName = claimerUser?.name || 'Um ministro';
    const formattedDate = schedule?.date ?
      new Date(schedule.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) :
      'data não definida';

    const notificationTitle = '✅ Substituto Encontrado!';
    const notificationMessage = `${claimerName} se ofereceu para substituir você na missa de ${formattedDate} às ${schedule.time || ''}. Você está liberado desta escala.`;

    // Criar notificação in-app
    await storage.createNotification({
      userId: request.requesterId,
      title: notificationTitle,
      message: notificationMessage,
      type: 'substitution',
      read: false,
      actionUrl: '/substitutions'
    });

    // Enviar push notification
    await sendPushNotificationToUsers([request.requesterId], {
      title: notificationTitle,
      body: notificationMessage,
      url: '/substitutions'
    });

    // Notificar via WebSocket
    notifyUsers([request.requesterId], {
      id: 'sub-claimed-' + id,
      title: notificationTitle,
      message: notificationMessage,
      type: 'success',
      actionUrl: '/substitutions',
      createdAt: new Date().toISOString()
    });

    console.log(`[PUSH] Notificação de claim de substituição enviada para ${request.requesterId}`);

    res.json({
      success: true,
      message: "Substituição aceita com sucesso!"
    });

  } catch (error: unknown) {
    // Handle race condition - another user claimed it first
    if (error instanceof Error && error.message === 'SUBSTITUTION_ALREADY_CLAIMED') {
      return res.status(409).json({
        success: false,
        message: "Esta solicitação já foi aceita por outro ministro"
      });
    }
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
    const isCoordinator = isAdminRole(req.user!.role);

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

    // Buscar dados da escala para invalidar cache
    const [schedule] = await db
      .select({ date: schedules.date })
      .from(schedules)
      .where(eq(schedules.id, request.scheduleId))
      .limit(1);

    // Atualizar status para cancelado
    await db
      .update(substitutionRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(substitutionRequests.id, id));

    // Invalidate cache for the affected schedule month
    if (schedule) {
      scheduleCache.invalidateByDate(schedule.date);
      console.log(`[CACHE] Invalidated cache after canceling substitution for ${schedule.date}`);
    }

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
