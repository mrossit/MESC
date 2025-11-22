import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../auth';
import type { AuthRequest } from '../auth';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { db } from '../db';
import { users, questionnaireResponses, questionnaires } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const router = Router();

// Schema de validação para o sorteio
const createDrawSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2024).max(2030),
  totalMinistersToDraw: z.number().min(1).max(100).optional() // Opcional, será calculado automaticamente
});

/**
 * POST /api/adoration/draw
 * Executa sorteio de ministros para adoração ao Santíssimo nas segundas-feiras
 * Somente coordenadores e gestores podem executar
 */
router.post('/draw', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { month, year, totalMinistersToDraw } = createDrawSchema.parse(req.body);

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    logger.info(`Iniciando sorteio de adoração para ${month}/${year} por ${req.user.id}`);

    // 1. Verificar se já existe sorteio para este mês
    const existingDraws = await storage.getAdorationDraws(year, month);
    if (existingDraws.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Já existe um sorteio para ${month}/${year}. Delete o sorteio anterior para criar um novo.`,
        drawId: existingDraws[0].id
      });
    }

    // 2. Buscar todos os ministros ativos e coordenadores
    const allMinisters = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          inArray(users.role, ['ministro', 'coordenador'])
        )
      );

    if (allMinisters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Não há ministros ativos disponíveis para sorteio'
      });
    }

    // 3. Calcular quantas segundas-feiras tem no mês
    const mondaysInMonth = getMondaysInMonth(year, month);
    const mondayCount = mondaysInMonth.length;

    if (mondayCount === 0) {
      return res.status(400).json({
        success: false,
        message: `Não há segundas-feiras no mês ${month}/${year}`
      });
    }

    // 4. Determinar quantos ministros total sortear
    const ministersToDrawTotal = totalMinistersToDraw || Math.ceil(allMinisters.length / 4); // Aproximadamente 1/4 dos ministros
    const ministersPerMonday = Math.ceil(ministersToDrawTotal / mondayCount);

    logger.info(`Sorteio: ${allMinisters.length} ministros disponíveis, ${mondayCount} segundas, ${ministersPerMonday} por segunda`);

    // 5. Verificar respostas voluntárias no questionário (se existir)
    const voluntaryMinisters = await getVoluntaryMinistersForAdoration(year, month);
    const voluntaryMinisterIds = new Set(voluntaryMinisters.map(m => m.id));

    logger.info(`${voluntaryMinisters.length} ministros se voluntariaram para adoração`);

    // 6. Criar o sorteio
    const draw = await storage.createAdorationDraw({
      month,
      year,
      totalMinistersToDraw: ministersToDrawTotal,
      createdBy: req.user.id
    });

    // 7. Executar o sorteio distribuindo entre as segundas
    const selectedMinisters = new Set<string>();
    const drawResults = [];

    // Shuffle array helper
    const shuffle = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Para cada segunda-feira do mês
    for (let weekIndex = 0; weekIndex < mondayCount; weekIndex++) {
      const mondayOfWeek = weekIndex + 1; // 1, 2, 3, 4, 5
      
      // Embaralhar lista de ministros disponíveis (não sorteados ainda)
      const availableForThisMonday = shuffle(
        allMinisters.filter(m => !selectedMinisters.has(m.id))
      );

      // Primeiro, adicionar voluntários se houver
      const voluntariesForThisMonday = availableForThisMonday
        .filter(m => voluntaryMinisterIds.has(m.id))
        .slice(0, ministersPerMonday);

      for (const minister of voluntariesForThisMonday) {
        await storage.addAdorationDrawResult(draw.id, minister.id, mondayOfWeek, true);
        selectedMinisters.add(minister.id);
        drawResults.push({
          ministerId: minister.id,
          ministerName: minister.name,
          mondayOfWeek,
          date: mondaysInMonth[weekIndex].toISOString().split('T')[0],
          isVoluntary: true
        });
      }

      // Completar com sorteados obrigatórios se necessário
      const remainingNeeded = ministersPerMonday - voluntariesForThisMonday.length;
      if (remainingNeeded > 0) {
        const nonVolunteers = availableForThisMonday
          .filter(m => !voluntaryMinisterIds.has(m.id) && !selectedMinisters.has(m.id))
          .slice(0, remainingNeeded);

        for (const minister of nonVolunteers) {
          await storage.addAdorationDrawResult(draw.id, minister.id, mondayOfWeek, false);
          selectedMinisters.add(minister.id);
          drawResults.push({
            ministerId: minister.id,
            ministerName: minister.name,
            mondayOfWeek,
            date: mondaysInMonth[weekIndex].toISOString().split('T')[0],
            isVoluntary: false
          });
        }
      }
    }

    logger.info(`Sorteio concluído: ${selectedMinisters.size} ministros distribuídos em ${mondayCount} segundas`);

    res.json({
      success: true,
      message: `Sorteio realizado com sucesso para ${month}/${year}`,
      data: {
        drawId: draw.id,
        month,
        year,
        totalMinisters: selectedMinisters.size,
        totalMondays: mondayCount,
        ministersPerMonday,
        voluntaryCount: drawResults.filter(r => r.isVoluntary).length,
        mandatoryCount: drawResults.filter(r => !r.isVoluntary).length,
        results: drawResults
      }
    });

  } catch (error: any) {
    logger.error('Erro ao executar sorteio de adoração:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao executar sorteio'
    });
  }
});

/**
 * GET /api/adoration/results/:year/:month
 * Busca resultados do sorteio de adoração
 */
router.get('/results/:year/:month', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const draws = await storage.getAdorationDraws(year, month);
    
    if (draws.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum sorteio encontrado para este mês',
        data: null
      });
    }

    const draw = draws[0]; // Pegar o mais recente
    const results = await storage.getAdorationDrawResults(draw.id);

    // Enriquecer com dados dos ministros
    const ministerIds = [...new Set(results.map(r => r.ministerId))];
    const ministers = await db
      .select()
      .from(users)
      .where(inArray(users.id, ministerIds));

    const ministerMap = new Map(ministers.map(m => [m.id, m]));

    const enrichedResults = results.map(result => {
      const minister = ministerMap.get(result.ministerId);
      return {
        ...result,
        ministerName: minister?.name || 'Desconhecido',
        ministerEmail: minister?.email
      };
    });

    // Agrupar por semana
    const mondaysInMonth = getMondaysInMonth(year, month);
    const resultsByWeek = enrichedResults.reduce((acc, result) => {
      const weekKey = `week_${result.mondayOfWeek}`;
      if (!acc[weekKey]) {
        acc[weekKey] = {
          weekNumber: result.mondayOfWeek,
          date: mondaysInMonth[result.mondayOfWeek - 1]?.toISOString().split('T')[0] || null,
          ministers: []
        };
      }
      acc[weekKey].ministers.push({
        id: result.ministerId,
        name: result.ministerName,
        email: result.ministerEmail,
        isVoluntary: result.isVoluntary
      });
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: {
        drawId: draw.id,
        month,
        year,
        createdAt: draw.createdAt,
        totalMinisters: ministerIds.length,
        voluntaryCount: enrichedResults.filter(r => r.isVoluntary).length,
        mandatoryCount: enrichedResults.filter(r => !r.isVoluntary).length,
        weeks: Object.values(resultsByWeek)
      }
    });

  } catch (error: any) {
    logger.error('Erro ao buscar resultados de adoração:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar resultados'
    });
  }
});

/**
 * DELETE /api/adoration/draw/:drawId
 * Deleta um sorteio (somente coordenador/gestor)
 */
router.delete('/draw/:drawId', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const { drawId } = req.params;
    await storage.deleteAdorationDraw(drawId);
    
    logger.info(`Sorteio ${drawId} deletado por ${req.user?.id}`);
    
    res.json({
      success: true,
      message: 'Sorteio deletado com sucesso'
    });
  } catch (error: any) {
    logger.error('Erro ao deletar sorteio:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao deletar sorteio'
    });
  }
});

// Helper: Get all Mondays in a given month
function getMondaysInMonth(year: number, month: number): Date[] {
  const mondays: Date[] = [];
  const date = new Date(year, month - 1, 1); // Start at first day of month
  
  // Find first Monday
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  
  // Collect all Mondays in the month
  while (date.getMonth() === month - 1) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  
  return mondays;
}

// Helper: Get ministers who volunteered for adoration in questionnaire
async function getVoluntaryMinistersForAdoration(year: number, month: number) {
  try {
    // 1. Buscar questionário do mês
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.year, year),
          eq(questionnaires.month, month)
        )
      )
      .limit(1);

    if (!questionnaire) {
      return [];
    }

    // 2. Buscar respostas que indicaram disponibilidade para adoração
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    // 3. Filtrar ministros que disseram "sim" para adoração (mondayAdoration)
    const voluntaryMinisterIds = responses
      .filter(response => {
        const resp = response.response as any;
        // Verificar se respondeu sim para mondayAdoration em qualquer formato
        return resp?.extra_activities?.mondayAdoration === 'yes' ||
               resp?.extra_activities?.mondayAdoration === true ||
               resp?.mondayAdoration === 'yes' ||
               resp?.mondayAdoration === true;
      })
      .map(r => r.userId);

    if (voluntaryMinisterIds.length === 0) {
      return [];
    }

    // 4. Buscar dados completos dos ministros voluntários
    const voluntaryMinisters = await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, voluntaryMinisterIds),
          eq(users.status, 'active')
        )
      );

    return voluntaryMinisters;

  } catch (error) {
    logger.error('Erro ao buscar voluntários para adoração:', error);
    return [];
  }
}

export default router;
