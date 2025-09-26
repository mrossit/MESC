import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../auth';
import type { AuthRequest } from '../auth';
import { generateAutomaticSchedule, GeneratedSchedule } from '../utils/scheduleGenerator.js';
import { logger } from '../utils/logger.js';
import { db } from '../db.js';
import { schedules, users } from '@shared/schema';
import { and, gte, lte, eq, sql } from 'drizzle-orm';
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
    const generatedSchedules = await generateAutomaticSchedule(year, month, false);

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
    logger.error('Erro ao gerar escalas automáticas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // Inserir novas escalas
    const schedulesToInsert = schedulesToSave.map(s => ({
      date: s.date,
      time: s.time,
      type: s.type as any,
      location: s.location || null,
      ministerId: s.ministerId,
      notes: s.notes || null,
      status: 'scheduled' as const
    }));

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

    const generatedSchedules = await generateAutomaticSchedule(year, month, true); // Preview aceita questionários abertos

    res.json({
      success: true,
      data: {
        month,
        year,
        totalSchedules: generatedSchedules.length,
        averageConfidence: calculateAverageConfidence(generatedSchedules),
        schedules: formatSchedulesForAPI(generatedSchedules),
        qualityMetrics: calculateQualityMetrics(generatedSchedules)
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
    const { ScheduleGenerator } = await import('../utils/scheduleGenerator.js');
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
      uniqueMinisters: new Set(existingSchedules.map(s => s.schedules.ministerId)).size,
      averageSchedulesPerMinister: existingSchedules.length / new Set(existingSchedules.map(s => s.schedules.ministerId)).size,
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

    // Inserir ministros escalados
    for (const minister of schedule.ministers) {
      await db.insert(schedules).values({
        date: schedule.massTime.date,
        time: schedule.massTime.time,
        type: 'missa',
        location: null,
        ministerId: minister.id,
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
  return schedules.map(schedule => ({
    date: schedule.massTime.date,
    time: schedule.massTime.time,
    dayOfWeek: schedule.massTime.dayOfWeek,
    ministers: schedule.ministers.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      totalServices: m.totalServices,
      availabilityScore: Math.round(m.availabilityScore * 100) / 100
    })),
    backupMinisters: schedule.backupMinisters.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role
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

export default router;