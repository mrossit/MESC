import { Router } from "express";
import { db } from "../db";
import { substitutionRequests, schedules, users, questionnaireResponses, questionnaires } from "@shared/schema";
import { eq, and, sql, gte, desc, count, notInArray } from "drizzle-orm";
import { authenticateToken as requireAuth, AuthRequest } from "../auth";

const router = Router();

// Calcular urgência baseada no tempo até a missa
function calculateUrgency(massDateStr: string, massTime: string): "low" | "medium" | "high" | "critical" {
  const now = new Date();
  const [year, month, day] = massDateStr.split('-').map(Number);
  const [hours, minutes] = massTime.split(':').map(Number);
  const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

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
  const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

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
    const responsesQuery = scheduledMinisterIds.length > 0
      ? db
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
          .where(
            and(
              eq(questionnaireResponses.questionnaireId, activeQuestionnaire.id),
              eq(users.status, 'active'),
              eq(users.role, 'ministro'),
              notInArray(questionnaireResponses.userId, scheduledMinisterIds)
            )
          )
      : db
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
          .where(
            and(
              eq(questionnaireResponses.questionnaireId, activeQuestionnaire.id),
              eq(users.status, 'active'),
              eq(users.role, 'ministro')
            )
          );

    const availableResponses = await responsesQuery;

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

  } catch (error) {
    console.error('Erro ao buscar suplente disponível:', error);
    return null;
  }
}

// POST /api/substitutions - Criar solicitação de substituição
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scheduleId, substituteId, reason } = req.body;
    const requesterId = req.user!.id;

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
    const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const now = new Date();

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
          eq(substitutionRequests.status, 'pending')
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

    // 🆕 AUTO-ESCALAÇÃO: Se não foi especificado um substituto, buscar automaticamente
    let finalSubstituteId = substituteId;
    let autoAssigned = false;

    if (!finalSubstituteId) {
      console.log(`🔍 Buscando suplente automático para ${schedule.date} às ${schedule.time}...`);
      const autoSubstituteId = await findAvailableSubstitute(schedule.date, schedule.time);

      if (autoSubstituteId) {
        finalSubstituteId = autoSubstituteId;
        autoAssigned = true;
        console.log(`✅ Suplente automático atribuído: ${autoSubstituteId}`);
      } else {
        console.log(`⚠️  Nenhum suplente disponível encontrado automaticamente`);
      }
    }

    // Determinar status inicial
    let status: "pending" | "auto_approved" = "pending";

    // Auto-aprovar se:
    // 1. Mais de 12h antes da missa E
    // 2. Menos de 2 substituições no mês (ou coordenador/gestor pode ter ilimitado)
    const userRole = req.user!.role;
    const isCoordinator = userRole === 'coordenador' || userRole === 'gestor';

    if (shouldAutoApprove(schedule.date, schedule.time) && (monthlyCount < 2 || isCoordinator)) {
      status = "auto_approved";
    }

    // Criar solicitação
    const [newRequest] = await db
      .insert(substitutionRequests)
      .values({
        scheduleId,
        requesterId,
        substituteId: finalSubstituteId || null,
        reason: reason || null,
        status,
        urgency,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Se auto-aprovado, atualizar a escala imediatamente
    if (status === "auto_approved" && finalSubstituteId) {
      await db
        .update(schedules)
        .set({
          ministerId: finalSubstituteId,
          substituteId: requesterId,
          updatedAt: new Date()
        })
        .where(eq(schedules.id, scheduleId));
    }

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

    // Mensagem personalizada baseada na auto-escalação
    let message = "";
    if (autoAssigned && finalSubstituteId) {
      message = `Solicitação criada! Foi encontrado automaticamente um suplente disponível: ${substituteUser?.name}. ` +
                `${status === "auto_approved" ? "A substituição foi auto-aprovada." : "Aguardando confirmação do suplente."}`;
    } else if (status === "auto_approved") {
      message = "Solicitação criada e auto-aprovada com sucesso";
    } else {
      message = finalSubstituteId
        ? "Solicitação criada com sucesso. Aguardando aprovação do suplente."
        : "Solicitação criada. Nenhum suplente disponível foi encontrado automaticamente. Aguardando coordenador.";
    }

    res.json({
      success: true,
      message,
      data: responseData,
      monthlyCount: monthlyCount + 1,
      isAutoApproved: status === "auto_approved",
      autoAssigned,
      substituteInfo: substituteUser ? {
        name: substituteUser.name,
        phone: substituteUser.phone,
        whatsapp: substituteUser.whatsapp
      } : null
    });

  } catch (error) {
    console.error("Erro ao criar solicitação de substituição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar solicitação de substituição"
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
      // Ministros veem apenas suas solicitações e solicitações direcionadas a eles
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
          sql`${substitutionRequests.requesterId} = ${userId} OR ${substitutionRequests.substituteId} = ${userId}`
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

    // Buscar ministros disponíveis que:
    // 1. Não estão escalados no mesmo horário
    // 2. Estão com status ativo
    const availableSubstitutes = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        photoUrl: users.photoUrl,
        // Contar quantas vezes serviu no mês
        servicesThisMonth: sql<number>`
          (SELECT COUNT(*)
           FROM ${schedules} s
           WHERE s.minister_id = ${users.id}
           AND EXTRACT(MONTH FROM s.date) = EXTRACT(MONTH FROM ${sql`CURRENT_DATE`})
           AND EXTRACT(YEAR FROM s.date) = EXTRACT(YEAR FROM ${sql`CURRENT_DATE`})
          )`
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
      .orderBy(sql`services_this_month ASC`)
      .limit(20);

    res.json({
      success: true,
      data: availableSubstitutes
    });

  } catch (error) {
    console.error("Erro ao buscar substitutos disponíveis:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar substitutos disponíveis"
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
          substituteId: request.requesterId,
          updatedAt: new Date()
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

    // Apenas solicitações pendentes podem ser canceladas
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Apenas solicitações pendentes podem ser canceladas"
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
