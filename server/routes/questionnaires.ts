import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db-config';
import { 
  questionnaires, 
  questionnaireResponses,
  users,
  notifications
} from '../../shared/schema-simple';
import { eq, and } from 'drizzle-orm';
import { generateQuestionnaireQuestions } from '../utils/questionnaireGenerator';
// Middleware de autenticação local
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const router = Router();

// Criar ou atualizar template de questionário para um mês específico
router.post('/templates', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2050)
    });

    const { month, year } = schema.parse(req.body);
    const userId = req.session.userId!;

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
          month,
          year,
          questions: questions,
          createdBy: userId
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

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      for (const minister of allMinisters) {
        if (minister.id) {
          await db.insert(notifications).values({
            userId: minister.id,
            title: 'Novo Questionário Disponível',
            message: `O questionário de disponibilidade para ${monthNames[month - 1]} de ${year} está disponível. Por favor, responda o quanto antes.`,
            type: 'info'
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
router.get('/templates/:year/:month', requireAuth, async (req, res) => {
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
router.post('/responses', requireAuth, async (req, res) => {
  try {
    console.log('[RESPONSES] Início do endpoint de submissão');
    console.log('[RESPONSES] UserId:', req.session?.userId);
    console.log('[RESPONSES] Body recebido:', JSON.stringify(req.body, null, 2));
    
    const schema = z.object({
      questionnaireTemplateId: z.string().optional(),
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
    
    const userId = req.session.userId!;

    // Check if db is available
    if (!db) {
      return res.status(503).json({ error: 'Database service temporarily unavailable. Please try again later.' });
    }

    // Verificar se existe template e se não está encerrado
    if (data.questionnaireTemplateId) {
      const [template] = await db.select().from(questionnaires)
        .where(eq(questionnaires.id, data.questionnaireTemplateId))
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
    let templateId = data.questionnaireTemplateId;
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
            month: data.month,
            year: data.year,
            questions: questions,
            createdBy: userId
          })
          .returning();
        templateId = newTemplate.id;
        console.log('[RESPONSES] Novo template criado:', templateId);
      }
    }
    console.log('[RESPONSES] Template ID final:', templateId);

    // Verificar se já existe resposta para este mês/ano
    console.log('[RESPONSES] Verificando resposta existente para ministerId:', minister.id, 'mês:', data.month, 'ano:', data.year);
    const [existingResponse] = await db.select().from(questionnaireResponses)
      .where(and(
        eq(questionnaireResponses.ministerId, minister.id),
        eq(questionnaireResponses.month, data.month),
        eq(questionnaireResponses.year, data.year)
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
            questionnaireTemplateId: templateId,
            responses: JSON.stringify(data.responses),
            availabilities: JSON.stringify(availabilities),
            submittedAt: new Date()
          })
          .where(eq(questionnaireResponses.id, existingResponse.id))
          .returning();
        
        console.log('[RESPONSES] Resposta atualizada com sucesso');

        res.json({
          ...updated,
          responses: JSON.parse(updated.responses),
          availabilities: JSON.parse(updated.availabilities)
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
            ministerId: minister.id,
            questionnaireTemplateId: templateId,
            month: data.month,
            year: data.year,
            responses: JSON.stringify(data.responses),
            availabilities: JSON.stringify(availabilities)
          })
          .returning();
        
        console.log('[RESPONSES] Resposta criada com sucesso');

        res.json({
          ...created,
          responses: JSON.parse(created.responses),
          availabilities: JSON.parse(created.availabilities)
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
    }
    res.status(500).json({ error: 'Failed to submit questionnaire response' });
  }
});

// Obter resposta do ministro para um mês específico
router.get('/responses/:year/:month', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userId = req.session.userId!;

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

      const [response] = await db.select({
        id: questionnaireResponses.id,
        ministerId: questionnaireResponses.ministerId,
        month: questionnaireResponses.month,
        year: questionnaireResponses.year,
        responses: questionnaireResponses.responses,
        availabilities: questionnaireResponses.availabilities,
        submittedAt: questionnaireResponses.submittedAt,
        questionnaireTemplate: {
          id: questionnaires.id,
          month: questionnaires.month,
          year: questionnaires.year,
          questions: questionnaires.questions,
          status: questionnaires.status
        }
      }).from(questionnaireResponses)
        .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireTemplateId, questionnaires.id))
        .where(and(
          eq(questionnaireResponses.ministerId, minister.id),
          eq(questionnaireResponses.month, month),
          eq(questionnaireResponses.year, year)
        ))
        .limit(1);

      if (response) {
        // Parse JSON fields
        res.json({
          ...response,
          responses: JSON.parse(response.responses),
          availabilities: JSON.parse(response.availabilities),
          questionnaireTemplate: response.questionnaireTemplate ? {
            ...response.questionnaireTemplate,
            questions: response.questionnaireTemplate.questions
          } : null
        });
      } else {
        res.json(null);
      }
    } catch (dbError) {
      // If database query fails, return null
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching questionnaire response:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire response' });
  }
});

// Obter todas as respostas para um mês (admin/coordenador)
router.get('/responses/all/:year/:month', requireAuth, async (req, res) => {
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
      ministerId: questionnaireResponses.ministerId,
      month: questionnaireResponses.month,
      year: questionnaireResponses.year,
      responses: questionnaireResponses.responses,
      availabilities: questionnaireResponses.availabilities,
      submittedAt: questionnaireResponses.submittedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email
      },
      questionnaireTemplate: {
        id: questionnaires.id,
        questions: questionnaires.questions
      }
    }).from(questionnaireResponses)
      .leftJoin(users, eq(questionnaireResponses.ministerId, users.id))
      .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireTemplateId, questionnaires.id))
      .where(and(
        eq(questionnaireResponses.month, month),
        eq(questionnaireResponses.year, year)
      ));

    res.json(responses);
  } catch (error) {
    console.error('Error fetching all questionnaire responses:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire responses' });
  }
});

// Encerrar questionário (impedir novas respostas)
router.patch('/admin/templates/:id/close', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
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
        closedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();

    res.json({
      ...updated,
      questions: JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error('Error closing questionnaire:', error);
    res.status(500).json({ error: 'Failed to close questionnaire' });
  }
});

// Reabrir questionário (permitir novas respostas)
router.patch('/admin/templates/:id/reopen', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
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
        closedAt: null,
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();

    res.json({
      ...updated,
      questions: JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error('Error reopening questionnaire:', error);
    res.status(500).json({ error: 'Failed to reopen questionnaire' });
  }
});

export default router;