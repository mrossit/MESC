import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { questionnaires, questionnaireResponses, users, notifications } from '../../shared/schema';
import { eq, and, or, ne } from 'drizzle-orm';
import { generateQuestionnaireQuestions } from '../utils/questionnaireGenerator';
import { authenticateToken as requireAuth, requireRole } from '../auth';

const router = Router();

// Função helper para nome do mês
function getMonthName(month: number): string {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month - 1];
}

// Middleware para verificar se o usuário é admin
// router.use(requireAuth); // Aplicado individualmente nas rotas
// router.use(requireRole(['gestor', 'coordenador'])); // Aplicado individualmente nas rotas

// Obter questionário atual (mês corrente)
router.get('/current', requireAuth, async (req: any, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (!db) {
      const questions = generateQuestionnaireQuestions(month, year);
      return res.json({
        month,
        year,
        title: `Questionário ${getMonthName(month)} ${year}`,
        description: `Questionário de disponibilidade para ${getMonthName(month)} de ${year}`,
        questions,
        status: 'active',
        generated: true
      });
    }

    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));

    if (template) {
      return res.json(template);
    }

    // Gerar novo template para o mês atual
    const questions = generateQuestionnaireQuestions(month, year);
    const userId = req.user?.id || '0';
    
    const [savedTemplate] = await db.insert(questionnaires).values({
      month,
      year,
      title: `Questionário ${getMonthName(month)} ${year}`,
      description: `Questionário de disponibilidade para ${getMonthName(month)} de ${year}`,
      questions,
      status: 'active',
      createdById: userId,
      targetUserIds: [],
      notifiedUserIds: []
    }).returning();

    res.json(savedTemplate);
  } catch (error) {
    console.error('Error getting current questionnaire:', error);
    res.status(500).json({ error: 'Failed to get current questionnaire' });
  }
});

// Obter template com perguntas editáveis
router.get('/templates/:year/:month', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!db) {
      // Gerar template sem banco
      const questions = generateQuestionnaireQuestions(month, year);
      return res.json({
        month,
        year,
        questions: questions.map(q => ({
          ...q,
          editable: q.category === 'custom'
        })),
        generated: true
      });
    }

    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));

    if (template) {
      // Parse questions from JSON string and add edit flags
      const parsedQuestions = template.questions as any[];
      const questionsWithEditFlag = parsedQuestions.map((q: any) => ({
        ...q,
        editable: true, // Permitir edição de todas as perguntas
        modified: q.modified || false // Flag para indicar se foi modificada
      }));
      
      res.json({
        ...template,
        questions: questionsWithEditFlag
      });
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Gerar novo template E SALVAR na base de dados
router.post('/templates/generate', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const schema = z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2050)
    });

    const { month, year } = schema.parse(req.body);
    const userId = req.user?.id || req.session?.userId;
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Verificar se já existe template NÃO deletado
    const [existingTemplate] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')  // Ignorar templates deletados
      ));

    if (existingTemplate) {
      // Retornar template existente
      const questionsWithEditFlag = (existingTemplate.questions as any[]).map((q: any) => ({
        ...q,
        editable: true,
        modified: q.modified || false
      }));
      
      return res.json({
        ...existingTemplate,
        questions: questionsWithEditFlag
      });
    }
    
    // Gerar perguntas automaticamente
    const questions = generateQuestionnaireQuestions(month, year);
    console.log(`[GENERATE] Gerando ${questions.length} perguntas para ${month}/${year}`);
    console.log(`[GENERATE] Primeira pergunta: ${questions[0]?.question}`);
    
    // Todas as perguntas são editáveis
    const questionsWithEditFlag = questions.map(q => ({
      ...q,
      editable: true,
      modified: false
    }));

    // SALVAR template na base de dados
    const [savedTemplate] = await db.insert(questionnaires).values({
      month,
      year,
      title: `Questionário ${getMonthName(month)} ${year}`,
      description: `Questionário de disponibilidade para ${getMonthName(month)} de ${year}`,
      questions: questionsWithEditFlag,  // JSONB não precisa stringify
      status: 'draft',
      createdById: userId,
      targetUserIds: [],  // JSONB não precisa stringify
      notifiedUserIds: []  // JSONB não precisa stringify
    }).returning();

    console.log(`Template criado e salvo na base de dados: ${month}/${year}`);
    
    res.json({
      ...savedTemplate,
      questions: questionsWithEditFlag,
      generated: true
    });
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Salvar ou atualizar template
router.post('/templates', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const schema = z.object({
      id: z.string().optional(),
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2050),
      questions: z.array(z.object({
        id: z.string(),
        type: z.enum(['multiple_choice', 'checkbox', 'text', 'time_selection', 'yes_no_with_options']),
        question: z.string(),
        options: z.array(z.string()).optional(),
        required: z.boolean(),
        category: z.enum(['regular', 'daily', 'special_event', 'custom']),
        editable: z.boolean().optional(),
        modified: z.boolean().optional(),
        metadata: z.object({
          eventDate: z.string().optional(),
          eventName: z.string().optional(),
          availableTimes: z.array(z.string()).optional(),
          conditionalOptions: z.array(z.string()).optional()
        }).optional()
      }))
    });

    const data = schema.parse(req.body);
    const userId = req.user?.id || req.session?.userId;

    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Verificar se já existe template
    const [existingTemplate] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, data.month),
        eq(questionnaires.year, data.year)
      ));

    if (existingTemplate) {
      // Atualizar template existente
      const [updated] = await db
        .update(questionnaires)
        .set({
          questions: data.questions,
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
          month: data.month,
          year: data.year,
          questions: data.questions,
          title: `Questionário ${getMonthName(data.month)} ${data.year}`,
          description: `Questionário de disponibilidade para ${getMonthName(data.month)} de ${data.year}`,
          status: 'draft',
          createdById: userId,
          targetUserIds: JSON.stringify([]),
          notifiedUserIds: JSON.stringify([])
        })
        .returning();

      // Parse questions back to object for response
      res.json({
        ...created,
        questions: created.questions
      });
    }
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Adicionar pergunta customizada a um template existente
router.post('/templates/:year/:month/questions', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const schema = z.object({
      type: z.enum(['multiple_choice', 'checkbox', 'text', 'time_selection']),
      question: z.string(),
      options: z.array(z.string()).optional(),
      required: z.boolean(),
      category: z.enum(['custom']).default('custom')
    });

    const questionData = schema.parse(req.body);

    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const newQuestion = {
      id: `custom_${Date.now()}`,
      ...questionData,
      editable: true,
      modified: false
    };

    const updatedQuestions = [...(template.questions as any[]), newQuestion];

    const [updated] = await db
      .update(questionnaires)
      .set({
        questions: updatedQuestions,
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, template.id))
      .returning();

    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions as string)
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Atualizar pergunta específica
router.put('/templates/:year/:month/questions/:questionId', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const questionId = req.params.questionId;
    
    const schema = z.object({
      question: z.string(),
      options: z.array(z.string()).optional(),
      required: z.boolean()
    });

    const updates = schema.parse(req.body);

    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedQuestions = (template.questions as any[]).map(q => {
      if (q.id === questionId) {
        // Permitir edição de qualquer pergunta e marcar como modificada
        return { 
          ...q, 
          ...updates,
          modified: true // Marcar como modificada quando editada
        };
      }
      return q;
    });

    const [updated] = await db
      .update(questionnaires)
      .set({
        questions: updatedQuestions,
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, template.id))
      .returning();

    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions as string)
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Deletar pergunta customizada
router.delete('/templates/:year/:month/questions/:questionId', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const questionId = req.params.questionId;

    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedQuestions = (template.questions as any[]).filter(q => {
      // Permitir deletar apenas perguntas customizadas
      // Perguntas automáticas não podem ser deletadas, apenas editadas
      if (q.id === questionId) {
        return q.category !== 'custom';
      }
      return true;
    });

    const [updated] = await db
      .update(questionnaires)
      .set({
        questions: updatedQuestions,
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, template.id))
      .returning();

    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions as string)
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Enviar ou reenviar questionário para todos os ministros (por year/month)
router.post('/templates/:year/:month/send', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    // Debug completo do request
    console.log('[SEND] Início do endpoint');
    console.log('[SEND] Params:', { year, month });
    console.log('[SEND] Headers:', req.headers);
    console.log('[SEND] Body raw:', req.body);
    console.log('[SEND] Body type:', typeof req.body);
    
    // Extrair resend do body
    const resend = req.body?.resend === true || req.body?.resend === 'true';
    
    console.log('[SEND] Resend extraído:', resend);
    console.log('[SEND] Tipo do resend:', typeof resend);
    
    if (!db) {
      console.log('[SEND] Erro: Database indisponível');
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    // Buscar o template por year/month
    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));
    
    if (!template) {
      console.log('[SEND] Erro: Template não encontrado');
      return res.status(404).json({ error: 'Template not found' });
    }
    
    console.log('[SEND] Template encontrado:', { 
      id: template.id, 
      status: template.status,
      updatedAt: template.updatedAt 
    });
    
    // Verificar se já foi enviado e não é reenvio
    if (template.status === 'sent' && !resend) {
      console.log('[SEND] Erro: Já enviado e resend=false');
      return res.status(400).json({ 
        error: 'Questionário já foi enviado aos ministros. Use a opção de reenviar.',
        canResend: true,
        debug: { status: template.status, resend, bodyReceived: req.body }
      });
    }
    
    // Se está fechado, não pode enviar nem reenviar
    if (template.status === 'closed') {
      console.log('[SEND] Erro: Questionário fechado');
      return res.status(400).json({ 
        error: 'Questionário está encerrado. Reabra-o antes de reenviar.'
      });
    }
    
    console.log('[SEND] Verificações passaram, processando envio/reenvio...');
    
    // Se é reenvio, registrar a data de reenvio
    const updateData: any = {
      status: 'sent',
      updatedAt: new Date()
    };
    
    // PostgreSQL schema doesn't have sentAt field
    // Track sends via status and updatedAt
    
    // Atualizar status para "sent"
    const [updated] = await db
      .update(questionnaires)
      .set(updateData)
      .where(eq(questionnaires.id, template.id))
      .returning();
    
    // Enviar notificações para todos os ministros
    const isResend = template.status === 'sent' && resend;
    
    // Dependências já importadas no topo do arquivo
    
    // Buscar todos os ministros ativos (usuários com role 'ministro')
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
    
    // Criar notificações para cada ministro
    for (const minister of allMinisters) {
      if (minister.id) {
        await db.insert(notifications).values({
          userId: minister.id,
          title: isResend ? 'Questionário Atualizado' : 'Novo Questionário Disponível',
          message: isResend 
            ? `O questionário de ${monthNames[month - 1]} de ${year} foi atualizado. Por favor, revise e atualize suas respostas se necessário.`
            : `O questionário de disponibilidade para ${monthNames[month - 1]} de ${year} está disponível. Por favor, responda o quanto antes.`,
          type: isResend ? 'warning' : 'info'
        });
      }
    }
    
    const message = isResend 
      ? 'Questionário reenviado com sucesso! As mudanças estão disponíveis para todos os ministros.'
      : 'Questionário enviado com sucesso para todos os ministros!';
    
    res.json({ 
      message,
      isResend,
      template: {
        ...updated,
        questions: updated.questions
      }
    });
  } catch (error) {
    console.error('Error sending questionnaire:', error);
    res.status(500).json({ error: 'Failed to send questionnaire' });
  }
});

// Enviar questionário para todos os ministros (por ID - mantido para compatibilidade)
router.post('/templates/:id/send', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const templateId = req.params.id;
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    // Buscar o template
    const [template] = await db.select().from(questionnaires)
      .where(eq(questionnaires.id, templateId));
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Atualizar status para "sent"
    const [updated] = await db
      .update(questionnaires)
      .set({
        status: 'sent',
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();
    
    // TODO: Enviar notificações para todos os ministros
    // Isso seria feito através de um sistema de notificações
    
    res.json({ 
      message: 'Questionário enviado com sucesso!',
      template: {
        ...updated,
        questions: updated.questions
      }
    });
  } catch (error) {
    console.error('Error sending questionnaire:', error);
    res.status(500).json({ error: 'Failed to send questionnaire' });
  }
});

// Encerrar questionário (fechar para novas respostas)
router.patch('/templates/:id/close', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const templateId = req.params.id;
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    const [template] = await db.select().from(questionnaires)
      .where(eq(questionnaires.id, templateId));
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (template.status !== 'sent') {
      return res.status(400).json({ error: 'Questionário precisa estar enviado para ser encerrado' });
    }
    
    const [updated] = await db
      .update(questionnaires)
      .set({
        status: 'closed',
        // closedAt: new Date(), // Campo não existe no schema
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();
    
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions as string)
    });
  } catch (error) {
    console.error('Error closing questionnaire:', error);
    res.status(500).json({ error: 'Failed to close questionnaire' });
  }
});

// Reabrir questionário
router.patch('/templates/:id/reopen', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const templateId = req.params.id;
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    const [template] = await db.select().from(questionnaires)
      .where(eq(questionnaires.id, templateId));
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (template.status !== 'closed') {
      return res.status(400).json({ error: 'Questionário precisa estar encerrado para ser reaberto' });
    }
    
    const [updated] = await db
      .update(questionnaires)
      .set({
        status: 'sent',
        // closedAt: null, // Campo não existe no schema
        updatedAt: new Date()
      })
      .where(eq(questionnaires.id, templateId))
      .returning();
    
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions as string)
    });
  } catch (error) {
    console.error('Error reopening questionnaire:', error);
    res.status(500).json({ error: 'Failed to reopen questionnaire' });
  }
});

// Deletar template completo - funcionalidade para produção
router.delete('/templates/:year/:month', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Buscar o template
    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year),
        ne(questionnaires.status, 'deleted')
      ));

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Verificar se há respostas vinculadas ao template
    const responses = await db.select({
      id: questionnaireResponses.id,
      questionnaireId: questionnaireResponses.questionnaireId,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      submittedAt: questionnaireResponses.submittedAt
    }).from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, template.id));

    if (responses.length > 0) {
      // Se há respostas, apenas marcar como deletado/inativo para manter histórico
      const [updated] = await db
        .update(questionnaires)
        .set({
          status: 'deleted',
          updatedAt: new Date()
        })
        .where(eq(questionnaires.id, template.id))
        .returning();

      res.json({ 
        message: 'Template marcado como deletado. Respostas existentes foram preservadas.',
        template: {
          ...updated,
          questions: updated.questions
        }
      });
    } else {
      // Se não há respostas, deletar completamente
      await db.delete(questionnaires)
        .where(eq(questionnaires.id, template.id));

      res.json({ 
        message: 'Template deletado com sucesso!',
        deleted: true
      });
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Obter status das respostas dos ministros para um mês específico
router.get('/responses-status/:year/:month', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    // Buscar o template do mês
    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ))
      .limit(1);
    
    if (!template) {
      return res.json({
        month,
        year,
        templateExists: false,
        totalMinisters: 0,
        respondedCount: 0,
        pendingCount: 0,
        responses: []
      });
    }
    
    // Importar tabela de usuários
    // Tabela de usuários já importada no topo do arquivo
    
    // Buscar todos os ministros e coordenadores ativos (ambos podem responder questionários)
    // Nota: Coordenadores também podem responder questionários
    const allMinisters = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users)
      .where(and(
        or(
          eq(users.role, 'ministro'),
          eq(users.role, 'coordenador')
        ),
        eq(users.status, 'active')
      ));
    
    // Buscar todas as respostas para este template específico
    const responses = await db.select({
      userId: questionnaireResponses.userId,
      submittedAt: questionnaireResponses.submittedAt,
      responses: questionnaireResponses.responses
    }).from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, template.id));
    
    // Mapear ministros com suas respostas
    const ministersWithResponses = allMinisters.map(minister => {
      const response = responses.find(r => r.userId === minister.id);
      
      if (response) {
        // Parse responses to get availability answer
        let availability = 'Não informado';
        try {
          const parsedResponses = JSON.parse(response.responses);
          // Nova estrutura: monthly_availability com objeto {answer, selectedOptions}
          const monthlyAvailability = parsedResponses.find((r: any) => r.questionId === 'monthly_availability');
          if (monthlyAvailability) {
            // Se a resposta é um objeto com 'answer'
            if (typeof monthlyAvailability.answer === 'object' && monthlyAvailability.answer.answer) {
              availability = monthlyAvailability.answer.answer === 'Sim' ? 'Disponível' : 'Indisponível';
            } 
            // Se a resposta é uma string direta
            else if (typeof monthlyAvailability.answer === 'string') {
              availability = monthlyAvailability.answer === 'Sim' ? 'Disponível' : 'Indisponível';
            }
          }
          // Fallback para estrutura antiga (questionId: 'availability')
          else {
            const oldAvailability = parsedResponses.find((r: any) => r.questionId === 'availability');
            if (oldAvailability) {
              availability = oldAvailability.answer === 'yes' || oldAvailability.answer === 'Disponível' ? 'Disponível' : 
                           oldAvailability.answer === 'no' || oldAvailability.answer === 'Indisponível' ? 'Indisponível' : 
                           oldAvailability.answer;
            }
          }
        } catch (e) {
          console.error('Error parsing responses:', e);
        }
        
        return {
          id: minister.id,
          name: minister.name,
          email: minister.email,
          phone: minister.phone,
          responded: true,
          respondedAt: response.submittedAt,
          availability
        };
      }
      
      return {
        id: minister.id,
        name: minister.name,
        email: minister.email,
        phone: minister.phone,
        responded: false,
        respondedAt: null,
        availability: null
      };
    });
    
    // Ordenar: não respondidos primeiro, depois por nome
    ministersWithResponses.sort((a, b) => {
      if (a.responded !== b.responded) {
        return a.responded ? 1 : -1; // Não respondidos primeiro
      }
      return a.name.localeCompare(b.name);
    });
    
    const respondedCount = ministersWithResponses.filter(m => m.responded).length;
    const totalMinisters = allMinisters.length;
    
    res.json({
      month,
      year,
      templateExists: true,
      templateId: template.id,
      templateStatus: template.status,
      totalMinisters,
      respondedCount,
      pendingCount: totalMinisters - respondedCount,
      responseRate: totalMinisters > 0 ? ((respondedCount / totalMinisters) * 100).toFixed(1) : 0,
      responses: ministersWithResponses
    });
    
  } catch (error) {
    console.error('Error fetching response status:', error);
    res.status(500).json({ error: 'Failed to fetch response status' });
  }
});

// Obter respostas detalhadas de um ministro específico
router.get('/responses/:templateId/:ministerId', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const { templateId, ministerId } = req.params;
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    // Buscar o template
    const [template] = await db.select().from(questionnaires)
      .where(eq(questionnaires.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Buscar a resposta específica
    const [response] = await db.select().from(questionnaireResponses)
      .where(and(
        eq(questionnaireResponses.questionnaireId, templateId),
        eq(questionnaireResponses.userId, ministerId)
      ))
      .limit(1);
    
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    
    // Buscar dados do usuário
    // Tabela de usuários já importada no topo do arquivo
    const [user] = await db.select({
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users)
      .where(eq(users.id, ministerId))
      .limit(1);
    
    res.json({
      user,
      response: {
        submittedAt: response.submittedAt,
        responses: JSON.parse(response.responses as string),
        availabilities: response.availableSundays || []
      },
      template: {
        questions: template.questions,
        month: template.month,
        year: template.year
      }
    });
    
  } catch (error) {
    console.error('Error fetching detailed response:', error);
    res.status(500).json({ error: 'Failed to fetch response details' });
  }
});

// Obter resumo acumulado de todas as respostas
router.get('/responses-summary/:year/:month', requireAuth, requireRole(['gestor', 'coordenador']), async (req: any, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (!db) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
    // Buscar o template
    const [template] = await db.select().from(questionnaires)
      .where(and(
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Buscar todas as respostas
    const responses = await db.select().from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, template.id));
    
    // Processar e acumular respostas
    const summary: Record<string, Record<string, number>> = {};
    const questions = template.questions as any[];
    
    responses.forEach(response => {
      const parsedResponses = JSON.parse(response.responses);
      
      parsedResponses.forEach((resp: any) => {
        if (!summary[resp.questionId]) {
          summary[resp.questionId] = {};
        }
        
        // Processar diferentes tipos de resposta
        if (typeof resp.answer === 'object' && resp.answer.answer) {
          // Respostas com sub-perguntas
          const mainAnswer = resp.answer.answer;
          if (!summary[resp.questionId][mainAnswer]) {
            summary[resp.questionId][mainAnswer] = 0;
          }
          summary[resp.questionId][mainAnswer]++;
          
          // Sub-resposta
          if (resp.answer.sub) {
            const subKey = `${resp.questionId}_sub`;
            if (!summary[subKey]) {
              summary[subKey] = {};
            }
            if (!summary[subKey][resp.answer.sub]) {
              summary[subKey][resp.answer.sub] = 0;
            }
            summary[subKey][resp.answer.sub]++;
          }
        } else if (Array.isArray(resp.answer)) {
          // Checkbox responses
          resp.answer.forEach((option: string) => {
            if (!summary[resp.questionId][option]) {
              summary[resp.questionId][option] = 0;
            }
            summary[resp.questionId][option]++;
          });
        } else if (typeof resp.answer === 'string') {
          // Simple responses
          if (!summary[resp.questionId][resp.answer]) {
            summary[resp.questionId][resp.answer] = 0;
          }
          summary[resp.questionId][resp.answer]++;
        }
      });
    });
    
    res.json({
      totalResponses: responses.length,
      questions: questions,
      summary: summary
    });
    
  } catch (error) {
    console.error('Error fetching response summary:', error);
    res.status(500).json({ error: 'Failed to fetch response summary' });
  }
});

export default router;