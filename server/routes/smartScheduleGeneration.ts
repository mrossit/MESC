import { Router, Request, Response } from "express";
import { db } from "../db";
import { schedules, users, questionnaireResponses, questionnaires, liturgicalCelebrations, familyRelationships } from "@shared/schema";
import { authenticateToken as requireAuth, AuthRequest, requireRole } from "../auth";
import { eq, and, sql, gte, lte, inArray, ne, or } from "drizzle-orm";
import { generateAutomaticSchedule, ScheduleGenerator, GeneratedSchedule, Minister } from "../utils/scheduleGenerator";
import { getCurrentLiturgicalSeason, getMovableFeasts } from "../utils/liturgicalCalculations";
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

interface GenerationOptions {
  prioritizeVeterans: boolean;
  allowFamiliesOnSameDay: boolean;
  maxAssignmentsPerMinister: number;
  fillAllPositions: boolean;
}

interface GenerationStatistics {
  coverage: number;
  fairness: number;
  conflicts: string[];
  distributionVariance: number;
  specialMassCoverage: Record<string, number>;
  assignmentsPerMinister: Record<string, number>;
  outliers: { ministerId: string; count: number; reason: string }[];
}

/**
 * POST /api/schedules/generate-smart
 * Generate intelligent schedule with advanced algorithm
 */
router.post("/generate-smart", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, options } = req.body as {
      month: number;
      year: number;
      options: GenerationOptions;
    };

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Mês e ano são obrigatórios"
      });
    }

    console.log(`[SMART_GEN] Generating smart schedule for ${month}/${year}`, options);

    // Generate the schedule using the existing algorithm
    const generator = new ScheduleGenerator();
    const generatedSchedules = await generator.generateScheduleForMonth(year, month, false);

    // Calculate statistics
    const statistics = calculateGenerationStatistics(generatedSchedules, options);

    // Identify warnings
    const warnings: string[] = [];

    if (statistics.coverage < 0.8) {
      warnings.push(`Cobertura baixa: apenas ${(statistics.coverage * 100).toFixed(0)}% das posições foram preenchidas`);
    }

    if (statistics.distributionVariance > 0.3) {
      warnings.push(`Distribuição desbalanceada: variância de ${(statistics.distributionVariance * 100).toFixed(0)}%`);
    }

    if (statistics.conflicts.length > 0) {
      warnings.push(`${statistics.conflicts.length} conflitos detectados`);
    }

    // Transform to response format
    const schedule = generatedSchedules.map(s => ({
      date: s.massTime.date!,
      time: s.massTime.time,
      type: s.massTime.type || 'missa',
      ministerId: null,
      position: 0,
      assignments: s.ministers.map((m, idx) => ({
        ministerId: m.id,
        ministerName: m.name,
        position: m.position || (idx + 1),
        score: m.availabilityScore,
        matchQuality: m.availabilityScore > 0.8 ? 'excellent' : m.availabilityScore > 0.5 ? 'good' : 'acceptable'
      }))
    }));

    res.json({
      success: true,
      message: `Escala gerada com sucesso para ${month}/${year}`,
      data: {
        schedule,
        statistics,
        warnings
      }
    });

  } catch (error: any) {
    console.error("[SMART_GEN] Error generating smart schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar escala inteligente"
    });
  }
});

/**
 * POST /api/schedules/preview
 * Generate preview without saving to database
 */
router.post("/preview", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, options } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Mês e ano são obrigatórios"
      });
    }

    console.log(`[PREVIEW] Generating preview for ${month}/${year}`);

    // Generate preview using preview mode
    const generator = new ScheduleGenerator();
    const generatedSchedules = await generator.generateScheduleForMonth(year, month, true);

    // Calculate statistics
    const statistics = calculateGenerationStatistics(generatedSchedules, options || {});

    // Get liturgical info for the month
    const liturgicalInfo = await getLiturgicalInfoForMonth(year, month);

    res.json({
      success: true,
      data: {
        schedules: generatedSchedules.map(s => ({
          massTime: s.massTime,
          ministers: s.ministers,
          backupMinisters: s.backupMinisters,
          confidence: s.confidence
        })),
        statistics,
        liturgicalInfo
      }
    });

  } catch (error: any) {
    console.error("[PREVIEW] Error generating preview:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar preview"
    });
  }
});

/**
 * PUT /api/schedules/manual-adjustment
 * Update single assignment with drag-drop changes
 */
router.put("/manual-adjustment", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, ministerId, newPosition, oldPosition } = req.body;

    if (!date || !time || !ministerId) {
      return res.status(400).json({
        success: false,
        message: "Data, horário e ministro são obrigatórios"
      });
    }

    console.log(`[MANUAL_ADJUST] Moving minister ${ministerId} from pos ${oldPosition} to ${newPosition} on ${date} ${time}`);

    // Check if minister is available for this date/time
    const availability = await checkMinisterAvailability(ministerId, date, time);

    if (!availability.available) {
      return res.status(400).json({
        success: false,
        message: `Ministro não está disponível: ${availability.reason}`,
        data: { availability }
      });
    }

    // Check for conflicts (already assigned on same day)
    const existingAssignments = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, date),
          eq(schedules.ministerId, ministerId),
          ne(schedules.time, time)
        )
      );

    if (existingAssignments.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ministro já escalado em outro horário neste dia: ${existingAssignments[0].time}`,
        data: { existingAssignments }
      });
    }

    // Update or create the assignment
    const existing = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, date),
          eq(schedules.time, time),
          eq(schedules.ministerId, ministerId)
        )
      );

    if (existing.length > 0) {
      // Update position
      await db
        .update(schedules)
        .set({ position: newPosition })
        .where(eq(schedules.id, existing[0].id));
    } else {
      // Create new assignment
      await db
        .insert(schedules)
        .values({
          date,
          time,
          type: 'missa',
          ministerId,
          position: newPosition,
          status: 'scheduled'
        });
    }

    // Calculate impact on fairness
    const fairnessImpact = await calculateFairnessImpact(ministerId, date);

    res.json({
      success: true,
      message: "Ajuste realizado com sucesso",
      data: {
        fairnessImpact,
        availability
      }
    });

  } catch (error: any) {
    console.error("[MANUAL_ADJUST] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao realizar ajuste manual"
    });
  }
});

/**
 * POST /api/schedules/publish
 * Publish schedule and notify ministers
 */
router.post("/publish", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, scheduleData } = req.body;

    if (!month || !year || !scheduleData) {
      return res.status(400).json({
        success: false,
        message: "Dados incompletos para publicação"
      });
    }

    console.log(`[PUBLISH] Publishing schedule for ${month}/${year}`);

    // Validate schedule before publishing
    const validation = await validateScheduleBeforePublish(scheduleData, month, year);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Escala não passou na validação",
        data: { validation }
      });
    }

    // Save all assignments to database
    const savedCount = await saveScheduleToDatabase(scheduleData, month, year);

    // Send notifications to ministers
    const notificationResults = await sendMinisterNotifications(scheduleData, month, year);

    // Log activity
    console.log(`[PUBLISH] Published ${savedCount} assignments, sent ${notificationResults.sent} notifications`);

    res.json({
      success: true,
      message: `Escala publicada com sucesso! ${savedCount} atribuições criadas.`,
      data: {
        assignmentsCreated: savedCount,
        notificationsSent: notificationResults.sent,
        notificationsFailed: notificationResults.failed,
        validation
      }
    });

  } catch (error: any) {
    console.error("[PUBLISH] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao publicar escala"
    });
  }
});

/**
 * GET /api/schedules/validation/:month/:year
 * Get validation checklist for a schedule
 */
router.get("/validation/:year/:month", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get all schedules for the month
    const startDate = format(new Date(yearNum, monthNum - 1, 1), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(yearNum, monthNum - 1, 1)), 'yyyy-MM-dd');

    const monthSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          gte(schedules.date, startDate),
          lte(schedules.date, endDate)
        )
      );

    const validation = await validateScheduleBeforePublish(monthSchedules, monthNum, yearNum);

    res.json({
      success: true,
      data: validation
    });

  } catch (error: any) {
    console.error("[VALIDATION] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao validar escala"
    });
  }
});

// ============= HELPER FUNCTIONS =============

/**
 * Calculate comprehensive statistics for generated schedule
 */
function calculateGenerationStatistics(
  schedules: GeneratedSchedule[],
  options: Partial<GenerationOptions>
): GenerationStatistics {
  const assignmentsPerMinister: Record<string, number> = {};
  const specialMassCoverage: Record<string, number> = {};
  let totalPositions = 0;
  let filledPositions = 0;

  // Count assignments
  for (const schedule of schedules) {
    const massType = schedule.massTime.type || 'regular';

    totalPositions += schedule.massTime.minMinisters;
    filledPositions += schedule.ministers.length;

    // Track special mass coverage
    if (massType !== 'missa_diaria' && massType !== 'missa_dominical') {
      if (!specialMassCoverage[massType]) {
        specialMassCoverage[massType] = 0;
      }
      specialMassCoverage[massType] += (schedule.ministers.length / schedule.massTime.minMinisters) * 100;
    }

    // Count per minister
    for (const minister of schedule.ministers) {
      if (!minister.id) continue;
      assignmentsPerMinister[minister.id] = (assignmentsPerMinister[minister.id] || 0) + 1;
    }
  }

  // Calculate coverage
  const coverage = totalPositions > 0 ? filledPositions / totalPositions : 0;

  // Calculate distribution variance
  const assignments = Object.values(assignmentsPerMinister);
  const avgAssignments = assignments.length > 0
    ? assignments.reduce((sum, count) => sum + count, 0) / assignments.length
    : 0;

  const variance = assignments.length > 0
    ? Math.sqrt(
        assignments.reduce((sum, count) => sum + Math.pow(count - avgAssignments, 2), 0) / assignments.length
      ) / (avgAssignments || 1)
    : 0;

  // Calculate fairness (inverse of variance, capped at 1)
  const fairness = Math.max(0, 1 - variance);

  // Identify outliers
  const maxAllowed = options.maxAssignmentsPerMinister || 4;
  const outliers = Object.entries(assignmentsPerMinister)
    .filter(([_, count]) => count > maxAllowed || count < 1)
    .map(([ministerId, count]) => ({
      ministerId,
      count,
      reason: count > maxAllowed ? 'too_many' : 'too_few'
    }));

  // Detect conflicts
  const conflicts: string[] = [];
  if (variance > 0.3) {
    conflicts.push('Distribuição desigual de atribuições entre ministros');
  }
  if (coverage < 0.9) {
    conflicts.push('Algumas missas não atingiram o número mínimo de ministros');
  }

  return {
    coverage,
    fairness,
    conflicts,
    distributionVariance: variance,
    specialMassCoverage,
    assignmentsPerMinister,
    outliers
  };
}

/**
 * Check if minister is available for a specific date/time
 */
async function checkMinisterAvailability(
  ministerId: string,
  date: string,
  time: string
): Promise<{ available: boolean; reason?: string }> {
  // Get minister data
  const minister = await db
    .select()
    .from(users)
    .where(eq(users.id, ministerId))
    .limit(1);

  if (minister.length === 0) {
    return { available: false, reason: "Ministro não encontrado" };
  }

  // Check if minister has questionnaire response for this period
  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const responses = await db
    .select()
    .from(questionnaireResponses)
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
    .where(
      and(
        eq(questionnaireResponses.userId, ministerId),
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      )
    );

  if (responses.length === 0) {
    return { available: true, reason: "Sem resposta de questionário (assumindo disponível)" };
  }

  // TODO: Check specific availability based on response data
  // For now, assume available if they responded

  return { available: true };
}

/**
 * Calculate impact on fairness metrics
 */
async function calculateFairnessImpact(
  ministerId: string,
  date: string
): Promise<{ before: number; after: number; change: number }> {
  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const startDate = format(startOfMonth(dateObj), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(dateObj), 'yyyy-MM-dd');

  // Get all assignments for the month
  const allAssignments = await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.date, startDate),
        lte(schedules.date, endDate)
      )
    );

  // Count per minister
  const counts: Record<string, number> = {};
  for (const assignment of allAssignments) {
    if (!assignment.ministerId) continue;
    counts[assignment.ministerId] = (counts[assignment.ministerId] || 0) + 1;
  }

  // Calculate variance before
  const valuesBefore = Object.values(counts);
  const avgBefore = valuesBefore.reduce((sum, c) => sum + c, 0) / valuesBefore.length;
  const varianceBefore = Math.sqrt(
    valuesBefore.reduce((sum, c) => sum + Math.pow(c - avgBefore, 2), 0) / valuesBefore.length
  );

  // Calculate variance after (simulating the new assignment)
  counts[ministerId] = (counts[ministerId] || 0) + 1;
  const valuesAfter = Object.values(counts);
  const avgAfter = valuesAfter.reduce((sum, c) => sum + c, 0) / valuesAfter.length;
  const varianceAfter = Math.sqrt(
    valuesAfter.reduce((sum, c) => sum + Math.pow(c - avgAfter, 2), 0) / valuesAfter.length
  );

  return {
    before: varianceBefore,
    after: varianceAfter,
    change: varianceAfter - varianceBefore
  };
}

/**
 * Validate schedule before publishing
 */
async function validateScheduleBeforePublish(
  scheduleData: any[],
  month: number,
  year: number
): Promise<{
  valid: boolean;
  checks: {
    allSundaysCovered: boolean;
    specialCelebrationsCovered: boolean;
    noOverAssignments: boolean;
    distributionVariance: number;
  };
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check 1: All Sundays have minimum ministers
  const sundays = scheduleData.filter(s => {
    const date = new Date(s.date || s.massTime?.date);
    return date.getDay() === 0; // Sunday
  });

  const sundaysUnderstaffed = sundays.filter(s => {
    const ministerCount = s.ministers?.length || s.assignments?.length || 0;
    const minRequired = 15; // Minimum for Sundays
    return ministerCount < minRequired;
  });

  const allSundaysCovered = sundaysUnderstaffed.length === 0;
  if (!allSundaysCovered) {
    errors.push(`${sundaysUnderstaffed.length} missas dominicais sem o mínimo de ministros`);
  }

  // Check 2: Special celebrations adequately covered
  const specialMasses = scheduleData.filter(s => {
    const type = s.type || s.massTime?.type;
    return type && !['missa_diaria', 'missa_dominical'].includes(type);
  });

  const specialUnderstaffed = specialMasses.filter(s => {
    const ministerCount = s.ministers?.length || s.assignments?.length || 0;
    const minRequired = s.massTime?.minMinisters || 20;
    return ministerCount < minRequired;
  });

  const specialCelebrationsCovered = specialUnderstaffed.length === 0;
  if (!specialCelebrationsCovered) {
    warnings.push(`${specialUnderstaffed.length} celebrações especiais com poucos ministros`);
  }

  // Check 3: No minister over maximum assignments
  const ministerCounts: Record<string, number> = {};
  for (const schedule of scheduleData) {
    const ministers = schedule.ministers || schedule.assignments || [];
    for (const minister of ministers) {
      const id = minister.id || minister.ministerId;
      if (id) {
        ministerCounts[id] = (ministerCounts[id] || 0) + 1;
      }
    }
  }

  const overAssigned = Object.entries(ministerCounts).filter(([_, count]) => count > 4);
  const noOverAssignments = overAssigned.length === 0;
  if (!noOverAssignments) {
    warnings.push(`${overAssigned.length} ministros com mais de 4 atribuições`);
  }

  // Check 4: Distribution variance
  const counts = Object.values(ministerCounts);
  const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.length > 0
    ? Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length) / avg
    : 0;

  if (variance > 0.3) {
    warnings.push(`Distribuição desbalanceada (variância: ${(variance * 100).toFixed(0)}%)`);
  }

  const valid = errors.length === 0;

  return {
    valid,
    checks: {
      allSundaysCovered,
      specialCelebrationsCovered,
      noOverAssignments,
      distributionVariance: variance
    },
    warnings,
    errors
  };
}

/**
 * Save schedule to database
 */
async function saveScheduleToDatabase(
  scheduleData: any[],
  month: number,
  year: number
): Promise<number> {
  let savedCount = 0;

  for (const schedule of scheduleData) {
    const date = schedule.date || schedule.massTime?.date;
    const time = schedule.time || schedule.massTime?.time;
    const type = schedule.type || schedule.massTime?.type || 'missa';
    const ministers = schedule.ministers || schedule.assignments || [];

    for (const minister of ministers) {
      const ministerId = minister.id || minister.ministerId;
      const position = minister.position || 0;

      if (!ministerId) continue;

      // Check if already exists
      const existing = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.date, date),
            eq(schedules.time, time),
            eq(schedules.ministerId, ministerId)
          )
        );

      if (existing.length === 0) {
        await db.insert(schedules).values({
          date,
          time,
          type: type as any,
          ministerId,
          position,
          status: 'scheduled'
        });
        savedCount++;
      }
    }
  }

  return savedCount;
}

/**
 * Send notifications to ministers
 */
async function sendMinisterNotifications(
  scheduleData: any[],
  month: number,
  year: number
): Promise<{ sent: number; failed: number }> {
  // TODO: Implement actual notification sending
  // For now, just count unique ministers
  const uniqueMinisters = new Set<string>();

  for (const schedule of scheduleData) {
    const ministers = schedule.ministers || schedule.assignments || [];
    for (const minister of ministers) {
      const id = minister.id || minister.ministerId;
      if (id) uniqueMinisters.add(id);
    }
  }

  return {
    sent: uniqueMinisters.size,
    failed: 0
  };
}

/**
 * Get liturgical information for a month
 */
async function getLiturgicalInfoForMonth(year: number, month: number): Promise<any> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = endOfMonth(startDate);

  // Get current liturgical season
  const season = getCurrentLiturgicalSeason(startDate);

  // Get movable feasts
  const movableFeasts = getMovableFeasts(year);

  // Get special celebrations from database
  const celebrations = await db
    .select()
    .from(liturgicalCelebrations)
    .where(
      and(
        gte(liturgicalCelebrations.date, format(startDate, 'yyyy-MM-dd')),
        lte(liturgicalCelebrations.date, format(endDate, 'yyyy-MM-dd'))
      )
    );

  return {
    season,
    movableFeasts,
    specialCelebrations: celebrations
  };
}

export default router;
