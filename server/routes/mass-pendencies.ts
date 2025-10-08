import { Router } from "express";
import { db } from "../db";
import { schedules, users, substitutionRequests } from "@shared/schema";
import { authenticateToken, requireRole, AuthRequest } from "../auth";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

// Configuração de mínimos de ministros por horário de missa
const MINIMUM_MINISTERS: Record<string, number> = {
  "08:00:00": 12,  // Missa das 8h - 12 ministros
  "10:00:00": 15,  // Missa das 10h - 15 ministros
  "19:00:00": 15,  // Missa das 19h - 15 ministros
  "19:30:00": 12,  // São Judas - 12 ministros (domingo 28)
  "06:30:00": 8,   // Missa da semana - 8 ministros
  "18:00:00": 10,  // Missa da tarde - 10 ministros
};

interface MassPendency {
  id: string;
  date: string;
  massTime: string;
  location: string;
  isSpecial: boolean;
  specialName?: string;
  minimumRequired: number;
  currentConfirmed: number;
  ministersShort: number;
  confirmedMinisters: Array<{
    id: string;
    name: string;
    position: number;
  }>;
  availableMinisters: Array<{
    id: string;
    name: string;
    lastServed?: string;
  }>;
  urgencyLevel: "low" | "medium" | "high" | "critical";
}

// GET /api/mass-pendencies - Retorna missas com desfalques no mês corrente
router.get("/", authenticateToken, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular início e fim do mês corrente
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formatar datas para string YYYY-MM-DD
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    // Buscar todas as missas do mês
    const monthSchedules = await db
      .select({
        date: schedules.date,
        time: schedules.time,
        location: schedules.location,
        ministerId: schedules.ministerId,
        ministerName: users.name,
        position: schedules.position,
        status: schedules.status,
        id: schedules.id
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          gte(schedules.date, startDateStr),
          lte(schedules.date, endDateStr),
          eq(schedules.status, "scheduled")
        )
      )
      .orderBy(schedules.date, schedules.time);

    // Buscar substituições pendentes ou aprovadas que afetam estas missas
    const scheduleIds = monthSchedules.map((s: any) => s.id);
    const activeSubstitutions = scheduleIds.length > 0
      ? await db
          .select({
            scheduleId: substitutionRequests.scheduleId,
            requesterId: substitutionRequests.requesterId,
            substituteId: substitutionRequests.substituteId,
            status: substitutionRequests.status
          })
          .from(substitutionRequests)
          .where(
            and(
              sql`${substitutionRequests.scheduleId} IN (${sql.join(
                scheduleIds.map((id: string) => sql`${id}`),
                sql`, `
              )})`,
              sql`${substitutionRequests.status} IN ('pending', 'approved')`
            )
          )
      : [];

    // Criar um mapa de substituições por scheduleId
    const substitutionsMap = new Map<string, typeof activeSubstitutions[0]>();
    activeSubstitutions.forEach((sub: any) => {
      substitutionsMap.set(sub.scheduleId, sub);
    });

    // Agrupar por data e horário
    const massesByDateTime = new Map<string, typeof monthSchedules>();
    monthSchedules.forEach((schedule: any) => {
      const key = `${schedule.date}-${schedule.time}`;
      if (!massesByDateTime.has(key)) {
        massesByDateTime.set(key, []);
      }
      massesByDateTime.get(key)!.push(schedule);
    });

    // Buscar todos os ministros ativos para sugestões
    const allMinisters = await db
      .select({
        id: users.id,
        name: users.name,
        lastService: users.lastService
      })
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          eq(users.role, "ministro")
        )
      );

    // Calcular pendências para cada missa
    const pendencies: MassPendency[] = [];

    for (const [dateTimeKey, scheduleGroup] of massesByDateTime.entries()) {
      if (scheduleGroup.length === 0) continue;

      const firstSchedule = scheduleGroup[0];
      const massDate = firstSchedule.date;
      const massTime = firstSchedule.time;
      const location = firstSchedule.location || "Matriz";

      // Determinar se é missa especial (São Judas no dia 28)
      const dayOfMonth = new Date(massDate).getDate();
      const isSaoJudas = dayOfMonth === 28 && massTime === "19:30:00";

      // Obter mínimo necessário para este horário
      const minimumRequired = MINIMUM_MINISTERS[massTime] || 12;

      // Contar ministros confirmados (sem substituição pendente/aprovada)
      // e também as posições totais criadas (para saber quantas estão vazias)
      let currentConfirmed = 0;
      let totalPositions = scheduleGroup.length; // Total de posições na escala
      const confirmedMinisters: MassPendency['confirmedMinisters'] = [];

      scheduleGroup.forEach((schedule: any) => {
        // Verificar se tem substituição ativa
        const substitution = substitutionsMap.get(schedule.id);

        // Se tem substituição aprovada com substituto, contar o substituto
        if (substitution?.status === 'approved' && substitution.substituteId) {
          currentConfirmed++;
          confirmedMinisters.push({
            id: substitution.substituteId,
            name: "Substituto", // Poderia fazer join para pegar o nome real
            position: schedule.position || 0
          });
        }
        // Se não tem substituição ou está pendente, contar o ministro original (se tiver)
        else if (!substitution && schedule.ministerId && schedule.ministerName) {
          currentConfirmed++;
          confirmedMinisters.push({
            id: schedule.ministerId,
            name: schedule.ministerName,
            position: schedule.position || 0
          });
        }
        // Se tem substituição pendente OU posição está vazia (ministerId null), não contar (desfalque)
      });

      // Calcular ministros faltantes: diferença entre o mínimo requerido e os confirmados
      // OU diferença entre posições criadas e confirmados (o que for maior)
      const ministersShort = Math.max(
        0,
        minimumRequired - currentConfirmed, // Falta para atingir o mínimo
        totalPositions - currentConfirmed   // Posições vazias
      );

      // Só adicionar se há desfalque
      if (ministersShort > 0) {
        // Calcular urgência
        const daysUntilMass = Math.floor(
          (new Date(massDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let urgencyLevel: MassPendency['urgencyLevel'] = "low";
        if (daysUntilMass <= 1 && ministersShort >= 5) urgencyLevel = "critical";
        else if (daysUntilMass <= 3 && ministersShort >= 3) urgencyLevel = "high";
        else if (daysUntilMass <= 7 && ministersShort >= 2) urgencyLevel = "medium";

        // Sugerir ministros disponíveis (que não estão escalados nesta data)
        const scheduledMinisterIds = new Set(
          scheduleGroup
            .filter((s: any) => s.ministerId)
            .map((s: any) => s.ministerId!)
        );

        const availableMinisters = allMinisters
          .filter((m: any) => !scheduledMinisterIds.has(m.id))
          .slice(0, 10) // Limitar a 10 sugestões
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            lastServed: m.lastService ? new Date(m.lastService).toISOString().split('T')[0] : undefined
          }));

        pendencies.push({
          id: dateTimeKey,
          date: massDate,
          massTime: massTime,
          location: isSaoJudas ? "São Judas" : location,
          isSpecial: isSaoJudas,
          specialName: isSaoJudas ? "Missa de São Judas Tadeu" : undefined,
          minimumRequired,
          currentConfirmed,
          ministersShort,
          confirmedMinisters,
          availableMinisters,
          urgencyLevel
        });
      }
    }

    // Ordenar por urgência e data
    pendencies.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
        return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    res.json(pendencies);
  } catch (error) {
    console.error("Error fetching mass pendencies:", error);
    res.status(500).json({ message: "Erro ao buscar pendências" });
  }
});

export default router;
