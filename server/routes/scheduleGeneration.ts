import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../auth';
import type { AuthRequest } from '../auth';
import { generateAutomaticSchedule, GeneratedSchedule } from '../utils/scheduleGenerator';
import { logger } from '../utils/logger.js';
import { db } from '../db.js';
import { schedules, users, massTimesConfig, questionnaires, questionnaireResponses, substitutionRequests } from '@shared/schema';
import { and, gte, lte, eq, sql, ne, desc, inArray } from 'drizzle-orm';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { scheduleCache } from '../services/scheduleCache';

const router = Router();

// Schema para validação de entrada
const generateScheduleSchema = z.object({
  year: z.number().min(2024).max(2030),
  month: z.number().min(1).max(12),
  saveToDatabase: z.boolean().default(false),
  replaceExisting: z.boolean().default(false)
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

      logger.info(`Validação OK: questionário ${targetQuestionnaire.id} com ${responses.length} respostas`);
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
    } catch (genError: any) {
      console.error('[ROUTE] ❌ ERRO NA FUNÇÃO generateAutomaticSchedule:', genError);
      console.error('[ROUTE] ❌ genError.message:', genError.message);
      console.error('[ROUTE] ❌ genError.stack:', genError.stack);
      throw genError; // Re-throw para ser capturado pelo catch principal
    }

    // Salvar no banco se solicitado
    let savedCount = 0;
    if (saveToDatabase && db) {
      savedCount = await saveGeneratedSchedules(generatedSchedules, replaceExisting);
    }

    // Preparar resposta com dados úteis para interface
    const response = {
      success: true,
      message: `Escalas geradas com sucesso para ${month}/${year}`,
      data: {
        month,
        year,
        totalSchedules: generatedSchedules.length,
        savedToDatabase: saveToDatabase,
        savedCount,
        averageConfidence: calculateAverageConfidence(generatedSchedules),
        schedulesByWeek: groupSchedulesByWeek(generatedSchedules),
        qualityMetrics: calculateQualityMetrics(generatedSchedules),
        schedules: formatSchedulesForAPI(generatedSchedules)
      }
    };

    logger.info(`Geração concluída: ${generatedSchedules.length} escalas, confidence média: ${response.data.averageConfidence}`);
    
    // DEBUG: Log da estrutura da resposta
    console.log('[RESPONSE_DEBUG] Estrutura da resposta:', {
      success: response.success,
      totalSchedules: response.data.totalSchedules,
      schedulesCount: response.data.schedules?.length,
      hasQualityMetrics: !!response.data.qualityMetrics,
      qualityMetricsKeys: response.data.qualityMetrics ? Object.keys(response.data.qualityMetrics) : []
    });

    res.json(response);

  } catch (error: any) {
    console.error('❌ [ROUTE] ERRO DETALHADO NO GENERATE:', error);
    console.error('❌ [ROUTE] ERRO STACK:', error.stack);
    console.error('❌ [ROUTE] ERRO NAME:', error.name);
    console.error('❌ [ROUTE] ERRO MESSAGE:', error.message);
    logger.error('Erro ao gerar escalas automáticas:', error);
    
    // SEMPRE retornar detalhes do erro para debugging
    res.status(500).json({
      success: false,
      message: error.message || 'Falha na geração automática de escalas',
      errorDetails: {
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    });
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
          const scheduleIds = existingSchedules.map((s: any) => s.id);

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
      } catch (deleteErr: any) {
        console.error('Error deleting existing schedules:', deleteErr);
        // Continue anyway - maybe there were no schedules to delete
      }
    }

    // Try to insert each schedule individually
    for (let i = 0; i < schedulesInput.length; i++) {
      const schedule = schedulesInput[i];

      try {
        // Validate required fields
        if (!schedule.date || !schedule.time) {
          throw new Error(`Missing required fields: date=${schedule.date}, time=${schedule.time}`);
        }

        // Validate ministerId if provided
        if (schedule.ministerId) {
          const [ministerExists] = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.id, schedule.ministerId))
            .limit(1);

          if (!ministerExists) {
            throw new Error(`Minister ID ${schedule.ministerId} does not exist in database`);
          }
        }

        // Create the record with all required fields
        // ✅ CRITICAL FIX: Only include columns that exist in database
        // Database columns: id, status, created_at, date, time, type, location, minister_id, substitute_id, notes, position
        const recordToInsert = {
          date: schedule.date,
          time: schedule.time,
          type: (schedule.type as any) || 'missa',
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

      } catch (err: any) {
        console.error(`[${i}] ❌ Failed to insert schedule:`, err);
        console.error(`[${i}] Error type:`, typeof err);
        console.error(`[${i}] Error message:`, err?.message);
        console.error(`[${i}] Error code:`, err?.code);
        console.error(`[${i}] Error stack:`, err?.stack);
        console.error(`[${i}] Full error object:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));

        errors.push({
          success: false,
          error: err?.message || String(err),
          code: err?.code,
          detail: err?.detail,
          constraint: err?.constraint,
          errorType: err?.name,
          fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
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

  } catch (error: any) {
    console.error('=== EMERGENCY SAVE CRITICAL ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      message: error.message || 'Erro crítico no emergency save',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    const analysis: {
      total: number;
      sample: any[];
      ministerIds: any[];
      uniqueDates: any[];
      uniqueTimes: any[];
      missingDate: number;
      missingTime: number;
      missingMinisterId: number;
      dataTypes: any;
      ministerIdsInDb?: number;
      ministerIdsRequested?: number;
      missingMinisterIds?: any[];
    } = {
      total: schedulesInput.length,
      sample: schedulesInput.slice(0, 3),
      ministerIds: [...new Set(schedulesInput.map((s: any) => s.ministerId).filter(Boolean))],
      uniqueDates: [...new Set(schedulesInput.map((s: any) => s.date))],
      uniqueTimes: [...new Set(schedulesInput.map((s: any) => s.time))],
      missingDate: schedulesInput.filter((s: any) => !s.date).length,
      missingTime: schedulesInput.filter((s: any) => !s.time).length,
      missingMinisterId: schedulesInput.filter((s: any) => !s.ministerId).length,
      dataTypes: {
        date: typeof schedulesInput[0]?.date,
        time: typeof schedulesInput[0]?.time,
        ministerId: typeof schedulesInput[0]?.ministerId,
        position: typeof schedulesInput[0]?.position
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
      const existingIds = new Set(existingMinisters.map((m: any) => m.id));
      analysis.missingMinisterIds = analysis.ministerIds.filter(id => !existingIds.has(id)).slice(0, 10);
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
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
        const scheduleIds = existingSchedules.map((s: any) => s.id);
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
        type: s.type as any,
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
    saved.forEach((schedule: any) => {
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

  } catch (error: any) {
    console.error('=== SAVE-GENERATED ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error constraint:', error.constraint);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));

    logger.error('Erro ao salvar escalas:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao salvar escalas',
      errorCode: error.code,
      errorDetail: error.detail,
      constraint: error.constraint
    });
  }
});

/**
 * Preview de escala para um mês - sem salvar
 * GET /api/schedules/preview/:year/:month
 */
router.get('/preview/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Ano e mês devem ser válidos'
      });
    }

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

  } catch (error: any) {
    logger.error('Erro ao gerar preview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao gerar preview'
    });
  }
});

/**
 * DEBUG: Verificar dados para geração
 * GET /api/schedules/debug/:year/:month
 */
router.get('/debug/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

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
  } catch (error: any) {
    logger.error('Erro no debug:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * Obter métricas de qualidade das escalas atuais
 * GET /api/schedules/quality-metrics/:year/:month
 */
router.get('/quality-metrics/:year/:month', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

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

    const metrics = {
      totalSchedules: existingSchedules.length,
      uniqueMinisters: new Set(existingSchedules.map((s: any) => s.schedules.ministerId)).size,
      averageSchedulesPerMinister: existingSchedules.length / new Set(existingSchedules.map((s: any) => s.schedules.ministerId)).size,
      distributionBalance: calculateDistributionBalance(existingSchedules),
      coverageByDay: calculateCoverageByDay(existingSchedules),
      substitutionRate: 0 // TODO: calcular com base em substituições
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

  } catch (error: any) {
    logger.error('Erro ao calcular métricas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao calcular métricas'
    });
  }
});

// Funções auxiliares
async function saveGeneratedSchedules(generatedSchedules: GeneratedSchedule[], replaceExisting: boolean): Promise<number> {
  if (!db) return 0;

  // Phase 1 - Data Integrity: Wrap entire operation in transaction
  return await db.transaction(async (tx: any) => {
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
        await tx.insert(schedules).values({
          date: schedule.massTime.date,
          time: schedule.massTime.time,
          type: 'missa',
          location: null,
          ministerId: minister.id, // Pode ser null para VACANTE
          position: (minister as any).position || (i + 1), // Usar position do ministro ou index + 1
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

function groupSchedulesByWeek(schedules: GeneratedSchedule[]): any {
  const weeks: { [key: string]: GeneratedSchedule[] } = {};
  
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
  const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
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

function calculateDistributionBalance(schedules: any[]): number {
  const ministerCounts: { [id: string]: number } = {};
  
  schedules.forEach(s => {
    const ministerId = s.schedules.ministerId;
    if (ministerId) {
      ministerCounts[ministerId] = (ministerCounts[ministerId] || 0) + 1;
    }
  });

  const counts = Object.values(ministerCounts);
  if (counts.length === 0) return 0;
  
  const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
  
  return Math.max(0, 1 - Math.sqrt(variance) / avg);
}

function calculateCoverageByDay(schedules: any[]) {
  const coverage: { [day: string]: number } = {};
  
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
      .orderBy(schedules.time, schedules.position);

    // Map assignments to expected format (massTime instead of time)
    const formattedAssignments = assignments.map((a: any) => ({
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
  } catch (error: any) {
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
      .orderBy(schedules.position);

    res.json({
      date,
      time,
      ministers: scheduledMinisters
    });
  } catch (error: any) {
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
  } catch (error: any) {
    logger.error('[ADD_MINISTER] ❌ Erro ao adicionar ministro:', error);
    logger.error('[ADD_MINISTER] ❌ Stack:', error.stack);
    res.status(500).json({ message: error.message || 'Erro ao adicionar ministro na escala' });
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('[batch-update] Error:', error);
    logger.error('Error batch updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule', details: error.message });
  }
});

export default router;