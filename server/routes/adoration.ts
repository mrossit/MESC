import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../auth';
import type { AuthRequest } from '../auth';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { db } from '../db';
import { users, questionnaireResponses, questionnaires } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const router = Router();

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/**
 * Helper function to validate and parse year/month from URL params
 */
function parseYearMonthParams(req: Request, res: Response): { year: number; month: number } | null {
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

  if (year < 2024 || year > 2030) {
    res.status(400).json({ success: false, message: 'Ano deve estar entre 2024 e 2030' });
    return null;
  }

  return { year, month };
}

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

    // 2. Buscar todos os ministros ativos e coordenadores COM familyId
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

    // 4. Agrupar ministros por família
    // Familiares devem ser escalados JUNTOS na mesma segunda-feira
    const familyGroups = new Map<string, typeof allMinisters>();
    const individualsWithoutFamily: typeof allMinisters = [];

    for (const minister of allMinisters) {
      if (minister.familyId) {
        if (!familyGroups.has(minister.familyId)) {
          familyGroups.set(minister.familyId, []);
        }
        familyGroups.get(minister.familyId)!.push(minister);
      } else {
        individualsWithoutFamily.push(minister);
      }
    }

    logger.info(`Sorteio: ${allMinisters.length} ministros, ${familyGroups.size} famílias, ${individualsWithoutFamily.length} individuais`);

    // 5. Criar unidades de sorteio (família inteira conta como 1 unidade)
    interface DrawUnit {
      id: string; // familyId ou odMinisterId
      members: typeof allMinisters;
      isFamily: boolean;
      isVoluntary: boolean;
    }

    const voluntaryMinisters = await getVoluntaryMinistersForAdoration(year, month);
    type VoluntaryMinister = typeof voluntaryMinisters[number];
    const voluntaryMinisterIds = new Set(voluntaryMinisters.map((m: VoluntaryMinister) => m.id));

    const drawUnits: DrawUnit[] = [];

    // Adicionar famílias como unidades
    for (const [familyId, members] of familyGroups) {
      // Família é voluntária se pelo menos um membro é voluntário
      const hasVoluntary = members.some((m: { id: string }) => voluntaryMinisterIds.has(m.id));
      drawUnits.push({
        id: familyId,
        members,
        isFamily: true,
        isVoluntary: hasVoluntary
      });
    }

    // Adicionar individuais como unidades
    for (const minister of individualsWithoutFamily) {
      drawUnits.push({
        id: minister.id,
        members: [minister],
        isFamily: false,
        isVoluntary: voluntaryMinisterIds.has(minister.id)
      });
    }

    // 6. Determinar quantas UNIDADES por segunda (não ministros)
    const unitsPerMonday = Math.ceil(drawUnits.length / mondayCount);

    logger.info(`${drawUnits.length} unidades de sorteio, ${unitsPerMonday} por segunda`);
    logger.info(`${voluntaryMinisters.length} ministros se voluntariaram para adoração`);

    // 7. Criar o sorteio
    const draw = await storage.createAdorationDraw({
      month,
      year,
      totalMinistersToDraw: allMinisters.length,
      createdBy: req.user.id
    });

    // 8. Executar o sorteio distribuindo UNIDADES entre as segundas
    const selectedUnits = new Set<string>();
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

      // Unidades disponíveis (não sorteadas ainda)
      const availableUnits = shuffle(
        drawUnits.filter(u => !selectedUnits.has(u.id))
      );

      // Primeiro, adicionar voluntários se houver
      const voluntaryUnits = availableUnits
        .filter(u => u.isVoluntary)
        .slice(0, unitsPerMonday);

      for (const unit of voluntaryUnits) {
        selectedUnits.add(unit.id);
        // Adicionar TODOS os membros da unidade (família inteira)
        for (const member of unit.members) {
          await storage.addAdorationDrawResult(draw.id, member.id, mondayOfWeek, true);
          drawResults.push({
            ministerId: member.id,
            ministerName: member.name,
            mondayOfWeek,
            date: mondaysInMonth[weekIndex].toISOString().split('T')[0],
            isVoluntary: true,
            familyId: unit.isFamily ? unit.id : null
          });
        }
      }

      // Completar com sorteados obrigatórios se necessário
      const remainingNeeded = unitsPerMonday - voluntaryUnits.length;
      if (remainingNeeded > 0) {
        const nonVoluntaryUnits = availableUnits
          .filter(u => !u.isVoluntary && !selectedUnits.has(u.id))
          .slice(0, remainingNeeded);

        for (const unit of nonVoluntaryUnits) {
          selectedUnits.add(unit.id);
          // Adicionar TODOS os membros da unidade (família inteira)
          for (const member of unit.members) {
            await storage.addAdorationDrawResult(draw.id, member.id, mondayOfWeek, false);
            drawResults.push({
              ministerId: member.id,
              ministerName: member.name,
              mondayOfWeek,
              date: mondaysInMonth[weekIndex].toISOString().split('T')[0],
              isVoluntary: false,
              familyId: unit.isFamily ? unit.id : null
            });
          }
        }
      }
    }

    const totalMinistersDrawn = drawResults.length;
    const totalFamilies = drawResults.filter(r => r.familyId).length > 0
      ? new Set(drawResults.filter(r => r.familyId).map(r => r.familyId)).size
      : 0;

    logger.info(`Sorteio concluído: ${totalMinistersDrawn} ministros em ${selectedUnits.size} unidades (${totalFamilies} famílias) distribuídos em ${mondayCount} segundas`);

    res.json({
      success: true,
      message: `Sorteio realizado com sucesso para ${month}/${year}`,
      data: {
        drawId: draw.id,
        month,
        year,
        totalMinisters: totalMinistersDrawn,
        totalMondays: mondayCount,
        unitsPerMonday,
        voluntaryCount: drawResults.filter(r => r.isVoluntary).length,
        mandatoryCount: drawResults.filter(r => !r.isVoluntary).length,
        results: drawResults
      }
    });

  } catch (error: unknown) {
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
      message: getErrorMessage(error) || 'Erro ao executar sorteio'
    });
  }
});

/**
 * GET /api/adoration/results/:year/:month
 * Busca resultados do sorteio de adoração
 */
router.get('/results/:year/:month', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const params = parseYearMonthParams(req, res);
    if (!params) return;
    const { year, month } = params;

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

    type MinisterRow = typeof ministers[number];
    const ministerMap = new Map<string, MinisterRow>(ministers.map((m: MinisterRow) => [m.id, m]));

    const enrichedResults = results.map(result => {
      const minister = ministerMap.get(result.ministerId);
      return {
        minister_id: result.ministerId,
        minister_name: minister?.name || 'Desconhecido',
        monday_of_week: result.mondayOfWeek,
        is_voluntary: result.isVoluntary
      };
    });

    res.json({
      success: true,
      data: {
        id: draw.id,
        month,
        year,
        total_ministers_to_draw: ministerIds.length,
        created_by: draw.createdBy,
        created_at: draw.createdAt,
        results: enrichedResults
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao buscar resultados de adoração:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao buscar resultados'
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
  } catch (error: unknown) {
    logger.error('Erro ao deletar sorteio:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao deletar sorteio'
    });
  }
});

// Schema de validação para troca de dia
const swapDaySchema = z.object({
  newMondayOfWeek: z.number().int().min(1).max(5)
});

/**
 * POST /api/adoration/swap-day/:drawId
 * Troca o dia de adoração de um ministro (não permite cancelar, apenas trocar)
 * Apenas o ministro solicitante é movido (familiares não são movidos automaticamente)
 */
router.post('/swap-day/:drawId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { drawId } = req.params;
    const { newMondayOfWeek } = swapDaySchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // 1. Verificar se o ministro está neste sorteio
    const currentResult = await storage.getAdorationDrawResultByMinister(drawId, userId);
    if (!currentResult) {
      return res.status(404).json({
        success: false,
        message: 'Você não está escalado neste sorteio de adoração'
      });
    }

    // 2. Verificar se a nova semana é diferente da atual
    if (currentResult.mondayOfWeek === newMondayOfWeek) {
      return res.status(400).json({
        success: false,
        message: 'Você já está escalado para esta semana'
      });
    }

    logger.info(`Troca de dia: ministro ${userId} de semana ${currentResult.mondayOfWeek} para ${newMondayOfWeek}`);

    // 3. Mover apenas o ministro solicitante para a nova semana
    await storage.updateAdorationDrawResultMonday(drawId, userId, newMondayOfWeek);

    // 4. Buscar nome do ministro e datas das segundas
    const [ministerUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const draw = await storage.getAdorationDrawById(drawId);
    let mondayDates: Date[] = [];
    if (draw) {
      mondayDates = getMondaysInMonth(draw.year, draw.month);
    }

    const oldDate = mondayDates[currentResult.mondayOfWeek - 1]?.toISOString().split('T')[0] || 'N/A';
    const newDate = mondayDates[newMondayOfWeek - 1]?.toISOString().split('T')[0] || 'N/A';

    logger.info(`Troca concluída: ${ministerUser?.name} movido de ${oldDate} para ${newDate}`);

    res.json({
      success: true,
      message: `Você foi movido de ${oldDate} para ${newDate}`,
      data: {
        movedMinisters: [{
          id: userId,
          name: ministerUser?.name || 'Desconhecido',
          oldWeek: currentResult.mondayOfWeek,
          newWeek: newMondayOfWeek
        }],
        oldWeek: currentResult.mondayOfWeek,
        newWeek: newMondayOfWeek,
        oldDate,
        newDate
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao trocar dia de adoração:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao trocar dia'
    });
  }
});

/**
 * GET /api/adoration/my-schedule/:year/:month
 * Retorna a escalação de adoração do ministro logado para o mês
 */
router.get('/my-schedule/:year/:month', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const params = parseYearMonthParams(req, res);
    if (!params) return;
    const { year, month } = params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // 1. Buscar sorteio do mês
    const draws = await storage.getAdorationDraws(year, month);
    if (draws.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Nenhum sorteio encontrado para este mês'
      });
    }

    const draw = draws[0];

    // 2. Buscar resultado do ministro
    const result = await storage.getAdorationDrawResultByMinister(draw.id, userId);
    if (!result) {
      return res.json({
        success: true,
        data: null,
        message: 'Você não está escalado para adoração neste mês'
      });
    }

    // 3. Calcular as datas das segundas
    const mondaysInMonth = getMondaysInMonth(year, month);

    // Validate mondayOfWeek is within bounds
    if (result.mondayOfWeek < 1 || result.mondayOfWeek > mondaysInMonth.length) {
      logger.warn(`[ADORATION] Invalid mondayOfWeek ${result.mondayOfWeek} for user ${userId}, month has ${mondaysInMonth.length} mondays`);
      return res.status(400).json({
        success: false,
        message: 'Dados de escalação inválidos. Por favor, contate um coordenador.'
      });
    }

    const scheduledDate = mondaysInMonth[result.mondayOfWeek - 1];

    // 4. Buscar familiares escalados juntos
    const familyMemberIds = await storage.getFamilyMemberIds(userId);
    const familyMembers = [];
    for (const memberId of familyMemberIds) {
      if (memberId !== userId) {
        const memberUser = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
        if (memberUser[0]) {
          familyMembers.push({ id: memberId, name: memberUser[0].name });
        }
      }
    }

    res.json({
      success: true,
      data: {
        drawId: draw.id,
        mondayOfWeek: result.mondayOfWeek,
        date: scheduledDate?.toISOString().split('T')[0],
        isVoluntary: result.isVoluntary,
        familyMembers,
        availableMondays: mondaysInMonth.map((d, idx) => ({
          week: idx + 1,
          date: d.toISOString().split('T')[0]
        }))
      }
    });

  } catch (error: unknown) {
    logger.error('Erro ao buscar escalação de adoração:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Erro ao buscar escalação'
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
    type QuestionnaireResponseRow = typeof responses[number];
    interface QuestionnaireResponseData {
      extra_activities?: { mondayAdoration?: string | boolean };
      mondayAdoration?: string | boolean;
    }
    const voluntaryMinisterIds = responses
      .filter((response: QuestionnaireResponseRow) => {
        const resp = response.responses as QuestionnaireResponseData | null;
        // Verificar se respondeu sim para mondayAdoration em qualquer formato
        return resp?.extra_activities?.mondayAdoration === 'yes' ||
               resp?.extra_activities?.mondayAdoration === true ||
               resp?.mondayAdoration === 'yes' ||
               resp?.mondayAdoration === true;
      })
      .map((r: QuestionnaireResponseRow) => r.userId);

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
