import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../auth';
import type { AuthRequest } from '../auth';
import { generateAutomaticSchedule, GeneratedSchedule } from '../utils/scheduleGenerator';
import { logger } from '../utils/logger.js';
import { db } from '../db.js';
import { schedules, users, massTimesConfig, questionnaires, questionnaireResponses } from '@shared/schema';
import { and, gte, lte, eq, sql, ne, desc } from 'drizzle-orm';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

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
    ministerId: z.string(),
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
 * Salva escalas aprovadas no banco de dados
 * POST /api/schedules/save-generated
 */
router.post('/save-generated', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { schedules: schedulesToSave, replaceExisting } = saveSchedulesSchema.parse(req.body);

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de banco de dados indisponível'
      });
    }

    // Se replaceExisting, remover escalas existentes do período
    if (replaceExisting && schedulesToSave.length > 0) {
      // Ordenar por data para garantir o range correto
      const sortedSchedules = [...schedulesToSave].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = sortedSchedules[0].date;
      const lastDate = sortedSchedules[sortedSchedules.length - 1].date;
      
      await db.delete(schedules).where(
        and(
          gte(schedules.date, firstDate),
          lte(schedules.date, lastDate)
        )
      );

      logger.info(`Removidas escalas existentes entre ${firstDate} e ${lastDate}`);
    }

    // Inserir novas escalas com position
    // Agrupar por date+time para atribuir positions sequenciais
    const groupedByDateTime: { [key: string]: typeof schedulesToSave } = {};
    schedulesToSave.forEach(s => {
      const key = `${s.date}_${s.time}`;
      if (!groupedByDateTime[key]) {
        groupedByDateTime[key] = [];
      }
      groupedByDateTime[key].push(s);
    });

    const schedulesToInsert = schedulesToSave.map((s, globalIndex) => {
      const key = `${s.date}_${s.time}`;
      const groupIndex = groupedByDateTime[key].indexOf(s);
      
      return {
        date: s.date,
        time: s.time,
        type: s.type as any,
        location: s.location || null,
        ministerId: s.ministerId,
        position: s.position ?? (groupIndex + 1), // Use provided position or calculate from group index
        notes: s.notes || null,
        status: 'scheduled' as const
      };
    });

    const saved = await db.insert(schedules).values(schedulesToInsert).returning();

    logger.info(`Salvas ${saved.length} escalas no banco de dados`);

    res.json({
      success: true,
      message: `${saved.length} escalas salvas com sucesso`,
      data: {
        savedCount: saved.length,
        schedules: saved
      }
    });

  } catch (error: any) {
    logger.error('Erro ao salvar escalas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao salvar escalas'
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

    console.log('[PREVIEW ROUTE] Calling generateAutomaticSchedule with:', { year, month, isPreview: true });
    const generatedSchedules = await generateAutomaticSchedule(year, month, true); // Preview aceita questionários abertos
    console.log('[PREVIEW ROUTE] Generated schedules count:', generatedSchedules.length);

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

  let savedCount = 0;

  for (const schedule of generatedSchedules) {
    if (!schedule.massTime.date) continue;

    // Se replaceExisting, remover escalas existentes para esta data/hora
    if (replaceExisting) {
      await db.delete(schedules).where(
        and(
          eq(schedules.date, schedule.massTime.date),
          eq(schedules.time, schedule.massTime.time)
        )
      );
    }

    // Inserir ministros escalados com posição para manter a ordem
    for (let i = 0; i < schedule.ministers.length; i++) {
      const minister = schedule.ministers[i];
      await db.insert(schedules).values({
        date: schedule.massTime.date,
        time: schedule.massTime.time,
        type: 'missa',
        location: null,
        ministerId: minister.id,
        position: (minister as any).position || (i + 1), // Usar position do ministro ou index + 1
        status: 'scheduled',
        notes: `Gerado automaticamente - Confiança: ${Math.round(schedule.confidence * 100)}%`
      });
      savedCount++;
    }
  }

  return savedCount;
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
      ministerCounts[minister.id] = (ministerCounts[minister.id] || 0) + 1;
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
      ministerId: z.string(),
      type: z.string().default('missa'),
      location: z.string().optional(),
      notes: z.string().optional()
    });

    const data = schema.parse(req.body);

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    // Verificar se o ministro já está escalado nesta data/hora
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
      return res.status(400).json({ error: 'Ministro já escalado neste horário' });
    }

    // Contar quantos ministros já estão escalados para calcular a posição
    const existingMinisters = await db
      .select({ position: schedules.position })
      .from(schedules)
      .where(and(
        eq(schedules.date, data.date),
        eq(schedules.time, data.time)
      ))
      .orderBy(desc(schedules.position));
    
    // Nova posição é a maior posição existente + 1, ou 1 se não há ninguém
    const newPosition = existingMinisters.length > 0 && existingMinisters[0].position 
      ? existingMinisters[0].position + 1 
      : 1;

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

    res.json(newSchedule);
  } catch (error: any) {
    logger.error('Error adding minister to schedule:', error);
    res.status(500).json({ error: 'Failed to add minister to schedule' });
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
    const schema = z.object({
      date: z.string(),
      time: z.string(),
      ministers: z.array(z.string()) // Array de IDs de ministros na ordem desejada
    });

    const { date, time, ministers } = schema.parse(req.body);

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    // Remover todos os ministros atuais
    await db
      .delete(schedules)
      .where(and(
        eq(schedules.date, date),
        eq(schedules.time, time)
      ));

    // Adicionar novos ministros com posição para manter a ordem
    if (ministers.length > 0) {
      const newSchedules = ministers.map((ministerId, index) => ({
        date,
        time,
        ministerId,
        position: index + 1, // Posição começa em 1
        type: 'missa',
        status: 'scheduled'
      }));

      await db.insert(schedules).values(newSchedules);
    }

    res.json({ success: true, message: 'Escala atualizada com sucesso' });
  } catch (error: any) {
    logger.error('Error batch updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

export default router;