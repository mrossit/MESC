import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../auth';
import type { AuthRequest } from '../auth';
import { generateAutomaticSchedule, GeneratedSchedule } from '../utils/scheduleGenerator';
import { logger } from '../utils/logger.js';
import { db } from '../db.js';
import { schedules, users, massTimesConfig, questionnaires, questionnaireResponses, substitutionRequests, scheduleGenerations } from '@shared/schema';
import { and, gte, lte, eq, sql, ne, desc, inArray } from 'drizzle-orm';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { scheduleCache } from '../services/scheduleCache';
import { learningService } from '../services/learningService';
import type {
  EmergencySaveScheduleInput,
  ScheduleSaveResult,
  ScheduleSaveError,
  MinisterData,
  ScheduleWithUserJoin,
  SubstitutionWithScheduleJoin,
  WeeklyGroupedSchedules,
  ScheduleValidationDiagnostics,
  ScheduleInput
} from '../types/schedules';
import { getErrorMessage, getErrorStack } from '../types/schedules';

const router = Router();

/**
 * Helper function to validate and parse year/month from URL params
 */
function parseYearMonthParams(req: AuthRequest, res: import('express').Response): { year: number; month: number } | null {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  if (isNaN(year) || isNaN(month)) {
    res.status(400).json({ success: false, message: 'Ano e mês devem ser números válidos' });
    return null;
  }

  if (month < 1 || month > 12) {
    res.status(400).json({ success: false, message: 'Mês deve estar entre 1 e 12' });
    return null;
  }

  // Dynamic year validation: allow current year -1 to current year +10
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 1;
  const maxYear = currentYear + 10;
  if (year < minYear || year > maxYear) {
    res.status(400).json({ success: false, message: `Ano deve estar entre ${minYear} e ${maxYear}` });
    return null;
  }

  return { year, month };
}

// Dynamic year range for validation (current year -1 to +10)
const getYearRange = () => {
  const currentYear = new Date().getFullYear();
  return { min: currentYear - 1, max: currentYear + 10 };
};

// Schema para validação de entrada
const generateScheduleSchema = z.object({
  year: z.number().refine(
    (year) => {
      const { min, max } = getYearRange();
      return year >= min && year <= max;
    },
    { message: 'Ano fora do intervalo permitido' }
  ),
  month: z.number().min(1).max(12),
  saveToDatabase: z.boolean().default(true), // Now defaults to true - always save
  replaceExisting: z.boolean().default(true) // Now defaults to true
});

// Schema para salvar escalas aprovadas
const saveSchedulesSchema = z.object({
  schedules: z.array(z.object({
    date: z.string(),
    time: z.string(),
    type: z.string().default('missa'),
    location: z.string().optional(),
    ministerId: z.string().nullable(), // Permite null para posições VACANTE
    position: z.number().optional(), // Order position for ministers at same date/time
    notes: z.string().optional()
  })),
  replaceExisting: z.boolean().default(false)
});

/**
 * Gera escala automática para um mês específico
 * POST /api/schedules/generate
 */
router.post('/generate', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { year, month, saveToDatabase, replaceExisting } = generateScheduleSchema.parse(req.body);

    logger.info(`Iniciando geração automática de escalas para ${month}/${year} por usuário ${req.user?.id}`);

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se há questionário com respostas antes de gerar
    if (db) {
      // 1. Verificar se questionário existe para o mês
      const [targetQuestionnaire] = await db.select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.month, month),
            eq(questionnaires.year, year)
          )
        )
        .limit(1);

      if (!targetQuestionnaire) {
        logger.warn(`Tentativa de gerar escalas sem questionário: ${month}/${year}`);
        return res.status(400).json({
          success: false,
          message: `Não há questionário criado para ${month}/${year}. Crie um questionário antes de gerar escalas.`,
          errorCode: 'NO_QUESTIONNAIRE'
        });
      }

      // 2. Verificar se questionário tem respostas
      const responses = await db.select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, targetQuestionnaire.id));

      if (responses.length === 0) {
        logger.warn(`Tentativa de gerar escalas sem respostas: ${month}/${year}`);
        return res.status(400).json({
          success: false,
          message: 'Não há respostas do questionário para este mês. Aguarde os ministros responderem antes de gerar escalas.',
          errorCode: 'NO_RESPONSES',
          questionnaireStatus: targetQuestionnaire.status
        });
      }

      // Validate that responses have actual content (not empty objects)
      type ResponseType = typeof responses[number];
      const validResponses = responses.filter((r: ResponseType) => {
        // Check if response has userId and some meaningful data
        if (!r.userId) return false;

        // Check if responses field is not empty
        const hasResponses = r.responses && typeof r.responses === 'object' &&
          Object.keys(r.responses as object).length > 0;

        // Check for alternative availability fields
        const hasAvailability = (r.availableSundays && Array.isArray(r.availableSundays) && r.availableSundays.length > 0) ||
          (r.preferredMassTimes && Array.isArray(r.preferredMassTimes) && r.preferredMassTimes.length > 0);

        return hasResponses || hasAvailability;
      });

      if (validResponses.length === 0) {
        logger.warn(`Tentativa de gerar escalas com respostas vazias: ${month}/${year}`);
        return res.status(400).json({
          success: false,
          message: 'As respostas do questionário estão vazias ou incompletas. Aguarde os ministros responderem corretamente.',
          errorCode: 'EMPTY_RESPONSES',
          totalResponses: responses.length,
          validResponses: 0
        });
      }

      logger.info(`Validação OK: questionário ${targetQuestionnaire.id} com ${validResponses.length} respostas válidas de ${responses.length} totais`);
    }

    // Verificar se já existem escalas para o mês
    if (!replaceExisting && db) {
      const existingSchedules = await db.select({ id: schedules.id })
        .from(schedules)
        .where(sql`EXTRACT(MONTH FROM date) = ${month} AND EXTRACT(YEAR FROM date) = ${year}`)
        .limit(1);

      if (existingSchedules.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Já existem escalas cadastradas para ${month}/${year}. Use replaceExisting: true para substituir.`,
          hasExistingSchedules: true
        });
      }
    }

    // Gerar escalas automaticamente (definitiva - exige questionário fechado)
    console.log('[ROUTE] ⏳ INICIANDO generateAutomaticSchedule com:', { year, month, saveToDatabase, isPreview: false });
    
    let generatedSchedules;
    try {
      generatedSchedules = await generateAutomaticSchedule(year, month, false);
      console.log('[ROUTE] ✅ Generated schedules count:', generatedSchedules.length);
    } catch (genError: unknown) {
      console.error('[ROUTE] ❌ ERRO NA FUNÇÃO generateAutomaticSchedule:', genError);
      console.error('[ROUTE] ❌ genError.message:', getErrorMessage(genError));
      console.error('[ROUTE] ❌ genError.stack:', getErrorStack(genError));
      throw genError; // Re-throw para ser capturado pelo catch principal
    }

    // ALWAYS save to database and create schedule_generation record
    let savedCount = 0;
    let generationId: string | null = null;

    if (db) {
      // Save schedules to database
      savedCount = await saveGeneratedSchedules(generatedSchedules, replaceExisting);

      // Build the original schedule JSON for learning/comparison
      const originalScheduleJson = {
        month,
        year,
        generatedAt: new Date().toISOString(),
        totalMasses: generatedSchedules.length,
        schedules: generatedSchedules.map(schedule => ({
          date: schedule.massTime.date,
          time: schedule.massTime.time,
          type: schedule.massTime.type || 'missa',
          ministers: schedule.ministers.map((m, idx) => ({
            id: m.id,
            name: m.name,
            position: m.position || (idx + 1)
          })),
          confidence: schedule.confidence
        }))
      };

      const qualityMetrics = calculateQualityMetrics(generatedSchedules);
      const generationMetrics = {
        averageConfidence: calculateAverageConfidence(generatedSchedules),
        totalSchedules: generatedSchedules.length,
        savedCount,
        uniqueMinistersUsed: qualityMetrics.uniqueMinistersUsed,
        balanceScore: qualityMetrics.balanceScore,
        highConfidenceSchedules: qualityMetrics.highConfidenceSchedules,
        lowConfidenceSchedules: qualityMetrics.lowConfidenceSchedules
      };

      // Check if there's an existing draft for this month/year
      const [existingGeneration] = await db.select()
        .from(scheduleGenerations)
        .where(
          and(
            eq(scheduleGenerations.month, month),
            eq(scheduleGenerations.year, year),
            eq(scheduleGenerations.status, 'draft')
          )
        )
        .limit(1);

      if (existingGeneration) {
        // Update existing draft
        await db.update(scheduleGenerations)
          .set({
            originalSchedule: originalScheduleJson,
            generationMetrics,
            createdAt: new Date(),
            createdById: req.user?.id || null
          })
          .where(eq(scheduleGenerations.id, existingGeneration.id));

        generationId = existingGeneration.id;
        logger.info(`Updated existing schedule_generation: ${generationId}`);
      } else {
        // Create new generation record
        const [newGeneration] = await db.insert(scheduleGenerations)
          .values({
            month,
            year,
            status: 'draft',
            originalSchedule: originalScheduleJson,
            generationMetrics,
            createdById: req.user?.id || null
          })
          .returning();

        generationId = newGeneration.id;
        logger.info(`Created new schedule_generation: ${generationId}`);
      }
    }

    // Preparar resposta com dados úteis para interface
    const qualityMetricsData = calculateQualityMetrics(generatedSchedules);
    const response = {
      success: true,
      message: `Escalas geradas com sucesso para ${month}/${year}`,
      data: {
        month,
        year,
        generationId, // NEW: return the generation ID
        generationStatus: 'draft' as const, // NEW: return current status
        totalSchedules: generatedSchedules.length,
        savedToDatabase: true,
        savedCount,
        averageConfidence: calculateAverageConfidence(generatedSchedules),
        schedulesByWeek: groupSchedulesByWeek(generatedSchedules),
        qualityMetrics: qualityMetricsData,
        schedules: formatSchedulesForAPI(generatedSchedules)
      }
    };

    logger.info(`Geração concluída: ${generatedSchedules.length} escalas, confidence média: ${response.data.averageConfidence}, generationId: ${generationId}`);
    
    // DEBUG: Log da estrutura da resposta
    console.log('[RESPONSE_DEBUG] Estrutura da resposta:', {
      success: response.success,
      totalSchedules: response.data.totalSchedules,
      schedulesCount: response.data.schedules?.length,
      hasQualityMetrics: !!response.data.qualityMetrics,
      qualityMetricsKeys: response.data.qualityMetrics ? Object.keys(response.data.qualityMetrics) : []
    });

    res.json(response);

  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    const errorStack = getErrorStack(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const errorCode = (error as { code?: string })?.code;

    console.error('❌ [ROUTE] ERRO DETALHADO NO GENERATE:', error);
    console.error('❌ [ROUTE] ERRO STACK:', errorStack);
    console.error('❌ [ROUTE] ERRO NAME:', errorName);
    console.error('❌ [ROUTE] ERRO MESSAGE:', errorMsg);
    logger.error('Erro ao gerar escalas automáticas:', error);

    // Return error details only in development
    const errorResponse: { success: false; message: string; errorCode?: string; errorDetails?: object } = {
      success: false,
      message: errorMsg || 'Falha na geração automática de escalas',
    };

    // Only expose error details in development for debugging
    if (process.env.NODE_ENV === 'development') {
      errorResponse.errorDetails = {
        message: errorMsg,
        name: errorName,
        stack: errorStack
      };
    } else {
      // In production, only include error code if available
      errorResponse.errorCode = errorCode || 'GENERATION_ERROR';
    }

    res.status(500).json(errorResponse);
  }
});

/**
 * EMERGENCY BYPASS: Salva escalas sem validações de constraint
 * POST /api/schedules/emergency-save
 */
router.post('/emergency-save', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    console.log('=== EMERGENCY SAVE START ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Schedules count:', req.body.schedules?.length);
    console.log('Month:', req.body.month, 'Year:', req.body.year);

    const { schedules: schedulesInput, month, year } = req.body;

    if (!schedulesInput || !Array.isArray(schedulesInput)) {
      return res.status(400).json({
        success: false,
        message: 'Schedules array is required'
      });
    }

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de banco de dados indisponível'
      });
    }

    console.log('First schedule sample:', JSON.stringify(schedulesInput[0], null, 2));

    const results = [];
    const errors = [];

    // FIRST: Delete existing schedules for the month if replaceExisting
    if (month && year) {
      try {
        console.log(`=== DELETING EXISTING SCHEDULES FOR ${month}/${year} ===`);

        // Get date range for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        console.log(`Date range: ${startDate} to ${endDate}`);

        // Get existing schedule IDs in this month
        const existingSchedules = await db.select({ id: schedules.id })
          .from(schedules)
          .where(
            and(
              gte(schedules.date, startDate),
              lte(schedules.date, endDate)
            )
          );

        console.log(`Found ${existingSchedules.length} existing schedules to delete`);

        if (existingSchedules.length > 0) {
          const scheduleIds = existingSchedules.map((s: { id: string }) => s.id);

          // Delete substitution requests first (foreign key constraint)
          const deletedSubstitutions = await db.delete(substitutionRequests).where(
            inArray(substitutionRequests.scheduleId, scheduleIds)
          );
          console.log(`Deleted substitution requests`);

          // Now delete schedules
          const deletedSchedules = await db.delete(schedules).where(
            and(
              gte(schedules.date, startDate),
              lte(schedules.date, endDate)
            )
          );
          console.log(`Deleted ${existingSchedules.length} schedules`);
        }
      } catch (deleteErr: unknown) {
        console.error('Error deleting existing schedules:', deleteErr);
        // Continue anyway - maybe there were no schedules to delete
      }
    }

    // BATCH VALIDATION: Collect all unique minister IDs and validate in one query
    const uniqueMinisterIds = [...new Set(
      schedulesInput
        .map((s: { ministerId?: string | null }) => s.ministerId)
        .filter((id): id is string => id !== null && id !== undefined)
    )];

    const existingMinisterIds = new Set<string>();
    if (uniqueMinisterIds.length > 0) {
      const existingMinisters = await db.select({ id: users.id })
        .from(users)
        .where(inArray(users.id, uniqueMinisterIds));
      existingMinisters.forEach((m: { id: string }) => existingMinisterIds.add(m.id));
      console.log(`[BATCH_VALIDATION] Verified ${existingMinisterIds.size}/${uniqueMinisterIds.length} minister IDs exist`);
    }

    // Try to insert each schedule individually
    for (let i = 0; i < schedulesInput.length; i++) {
      const schedule = schedulesInput[i];

      try {
        // Validate required fields
        if (!schedule.date || !schedule.time) {
          throw new Error(`Missing required fields: date=${schedule.date}, time=${schedule.time}`);
        }

        // Validate ministerId using pre-fetched set (O(1) lookup instead of O(n) queries)
        if (schedule.ministerId && !existingMinisterIds.has(schedule.ministerId)) {
          throw new Error(`Minister ID ${schedule.ministerId} does not exist in database`);
        }

        // Create the record with all required fields
        // ✅ CRITICAL FIX: Only include columns that exist in database
        // Database columns: id, status, created_at, date, time, type, location, minister_id, substitute_id, notes, position
        const recordToInsert = {
          date: schedule.date,
          time: schedule.time,
          type: (schedule.type as 'missa' | 'celebracao' | 'evento') || 'missa',
          location: schedule.location || null,
          ministerId: schedule.ministerId || null,
          position: schedule.position !== undefined ? schedule.position : (i + 1),
          status: 'scheduled' as const,
          notes: schedule.notes || null
          // NOT including fields that don't exist in DB: on_site_adjustments, mass_type, month, year
        };

        const [inserted] = await db.insert(schedules).values(recordToInsert).returning();

        results.push({
          success: true,
          id: inserted.id,
          index: i
        });

      } catch (err: unknown) {
        const dbErr = err as { message?: string; code?: string; detail?: string; constraint?: string; name?: string; stack?: string };
        console.error(`[${i}] ❌ Failed to insert schedule:`, err);
        console.error(`[${i}] Error type:`, typeof err);
        console.error(`[${i}] Error message:`, dbErr?.message);
        console.error(`[${i}] Error code:`, dbErr?.code);
        console.error(`[${i}] Error stack:`, dbErr?.stack);
        console.error(`[${i}] Full error object:`, JSON.stringify(err, Object.getOwnPropertyNames(err as object)));

        errors.push({
          success: false,
          error: dbErr?.message || String(err),
          code: dbErr?.code,
          detail: dbErr?.detail,
          constraint: dbErr?.constraint,
          errorType: dbErr?.name,
          fullError: JSON.stringify(err, Object.getOwnPropertyNames(err as object)),
          index: i,
          schedule: {
            date: schedule.date,
            time: schedule.time,
            ministerId: schedule.ministerId,
            position: schedule.position
          }
        });
      }
    }

    const savedCount = results.filter(r => r.success).length;
    const failedCount = errors.length;

    console.log(`=== EMERGENCY SAVE COMPLETE ===`);
    console.log(`Saved: ${savedCount}, Failed: ${failedCount}`);
    if (failedCount > 0) {
      console.log('First 5 errors:', JSON.stringify(errors.slice(0, 5), null, 2));
    }

    // Invalidate cache for the affected month (even if all saves failed, 
    // because we deleted existing schedules)
    if (month && year) {
      scheduleCache.invalidate(year, month);
      console.log(`[CACHE] Invalidated cache for ${month}/${year} after emergency save (saved: ${savedCount}, failed: ${failedCount})`);
    }

    res.json({
      success: failedCount === 0,
      message: failedCount === 0
        ? `${savedCount} escalas salvas com sucesso via emergency save`
        : `Salvos: ${savedCount}, Falhas: ${failedCount}`,
      data: {
        savedCount,
        failedCount,
        results,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return only first 10 errors to avoid huge response
        errorSummary: errors.length > 0 ? {
          total: errors.length,
          sampleError: errors[0],
          uniqueErrors: [...new Set(errors.map(e => e.error))],
          uniqueCodes: [...new Set(errors.map(e => e.code))],
          uniqueConstraints: [...new Set(errors.map(e => e.constraint))]
        } : undefined
      }
    });

  } catch (error: unknown) {
    console.error('=== EMERGENCY SAVE CRITICAL ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', getErrorStack(error));

    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro crítico no emergency save',
      error: getErrorMessage(error),
      stack: process.env.NODE_ENV === 'development' ? getErrorStack(error) : undefined
    });
  }
});

/**
 * DEBUG: Inspecionar dados que serão salvos
 * POST /api/schedules/inspect-save-data
 */
router.post('/inspect-save-data', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { schedules: schedulesInput } = req.body;

    if (!schedulesInput || !Array.isArray(schedulesInput)) {
      return res.status(400).json({
        success: false,
        message: 'Schedules array is required'
      });
    }

    // Analyze the data
    type InputSchedule = { date?: string; time?: string; ministerId?: string | null; position?: number };
    const typedInput = schedulesInput as InputSchedule[];

    const analysis: ScheduleValidationDiagnostics & {
      ministerIdsInDb?: number;
      ministerIdsRequested?: number;
    } = {
      totalReceived: typedInput.length,
      sample: typedInput.slice(0, 3) as ScheduleInput[],
      ministerIds: [...new Set(typedInput.map(s => s.ministerId).filter((id): id is string => !!id))],
      uniqueDates: [...new Set(typedInput.map(s => s.date).filter((d): d is string => !!d))],
      uniqueTimes: [...new Set(typedInput.map(s => s.time).filter((t): t is string => !!t))],
      missingDate: typedInput.filter(s => !s.date).length,
      missingTime: typedInput.filter(s => !s.time).length,
      missingMinisterId: typedInput.filter(s => !s.ministerId).length,
      dataTypes: {
        date: typeof typedInput[0]?.date,
        time: typeof typedInput[0]?.time,
        ministerId: typeof typedInput[0]?.ministerId,
        position: typeof typedInput[0]?.position
      }
    };

    // Check if minister IDs exist
    if (db && analysis.ministerIds.length > 0) {
      const existingMinisters = await db.select({ id: users.id })
        .from(users)
        .where(inArray(users.id, analysis.ministerIds.slice(0, 50))); // Check first 50

      analysis.ministerIdsInDb = existingMinisters.length;
      analysis.ministerIdsRequested = analysis.ministerIds.length;

      // Find missing minister IDs
      const existingIds = new Set(existingMinisters.map((m: { id: string }) => m.id));
      analysis.missingMinisterIds = analysis.ministerIds.filter(id => !existingIds.has(id)).slice(0, 10);
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error),
      stack: getErrorStack(error)
    });
  }
});

/**
 * Salva escalas aprovadas no banco de dados
 * POST /api/schedules/save-generated
 */
router.post('/save-generated', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    console.log('=== SAVE-GENERATED START ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Schedules count:', req.body.schedules?.length);
    console.log('Replace existing:', req.body.replaceExisting);

    const { schedules: schedulesToSave, replaceExisting } = saveSchedulesSchema.parse(req.body);

    console.log('Parsed schedules:', schedulesToSave.length);
    console.log('First schedule sample:', schedulesToSave[0]);

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de banco de dados indisponível'
      });
    }

    // Se replaceExisting, remover escalas existentes do período
    if (replaceExisting && schedulesToSave.length > 0) {
      console.log('=== CASCADE DELETION START ===');
      // Ordenar por data para garantir o range correto
      const sortedSchedules = [...schedulesToSave].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = sortedSchedules[0].date;
      const lastDate = sortedSchedules[sortedSchedules.length - 1].date;

      console.log(`Date range: ${firstDate} to ${lastDate}`);

      // FIRST: Delete related substitution requests (foreign key constraint)
      const existingSchedules = await db.select({ id: schedules.id })
        .from(schedules)
        .where(
          and(
            gte(schedules.date, firstDate),
            lte(schedules.date, lastDate)
          )
        );

      console.log(`Found ${existingSchedules.length} existing schedules to delete`);

      if (existingSchedules.length > 0) {
        const scheduleIds = existingSchedules.map((s: { id: string }) => s.id);
        console.log(`Schedule IDs to delete:`, scheduleIds.slice(0, 5), '...');

        // Delete substitution requests before deleting schedules
        const deletedSubstitutions = await db.delete(substitutionRequests).where(
          inArray(substitutionRequests.scheduleId, scheduleIds)
        );

        console.log(`Deleted substitution requests:`, deletedSubstitutions);
        logger.info(`Removed substitution requests for ${scheduleIds.length} schedules`);
      }

      // Now safe to delete old schedules
      const deletedSchedules = await db.delete(schedules).where(
        and(
          gte(schedules.date, firstDate),
          lte(schedules.date, lastDate)
        )
      );

      console.log(`Deleted schedules:`, deletedSchedules);
      logger.info(`Removidas escalas existentes entre ${firstDate} e ${lastDate}`);
      console.log('=== CASCADE DELETION COMPLETE ===');
    }

    // Inserir novas escalas com position
    // Agrupar por date+time para atribuir positions sequenciais
    const groupedByDateTime: { [key: string]: Array<typeof schedulesToSave[0] & { _index: number }> } = {};
    schedulesToSave.forEach((s, idx) => {
      const key = `${s.date}_${s.time}`;
      if (!groupedByDateTime[key]) {
        groupedByDateTime[key] = [];
      }
      groupedByDateTime[key].push({ ...s, _index: idx });
    });

    const schedulesToInsert = schedulesToSave.map((s, globalIndex) => {
      const key = `${s.date}_${s.time}`;
      const group = groupedByDateTime[key];

      // Find this schedule's position within its group
      let positionInGroup = 1;
      for (let i = 0; i < group.length; i++) {
        if (group[i]._index === globalIndex) {
          positionInGroup = i + 1;
          break;
        }
      }

      // ✅ CRITICAL FIX: Only include columns that exist in database
      // Database columns: id, status, created_at, date, time, type, location, minister_id, substitute_id, notes, position
      // NOT including: on_site_adjustments, mass_type, month, year
      return {
        date: s.date,
        time: s.time,
        type: s.type as 'missa' | 'celebracao' | 'evento',
        location: s.location || null,
        ministerId: s.ministerId, // Drizzle will map this to minister_id
        position: s.position ?? positionInGroup, // Use provided position or calculated group position
        notes: s.notes || null,
        status: 'scheduled' as const
        // NOT including fields that don't exist in DB: on_site_adjustments, mass_type, month, year
      };
    });

    console.log('=== INSERTING SCHEDULES ===');
    console.log(`Inserting ${schedulesToInsert.length} schedules`);
    console.log('Sample schedule to insert:', schedulesToInsert[0]);

    const saved = await db.insert(schedules).values(schedulesToInsert).returning();

    console.log(`Successfully inserted ${saved.length} schedules`);
    logger.info(`Salvas ${saved.length} escalas no banco de dados`);

    // Invalidate cache for the month(s) affected (even if inserts failed,
    // because we may have deleted existing schedules)
    const uniqueMonths = new Set<string>();
    
    // Extract months from successfully saved schedules
    saved.forEach((schedule: { date: string }) => {
      const scheduleDate = new Date(schedule.date);
      const year = scheduleDate.getFullYear();
      const month = scheduleDate.getMonth() + 1;
      const monthKey = `${year}-${month}`;
      uniqueMonths.add(monthKey);
    });

    // Also extract months from schedules we attempted to insert
    schedulesToInsert.forEach(schedule => {
      const scheduleDate = new Date(schedule.date);
      const year = scheduleDate.getFullYear();
      const month = scheduleDate.getMonth() + 1;
      const monthKey = `${year}-${month}`;
      uniqueMonths.add(monthKey);
    });

    uniqueMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      scheduleCache.invalidate(year, month);
    });
    
    if (uniqueMonths.size > 0) {
      console.log(`[CACHE] Invalidated cache for months: ${Array.from(uniqueMonths).join(', ')}`);
    }

    res.json({
      success: true,
      message: `${saved.length} escalas salvas com sucesso`,
      data: {
        savedCount: saved.length,
        schedules: saved
      }
    });

  } catch (error: unknown) {
    const dbErr = error as { name?: string; message?: string; code?: string; detail?: string; constraint?: string; stack?: string };
    console.error('=== SAVE-GENERATED ERROR ===');
    console.error('Error name:', dbErr.name);
    console.error('Error message:', dbErr.message);
    console.error('Error code:', dbErr.code);
    console.error('Error detail:', dbErr.detail);
    console.error('Error constraint:', dbErr.constraint);
    console.error('Error stack:', dbErr.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));

    logger.error('Erro ao salvar escalas:', error);

    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao salvar escalas',
      errorCode: dbErr.code,
      errorDetail: dbErr.detail,
      constraint: dbErr.constraint
    });
  }
});

/**
 * Preview de escala para um mês - sem salvar
 * GET /api/schedules/preview/:year/:month
 */
router.get('/preview/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const params = parseYearMonthParams(req, res);
    if (!params) return;
    const { year, month } = params;

    console.log('[PREVIEW ROUTE] 🚀 Starting schedule preview with 30s timeout');

    // 🔥 EMERGENCY FIX: Add 30-second timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('⏱️ Schedule generation timed out after 30 seconds. This indicates a performance issue that needs to be fixed.'));
      }, 30000);
    });

    console.log('[PREVIEW ROUTE] Calling generateAutomaticSchedule with:', { year, month, isPreview: true });

    // Race between generation and timeout
    const generatedSchedules = await Promise.race([
      generateAutomaticSchedule(year, month, true), // Preview aceita questionários abertos
      timeoutPromise
    ]);

    console.log('[PREVIEW ROUTE] ✅ Generated schedules count:', generatedSchedules.length);

    // 🚨 CORREÇÃO DIRETA NA ROTA: Remover missas diárias do dia 28
    const correctedSchedules = generatedSchedules.filter(schedule => {
      const isDay28 = schedule.massTime.date?.endsWith('-28');
      const isDailyMass = schedule.massTime.type === 'missa_diaria';
      
      if (isDay28 && isDailyMass) {
        console.log(`[PREVIEW_FILTER] 🚫 Removendo missa diária do dia 28: ${schedule.massTime.date} ${schedule.massTime.time}`);
        return false; // Remover
      }
      return true;
    });

    console.log(`[PREVIEW_FILTER] Filtro aplicado: ${generatedSchedules.length} → ${correctedSchedules.length} escalas`);

    res.json({
      success: true,
      data: {
        month,
        year,
        totalSchedules: correctedSchedules.length,
        averageConfidence: calculateAverageConfidence(correctedSchedules),
        schedules: formatSchedulesForAPI(correctedSchedules),
        qualityMetrics: calculateQualityMetrics(correctedSchedules)
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao gerar preview:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao gerar preview'
    });
  }
});

/**
 * Get existing generation for a month/year
 * GET /api/schedules/generation/:year/:month
 */
router.get('/generation/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const params = parseYearMonthParams(req, res);
    if (!params) return;
    const { year, month } = params;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de banco de dados indisponível'
      });
    }

    // Find the most recent generation for this month/year (prefer draft over published)
    const [generation] = await db.select()
      .from(scheduleGenerations)
      .where(
        and(
          eq(scheduleGenerations.month, month),
          eq(scheduleGenerations.year, year)
        )
      )
      .orderBy(desc(scheduleGenerations.createdAt))
      .limit(1);

    if (!generation) {
      return res.json({
        success: true,
        data: null,
        message: 'Nenhuma geração encontrada para este período'
      });
    }

    // Get current schedules from database for this month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const currentSchedules = await db.select({
      id: schedules.id,
      date: schedules.date,
      time: schedules.time,
      type: schedules.type,
      ministerId: schedules.ministerId,
      position: schedules.position,
      status: schedules.status,
      notes: schedules.notes,
      ministerName: users.name,
      scheduleDisplayName: users.scheduleDisplayName
    })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          gte(schedules.date, startDate),
          lte(schedules.date, endDate)
        )
      )
      .orderBy(schedules.date, schedules.time, schedules.position, schedules.id);

    // Group schedules by date+time
    const groupedSchedules: Record<string, typeof currentSchedules> = {};
    currentSchedules.forEach(schedule => {
      const key = `${schedule.date}_${schedule.time}`;
      if (!groupedSchedules[key]) {
        groupedSchedules[key] = [];
      }
      groupedSchedules[key].push(schedule);
    });

    // Format as GeneratedSchedule-like structure
    const formattedSchedules = Object.entries(groupedSchedules).map(([key, ministers]) => {
      const [date, time] = key.split('_');
      return {
        date,
        time,
        dayOfWeek: new Date(date).getDay(),
        ministers: ministers.map(m => ({
          id: m.ministerId,
          name: m.scheduleDisplayName || m.ministerName || 'VACANTE',
          role: '',
          totalServices: 0,
          availabilityScore: 0,
          position: m.position
        })),
        backupMinisters: [],
        confidence: 1.0,
        qualityScore: 'Excelente'
      };
    });

    res.json({
      success: true,
      data: {
        generationId: generation.id,
        generationStatus: generation.status,
        month: generation.month,
        year: generation.year,
        createdAt: generation.createdAt,
        publishedAt: generation.publishedAt,
        originalSchedule: generation.originalSchedule,
        finalSchedule: generation.finalSchedule,
        differences: generation.differences,
        generationMetrics: generation.generationMetrics,
        // Current state from database
        totalSchedules: formattedSchedules.length,
        schedules: formattedSchedules,
        currentSchedulesCount: currentSchedules.length
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao carregar geração:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao carregar geração'
    });
  }
});

/**
 * Publish a schedule generation
 * POST /api/schedules/generation/:id/publish
 */
router.post('/generation/:id/publish', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de banco de dados indisponível'
      });
    }

    // Find the generation
    const [generation] = await db.select()
      .from(scheduleGenerations)
      .where(eq(scheduleGenerations.id, id))
      .limit(1);

    if (!generation) {
      return res.status(404).json({
        success: false,
        message: 'Geração não encontrada'
      });
    }

    if (generation.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Esta geração já foi publicada'
      });
    }

    const { month, year } = generation;

    // Get current schedules from database (final state after edits)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const currentSchedules = await db.select({
      id: schedules.id,
      date: schedules.date,
      time: schedules.time,
      type: schedules.type,
      ministerId: schedules.ministerId,
      position: schedules.position,
      ministerName: users.name
    })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          gte(schedules.date, startDate),
          lte(schedules.date, endDate)
        )
      )
      .orderBy(schedules.date, schedules.time, schedules.position, schedules.id);

    // Build final schedule JSON
    const groupedSchedules: Record<string, typeof currentSchedules> = {};
    currentSchedules.forEach(schedule => {
      const key = `${schedule.date}_${schedule.time}`;
      if (!groupedSchedules[key]) {
        groupedSchedules[key] = [];
      }
      groupedSchedules[key].push(schedule);
    });

    const finalScheduleJson = {
      month,
      year,
      publishedAt: new Date().toISOString(),
      totalMasses: Object.keys(groupedSchedules).length,
      schedules: Object.entries(groupedSchedules).map(([key, ministers]) => {
        const [date, time] = key.split('_');
        return {
          date,
          time,
          type: ministers[0]?.type || 'missa',
          ministers: ministers.map((m, idx) => ({
            id: m.ministerId,
            name: m.ministerName || 'VACANTE',
            position: m.position || (idx + 1)
          }))
        };
      })
    };

    // Calculate differences between original and final
    const originalSchedule = generation.originalSchedule as {
      schedules: Array<{
        date: string;
        time: string;
        ministers: Array<{ id: string | null; name: string; position: number }>;
      }>;
    };

    const differences = calculateScheduleDifferences(originalSchedule, finalScheduleJson);

    // 🤖 ADAPTIVE LEARNING: Learn from coordinator edits
    // This analyzes the differences and creates patterns for future schedule generation
    if (differences.summary.totalChanges > 0 && process.env.USE_DATABASE_MASS_CONFIG === 'true') {
      try {
        // Convert differences to learning format
        const learningDiffs = differences.changes
          .filter(c => c.type === 'minister_removed' || c.type === 'minister_added')
          .map(c => ({
            type: c.type === 'minister_removed' ? 'minister_removed' as const : 'minister_added' as const,
            ministerId: (c.type === 'minister_removed' ? c.original?.id : c.final?.id) || '',
            ministerName: (c.type === 'minister_removed' ? c.original?.name : c.final?.name) || '',
            date: c.date,
            time: c.time,
            massType: 'missa_dominical' // Would need to be extracted from schedule context
          }))
          .filter(d => d.ministerId); // Filter out VACANTE entries

        await learningService.learnFromDifferences(learningDiffs);
        logger.info(`🤖 Learned from ${learningDiffs.length} schedule edits`);
      } catch (learningError) {
        // Learning failure should not block publishing
        logger.warn('⚠️ Failed to learn from schedule differences:', learningError);
      }
    }

    // Update schedules status to 'published'
    await db.update(schedules)
      .set({ status: 'published' })
      .where(
        and(
          gte(schedules.date, startDate),
          lte(schedules.date, endDate)
        )
      );

    // Update generation record
    await db.update(scheduleGenerations)
      .set({
        status: 'published',
        finalSchedule: finalScheduleJson,
        differences,
        publishedAt: new Date()
      })
      .where(eq(scheduleGenerations.id, id));

    // Invalidate cache
    scheduleCache.invalidate(year, month);

    logger.info(`Geração ${id} publicada com sucesso. Diferenças: ${differences.summary.totalChanges} alterações`);

    res.json({
      success: true,
      message: `Escala de ${month}/${year} publicada com sucesso!`,
      data: {
        generationId: id,
        generationStatus: 'published',
        publishedAt: new Date().toISOString(),
        differences,
        schedulesPublished: currentSchedules.length
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao publicar geração:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao publicar geração'
    });
  }
});

/**
 * Calculate differences between original and final schedule
 */
function calculateScheduleDifferences(
  original: { schedules: Array<{ date: string; time: string; ministers: Array<{ id: string | null; name: string; position: number }> }> },
  final: { schedules: Array<{ date: string; time: string; ministers: Array<{ id: string | null; name: string; position: number }> }> }
) {
  const changes: Array<{
    date: string;
    time: string;
    type: 'minister_removed' | 'minister_added' | 'minister_replaced' | 'position_changed';
    original: { id: string | null; name: string; position: number } | null;
    final: { id: string | null; name: string; position: number } | null;
    reason: string;
  }> = [];

  let ministersAdded = 0;
  let ministersRemoved = 0;
  let ministersReplaced = 0;
  let positionsChanged = 0;

  // Create lookup maps
  const originalByKey = new Map<string, typeof original.schedules[0]>();
  original.schedules.forEach(s => {
    originalByKey.set(`${s.date}_${s.time}`, s);
  });

  const finalByKey = new Map<string, typeof final.schedules[0]>();
  final.schedules.forEach(s => {
    finalByKey.set(`${s.date}_${s.time}`, s);
  });

  // Check each original schedule against final
  originalByKey.forEach((origSchedule, key) => {
    const finalSchedule = finalByKey.get(key);
    const [date, time] = key.split('_');

    if (!finalSchedule) {
      // Entire mass was removed
      origSchedule.ministers.forEach(m => {
        changes.push({
          date, time,
          type: 'minister_removed',
          original: m,
          final: null,
          reason: 'mass_removed'
        });
        ministersRemoved++;
      });
      return;
    }

    // Compare ministers
    const origMinistersById = new Map(origSchedule.ministers.map(m => [m.id, m]));
    const finalMinistersById = new Map(finalSchedule.ministers.map(m => [m.id, m]));

    // Check for removed ministers
    origMinistersById.forEach((origMinister, id) => {
      if (!finalMinistersById.has(id)) {
        changes.push({
          date, time,
          type: 'minister_removed',
          original: origMinister,
          final: null,
          reason: 'manual_edit'
        });
        ministersRemoved++;
      } else {
        // Check position change
        const finalMinister = finalMinistersById.get(id)!;
        if (origMinister.position !== finalMinister.position) {
          changes.push({
            date, time,
            type: 'position_changed',
            original: origMinister,
            final: finalMinister,
            reason: 'reordered'
          });
          positionsChanged++;
        }
      }
    });

    // Check for added ministers
    finalMinistersById.forEach((finalMinister, id) => {
      if (!origMinistersById.has(id)) {
        changes.push({
          date, time,
          type: 'minister_added',
          original: null,
          final: finalMinister,
          reason: 'manual_edit'
        });
        ministersAdded++;
      }
    });
  });

  // Check for new masses in final that weren't in original
  finalByKey.forEach((finalSchedule, key) => {
    if (!originalByKey.has(key)) {
      const [date, time] = key.split('_');
      finalSchedule.ministers.forEach(m => {
        changes.push({
          date, time,
          type: 'minister_added',
          original: null,
          final: m,
          reason: 'mass_added'
        });
        ministersAdded++;
      });
    }
  });

  return {
    summary: {
      totalChanges: changes.length,
      ministersAdded,
      ministersRemoved,
      ministersReplaced,
      positionsChanged
    },
    changes
  };
}

/**
 * DEBUG: Verificar dados para geração
 * GET /api/schedules/debug/:year/:month
 */
router.get('/debug/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  const params = parseYearMonthParams(req, res);
  if (!params) return;
  const { year, month } = params;

  try {
    // Importar as classes necessárias
    const { ScheduleGenerator } = await import('../utils/scheduleGenerator');
    const generator = new ScheduleGenerator();

    // Dados dos ministros
    const ministersData = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
      totalServices: users.totalServices
    }).from(users).where(
      and(
        eq(users.status, 'active'),
        ne(users.role, 'gestor')
      )
    );

    // Horários de missa
    const massTimesData = await db.select().from(massTimesConfig)
      .where(eq(massTimesConfig.isActive, true));

    // Respostas de questionários
    const responsesData = await db.select().from(questionnaireResponses)
      .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .where(
        and(
          eq(questionnaires.month, month),
          eq(questionnaires.year, year)
        )
      );

    res.json({
      success: true,
      debug: {
        environment: process.env.NODE_ENV,
        database: !!db,
        month,
        year,
        ministers: {
          total: ministersData.length,
          list: ministersData
        },
        massTimes: {
          total: massTimesData.length,
          list: massTimesData
        },
        questionnaireResponses: {
          total: responsesData.length,
          hasData: responsesData.length > 0
        }
      }
    });
  } catch (error: unknown) {
    logger.error('Erro no debug:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error),
      stack: getErrorStack(error)
    });
  }
});

/**
 * Obter métricas de qualidade das escalas atuais
 * GET /api/schedules/quality-metrics/:year/:month
 */
router.get('/quality-metrics/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  const params = parseYearMonthParams(req, res);
  if (!params) return;
  const { year, month } = params;

  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de banco de dados indisponível'
      });
    }

    // Buscar escalas existentes para o mês
    const existingSchedules = await db.select()
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${schedules.date}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${schedules.date}) = ${year}`
        )
      );

    // Calcular taxa de substituição
    // Buscar substitution requests do mês (approved + auto_approved = substituições realizadas)
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const substitutions = await db
      .select()
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .where(
        and(
          gte(schedules.date, firstDay.toISOString().split('T')[0]),
          lte(schedules.date, lastDay.toISOString().split('T')[0])
        )
      );

    const completedSubstitutions = substitutions.filter(
      (s: SubstitutionWithScheduleJoin) => s.substitution_requests.status === 'approved' || s.substitution_requests.status === 'auto_approved'
    ).length;

    const substitutionRate = existingSchedules.length > 0
      ? Math.round((completedSubstitutions / existingSchedules.length) * 100)
      : 0;

    const typedSchedules = existingSchedules as ScheduleWithUserJoin[];
    const metrics = {
      totalSchedules: existingSchedules.length,
      uniqueMinisters: new Set(typedSchedules.map(s => s.schedules.ministerId)).size,
      averageSchedulesPerMinister: existingSchedules.length / new Set(typedSchedules.map(s => s.schedules.ministerId)).size,
      distributionBalance: calculateDistributionBalance(existingSchedules as ScheduleWithUserJoin[]),
      coverageByDay: calculateCoverageByDay(existingSchedules as ScheduleWithUserJoin[]),
      substitutionRate, // Percentual de escalas que tiveram substituição
      totalSubstitutions: substitutions.length,
      completedSubstitutions
    };

    res.json({
      success: true,
      data: {
        month,
        year,
        metrics,
        schedules: existingSchedules.length
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao calcular métricas:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao calcular métricas'
    });
  }
});

// Funções auxiliares
async function saveGeneratedSchedules(generatedSchedules: GeneratedSchedule[], replaceExisting: boolean): Promise<number> {
  if (!db) return 0;

  // Phase 1 - Data Integrity: Wrap entire operation in transaction
  return await db.transaction(async (tx: typeof db) => {
    let savedCount = 0;

    for (const schedule of generatedSchedules) {
      if (!schedule.massTime.date) continue;

      // Se replaceExisting, remover escalas existentes para esta data/hora
      if (replaceExisting) {
        // Delete old schedules for this date/time
        await tx.delete(schedules)
          .where(
            and(
              eq(schedules.date, schedule.massTime.date),
              eq(schedules.time, schedule.massTime.time)
            )
          );
      }

      // Inserir ministros escalados com posição para manter a ordem
      for (let i = 0; i < schedule.ministers.length; i++) {
        const minister = schedule.ministers[i];
        const ministerPosition = (minister as { position?: number }).position;
        await tx.insert(schedules).values({
          date: schedule.massTime.date,
          time: schedule.massTime.time,
          type: 'missa',
          location: null,
          ministerId: minister.id, // Pode ser null para VACANTE
          position: ministerPosition || (i + 1), // Usar position do ministro ou index + 1
          status: 'scheduled',
          notes: `Gerado automaticamente - Confiança: ${Math.round(schedule.confidence * 100)}%`
        });
        savedCount++;
      }
    }

    return savedCount;
  });
}

function calculateAverageConfidence(schedules: GeneratedSchedule[]): number {
  if (schedules.length === 0) return 0;
  const sum = schedules.reduce((acc, s) => acc + s.confidence, 0);
  return Math.round((sum / schedules.length) * 100) / 100;
}

function groupSchedulesByWeek(schedules: GeneratedSchedule[]): Record<string, GeneratedSchedule[]> {
  const weeks: Record<string, GeneratedSchedule[]> = {};
  
  schedules.forEach(schedule => {
    if (schedule.massTime.date) {
      const date = new Date(schedule.massTime.date);
      const weekKey = `Semana ${Math.ceil(date.getDate() / 7)}`;
      if (!weeks[weekKey]) weeks[weekKey] = [];
      weeks[weekKey].push(schedule);
    }
  });

  return weeks;
}

function calculateQualityMetrics(schedules: GeneratedSchedule[]) {
  const totalMinisters = new Set(schedules.flatMap(s => s.ministers.map(m => m.id))).size;
  const totalSchedules = schedules.reduce((acc, s) => acc + s.ministers.length, 0);
  
  return {
    uniqueMinistersUsed: totalMinisters,
    averageMinistersPerMass: Math.round((totalSchedules / schedules.length) * 10) / 10,
    highConfidenceSchedules: schedules.filter(s => s.confidence >= 0.8).length,
    lowConfidenceSchedules: schedules.filter(s => s.confidence < 0.5).length,
    balanceScore: calculateBalanceScore(schedules)
  };
}

function calculateBalanceScore(schedules: GeneratedSchedule[]): number {
  const ministerCounts: { [id: string]: number } = {};
  
  schedules.forEach(schedule => {
    schedule.ministers.forEach(minister => {
      // Ignorar posições VACANT (minister.id null) no cálculo de balanceamento
      if (minister.id !== null) {
        ministerCounts[minister.id] = (ministerCounts[minister.id] || 0) + 1;
      }
    });
  });

  const counts = Object.values(ministerCounts);
  if (counts.length === 0) return 0;

  const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  if (avg === 0) return 0;

  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;

  // Score de 0-1, onde 1 é perfeitamente balanceado
  return Math.max(0, 1 - Math.sqrt(variance) / avg);
}

function formatSchedulesForAPI(schedules: GeneratedSchedule[]) {
  // 🚨 FILTRO FINAL: Garantir que NÃO há missas diárias no dia 28 (São Judas)
  console.log(`[API_FILTER] 🔥 EXECUTANDO FILTRO! Total schedules: ${schedules.length}`);
  
  const filteredSchedules = schedules.filter(schedule => {
    const isDay28 = schedule.massTime.date?.endsWith('-28');
    const isDailyMass = schedule.massTime.type === 'missa_diaria';
    
    console.log(`[API_FILTER] 🔍 Checking: ${schedule.massTime.date} ${schedule.massTime.time} type=${schedule.massTime.type}`);
    
    if (isDay28 && isDailyMass) {
      console.log(`[API_FILTER] 🚫 REMOVENDO missa diária do dia 28: ${schedule.massTime.date} ${schedule.massTime.time}`);
      return false; // Remover
    }
    return true; // Manter
  });
  
  console.log(`[API_FILTER] 📊 Filtro final: ${schedules.length} → ${filteredSchedules.length} escalas`);
  
  return filteredSchedules.map(schedule => ({
    date: schedule.massTime.date,
    time: schedule.massTime.time,
    dayOfWeek: schedule.massTime.dayOfWeek,
    type: schedule.massTime.type || 'missa', // Incluir tipo da missa
    ministers: schedule.ministers.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      totalServices: m.totalServices,
      availabilityScore: Math.round(m.availabilityScore * 100) / 100,
      position: m.position
    })),
    backupMinisters: schedule.backupMinisters.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      position: m.position
    })),
    confidence: Math.round(schedule.confidence * 100) / 100,
    qualityScore: calculateScheduleQuality(schedule)
  }));
}

function calculateScheduleQuality(schedule: GeneratedSchedule): string {
  if (schedule.confidence >= 0.8) return 'Excelente';
  if (schedule.confidence >= 0.6) return 'Bom';
  if (schedule.confidence >= 0.4) return 'Regular';
  return 'Baixa';
}

function calculateDistributionBalance(schedules: ScheduleWithUserJoin[]): number {
  const ministerCounts: Record<string, number> = {};

  schedules.forEach(s => {
    const ministerId = s.schedules.ministerId;
    if (ministerId) {
      ministerCounts[ministerId] = (ministerCounts[ministerId] || 0) + 1;
    }
  });

  const counts = Object.values(ministerCounts);
  if (counts.length === 0) return 0;

  const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  if (avg === 0) return 0;

  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;

  return Math.max(0, 1 - Math.sqrt(variance) / avg);
}

function calculateCoverageByDay(schedules: ScheduleWithUserJoin[]): Record<string, number> {
  const coverage: Record<string, number> = {};

  schedules.forEach(s => {
    const date = s.schedules.date;
    if (date) {
      const day = format(new Date(date), 'EEEE', { locale: ptBR });
      coverage[day] = (coverage[day] || 0) + 1;
    }
  });

  return coverage;
}

/**
 * Buscar todas as atribuições para uma data específica
 * GET /api/schedules/by-date/:date
 */
router.get('/by-date/:date', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    const dateOnly = date.split('T')[0]; // Extrair apenas a parte da data (YYYY-MM-DD)

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const assignments = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        ministerId: schedules.ministerId,
        position: schedules.position,
        status: schedules.status,
        notes: schedules.notes,
        ministerName: users.name,
        scheduleDisplayName: users.scheduleDisplayName
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(eq(schedules.date, dateOnly))
      .orderBy(schedules.time, schedules.position, schedules.id);

    // Map assignments to expected format (massTime instead of time)
    type AssignmentResult = {
      id: string;
      date: string;
      time: string;
      type: string | null;
      location: string | null;
      ministerId: string | null;
      position: number | null;
      status: string;
      notes: string | null;
      ministerName: string | null;
      scheduleDisplayName: string | null;
    };
    const formattedAssignments = (assignments as AssignmentResult[]).map(a => ({
      id: a.id,
      date: a.date,
      massTime: a.time, // Frontend expects 'massTime' field
      type: a.type,
      location: a.location,
      ministerId: a.ministerId,
      position: a.position,
      status: a.status,
      notes: a.notes,
      ministerName: a.ministerName,
      scheduleDisplayName: a.scheduleDisplayName,
      confirmed: a.status === 'scheduled' // Map status to confirmed boolean
    }));

    if (formattedAssignments.length === 0) {
      return res.json({
        message: "Nenhuma escala publicada para esta data",
        assignments: []
      });
    }

    res.json({ assignments: formattedAssignments });
  } catch (error: unknown) {
    logger.error('Error fetching schedule by date:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * Buscar ministros escalados para uma data/hora específica
 * GET /api/schedules/:date/:time
 */
router.get('/:date/:time', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { date, time } = req.params;
    
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const scheduledMinisters = await db
      .select({
        id: schedules.id,
        ministerId: schedules.ministerId,
        ministerName: users.name,
        scheduleDisplayName: users.scheduleDisplayName,
        status: schedules.status,
        notes: schedules.notes,
        type: schedules.type,
        location: schedules.location,
        position: schedules.position
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(and(
        eq(schedules.date, date),
        eq(schedules.time, time)
      ))
      .orderBy(schedules.position, schedules.id);

    res.json({
      date,
      time,
      ministers: scheduledMinisters
    });
  } catch (error: unknown) {
    logger.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * Adicionar ministro a uma escala
 * POST /api/schedules/add-minister
 */
router.post('/add-minister', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      date: z.string(),
      time: z.string(),
      ministerId: z.string().nullable(), // Permite null para posições VACANTE
      position: z.number().optional(), // NOVO: aceita posição opcional
      type: z.string().default('missa'),
      location: z.string().optional(),
      notes: z.string().optional(),
      skipDuplicateCheck: z.boolean().optional() // NOVO: flag para permitir substituição durante edição
    });

    const data = schema.parse(req.body);
    
    logger.info(`[ADD_MINISTER] 📥 Recebido: date=${data.date}, time=${data.time}, ministerId=${data.ministerId}, position=${data.position}, skipDuplicateCheck=${data.skipDuplicateCheck}`);

    if (!db) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    // Verificar duplicação apenas se não for uma edição/substituição e ministerId existir
    if (!data.skipDuplicateCheck && data.ministerId) {
      logger.info(`[ADD_MINISTER] 🔍 Verificando duplicação: date=${data.date}, time=${data.time}, ministerId=${data.ministerId}`);

      const [existing] = await db
        .select()
        .from(schedules)
        .where(and(
          eq(schedules.date, data.date),
          eq(schedules.time, data.time),
          eq(schedules.ministerId, data.ministerId)
        ))
        .limit(1);

      if (existing) {
        logger.warn(`[ADD_MINISTER] ⚠️ Ministro ${data.ministerId} já escalado neste horário (ID do registro existente: ${existing.id})`);
        return res.status(400).json({ message: 'Ministro já escalado neste horário' });
      }
      
      logger.info(`[ADD_MINISTER] ✅ Nenhuma duplicação encontrada, prosseguindo...`);
    } else {
      logger.info(`[ADD_MINISTER] ⏩ Pulando verificação de duplicação (modo edição)`);
    }

    // Se posição foi fornecida, usar ela. Caso contrário, calcular automaticamente
    let newPosition: number;
    
    if (data.position !== undefined) {
      // Usar a posição fornecida (útil para edição/substituição)
      newPosition = data.position;
      logger.info(`[ADD_MINISTER] ✅ Usando posição fornecida: ${newPosition}`);
    } else {
      // Calcular automaticamente: última posição + 1
      const existingMinisters = await db
        .select({ position: schedules.position })
        .from(schedules)
        .where(and(
          eq(schedules.date, data.date),
          eq(schedules.time, data.time)
        ))
        .orderBy(desc(schedules.position));
      
      newPosition = existingMinisters.length > 0 && existingMinisters[0].position 
        ? existingMinisters[0].position + 1 
        : 1;
      logger.info(`[ADD_MINISTER] 🔢 Posição calculada automaticamente: ${newPosition} (ministros existentes: ${existingMinisters.length})`);
    }

    // Inserir novo ministro
    const [newSchedule] = await db
      .insert(schedules)
      .values({
        date: data.date,
        time: data.time,
        type: data.type,
        location: data.location,
        ministerId: data.ministerId,
        position: newPosition,
        notes: data.notes,
        status: 'scheduled'
      })
      .returning();

    logger.info(`[ADD_MINISTER] ✅ Ministro adicionado com sucesso: id=${newSchedule.id}, position=${newSchedule.position}`);
    res.json(newSchedule);
  } catch (error: unknown) {
    logger.error('[ADD_MINISTER] ❌ Erro ao adicionar ministro:', error);
    logger.error('[ADD_MINISTER] ❌ Stack:', getErrorStack(error));
    res.status(500).json({ message: getErrorMessage(error) || 'Erro ao adicionar ministro na escala' });
  }
});

/**
 * Remover ministro de uma escala
 * DELETE /api/schedules/:id
 */
router.delete('/:id', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    await db
      .delete(schedules)
      .where(eq(schedules.id, id));

    res.json({ success: true, message: 'Ministro removido da escala' });
  } catch (error: unknown) {
    logger.error('Error removing minister from schedule:', error);
    res.status(500).json({ error: 'Failed to remove minister from schedule' });
  }
});

/**
 * Atualizar múltiplos ministros de uma vez (útil para drag and drop)
 * PATCH /api/schedules/batch-update
 */
router.patch('/batch-update', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    console.log('[batch-update] Request body:', req.body);

    const schema = z.object({
      date: z.string(),
      time: z.string(),
      ministers: z.array(z.string().nullable()) // Array de IDs de ministros (null = VACANTE)
    });

    const { date, time, ministers } = schema.parse(req.body);

    console.log('[batch-update] Parsed data:', { date, time, ministers });

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    // Buscar escalas existentes para esta data/hora
    console.log('[batch-update] Fetching existing schedules for:', { date, time });
    const existingSchedules = await db
      .select()
      .from(schedules)
      .where(and(
        eq(schedules.date, date),
        eq(schedules.time, time)
      ));

    console.log('[batch-update] Found existing schedules:', existingSchedules.length);

    // SPECIAL CASE: Se todos os ministros foram removidos (lista vazia), deletar a missa inteira
    if (ministers.length === 0) {
      console.log('[batch-update] All ministers removed - deleting entire mass and related substitutions');
      
      // Primeiro, deletar todas as substituições relacionadas
      for (const schedule of existingSchedules) {
        await db
          .delete(substitutionRequests)
          .where(eq(substitutionRequests.scheduleId, schedule.id));
      }
      
      // Depois, deletar todas as escalações dessa missa
      await db
        .delete(schedules)
        .where(and(
          eq(schedules.date, date),
          eq(schedules.time, time)
        ));
      
      console.log('[batch-update] Mass deleted successfully');
      return res.json({ success: true, message: 'Missa removida completamente do calendário' });
    }

    // Estratégia: atualizar existentes e adicionar/remover conforme necessário
    // Isso evita deletar registros que podem ter foreign keys

    // 1. Atualizar ou criar registros para os ministros na nova lista
    for (let i = 0; i < ministers.length; i++) {
      const ministerId = ministers[i];
      const position = i + 1;

      if (existingSchedules[i]) {
        // Atualizar registro existente
        console.log('[batch-update] Updating schedule:', existingSchedules[i].id);
        await db
          .update(schedules)
          .set({
            ministerId: ministerId,
            position: position
          })
          .where(eq(schedules.id, existingSchedules[i].id));
      } else {
        // Criar novo registro
        console.log('[batch-update] Creating new schedule at position:', position);
        await db.insert(schedules).values({
          date,
          time,
          ministerId: ministerId,
          position: position,
          type: 'missa',
          status: 'scheduled'
        });
      }
    }

    // 2. Remover registros excedentes (se a nova lista for menor)
    if (existingSchedules.length > ministers.length) {
      const schedulesToDelete = existingSchedules.slice(ministers.length);
      console.log('[batch-update] Removing excess schedules:', schedulesToDelete.length);

      for (const schedule of schedulesToDelete) {
        // Verificar se há substituições vinculadas antes de deletar
        const hasSubstitutions = await db
          .select()
          .from(substitutionRequests)
          .where(eq(substitutionRequests.scheduleId, schedule.id))
          .limit(1);

        if (hasSubstitutions.length > 0) {
          // Se houver substituições, apenas marcar o ministerId como null ao invés de deletar
          console.log('[batch-update] Schedule has substitutions, setting ministerId to null:', schedule.id);
          await db
            .update(schedules)
            .set({ ministerId: null })
            .where(eq(schedules.id, schedule.id));
        } else {
          // Se não houver substituições, pode deletar
          console.log('[batch-update] Deleting schedule:', schedule.id);
          await db
            .delete(schedules)
            .where(eq(schedules.id, schedule.id));
        }
      }
    }

    console.log('[batch-update] Success! Updated schedule');
    res.json({ success: true, message: 'Escala atualizada com sucesso' });
  } catch (error: unknown) {
    console.error('[batch-update] Error:', error);
    logger.error('Error batch updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule', details: getErrorMessage(error) });
  }
});

export default router;