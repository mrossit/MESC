import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  questionnaires, 
  questionnaireResponses,
  users,
  notifications
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { generateQuestionnaireQuestions } from '../utils/questionnaireGenerator';
import { authenticateToken as requireAuth, AuthRequest, requireRole } from '../auth';

const router = Router();

// Month names for Portuguese locale
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Função auxiliar para analisar respostas e extrair disponibilidades
function analyzeResponses(responses: any[]) {
  const availabilities: any = {
    sundays: [],
    massTimes: [],
    dailyMass: false,
    dailyMassDays: [],
    alternativeTimes: [],
    specialEvents: []
  };

  responses.forEach(r => {
    const { questionId, answer } = r;
    
    // Domingos disponíveis
    if (questionId === 'sundays_available' && Array.isArray(answer)) {
      availabilities.sundays = answer;
    }
    
    // Horário principal de missa
    if (questionId === 'primary_mass_time' && typeof answer === 'string') {
      availabilities.massTimes.push(answer);
    }
    
    // Missas diárias
    if (questionId === 'daily_mass_availability') {
      if (answer === 'Sim') {
        availabilities.dailyMass = true;
        availabilities.dailyMassDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
      } else if (answer === 'Apenas em alguns dias') {
        availabilities.dailyMass = true;
      }
    }
    
    // Dias específicos para missas diárias
    if (questionId === 'daily_mass_days' && Array.isArray(answer)) {
      availabilities.dailyMassDays = answer;
    }
    
    // Horários alternativos (pergunta yes_no_with_options)
    if (questionId === 'other_times_available') {
      if (typeof answer === 'object' && answer.answer === 'Sim' && answer.selectedOptions) {
        availabilities.alternativeTimes = answer.selectedOptions;
      }
    }
    
    // Eventos especiais
    if (questionId.includes('special_event_') && answer === 'Sim') {
      availabilities.specialEvents.push(questionId.replace('special_event_', ''));
    }
  });

  return { availabilities };
}

// Criar ou atualizar template de questionário para um mês específico
router.post('/templates', requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2050)
    });

    const { month, year } = schema.parse(req.body);
    const userId = req.user?.id!;

    // Check if db is available
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Verificar se já existe um template para este mês/ano
    const [existingTemplate] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ))
      .limit(1);

    // Gerar perguntas usando IA
    const questions = generateQuestionnaireQuestions(month, year);

    if (existingTemplate) {
      // Atualizar template existente
      const [updated] = await db
        .update(questionnaires)
        .set({
          questions: questions,
          updatedAt: new Date()
        })
        .where(eq(questionnaires.id, existingTemplate.id))
        .returning();

      // Parse questions back to object for response
      res.json({
        ...updated,
        questions: updated.questions
      });
    } else {
      // Criar novo template
      const [created] = await db
        .insert(questionnaires)
        .values({
          title: `Questionário ${monthNames[month - 1]} ${year}`,
          month,
          year,
          questions: questions,
          createdById: userId
        })
        .returning();

      // Notificar ministros sobre novo questionário
      const allMinisters = await db.select({
        id: users.id,
        name: users.name,
        email: users.email
      }).from(users)
        .where(and(
          eq(users.role, 'ministro'),
          eq(users.status, 'active')
        ));


      for (const minister of allMinisters) {
        if (minister.id) {
          await db.insert(notifications).values({
            userId: minister.id,
            title: 'Novo Questionário Disponível',
            message: `O questionário de disponibilidade para ${monthNames[month - 1]} de ${year} está disponível. Por favor, responda o quanto antes.`,
            type: 'announcement'
          });
        }
      }

      // Parse questions back to object for response
      res.json({
        ...created,
        questions: created.questions
      });
    }
  } catch (error) {
    console.error('Error creating/updating questionnaire template:', error);
    res.status(500).json({ error: 'Failed to create/update questionnaire template' });
  }
});

// Obter template de questionário para um mês específico
router.get('/templates/:year/:month', requireAuth, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    // If db is not available, generate template dynamically
    if (!db) {
      const questions = generateQuestionnaireQuestions(month, year);
      return res.json({
        month,
        year,
        questions,
        generated: true
      });
    }

    try {
      const [template] = await db.select().from(questionnaires)
        .where(and(
          eq(questionnaires.month, month),
          eq(questionnaires.year, year)
        ))
        .limit(1);

      if (!template) {
        // Se não existe template, retornar 404
        return res.status(404).json({ error: 'Questionário não encontrado para este período' });
      }
      
      // Verificar se o questionário está disponível
      if (template.status === 'draft' || template.status === 'deleted') {
        return res.status(403).json({ 
          error: 'Questionário ainda não está disponível para respostas',
          status: template.status 
        });
      }
      
      // Template está disponível (sent ou closed)
      // Parse questions from JSON string
      res.json({
        ...template,
        questions: template.questions
      });
    } catch (dbError) {
      // If database query fails, generate template dynamically
      const questions = generateQuestionnaireQuestions(month, year);
      res.json({
        month,
        year,
        questions,
        generated: true
      });
    }
  } catch (error) {
    console.error('Error fetching questionnaire template:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire template' });
  }
});

// Submeter resposta ao questionário
router.post('/responses', requireAuth, async (req: AuthRequest, res) => {
  try {
    console.log('[RESPONSES] Início do endpoint de submissão');
    console.log('[RESPONSES] UserId:', req.user?.id);
    console.log('[RESPONSES] Body recebido:', JSON.stringify(req.body, null, 2));
    
    const schema = z.object({
      questionnaireId: z.string().optional(),
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2050),
      responses: z.array(z.object({
        questionId: z.string(),
        answer: z.union([
          z.string(), 
          z.array(z.string()), 
          z.boolean(),
          z.object({
            answer: z.string(),
            selectedOptions: z.array(z.string()).optional()
          })
        ]),
        metadata: z.any().optional()
      }))
    });

    let data;
    try {
      data = schema.parse(req.body);
      console.log('[RESPONSES] Dados validados com sucesso');
    } catch (validationError) {
      console.error('[RESPONSES] Erro de validação:', validationError);
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validationError instanceof Error ? validationError.message : 'Erro de validação'
      });
    }
    
    const userId = req.user?.id!;

    // Check if db is available
    if (!db) {
      return res.status(503).json({ error: 'Database service temporarily unavailable. Please try again later.' });
    }

    // Verificar se existe template e se não está encerrado
    if (data.questionnaireId) {
      const [template] = await db.select().from(questionnaires)
        .where(eq(questionnaires.id, data.questionnaireId))
        .limit(1);
      
      if (template && template.status === 'closed') {
        return res.status(400).json({ error: 'Este questionário foi encerrado e não aceita mais respostas' });
      }
    }

    // Encontrar o usuário ministro
    console.log('[RESPONSES] Buscando usuário para userId:', userId);
    let minister = null;
    
    try {
      const [foundUser] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      console.log('[RESPONSES] Usuário encontrado:', foundUser);

      if (foundUser && foundUser.role === 'ministro') {
        minister = {
          id: foundUser.id,
          userId: foundUser.id,
          name: foundUser.name,
          active: foundUser.status === 'active'
        };
      } else if (foundUser && ['coordenador', 'gestor'].includes(foundUser.role)) {
        console.log('[RESPONSES] Usuário é coordenador/reitor, pode responder');
        // Criar um ministro temporário para coordenadores/reitores
        minister = {
          id: foundUser.id,
          userId: foundUser.id,
          name: foundUser.name,
          active: true
        };
        console.log('[RESPONSES] Ministro temporário criado:', minister);
      } else {
        console.log('[RESPONSES] Usuário não pode responder questionário');
        return res.status(404).json({ error: 'User cannot submit questionnaire responses' });
      }
    } catch (dbError) {
      console.error('[RESPONSES] Erro ao buscar ministro:', dbError);
      throw dbError;
    }

    // Se não foi fornecido templateId, buscar ou criar um
    let templateId = data.questionnaireId;
    console.log('[RESPONSES] Template ID inicial:', templateId);
    
    if (!templateId) {
      console.log('[RESPONSES] Buscando template para mês:', data.month, 'ano:', data.year);
      const [template] = await db.select().from(questionnaires)
        .where(and(
          eq(questionnaires.month, data.month),
          eq(questionnaires.year, data.year)
        ))
        .limit(1);

      if (template) {
        templateId = template.id;
        console.log('[RESPONSES] Template existente encontrado:', templateId);
      } else {
        console.log('[RESPONSES] Template não encontrado, criando novo...');
        // Criar template automaticamente
        const questions = generateQuestionnaireQuestions(data.month, data.year);
        const [newTemplate] = await db
          .insert(questionnaires)
          .values({
            title: `Questionário ${monthNames[data.month - 1]} ${data.year}`,
            month: data.month,
            year: data.year,
            questions: questions,
            createdById: userId
          })
          .returning();
        templateId = newTemplate.id;
        console.log('[RESPONSES] Novo template criado:', templateId);
      }
    }
    console.log('[RESPONSES] Template ID final:', templateId);

    // Verificar se já existe resposta para este template
    console.log('[RESPONSES] Verificando resposta existente para userId:', minister.id, 'templateId:', templateId);
    const [existingResponse] = await db.select().from(questionnaireResponses)
      .where(and(
        eq(questionnaireResponses.userId, minister.id),
        eq(questionnaireResponses.questionnaireId, templateId)
      ))
      .limit(1);
    console.log('[RESPONSES] Resposta existente encontrada?', existingResponse ? 'Sim' : 'Não');

    // Analisar respostas para extrair disponibilidades
    console.log('[RESPONSES] Analisando respostas');
    const { availabilities } = analyzeResponses(data.responses);
    console.log('[RESPONSES] Disponibilidades extraídas:', availabilities);

    if (existingResponse) {
      console.log('[RESPONSES] Atualizando resposta existente:', existingResponse.id);
      // Atualizar resposta existente
      try {
        const [updated] = await db
          .update(questionnaireResponses)
          .set({
            questionnaireId: templateId,
            responses: JSON.stringify(data.responses),
            submittedAt: new Date()
          })
          .where(eq(questionnaireResponses.id, existingResponse.id))
          .returning();
        
        console.log('[RESPONSES] Resposta atualizada com sucesso');

        res.json({
          ...updated,
          responses: typeof updated.responses === 'string'
            ? JSON.parse(updated.responses)
            : updated.responses
        });
      } catch (updateError) {
        console.error('[RESPONSES] Erro ao atualizar resposta:', updateError);
        throw updateError;
      }
    } else {
      console.log('[RESPONSES] Criando nova resposta');
      // Criar nova resposta
      try {
        const [created] = await db
          .insert(questionnaireResponses)
          .values({
            userId: minister.id,
            questionnaireId: templateId,
            responses: JSON.stringify(data.responses)
          })
          .returning();
        
        console.log('[RESPONSES] Resposta criada com sucesso');

        res.json({
          ...created,
          responses: typeof created.responses === 'string'
            ? JSON.parse(created.responses)
            : created.responses
        });
      } catch (insertError) {
        console.error('[RESPONSES] Erro ao criar resposta:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('[RESPONSES] Erro geral no endpoint:', error);
    if (error instanceof Error) {
      console.error('[RESPONSES] Stack trace:', error.stack);
      console.error('[RESPONSES] Error message:', error.message);
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao enviar resposta do questionário';
      
      if (error.message.includes('database') || error.message.includes('db')) {
        errorMessage = 'Erro de conexão com o banco de dados. Tente novamente.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Dados inválidos no questionário.';
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorMessage = 'Sem permissão para enviar o questionário.';
      } else if (error.message) {
        // Se houver uma mensagem específica, usar ela (mas não expor detalhes técnicos)
        errorMessage = `Erro: ${error.message.substring(0, 100)}`;
      }
      
      res.status(500).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: 'Erro desconhecido ao processar questionário' });
    }
  }
});

// Obter resposta do ministro para um mês específico
router.get('/responses/:year/:month', requireAuth, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userId = req.user?.id!;

    // If db is not available, return null
    if (!db) {
      return res.json(null);
    }

    try {
      // Encontrar o usuário
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      // Criar objeto ministro compatível
      const minister = user && (user.role === 'ministro' || user.role === 'coordenador' || user.role === 'gestor') ? {
        id: user.id,
        userId: user.id
      } : null;

      if (!minister) {
        return res.json(null);
      }

      console.log('[GET /responses] Buscando respostas para:', {
        userId: minister.id,
        month,
        year
      });

      // Primeiro, buscar todas as respostas do usuário para debug
      const allUserResponses = await db.select({
        id: questionnaireResponses.id,
        questionnaireId: questionnaireResponses.questionnaireId,
        month: questionnaires.month,
        year: questionnaires.year
      }).from(questionnaireResponses)
        .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
        .where(eq(questionnaireResponses.userId, minister.id));

      console.log('[GET /responses] Todas as respostas do usuário:', allUserResponses);

      const [response] = await db.select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        responses: questionnaireResponses.responses,
        submittedAt: questionnaireResponses.submittedAt,
        questionnaireTemplate: {
          id: questionnaires.id,
          month: questionnaires.month,
          year: questionnaires.year,
          questions: questionnaires.questions,
          status: questionnaires.status
        }
      }).from(questionnaireResponses)
        .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
        .where(and(
          eq(questionnaireResponses.userId, minister.id),
          eq(questionnaires.month, month),
          eq(questionnaires.year, year)
        ))
        .limit(1);

      console.log('[GET /responses] Resposta encontrada:', response ? 'Sim' : 'Não');

      if (response) {
        console.log('[GET /responses] Tipo do campo responses:', typeof response.responses);

        // Parse JSON fields se necessário
        const parsedResponses = typeof response.responses === 'string'
          ? JSON.parse(response.responses)
          : response.responses;

        const result = {
          id: response.id,
          userId: response.userId,
          responses: parsedResponses,
          submittedAt: response.submittedAt,
          questionnaireTemplate: response.questionnaireTemplate ? {
            ...response.questionnaireTemplate,
            questions: response.questionnaireTemplate.questions
          } : null
        };

        console.log('[GET /responses] Retornando resposta com ID:', result.id);
        res.json(result);
      } else {
        console.log('[GET /responses] Nenhuma resposta encontrada para o período');
        res.json(null);
      }
    } catch (dbError) {
      console.error('[GET /responses] Erro na query do banco:', dbError);
      // If database query fails, return null
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching questionnaire response:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire response' });
  }
});

// Obter status das respostas para admin/coordenador
router.get('/admin/responses-status/:year/:month', requireAuth, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (userRole !== 'gestor' && userRole !== 'coordenador') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!db) {
      return res.json([]);
    }

    // Buscar o questionário do mês
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ))
      .limit(1);

    if (!questionnaire) {
      return res.json({
        month,
        year,
        templateExists: false,
        totalMinisters: 0,
        respondedCount: 0,
        pendingCount: 0,
        responseRate: '0%',
        responses: []
      });
    }

    // Buscar todos os ministros ativos
    const ministers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone
      })
      .from(users)
      .where(and(
        eq(users.role, 'ministro'),
        eq(users.status, 'active')
      ));

    // Buscar todas as respostas para este questionário
    const responses = await db
      .select({
        userId: questionnaireResponses.userId,
        submittedAt: questionnaireResponses.submittedAt,
        responses: questionnaireResponses.responses
      })
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    // Mapear ministros com suas respostas
    const responseMap = new Map(responses.map(r => [r.userId, r]));

    const ministerResponses = ministers.map(minister => ({
      id: minister.id,
      name: minister.name,
      email: minister.email,
      phone: minister.phone || '',
      responded: responseMap.has(minister.id),
      respondedAt: responseMap.get(minister.id)?.submittedAt?.toISOString() || null,
      availability: null // Pode ser expandido para incluir disponibilidade
    }));

    const respondedCount = responses.length;
    const totalMinisters = ministers.length;
    const responseRate = totalMinisters > 0
      ? `${Math.round((respondedCount / totalMinisters) * 100)}%`
      : '0%';

    res.json({
      month,
      year,
      templateExists: true,
      templateId: questionnaire.id,
      templateStatus: questionnaire.status,
      totalMinisters,
      respondedCount,
      pendingCount: totalMinisters - respondedCount,
      responseRate,
      responses: ministerResponses
    });

  } catch (error) {
    console.error('Error fetching response status:', error);
    res.status(500).json({ error: 'Failed to fetch response status' });
  }
});

// Obter resumo das respostas para admin/coordenador
router.get('/admin/responses-summary/:year/:month', requireAuth, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (userRole !== 'gestor' && userRole !== 'coordenador') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!db) {
      return res.json({ totalResponses: 0, questions: [], summary: {} });
    }

    // Buscar o questionário do mês
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ))
      .limit(1);

    if (!questionnaire) {
      return res.json({ totalResponses: 0, questions: [], summary: {} });
    }

    // Buscar todas as respostas
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    // Processar resumo das respostas
    const summary: Record<string, Record<string, number>> = {};
    const questions = questionnaire.questions as any[];

    responses.forEach(response => {
      const userResponses = typeof response.responses === 'string'
        ? JSON.parse(response.responses)
        : response.responses;

      if (Array.isArray(userResponses)) {
        userResponses.forEach((r: any) => {
          if (!summary[r.questionId]) {
            summary[r.questionId] = {};
          }

          const answer = typeof r.answer === 'string' ? r.answer : JSON.stringify(r.answer);
          summary[r.questionId][answer] = (summary[r.questionId][answer] || 0) + 1;
        });
      }
    });

    res.json({
      totalResponses: responses.length,
      questions,
      summary
    });

  } catch (error) {
    console.error('Error fetching response summary:', error);
    res.status(500).json({ error: 'Failed to fetch response summary' });
  }
});

// Obter detalhes de uma resposta específica (admin/coordenador)
router.get('/admin/responses/:templateId/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { templateId, userId } = req.params;
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (userRole !== 'gestor' && userRole !== 'coordenador') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Buscar o questionário
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, templateId))
      .limit(1);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Buscar o usuário
    const [user] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Buscar a resposta
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(and(
        eq(questionnaireResponses.questionnaireId, templateId),
        eq(questionnaireResponses.userId, userId)
      ))
      .limit(1);

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Processar respostas
    const userResponses = typeof response.responses === 'string'
      ? JSON.parse(response.responses)
      : response.responses;

    res.json({
      user,
      response: {
        submittedAt: response.submittedAt?.toISOString(),
        responses: userResponses,
        availabilities: [] // Pode ser expandido no futuro
      },
      template: {
        questions: questionnaire.questions,
        month: questionnaire.month,
        year: questionnaire.year
      }
    });

  } catch (error) {
    console.error('Error fetching detailed response:', error);
    res.status(500).json({ error: 'Failed to fetch detailed response' });
  }
});

// Obter todas as respostas para um mês (admin/coordenador)
router.get('/responses/all/:year/:month', requireAuth, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (userRole !== 'gestor' && userRole !== 'coordenador') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if db is available
    if (!db) {
      return res.json([]);
    }

    const responses = await db.select({
      id: questionnaireResponses.id,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      submittedAt: questionnaireResponses.submittedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email
      },
      questionnaireTemplate: {
        id: questionnaires.id,
        questions: questionnaires.questions,
        month: questionnaires.month,
        year: questionnaires.year
      }
    }).from(questionnaireResponses)
      .leftJoin(users, eq(questionnaireResponses.userId, users.id))
      .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ));

    res.json(responses);
  } catch (error) {
    console.error('Error fetching all questionnaire responses:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire responses' });
  }
});

// Encerrar questionário (impedir novas respostas)
router.patch('/admin/templates/:id/close', requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id!;
    const templateId = req.params.id;
    
    // Verificar se é admin (reitor ou coordenador)
    if (!req.user || !['gestor', 'coordenador'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Verificar se o template existe
    const [existingTemplate] = await db.select().from(questionnaires)
      .where(eq(questionnaires.id, templateId))
      .limit(1);

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existingTemplate.status === 'closed') {
      return res.status(400).json({ error: 'Questionário já está encerrado' });
    }

    // Encerrar o questionário
    const [updated] = await db
      .update(questionnaires)
      .set({
        status: 'closed',
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();

    res.json({
      ...updated,
      questions: updated.questions
    });
  } catch (error) {
    console.error('Error closing questionnaire:', error);
    res.status(500).json({ error: 'Failed to close questionnaire' });
  }
});

// Reabrir questionário (permitir novas respostas)
router.patch('/admin/templates/:id/reopen', requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id!;
    const templateId = req.params.id;
    
    // Verificar se é admin (reitor ou coordenador)
    if (!req.user || !['gestor', 'coordenador'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Verificar se o template existe
    const [existingTemplate] = await db.select().from(questionnaires)
      .where(eq(questionnaires.id, templateId))
      .limit(1);

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existingTemplate.status !== 'closed') {
      return res.status(400).json({ error: 'Questionário não está encerrado' });
    }

    // Reabrir o questionário
    const [updated] = await db
      .update(questionnaires)
      .set({
        status: 'sent',
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();

    res.json({
      ...updated,
      questions: updated.questions
    });
  } catch (error) {
    console.error('Error reopening questionnaire:', error);
    res.status(500).json({ error: 'Failed to reopen questionnaire' });
  }
});

// Get family members for questionnaire sharing
router.get('/family-sharing/:questionnaireId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { questionnaireId } = req.params;
    const userId = req.user!.id;
    
    // Import storage dynamically to avoid circular dependency
    const { storage } = await import('../storage');
    const familyMembers = await storage.getFamilyMembersForQuestionnaire(userId, questionnaireId);
    
    res.json(familyMembers);
  } catch (error) {
    console.error('Error fetching family members for questionnaire:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

export default router;