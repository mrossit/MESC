import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  questionnaires,
  questionnaireResponses,
  users,
  notifications,
  familyRelationships
} from '@shared/schema';
import { eq, and, inArray, or } from 'drizzle-orm';
import { mobileNotificationData } from '@shared/mobileNotificationEvents';
import { pushConfig, sendPushNotificationToUsers } from '../utils/pushNotifications';
import { generateQuestionnaireQuestions } from '../utils/questionnaireGenerator';
import { authenticateToken as requireAuth, AuthRequest, requireRole } from '../auth';
import { isAdmin as isAdminRole } from '@shared/roles';
import { communityIdFromQuestionnaire, resolveWriteCommunityId } from '../utils/communityContext';
import {
  getQuestionnaireResponsesForExport,
  getMonthlyResponsesForExport,
  createDetailedCSV,
  convertResponsesToCSV
} from '../utils/csvExporter';
import { QuestionnaireService } from '../services/questionnaireService';

const router = Router();

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

// Response item interface for parsing
interface ResponseItem {
  questionId: string;
  answer: unknown;
}

// Availabilities structure
interface Availabilities {
  sundays: string[];
  massTimes: string[];
  dailyMass: boolean;
  dailyMassDays: string[];
  alternativeTimes: string[];
  specialEvents: string[];
}


/**
 * Helper function to validate and parse year/month parameters
 * Returns null if validation fails (sends error response)
 */
function parseYearMonth(req: Request, res: Response): { year: number; month: number } | null {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  if (isNaN(year) || isNaN(month)) {
    res.status(400).json({ error: 'Ano e mês devem ser números válidos' });
    return null;
  }

  if (month < 1 || month > 12) {
    res.status(400).json({ error: 'Mês deve estar entre 1 e 12' });
    return null;
  }

  if (year < 2020 || year > 2100) {
    res.status(400).json({ error: 'Ano deve estar entre 2020 e 2100' });
    return null;
  }

  return { year, month };
}

// Month names for Portuguese locale
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Safely parse JSON with error handling
 * Returns the parsed object or the original value if already an object
 */
function safeParseJSON<T>(value: string | T, fallback: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[QUESTIONNAIRE] Failed to parse JSON:', error);
    return fallback;
  }
}

// Função auxiliar para analisar respostas e extrair disponibilidades
function analyzeResponses(responses: ResponseItem[]) {
  const availabilities: Availabilities = {
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
      if (typeof answer === 'object' && answer !== null) {
        const answerObj = answer as { answer?: string; selectedOptions?: string[] };
        if (answerObj.answer === 'Sim' && answerObj.selectedOptions) {
          availabilities.alternativeTimes = answerObj.selectedOptions;
        }
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
          communityId: await resolveWriteCommunityId(req.user),
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
            type: 'announcement',
            actionUrl: '/questionnaires',
            data: mobileNotificationData('questionnaire_published', {
              questionnaireId: created.id,
              month,
              year,
            })
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
    const params = parseYearMonth(req, res);
    if (!params) return;
    const { year, month } = params;

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
      })),
      sharedWithFamilyIds: z.array(z.string()).optional(),
      familyServePreference: z.enum(['together', 'separately']).optional()
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
      } else if (foundUser && isAdminRole(foundUser.role)) {
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
            communityId: await resolveWriteCommunityId(req.user),
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

    // 🛡️ CRITICAL: Standardize ALL responses to v2.0 format WITH SAFETY NET
    console.log('[RESPONSES] Standardizing responses to v2.0 format with tracking');
    const processingResult = QuestionnaireService.standardizeResponseWithTracking(
      data.responses,
      data.month,
      data.year
    );
    const standardizedResponse = processingResult.standardized;
    const unmappedResponses = processingResult.unmappedResponses;
    const processingWarnings = processingResult.warnings;

    console.log('[RESPONSES] Standardized response:', JSON.stringify(standardizedResponse, null, 2));
    if (unmappedResponses.length > 0) {
      console.warn('[RESPONSES] ⚠️ UNMAPPED RESPONSES DETECTED:', unmappedResponses);
    }
    if (processingWarnings.length > 0) {
      console.warn('[RESPONSES] ⚠️ PROCESSING WARNINGS:', processingWarnings);
    }

    // Extract structured data for legacy compatibility
    console.log('[RESPONSES] Extracting structured data');
    const extractedData = QuestionnaireService.extractStructuredData(standardizedResponse);
    console.log('[RESPONSES] Dados extraídos:', extractedData);

    // Promote alternativeTimes back to v2.0 public field before saving
    if (extractedData.alternativeTimes && Array.isArray(extractedData.alternativeTimes)) {
      (standardizedResponse as any).alternative_times = extractedData.alternativeTimes;
    }
    
    // Clean up internal helper fields before saving to JSON (don't persist to database)
    delete (standardizedResponse as any)._alternativeTimes;
    delete (standardizedResponse as any)._preferredTime;

    // Phase 1 - Data Integrity: UPSERT pattern to prevent race conditions
    // This atomically inserts or updates, eliminating the check-then-insert race condition
    console.log('[RESPONSES] Using UPSERT to save response (prevents race conditions)');

    const responseValues = {
      userId: minister.id,
      questionnaireId: templateId,
      communityId: await communityIdFromQuestionnaire(templateId), // herda do questionário
      responses: JSON.stringify(standardizedResponse), // SAVE STANDARDIZED V2.0 FORMAT
      availableSundays: extractedData.availableSundays,
      preferredMassTimes: extractedData.preferredMassTimes,
      alternativeTimes: extractedData.alternativeTimes,
      dailyMassAvailability: extractedData.dailyMassAvailability,
      specialEvents: extractedData.specialEvents,
      canSubstitute: extractedData.canSubstitute,
      notes: extractedData.notes,
      unmappedResponses: unmappedResponses, // 🛡️ SAFETY NET: Save unmapped responses
      processingWarnings: processingWarnings, // 🛡️ SAFETY NET: Save warnings
      sharedWithFamilyIds: data.sharedWithFamilyIds || [],
      isSharedResponse: false,
      isDeleted: false, // Ensure non-deleted (supports soft delete resurrection)
      deletedAt: null, // Clear deletion timestamp
      submittedAt: new Date(),
      updatedAt: new Date()
    };

    console.log('[RESPONSES] Data being sent for UPSERT:', JSON.stringify(responseValues, null, 2));

    let result: { responseData: Record<string, unknown>; isUpdate: boolean };

    try {
      // UPSERT: INSERT ... ON CONFLICT DO UPDATE (atomic operation)
      const [saved] = await db
        .insert(questionnaireResponses)
        .values(responseValues)
        .onConflictDoUpdate({
          target: [questionnaireResponses.userId, questionnaireResponses.questionnaireId],
          set: {
            responses: JSON.stringify(standardizedResponse),
            availableSundays: extractedData.availableSundays,
            preferredMassTimes: extractedData.preferredMassTimes,
            alternativeTimes: extractedData.alternativeTimes,
            dailyMassAvailability: extractedData.dailyMassAvailability,
            specialEvents: extractedData.specialEvents,
            canSubstitute: extractedData.canSubstitute,
            notes: extractedData.notes,
            unmappedResponses: unmappedResponses,
            processingWarnings: processingWarnings,
            sharedWithFamilyIds: data.sharedWithFamilyIds || [],
            isDeleted: false, // Resurrect soft-deleted records
            deletedAt: null, // Clear deletion timestamp
            submittedAt: new Date(),
            updatedAt: new Date()
          }
        })
        .returning();

      console.log('[RESPONSES] Resposta salva com sucesso (UPSERT)');

      // Armazenar dados para retorno posterior
      const responseData = {
        ...saved,
        responses: safeParseJSON(saved.responses, [])
      };

      // Note: We can't easily determine if it was an insert or update with UPSERT
      // But that's okay - the operation is atomic and idempotent
      result = { responseData, isUpdate: false };
    } catch (upsertError) {
      console.error('[RESPONSES] Erro ao salvar resposta (UPSERT):', upsertError);
      throw upsertError;
    }

    // Salvar preferência de escalação familiar se fornecida
    if (data.familyServePreference && data.sharedWithFamilyIds && data.sharedWithFamilyIds.length > 0) {
      try {
        console.log('[RESPONSES] Salvando preferência familiar:', data.familyServePreference);
        const { storage } = await import('../storage');
        const preferTogether = data.familyServePreference === 'together';
        await storage.updateFamilyPreference(minister.id, preferTogether);
        console.log('[RESPONSES] Preferência familiar salva com sucesso');
      } catch (prefError) {
        console.error('[RESPONSES] Erro ao salvar preferência familiar:', prefError);
        // Não bloquear o envio se falhar ao salvar preferência
      }
    }

    // Processar compartilhamento familiar após salvar a resposta principal
    if (data.sharedWithFamilyIds && data.sharedWithFamilyIds.length > 0) {
      console.log('[RESPONSES] Processando compartilhamento familiar:', data.sharedWithFamilyIds);
      
      // Validar relacionamentos familiares
      for (const familyUserId of data.sharedWithFamilyIds) {
        try {
          // Verificar se o usuário está relacionado familiarmente
          const [familyMember] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(and(
              eq(users.id, familyUserId),
              eq(users.status, 'active')
            ))
            .limit(1);

          if (!familyMember) {
            console.warn(`[RESPONSES] Usuário não encontrado ou inativo: ${familyUserId}`);
            continue;
          }

          // Verificar relacionamento familiar
          const [familyRelation] = await db
            .select()
            .from(familyRelationships)
            .where(or(
              and(
                eq(familyRelationships.userId, minister.id),
                eq(familyRelationships.relatedUserId, familyUserId)
              ),
              and(
                eq(familyRelationships.userId, familyUserId),
                eq(familyRelationships.relatedUserId, minister.id)
              )
            ))
            .limit(1);

          if (!familyRelation) {
            console.warn(`[RESPONSES] Sem relação familiar válida entre ${minister.id} e ${familyUserId}`);
            continue;
          }

          // Phase 1 - Data Integrity: Use UPSERT for family sharing to prevent race conditions
          // Strategy: Only create/update shared responses, never overwrite personal responses

          // Check if family member already has a personal (non-shared) response
          const [existingPersonalResponse] = await db
            .select({ isSharedResponse: questionnaireResponses.isSharedResponse, sharedFromUserId: questionnaireResponses.sharedFromUserId })
            .from(questionnaireResponses)
            .where(and(
              eq(questionnaireResponses.userId, familyUserId),
              eq(questionnaireResponses.questionnaireId, templateId as any),
              eq(questionnaireResponses.isDeleted, false),
              eq(questionnaireResponses.isSharedResponse, false) // Only check for personal responses
            ))
            .limit(1);

          if (existingPersonalResponse) {
            console.log(`[RESPONSES] ${familyMember.name} já possui resposta própria, não sobrescrevendo`);
            continue; // Skip to next family member
          }

          // Safe to UPSERT: Either no response exists, or only a shared response exists
          // UPSERT will create if absent, or update if it's a shared response from this user
          try {
            await db
              .insert(questionnaireResponses)
              .values({
                userId: familyUserId,
                questionnaireId: templateId,
                communityId: await communityIdFromQuestionnaire(templateId), // herda do questionário
                responses: JSON.stringify(standardizedResponse),
                availableSundays: extractedData.availableSundays,
                preferredMassTimes: extractedData.preferredMassTimes,
                alternativeTimes: extractedData.alternativeTimes,
                dailyMassAvailability: extractedData.dailyMassAvailability,
                specialEvents: extractedData.specialEvents,
                canSubstitute: extractedData.canSubstitute,
                notes: extractedData.notes,
                isSharedResponse: true,
                sharedFromUserId: minister.id,
                sharedWithFamilyIds: [],
                isDeleted: false, // Ensure non-deleted (supports soft delete resurrection)
                deletedAt: null // Clear deletion timestamp
              })
              .onConflictDoUpdate({
                target: [questionnaireResponses.userId, questionnaireResponses.questionnaireId],
                set: {
                  responses: JSON.stringify(standardizedResponse),
                  availableSundays: extractedData.availableSundays,
                  preferredMassTimes: extractedData.preferredMassTimes,
                  alternativeTimes: extractedData.alternativeTimes,
                  dailyMassAvailability: extractedData.dailyMassAvailability,
                  specialEvents: extractedData.specialEvents,
                  canSubstitute: extractedData.canSubstitute,
                  notes: extractedData.notes,
                  isDeleted: false, // Resurrect soft-deleted records
                  deletedAt: null, // Clear deletion timestamp
                  submittedAt: new Date(),
                  updatedAt: new Date()
                  // Note: Only update if it's still a shared response (protected by unique index on non-deleted)
                }
              });

            console.log(`[RESPONSES] Resposta compartilhada salva (UPSERT) para ${familyMember.name} (${familyUserId})`);
          } catch (familyUpsertError) {
            console.error(`[RESPONSES] Erro no UPSERT familiar:`, familyUpsertError);
            throw familyUpsertError;
          }
        } catch (shareError) {
          console.error(`[RESPONSES] Erro ao compartilhar com familiar ${familyUserId}:`, shareError);
          // Continuar processamento dos outros familiares
        }
      }
    }

    // Retornar resposta final
    res.json(result.responseData);
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
    const params = parseYearMonth(req, res);
    if (!params) return;
    const { year, month } = params;
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
      const minister = user && (user.role === 'ministro' || isAdminRole(user.role)) ? {
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
        const parsedResponses = safeParseJSON(response.responses, []);

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
    const params = parseYearMonth(req, res);
    if (!params) return;
    const { year, month } = params;
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (!isAdminRole(userRole)) {
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
    type ResponseRow = typeof responses[number];
    type MinisterRow = typeof ministers[number];
    const responseMap = new Map<string, ResponseRow>(responses.map((r: ResponseRow) => [r.userId, r]));

    const ministerResponses = ministers.map((minister: MinisterRow) => {
      const response = responseMap.get(minister.id);
      return {
        id: minister.id,
        name: minister.name,
        email: minister.email,
        phone: minister.phone || '',
        responded: responseMap.has(minister.id),
        respondedAt: response?.submittedAt ? new Date(response.submittedAt).toISOString() : null,
        availability: null // Pode ser expandido para incluir disponibilidade
      };
    });

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
    const params = parseYearMonth(req, res);
    if (!params) return;
    const { year, month } = params;
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (!isAdminRole(userRole)) {
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
    const questions = questionnaire.questions as unknown[];

    type SummaryResponseRow = typeof responses[number];
    responses.forEach((response: SummaryResponseRow) => {
      const userResponses = safeParseJSON(response.responses, []);

      if (Array.isArray(userResponses)) {
        userResponses.forEach((r: ResponseItem) => {
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
    if (!isAdminRole(userRole)) {
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
    const userResponses = safeParseJSON(response.responses, []);

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
    const params = parseYearMonth(req, res);
    if (!params) return;
    const { year, month } = params;
    const userRole = req.user!.role;

    // Verificar se o usuário tem permissão
    if (!isAdminRole(userRole)) {
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
    if (!req.user || !isAdminRole(req.user.role)) {
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

    try {
      const explicitTargetUserIds = Array.isArray(existingTemplate.targetUserIds)
        ? existingTemplate.targetUserIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];

      const targetUsers = explicitTargetUserIds.length > 0
        ? await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            inArray(users.id, explicitTargetUserIds),
            eq(users.status, 'active')
          ))
        : await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.role, 'ministro'),
            eq(users.status, 'active'),
            existingTemplate.communityId
              ? eq(users.homeCommunityId, existingTemplate.communityId)
              : undefined
          ));

      const recipientIds = [...new Set(targetUsers.map((user) => user.id))];
      if (recipientIds.length > 0) {
        const title = 'Questionário Encerrado';
        const message = `O questionário ${existingTemplate.title ?? 'de disponibilidade'} foi encerrado. Novas respostas não serão aceitas.`;

        await Promise.all(recipientIds.map((recipientId) =>
          db.insert(notifications).values({
            userId: recipientId,
            title,
            message,
            type: 'announcement',
            read: false,
            actionUrl: '/questionnaires',
            data: mobileNotificationData('questionnaire_closed', {
              questionnaireId: templateId,
              month: existingTemplate.month,
              year: existingTemplate.year,
            })
          })
        ));

        if (pushConfig.enabled) {
          await sendPushNotificationToUsers(recipientIds, {
            title,
            body: message,
            url: '/questionnaires',
            tag: `questionnaire-closed-${templateId}`,
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending questionnaire close notifications:', notificationError);
    }

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
    if (!req.user || !isAdminRole(req.user.role)) {
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

// Export questionnaire responses as CSV
router.get('/:questionnaireId/export/csv', requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {
    const { questionnaireId } = req.params;
    const { format = 'detailed' } = req.query as { format?: 'simple' | 'detailed' };

    // Fetch and format data for CSV export
    const exportData = await getQuestionnaireResponsesForExport(questionnaireId);

    // Generate CSV content based on format preference
    const csvContent = format === 'detailed'
      ? createDetailedCSV(exportData)
      : convertResponsesToCSV(exportData);

    // Get questionnaire for filename
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, questionnaireId))
      .limit(1);

    const filename = questionnaire
      ? `respostas_${questionnaire.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      : `respostas_questionario_${new Date().toISOString().split('T')[0]}.csv`;

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting questionnaire responses:', error);
    res.status(500).json({ error: 'Failed to export questionnaire responses' });
  }
});

// Export monthly responses as CSV
router.get('/export/:year/:month/csv', requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {
    const params = parseYearMonth(req, res);
    if (!params) return;
    const { year, month } = params;
    const { format = 'detailed' } = req.query as { format?: 'simple' | 'detailed' };

    // Fetch and format data for CSV export
    const exportData = await getMonthlyResponsesForExport(month, year);

    // Generate CSV content based on format preference
    const csvContent = format === 'detailed'
      ? createDetailedCSV(exportData)
      : convertResponsesToCSV(exportData);

    const monthName = monthNames[month - 1];
    const filename = `respostas_${monthName}_${year}_${new Date().toISOString().split('T')[0]}.csv`;

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting monthly responses:', error);
    const message = error instanceof Error ? error.message : 'Failed to export monthly responses';
    res.status(500).json({ error: message });
  }
});

/**
 * ADMIN: Reprocessar respostas existentes para preencher colunas estruturadas
 * POST /api/questionnaires/admin/reprocess-responses
 */
router.post('/admin/reprocess-responses', requireAuth, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { questionnaireId } = req.body;

    console.log(`[REPROCESS] 🔄 Iniciando reprocessamento...`);
    console.log(`[REPROCESS] QuestionnaireId recebido:`, questionnaireId);

    // Se questionnaireId for fornecido, verificar se existe
    if (questionnaireId) {
      const [questionnaire] = await db.select()
        .from(questionnaires)
        .where(eq(questionnaires.id, questionnaireId))
        .limit(1);
      
      if (!questionnaire) {
        console.log(`[REPROCESS] ❌ Questionário ${questionnaireId} não encontrado!`);
        return res.status(404).json({ error: 'Questionário não encontrado' });
      }
      
      console.log(`[REPROCESS] ✅ Questionário encontrado: ${questionnaire.title} (${questionnaire.month}/${questionnaire.year})`);
    }

    // Buscar todas as respostas do questionário
    const allResponses = questionnaireId 
      ? await db.select()
          .from(questionnaireResponses)
          .where(eq(questionnaireResponses.questionnaireId, questionnaireId))
      : await db.select().from(questionnaireResponses);

    console.log(`[REPROCESS] 📝 Encontradas ${allResponses.length} respostas para reprocessar...`);

    let updated = 0;
    let errors = 0;

    for (const response of allResponses) {
      try {
        // Parse responses se for string
        const responsesArray = safeParseJSON(response.responses, []);

        // Get questionnaire to extract month/year
        const [questionnaire] = await db.select()
          .from(questionnaires)
          .where(eq(questionnaires.id, response.questionnaireId))
          .limit(1);

        // 🛡️ CRITICAL: Standardize response to v2.0 format WITH SAFETY NET
        const processingResult = QuestionnaireService.standardizeResponseWithTracking(
          responsesArray,
          questionnaire?.month,
          questionnaire?.year
        );
        const standardizedResponse = processingResult.standardized;
        const unmappedResponses = processingResult.unmappedResponses;
        const processingWarnings = processingResult.warnings;

        // Extract structured data for legacy fields
        const extractedData = QuestionnaireService.extractStructuredData(standardizedResponse);

        console.log(`[REPROCESS] Resposta ${response.id}:`, {
          availableSundays: extractedData.availableSundays?.length || 0,
          dailyMass: extractedData.dailyMassAvailability?.length || 0,
          specialEvents: extractedData.specialEvents ? Object.keys(extractedData.specialEvents).length : 0,
          unmapped: unmappedResponses.length,
          warnings: processingWarnings.length
        });
        
        if (unmappedResponses.length > 0) {
          console.warn(`[REPROCESS] ⚠️ Response ${response.id} has unmapped questions:`, unmappedResponses);
        }

        // Atualizar resposta com formato v2.0 E dados estruturados + safety net
        await db.update(questionnaireResponses)
          .set({
            responses: JSON.stringify(standardizedResponse), // SAVE STANDARDIZED V2.0 FORMAT
            availableSundays: extractedData.availableSundays,
            preferredMassTimes: extractedData.preferredMassTimes,
            alternativeTimes: extractedData.alternativeTimes,
            dailyMassAvailability: extractedData.dailyMassAvailability,
            specialEvents: extractedData.specialEvents,
            canSubstitute: extractedData.canSubstitute,
            notes: extractedData.notes,
            unmappedResponses: unmappedResponses, // 🛡️ SAFETY NET
            processingWarnings: processingWarnings // 🛡️ SAFETY NET
          })
          .where(eq(questionnaireResponses.id, response.id));

        updated++;
      } catch (error: unknown) {
        console.error(`[REPROCESS] Erro ao processar resposta ${response.id}:`, getErrorMessage(error));
        errors++;
      }
    }

    console.log(`[REPROCESS] ✅ Concluído: ${updated} atualizadas, ${errors} erros`);

    res.json({
      success: true,
      message: `Reprocessadas ${updated} respostas com sucesso`,
      data: {
        total: allResponses.length,
        updated,
        errors
      }
    });

  } catch (error: unknown) {
    console.error('[REPROCESS] Erro geral:', error);
    res.status(500).json({
      success: false,
      message: getErrorMessage(error)
    });
  }
});

export default router;
