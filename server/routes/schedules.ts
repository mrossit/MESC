import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { schedules, substitutionRequests, users } from "@shared/schema";
import { authenticateToken as requireAuth, AuthRequest, requireRole } from "../auth";
import { isAdmin as isAdminRole } from "@shared/roles";
import { mobileNotificationData } from "@shared/mobileNotificationEvents";
import { eq, and, sql, gte, lte, count, desc } from "drizzle-orm";
import { scheduleCache } from "../services/scheduleCache";
import { analyzeMonthlyPatterns } from "../services/scheduleComparisonService";
import type { ScheduleAssignment } from "../types/schedules";
import type { Schedule } from "@shared/schema";
import { sendPushNotificationToUsers } from "../utils/pushNotifications";
import { storage } from "../storage";
import { notifyUsers } from "../websocket";
import { resolveWriteCommunityId } from "../utils/communityContext";

// Query parameter validation schemas
const ministerIdQuerySchema = z.object({
  ministerId: z.string().uuid().optional()
});

const monthYearQuerySchema = z.object({
  month: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().min(1).max(12)).optional(),
  year: z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().min(2024).max(2100)).optional()
});

const dateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Data deve estar no formato YYYY-MM-DD')
});

// Stub implementations for missing functions
const logActivity = async (userId: string, action: string, description: string, metadata?: Record<string, unknown>) => {
  console.log(`[Activity Log] ${action}: ${description}`, metadata);
};

const isMissingSchedulesDateColumnError = (error: unknown) => {
  const message = (error as Error)?.message?.toLowerCase() ?? "";
  return (
    (message.includes("does not exist") && message.includes('"date"')) ||
    message.includes("no such column: schedules.date") ||
    message.includes("no such column: date")
  );
};

const router = Router();

// Get upcoming schedules for a minister
router.get("/minister/upcoming", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Get the minister ID from the logged-in user or from query parameter
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Validate query parameters
    const queryValidation = ministerIdQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Parâmetros inválidos",
        errors: queryValidation.error.errors
      });
    }

    // Allow filtering by ministerId (for family members view)
    const targetMinisterId = queryValidation.data.ministerId || userId;

    // Note: ministers table doesn't exist in schema - ministers are users with role 'ministro'
    const minister = await db
      .select()
      .from(users)
      .where(eq(users.id, targetMinisterId))
      .limit(1);

    if (minister.length === 0) {
      return res.json({ assignments: [] });
    }

    const ministerId = minister[0].id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if the logged-in user is a coordinator/manager
    const loggedInUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const isAdmin = loggedInUser.length > 0 && isAdminRole(loggedInUser[0].role);

    // Note: scheduleAssignments table doesn't exist in schema - using schedules table instead
    // IMPORTANT: Ministers can only see PUBLISHED schedules
    // Coordinators/Managers can see all schedules
    const upcomingAssignments = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        notes: schedules.notes,
        position: schedules.position,
        status: schedules.status
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, ministerId),
          gte(schedules.date, today.toISOString().split('T')[0]),
          // Only show published schedules to regular ministers
          isAdmin ? undefined : eq(schedules.status, 'published')
        )
      )
      .orderBy(schedules.date, schedules.time, schedules.id)
      .limit(10);

    // Transform to match expected format
    type UpcomingAssignment = typeof upcomingAssignments[number];
    const formattedAssignments = upcomingAssignments.map((assignment: UpcomingAssignment) => ({
      id: assignment.id,
      date: assignment.date,
      massTime: assignment.time,
      position: assignment.position || 0,
      confirmed: true,
      scheduleId: assignment.id,
      scheduleTitle: assignment.type,
      scheduleStatus: assignment.status || "scheduled"
    }));
    
    res.json({ assignments: formattedAssignments });
  } catch (error) {
    console.error("Error getting upcoming schedules:", error);
    res.status(500).json({ message: "Erro ao buscar próximas escalas" });
  }
});

// Get schedule assignments for a specific date
router.get("/by-date/:date", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate date parameter
    const paramValidation = dateParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({
        message: "Data inválida. Use o formato YYYY-MM-DD",
        errors: paramValidation.error.errors
      });
    }

    const { date } = paramValidation.data;
    const userId = req.user?.id;

    // Check if user is coordinator/manager
    let isAdmin = false;
    if (userId) {
      const userResult = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      isAdmin = userResult.length > 0 && isAdminRole(userResult[0].role);
    }

    // Parse date string directly to avoid timezone issues
    // Expected format: ISO date string (YYYY-MM-DD) or full ISO datetime
    const targetDateStr = date.includes('T') ? date.split('T')[0] : date.split(' ')[0];

    // IMPORTANT: Ministers can only see PUBLISHED schedules
    // Coordinators/Managers can see all schedules
    const massAssignmentsRaw = await db
      .select({
        id: schedules.id,
        scheduleId: schedules.id,
        ministerId: schedules.ministerId,
        ministerName: users.name,
        scheduleDisplayName: users.scheduleDisplayName,
        date: schedules.date,
        massTime: schedules.time,
        position: schedules.position,
        confirmed: sql`true`,
        status: schedules.status,
        // Campos necessários para identificar adoração e celebrações especiais
        type: schedules.type,
        location: schedules.location,
        notes: schedules.notes
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          eq(schedules.date, targetDateStr),
          isAdmin ? undefined : eq(schedules.status, 'published')
        )
      )
      .orderBy(schedules.time, schedules.position, schedules.id);

    // Mapear entradas VACANTE: quando ministerId é null ou 'VACANT', definir ministerName como 'VACANTE'
    const massAssignments = massAssignmentsRaw.map(a => {
      const isVacant = !a.ministerId || a.ministerId === 'VACANT';
      return {
        ...a,
        ministerId: isVacant ? null : a.ministerId,
        ministerName: isVacant ? 'VACANTE' : a.ministerName,
        scheduleDisplayName: isVacant ? 'VACANTE' : a.scheduleDisplayName,
      };
    });

    // 🕊️ INCLUSÃO DE ADORAÇÃO: Verificar se a data é uma segunda-feira e buscar sorteio
    let adorationAssignments: ScheduleAssignment[] = [];
    try {
      const targetDate = new Date(targetDateStr + 'T12:00:00');
      const isMonday = targetDate.getDay() === 1;

      if (isMonday) {
        const { adorationDraws, adorationDrawResults } = await import('@shared/schema');
        const monthNum = targetDate.getMonth() + 1;
        const yearNum = targetDate.getFullYear();

        // Buscar sorteio do mês
        const draws = await db
          .select()
          .from(adorationDraws)
          .where(and(eq(adorationDraws.month, monthNum), eq(adorationDraws.year, yearNum)))
          .limit(1);

        if (draws.length > 0) {
          // Calcular qual segunda-feira do mês é esta data (1ª, 2ª, 3ª, 4ª ou 5ª)
          const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
          let mondayOfWeek = 0;
          const tempDate = new Date(firstDayOfMonth);

          // Encontra a primeira segunda-feira do mês
          while (tempDate.getDay() !== 1) {
            tempDate.setDate(tempDate.getDate() + 1);
          }

          // Conta quantas segundas-feiras até a data alvo (inclusive)
          // Se a primeira segunda-feira é igual ou anterior à targetDate, começa a contar
          while (tempDate <= targetDate) {
            mondayOfWeek++;
            // Se encontrou a data alvo, para de contar
            const tempDateStr = tempDate.toISOString().split('T')[0];
            if (tempDateStr === targetDateStr) {
              break;
            }
            tempDate.setDate(tempDate.getDate() + 7);
          }

          // Se mondayOfWeek ainda é 0, a targetDate não é uma segunda-feira válida
          if (mondayOfWeek === 0) {
            console.log(`[ADORATION] Data ${targetDateStr} não corresponde a uma segunda-feira válida do mês`);
          }

          // Buscar resultados apenas para esta segunda-feira específica
          const drawResults = await db
            .select({
              id: adorationDrawResults.id,
              ministerId: adorationDrawResults.ministerId,
              ministerName: users.name,
              scheduleDisplayName: users.scheduleDisplayName,
              mondayOfWeek: adorationDrawResults.mondayOfWeek,
              isVoluntary: adorationDrawResults.isVoluntary
            })
            .from(adorationDrawResults)
            .leftJoin(users, eq(adorationDrawResults.ministerId, users.id))
            .where(and(
              eq(adorationDrawResults.drawId, draws[0].id),
              eq(adorationDrawResults.mondayOfWeek, mondayOfWeek)
            ));

          type DrawResultRow = typeof drawResults[number];
          adorationAssignments = drawResults.map((res: DrawResultRow) => ({
            id: `adoracao-${res.id}`,
            scheduleId: `adoracao-${res.id}`,
            ministerId: res.ministerId,
            date: targetDateStr,
            massTime: "22:00:00",
            position: 0,
            confirmed: true,
            ministerName: res.ministerName,
            scheduleDisplayName: res.scheduleDisplayName,
            notes: res.isVoluntary ? "Voluntário" : "Sorteado",
            status: "published",
            type: "adoracao",
            location: "Adoração ao Santíssimo"
          }));
        }
      }
    } catch (e) {
      console.error("[SCHEDULES_BY_DATE] Erro ao buscar adoração:", e);
    }

    // Mesclar escalações de missas com as de adoração
    const allAssignments = [...massAssignments, ...adorationAssignments];

    // Buscar backups da geração do mês (apenas para coordenadores)
    let backupsByTime: Record<string, any[]> = {};
    if (isAdmin) {
      try {
        const [yearStr, monthStr] = targetDateStr.split('-');
        const genYear = parseInt(yearStr);
        const genMonth = parseInt(monthStr);

        const { scheduleGenerations } = await import('@shared/schema');
        const [generation] = await db.select()
          .from(scheduleGenerations)
          .where(and(
            eq(scheduleGenerations.year, genYear),
            eq(scheduleGenerations.month, genMonth)
          ))
          .orderBy(desc(scheduleGenerations.createdAt))
          .limit(1);

        if (generation) {
          const savedData = (generation.finalSchedule || generation.originalSchedule) as any;
          const savedSchedules: any[] = savedData?.schedules || savedData || [];
          if (Array.isArray(savedSchedules)) {
            savedSchedules.forEach((s: any) => {
              if (s.date === targetDateStr && s.time && Array.isArray(s.backupMinisters) && s.backupMinisters.length > 0) {
                backupsByTime[s.time] = s.backupMinisters;
              }
            });
          }
        }
      } catch (e) {
        console.error("[SCHEDULES_BY_DATE] Erro ao buscar backups:", e);
      }
    }

    if (allAssignments.length === 0) {
      return res.json({
        schedule: null,
        assignments: [],
        backupsByTime,
        message: "Nenhuma escala encontrada para esta data"
      });
    }

    res.json({
      schedule: {
        id: massAssignments.length > 0 ? massAssignments[0].scheduleId : `adoracao-${targetDateStr}`,
        date: targetDateStr,
        status: "scheduled"
      },
      assignments: allAssignments,
      backupsByTime
    });
  } catch (error) {
    console.error("Error fetching schedule by date:", error);
    res.status(500).json({ message: "Erro ao buscar escala para a data" });
  }
});

// Obter escalas para um mês específico
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate query parameters
    const queryValidation = monthYearQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Parâmetros inválidos",
        errors: queryValidation.error.errors
      });
    }

    const { month, year } = queryValidation.data;
    const userId = req.user?.id;

    // Check if user is coordinator/manager
    let isAdmin = false;
    if (userId) {
      const userResult = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      isAdmin = userResult.length > 0 && isAdminRole(userResult[0].role);
    }

    let query = db.select().from(schedules);

    if (month !== undefined && year !== undefined) {
      // Values are already validated and parsed by zod
      const yearNum = year;
      const monthNum = month;

      // Check cache first - but only use cache for admin users who can see all
      // For regular users, we need to filter by published status
      const cachedData = isAdmin ? scheduleCache.get(yearNum, monthNum) : null;
      if (cachedData) {
        console.log(`[SCHEDULES_API] ⚡ Returning cached data for ${monthNum}/${yearNum}`);
        return res.json(cachedData);
      }

      console.log(`[SCHEDULES_API] 🔍 Cache miss - querying database for ${monthNum}/${yearNum} (isAdmin: ${isAdmin})`);

      // Format dates as YYYY-MM-DD strings directly
      const startDateStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;

      // Calculate last day of month
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const endDateStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      let schedulesList: Schedule[] = [];
      try {
        // IMPORTANT: Ministers can only see PUBLISHED schedules
        // Coordinators/Managers can see all schedules
        schedulesList = await db
          .select()
          .from(schedules)
          .where(
            and(
              gte(schedules.date, startDateStr),
              lte(schedules.date, endDateStr),
              isAdmin ? undefined : eq(schedules.status, 'published')
            )
          );
      } catch (error) {
        if (isMissingSchedulesDateColumnError(error)) {
          console.warn("[Schedules Route] Falling back to empty response (schedules.date column missing?):", (error as Error)?.message);
          res.json({
            schedules: [],
            assignments: [],
            substitutions: []
          });
          return;
        }
        throw error;
      }

      // Note: scheduleAssignments table doesn't exist - returning schedule data directly
      let assignmentsList: Array<{
        id: string;
        scheduleId: string;
        ministerId: string | null;
        date: string;
        massTime: string;
        position: number;
        confirmed: boolean;
        ministerName: string | null;
        scheduleDisplayName: string | null;
        photoUrl: string | null;
        notes: string | null;
        status: string;
      }> = [];

      if (schedulesList.length > 0) {
        // IMPORTANT: Apply same filter as schedulesList - ministers only see published
        const rawAssignments = await db
          .select({
            id: schedules.id,
            scheduleId: schedules.id,
            ministerId: schedules.ministerId,
            date: schedules.date,
            massTime: schedules.time,
            position: sql`COALESCE(${schedules.position}, 0)`.as('position'),
            confirmed: sql`true`.as('confirmed'),
            ministerName: users.name,
            scheduleDisplayName: users.scheduleDisplayName,
            photoUrl: users.photoUrl,
            notes: schedules.notes,
            status: schedules.status
          })
          .from(schedules)
          .leftJoin(users, eq(schedules.ministerId, users.id))
          .where(
            and(
              gte(schedules.date, startDateStr),
              lte(schedules.date, endDateStr),
              isAdmin ? undefined : eq(schedules.status, 'published')
            )
          )
          .orderBy(schedules.date, schedules.time, schedules.position, schedules.id);

        // Mapear entradas VACANTE: quando ministerId é null ou 'VACANT', definir ministerName como 'VACANTE'
        assignmentsList = rawAssignments.map(a => {
          const isVacant = !a.ministerId || a.ministerId === 'VACANT';
          return {
            id: a.id,
            scheduleId: a.scheduleId,
            ministerId: isVacant ? null : a.ministerId,
            date: a.date,
            massTime: a.massTime,
            position: a.position as number,
            confirmed: a.confirmed as boolean,
            ministerName: isVacant ? 'VACANTE' : a.ministerName,
            scheduleDisplayName: isVacant ? 'VACANTE' : a.scheduleDisplayName,
            photoUrl: a.photoUrl,
            notes: a.notes,
            status: a.status,
          };
        });
      }

      // Get substitution requests for these schedules
      const substitutionsList = schedulesList.length > 0
        ? await db
            .select({
              id: substitutionRequests.id,
              scheduleId: substitutionRequests.scheduleId,
              assignmentId: substitutionRequests.scheduleId, // Alias para compatibilidade com o cliente
              requesterId: substitutionRequests.requesterId,
              requestingMinisterId: substitutionRequests.requesterId, // Alias para compatibilidade
              substituteId: substitutionRequests.substituteId,
              status: substitutionRequests.status,
              reason: substitutionRequests.reason
            })
            .from(substitutionRequests)
            .where(
              and(
                sql`${substitutionRequests.scheduleId} IN (${sql.join(
                  schedulesList.map((s: Schedule) => sql`${s.id}`),
                  sql`, `
                )})`,
                sql`${substitutionRequests.status} IN ('available', 'pending', 'approved', 'auto_approved')`
              )
            )
        : [];

      // 🕊️ INCLUSÃO DE ADORAÇÃO: Buscar resultados do sorteio de adoração para o mês
      let adorationAssignments: ScheduleAssignment[] = [];
      try {
        const { adorationDraws, adorationDrawResults, users } = await import('@shared/schema');
        const draws = await db
          .select()
          .from(adorationDraws)
          .where(and(eq(adorationDraws.month, monthNum), eq(adorationDraws.year, yearNum)))
          .limit(1);

        if (draws.length > 0) {
          const drawResults = await db
            .select({
              id: adorationDrawResults.id,
              ministerId: adorationDrawResults.ministerId,
              ministerName: users.name,
              scheduleDisplayName: users.scheduleDisplayName,
              mondayOfWeek: adorationDrawResults.mondayOfWeek,
              isVoluntary: adorationDrawResults.isVoluntary
            })
            .from(adorationDrawResults)
            .leftJoin(users, eq(adorationDrawResults.ministerId, users.id))
            .where(eq(adorationDrawResults.drawId, draws[0].id));

          // Helper: Get all Mondays in a given month
          function getMondaysInMonth(year: number, month: number): string[] {
            const mondays: string[] = [];
            const date = new Date(year, month - 1, 1);
            while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
            while (date.getMonth() === month - 1) {
              mondays.push(date.toISOString().split('T')[0]);
              date.setDate(date.getDate() + 7);
            }
            return mondays;
          }

          const mondaysInMonth = getMondaysInMonth(yearNum, monthNum);

          type DrawResultRow = typeof drawResults[number];
          adorationAssignments = drawResults.map((res: DrawResultRow) => {
            const mondayDate = mondaysInMonth[res.mondayOfWeek - 1];
            return {
              id: `adoracao-${res.id}`,
              scheduleId: `adoracao-${res.id}`,
              ministerId: res.ministerId,
              date: mondayDate,
              massTime: "22:00:00",
              position: 0,
              confirmed: true,
              ministerName: res.ministerName,
              scheduleDisplayName: res.scheduleDisplayName,
              photoUrl: null,
              notes: res.isVoluntary ? "Voluntário" : "Sorteado",
              status: "published",
              type: "adoracao"
            };
          });
        }
      } catch (e) {
        console.error("[SCHEDULES_API] Erro ao buscar adoração:", e);
      }

      // Mesclar escalações de missas com as de adoração
      const allAssignmentsList = [...assignmentsList, ...adorationAssignments];

      // Create monthly schedule metadata object
      // The frontend expects a Schedule object with month, year, status
      // Determine status: "published" if ANY schedule is published, "draft" otherwise
      const hasPublishedSchedules = schedulesList.some((s) => s.status === "published");
      const scheduleStatus = hasPublishedSchedules ? "published" : "draft";

      const monthlySchedule = schedulesList.length > 0 ? {
        id: `schedule-${yearNum}-${monthNum}`, // Synthetic ID for the month
        title: `Escala ${monthNum}/${yearNum}`,
        month: monthNum,
        year: yearNum,
        status: scheduleStatus as "draft" | "published" | "completed",
        createdBy: schedulesList[0].ministerId || "system",
        createdAt: schedulesList[0].createdAt?.toISOString() || new Date().toISOString(),
        publishedAt: hasPublishedSchedules ? new Date().toISOString() : undefined
      } : null;

      const responseData = {
        schedules: monthlySchedule ? [monthlySchedule] : [],
        assignments: allAssignmentsList,
        substitutions: substitutionsList
      };

      // Cache the result
      scheduleCache.setSync(yearNum, monthNum, responseData);
      console.log(`[SCHEDULES_API] 💾 Cached result for ${monthNum}/${yearNum}`);

      res.json(responseData);
    } else {
      // Sem mês/ano especificados: usar mês atual como fallback seguro
      // (evita full table scan que retornaria o banco inteiro)
      const now = new Date();
      const fallbackYear = now.getFullYear();
      const fallbackMonth = now.getMonth() + 1;
      const startDateStr = `${fallbackYear}-${fallbackMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(fallbackYear, fallbackMonth, 0).getDate();
      const endDateStr = `${fallbackYear}-${fallbackMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      const fallbackSchedules = await db
        .select()
        .from(schedules)
        .where(
          and(
            gte(schedules.date, startDateStr),
            lte(schedules.date, endDateStr)
          )
        );
      res.json({ schedules: fallbackSchedules, assignments: [] });
    }
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ message: "Erro ao buscar escalas" });
  }
});

// Create new schedule
router.post("/", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    // Only coordinators can create schedules
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (user.length === 0 || !isAdminRole(user[0].role)) {
      return res.status(403).json({ message: "Sem permissão para criar escalas" });
    }

    const { date, time, type = 'missa', location, ministerId } = req.body;

    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({ message: "Data e horário são obrigatórios" });
    }

    // Validate date format
    if (isNaN(Date.parse(date))) {
      return res.status(400).json({ message: "Data deve estar em formato válido" });
    }

    // Check if schedule already exists for this date/time
    const existing = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, date),
          eq(schedules.time, time)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ message: "Já existe uma escala para esta data e horário" });
    }

    const newSchedule = await db
      .insert(schedules)
      .values({
        communityId: await resolveWriteCommunityId(req.user),
        date,
        time,
        type: type as 'missa' | 'celebracao' | 'evento',
        location,
        ministerId,
        status: "scheduled"
      })
      .returning();

    if (newSchedule.length === 0) {
      return res.status(500).json({ message: "Erro ao criar escala" });
    }

    await logActivity(
      req.user?.id!,
      "schedule_created",
      `Nova escala criada para ${date} às ${time}`,
      { scheduleId: newSchedule[0].id }
    );

    // Invalidate cache for the month of the new schedule
    scheduleCache.invalidateByDate(date);

    res.status(201).json(newSchedule[0]);
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ message: "Erro ao criar escala" });
  }
});

// Update schedule
router.put("/:id", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    // Only coordinators can update schedules
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (user.length === 0 || !isAdminRole(user[0].role)) {
      return res.status(403).json({ message: "Sem permissão para editar escalas" });
    }

    const { notes } = req.body;

    const updatedSchedule = await db
      .update(schedules)
      .set({ notes })
      .where(eq(schedules.id, req.params.id))
      .returning();

    if (updatedSchedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    await logActivity(
      req.user?.id!,
      "schedule_updated",
      `Escala atualizada`,
      { scheduleId: req.params.id }
    );

    // Invalidate cache for the month of the updated schedule
    if (updatedSchedule[0].date) {
      scheduleCache.invalidateByDate(updatedSchedule[0].date);
    }

    res.json(updatedSchedule[0]);
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Erro ao atualizar escala" });
  }
});

// Publish schedule (month-based)
// ID format: "schedule-YYYY-MM" (e.g., "schedule-2025-10")
router.patch("/:id/publish", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    // Only coordinators can publish schedules
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (user.length === 0 || !isAdminRole(user[0].role)) {
      return res.status(403).json({ message: "Sem permissão para publicar escalas" });
    }

    // Parse month/year from synthetic ID format: "schedule-2025-10"
    const match = req.params.id.match(/^schedule-(\d{4})-(\d{1,2})$/);
    if (!match) {
      return res.status(400).json({ message: "ID de escala inválido. Formato esperado: schedule-YYYY-MM" });
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);

    // Validate parsed values
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month or year in schedule ID' });
    }

    // Calculate date range for the month
    const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    // Update all schedules in this month to "published" status
    const result = await db
      .update(schedules)
      .set({
        status: "published"
      })
      .where(
        and(
          gte(schedules.date, startDateStr),
          lte(schedules.date, endDateStr)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Nenhuma escala encontrada para este mês" });
    }

    await logActivity(
      req.user?.id!,
      "schedule_published",
      `Escala publicada para ${month}/${year}`,
      { scheduleId: req.params.id, month, year, schedulesUpdated: result.length }
    );

    // Invalidate cache for this month
    scheduleCache.invalidate(year, month);

    // 🤖 ADAPTIVE LEARNING - PHASE 3: Analyze and learn from coordinator modifications
    try {
      const learningReport = await analyzeMonthlyPatterns(month, year);
      console.log(`[ADAPTIVE] 📊 Learning analysis complete for ${month}/${year}:`);
      console.log(`  - Acceptance rate: ${learningReport.acceptanceRate.toFixed(1)}%`);
      console.log(`  - Algorithm health: ${learningReport.algorithmHealth}`);
      console.log(`  - Ministers with updated scores: ${learningReport.frequentlyRemovedMinisters.length}`);
    } catch (error) {
      console.error("[ADAPTIVE] ⚠️ Error during learning analysis:", error);
      // Don't fail the publish if learning analysis fails
    }

    // Notificar todos os ministros escalados (push + in-app)
    try {
      // Buscar ministros únicos que estão escalados neste mês
      const uniqueMinisterIds = [...new Set(result.map((s: typeof schedules.$inferSelect) => s.ministerId).filter(Boolean))] as string[];

      if (uniqueMinisterIds.length > 0) {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthName = monthNames[month - 1];

        const notificationTitle = '📅 Nova Escala Publicada';
        const notificationMessage = `A escala de ${monthName}/${year} foi publicada. Confira suas escalas e fique atento aos horários.`;

        // Criar notificações in-app para todos os ministros
        await Promise.all(uniqueMinisterIds.map(ministerId =>
          storage.createNotification({
            userId: ministerId,
            title: notificationTitle,
            message: notificationMessage,
            type: 'schedule',
            read: false,
            actionUrl: '/schedules',
            data: mobileNotificationData('schedule_published', {
              month,
              year,
            })
          })
        ));

        // Enviar push notifications
        await sendPushNotificationToUsers(uniqueMinisterIds, {
          title: notificationTitle,
          body: notificationMessage,
          url: '/schedules',
          tag: `schedule-published-${month}-${year}`,
          data: mobileNotificationData('schedule_published', {
            month,
            year,
          })
        });

        // Notificar via WebSocket para atualização em tempo real
        notifyUsers(uniqueMinisterIds, {
          id: 'schedule-published-' + month + '-' + year,
          title: notificationTitle,
          message: notificationMessage,
          type: 'info',
          actionUrl: '/schedules',
          createdAt: new Date().toISOString()
        });

        console.log(`[PUSH] Notificação de escala publicada enviada para ${uniqueMinisterIds.length} ministros`);
      }
    } catch (notifError) {
      console.error("[SCHEDULES] Erro ao enviar notificações de escala publicada:", notifError);
      // Não falhar a publicação se as notificações falharem
    }

    res.json({
      message: `Escala publicada com sucesso! ${result.length} escalas atualizadas.`,
      schedulesUpdated: result.length
    });
  } catch (error) {
    console.error("Error publishing schedule:", error);
    res.status(500).json({ message: "Erro ao publicar escala" });
  }
});

// Delete schedule - supports both individual schedule UUID and month-based ID (schedule-YYYY-MM)
router.delete("/:id", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    console.log("DELETE schedule request for ID:", req.params.id);

    // Only coordinators can delete schedules
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (user.length === 0 || !isAdminRole(user[0].role)) {
      return res.status(403).json({ message: "Sem permissão para excluir escalas" });
    }

    // Check if this is a month-based ID (schedule-YYYY-MM format)
    const monthIdMatch = req.params.id.match(/^schedule-(\d{4})-(\d{1,2})$/);

    if (monthIdMatch) {
      // Month-based delete - delete ALL schedules for the month
      const year = parseInt(monthIdMatch[1]);
      const month = parseInt(monthIdMatch[2]);

      // Validate parsed values
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Invalid month or year in schedule ID' });
      }

      console.log(`[DELETE_SCHEDULE] Month-based delete for ${month}/${year}`);

      // Calculate date range for the month
      const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      // Get all schedules for the month
      const schedulesList = await db
        .select()
        .from(schedules)
        .where(
          and(
            gte(schedules.date, startDateStr),
            lte(schedules.date, endDateStr)
          )
        );

      if (schedulesList.length === 0) {
        return res.status(404).json({ message: "Nenhuma escala encontrada para este mês" });
      }

      // Check if any schedule is published
      type ScheduleListItem = typeof schedulesList[number];
      const hasPublished = schedulesList.some((s: ScheduleListItem) => s.status === "published");
      if (hasPublished) {
        return res.status(400).json({ message: "Não é possível excluir escalas publicadas. Cancele a publicação primeiro." });
      }

      // Get all schedule IDs
      const scheduleIds = schedulesList.map((s: ScheduleListItem) => s.id);

      // Delete related substitution requests first
      for (const scheduleId of scheduleIds) {
        await db
          .delete(substitutionRequests)
          .where(eq(substitutionRequests.scheduleId, scheduleId));
      }

      console.log(`[DELETE_SCHEDULE] Deleted substitution requests for ${scheduleIds.length} schedules`);

      // Delete all schedules for the month
      await db
        .delete(schedules)
        .where(
          and(
            gte(schedules.date, startDateStr),
            lte(schedules.date, endDateStr)
          )
        );

      await logActivity(
        req.user?.id!,
        "schedule_deleted",
        `Escalas de ${month}/${year} excluídas`,
        { month, year, count: scheduleIds.length }
      );

      // Invalidate cache for the month
      scheduleCache.invalidate(year, month);

      console.log(`[DELETE_SCHEDULE] Successfully deleted ${scheduleIds.length} schedules for ${month}/${year}`);
      res.json({ message: `${scheduleIds.length} escalas excluídas com sucesso` });

    } else {
      // Individual schedule delete (UUID)
      const schedule = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, req.params.id))
        .limit(1);

      if (schedule.length === 0) {
        return res.status(404).json({ message: "Escala não encontrada" });
      }

      if (schedule[0].status === "published") {
        return res.status(400).json({ message: "Não é possível excluir uma escala publicada" });
      }

      // Delete related substitution requests first (due to foreign key constraints)
      await db
        .delete(substitutionRequests)
        .where(eq(substitutionRequests.scheduleId, req.params.id));

      console.log(`Deleted substitution requests for schedule: ${req.params.id}`);

      // Finally delete the schedule
      await db
        .delete(schedules)
        .where(eq(schedules.id, req.params.id));

      await logActivity(
        req.user?.id!,
        "schedule_deleted",
        `Escala excluída`,
        { scheduleId: req.params.id }
      );

      // Invalidate cache for the month of the deleted schedule
      if (schedule[0].date) {
        scheduleCache.invalidateByDate(schedule[0].date);
      }

      console.log(`Successfully deleted schedule: ${schedule[0].id}`);
      res.json({ message: "Escala excluída com sucesso" });
    }
  } catch (error) {
    console.error("Error deleting schedule - Full error:", error);
    res.status(500).json({ message: "Erro ao excluir escala" });
  }
});

// Unpublish schedule (cancel publication) - month-based
// ID format: "schedule-YYYY-MM" (e.g., "schedule-2025-10")
router.patch("/:id/unpublish", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    console.log('[UNPUBLISH_API] Received request for ID:', req.params.id);
    console.log('[UNPUBLISH_API] User ID:', req.user?.id);

    // Only coordinators can unpublish schedules
    if (!req.user?.id) {
      console.log('[UNPUBLISH_API] No user ID found');
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (user.length === 0 || !isAdminRole(user[0].role)) {
      console.log('[UNPUBLISH_API] User not authorized, role:', user[0]?.role);
      return res.status(403).json({ message: "Sem permissão para cancelar publicação" });
    }

    console.log('[UNPUBLISH_API] User authorized:', user[0].name, 'role:', user[0].role);

    // Parse month/year from synthetic ID format: "schedule-2025-10"
    const match = req.params.id.match(/^schedule-(\d{4})-(\d{1,2})$/);
    if (!match) {
      console.log('[UNPUBLISH_API] Invalid ID format:', req.params.id);
      return res.status(400).json({ message: "ID de escala inválido. Formato esperado: schedule-YYYY-MM" });
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);

    // Validate parsed values
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month or year in schedule ID' });
    }

    console.log('[UNPUBLISH_API] Parsed year:', year, 'month:', month);

    // Calculate date range for the month
    const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    console.log('[UNPUBLISH_API] Date range:', startDateStr, 'to', endDateStr);

    // Update all schedules in this month back to "scheduled" status
    const result = await db
      .update(schedules)
      .set({
        status: "scheduled"
      })
      .where(
        and(
          gte(schedules.date, startDateStr),
          lte(schedules.date, endDateStr)
        )
      )
      .returning();

    console.log('[UNPUBLISH_API] Updated', result.length, 'schedules');

    if (result.length === 0) {
      console.log('[UNPUBLISH_API] No schedules found for this month');
      return res.status(404).json({ message: "Nenhuma escala encontrada para este mês" });
    }

    await logActivity(
      req.user?.id!,
      "schedule_unpublished",
      `Publicação cancelada para ${month}/${year}`,
      { scheduleId: req.params.id, month, year, schedulesUpdated: result.length }
    );

    // Invalidate cache for this month
    scheduleCache.invalidate(year, month);

    console.log('[UNPUBLISH_API] Success! Returning response');

    res.json({
      message: `Publicação cancelada com sucesso! ${result.length} escalas atualizadas.`,
      schedulesUpdated: result.length
    });
  } catch (error) {
    console.error("Error unpublishing schedule:", error);
    res.status(500).json({ message: "Erro ao cancelar publicação" });
  }
});

// Generate intelligent schedule
// NOTA: Este endpoint é um stub — a geração real acontece em scheduleGeneration.ts
// (POST /api/schedules/generate). Este endpoint NÃO deve escrever status inválidos no banco.
router.post("/:scheduleId/generate", requireAuth, requireRole(['coordenador', 'gestor']), async (_req: AuthRequest, res: Response) => {
  res.status(501).json({
    message: "Use o endpoint POST /api/schedules/generate para gerar escalas automáticas.",
    hint: "Este endpoint individual está desativado. A geração de escalas é feita por mês completo."
  });
});

export default router;
