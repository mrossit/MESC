import { Router } from "express";
import { db } from "../db";
import { substitutionRequests, schedules, users } from "@shared/schema";
import { eq, and, sql, gte, desc, count } from "drizzle-orm";
import { authenticateToken, type AuthRequest } from "../auth";

const router = Router();

// Calcular urgência baseada no tempo até a missa
function calculateUrgency(massDate: Date, massTime: string): "low" | "medium" | "high" | "critical" {
  const now = new Date();
  const [hours, minutes] = massTime.split(':').map(Number);
  const massDateTime = new Date(massDate);
  massDateTime.setHours(hours, minutes, 0, 0);

  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilMass < 12) return "critical";
  if (hoursUntilMass < 24) return "high";
  if (hoursUntilMass < 72) return "medium";
  return "low";
}

// Verificar se solicitação deve ser auto-aprovada (> 12h antes)
function shouldAutoApprove(massDate: Date, massTime: string): boolean {
  const now = new Date();
  const [hours, minutes] = massTime.split(':').map(Number);
  const massDateTime = new Date(massDate);
  massDateTime.setHours(hours, minutes, 0, 0);

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

// POST /api/substitutions - Criar solicitação de substituição
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
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

    // Verificar se a data já passou
    const massDate = new Date(schedule.date);
    const now = new Date();
    if (massDate < now) {
      return res.status(400).json({
        success: false,
        message: "Não é possível solicitar substituição para data passada"
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
    const urgency = calculateUrgency(massDate, schedule.massTime);

    // Verificar contador mensal de substituições
    const monthlyCount = await countMonthlySubstitutions(requesterId);

    // Determinar status inicial
    let status: "pending" | "auto_approved" = "pending";

    // Auto-aprovar se:
    // 1. Mais de 12h antes da missa E
    // 2. Menos de 2 substituições no mês (ou coordenador/gestor pode ter ilimitado)
    const userRole = req.user!.role;
    const isCoordinator = userRole === 'coordenador' || userRole === 'gestor';

    if (shouldAutoApprove(massDate, schedule.massTime) && (monthlyCount < 2 || isCoordinator)) {
      status = "auto_approved";
    }

    // Criar solicitação
    const [newRequest] = await db
      .insert(substitutionRequests)
      .values({
        scheduleId,
        requesterId,
        substituteId: substituteId || null,
        reason: reason || null,
        status,
        urgency,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Se auto-aprovado, atualizar a escala imediatamente
    if (status === "auto_approved" && substituteId) {
      await db
        .update(schedules)
        .set({
          ministerId: substituteId,
          substituteId: requesterId,
          updatedAt: new Date()
        })
        .where(eq(schedules.id, scheduleId));
    }

    // Buscar dados completos para retorno
    const [requestWithDetails] = await db
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

    res.json({
      success: true,
      message: status === "auto_approved"
        ? "Solicitação criada e auto-aprovada com sucesso"
        : "Solicitação criada com sucesso. Aguardando aprovação do coordenador.",
      data: requestWithDetails,
      monthlyCount: monthlyCount + 1,
      isAutoApproved: status === "auto_approved"
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
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
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

    res.json(requests);

  } catch (error) {
    console.error("Erro ao listar solicitações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar solicitações"
    });
  }
});

// GET /api/substitutions/available/:scheduleId - Listar substitutos disponíveis
router.get("/available/:scheduleId", authenticateToken, async (req: AuthRequest, res) => {
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
            AND s.mass_time = ${schedule.massTime}
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
router.post("/:id/respond", authenticateToken, async (req: AuthRequest, res) => {
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
router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
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
