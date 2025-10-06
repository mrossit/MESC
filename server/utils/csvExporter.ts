import { db } from '../db';
import {
  questionnaires,
  questionnaireResponses,
  users
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface CSVExportData {
  ministerId: string;
  ministerName: string;
  ministerEmail: string;
  questionnaireTitle: string;
  submittedAt: Date | null;
  responses: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    answer: any;
  }>;
}

/**
 * Converts questionnaire responses to CSV format
 */
export function convertResponsesToCSV(data: CSVExportData[]): string {
  if (data.length === 0) {
    return 'Sem dados para exportar';
  }

  // Get all unique questions to create consistent columns
  const allQuestions = new Set<string>();
  data.forEach(entry => {
    entry.responses.forEach(response => {
      allQuestions.add(response.questionId);
    });
  });

  // Create header row
  const headers = [
    'ID do Ministro',
    'Nome do Ministro',
    'Email do Ministro',
    'Título do Questionário',
    'Data de Envio',
    ...Array.from(allQuestions)
  ];

  // Create data rows
  const rows = data.map(entry => {
    const responseMap = new Map(
      entry.responses.map(r => [r.questionId, formatAnswer(r.answer, r.questionType)])
    );

    return [
      entry.ministerId,
      entry.ministerName,
      entry.ministerEmail,
      entry.questionnaireTitle,
      entry.submittedAt ? new Date(entry.submittedAt).toLocaleString('pt-BR') : 'Não enviado',
      ...Array.from(allQuestions).map(questionId => responseMap.get(questionId) || '')
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');

  // Add BOM for proper UTF-8 encoding in Excel
  return '\uFEFF' + csvContent;
}

/**
 * Creates a detailed CSV with questions as headers
 */
export function createDetailedCSV(data: CSVExportData[]): string {
  if (data.length === 0) {
    return 'Sem dados para exportar';
  }

  // Get all unique questions with their text
  const questionMap = new Map<string, string>();
  data.forEach(entry => {
    entry.responses.forEach(response => {
      if (!questionMap.has(response.questionId)) {
        questionMap.set(response.questionId, response.questionText);
      }
    });
  });

  // Create header row with question texts
  const headers = [
    'Nome do Ministro',
    'Email',
    'Data de Envio',
    ...Array.from(questionMap.values())
  ];

  // Create data rows
  const rows = data.map(entry => {
    const responseMap = new Map(
      entry.responses.map(r => [r.questionId, formatAnswer(r.answer, r.questionType)])
    );

    return [
      entry.ministerName,
      entry.ministerEmail,
      entry.submittedAt ? new Date(entry.submittedAt).toLocaleString('pt-BR') : 'Não enviado',
      ...Array.from(questionMap.keys()).map(questionId => responseMap.get(questionId) || 'Não respondido')
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');

  // Add BOM for proper UTF-8 encoding in Excel
  return '\uFEFF' + csvContent;
}

/**
 * Formats answer based on question type
 */
function formatAnswer(answer: any, questionType: string): string {
  if (answer === null || answer === undefined) {
    return '';
  }

  switch (questionType) {
    case 'multiple_choice':
    case 'checkbox':
      if (Array.isArray(answer)) {
        return answer.join('; ');
      }
      return String(answer);

    case 'yes_no':
      return answer === true ? 'Sim' : answer === false ? 'Não' : String(answer);

    case 'yes_no_with_options':
      if (typeof answer === 'object' && answer !== null) {
        const mainAnswer = answer.answer === 'Sim' ? 'Sim' : 'Não';
        if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
          return `${mainAnswer}: ${answer.selectedOptions.join('; ')}`;
        }
        return mainAnswer;
      }
      return String(answer);

    case 'text':
    case 'textarea':
    default:
      return String(answer);
  }
}

/**
 * Escapes special characters for CSV format
 */
function escapeCSVField(field: string): string {
  const str = String(field);
  // If the field contains comma, newline, or quotes, wrap it in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    // Escape existing quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Fetches and formats questionnaire responses for CSV export
 */
export async function getQuestionnaireResponsesForExport(
  questionnaireId: string
): Promise<CSVExportData[]> {
  if (!db) {
    throw new Error('Database not available');
  }

  // Fetch questionnaire details
  const [questionnaire] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.id, questionnaireId))
    .limit(1);

  if (!questionnaire) {
    throw new Error('Questionnaire not found');
  }

  // Fetch all responses with user information
  const responsesWithUsers = await db
    .select({
      response: questionnaireResponses,
      user: users
    })
    .from(questionnaireResponses)
    .innerJoin(users, eq(questionnaireResponses.userId, users.id))
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId));

  // Format data for CSV export
  const exportData: CSVExportData[] = responsesWithUsers.map(({ response, user }) => {
    const formattedResponses: any[] = [];

    // Priority 1: Use structured columns if they have data
    if (response.availableSundays && response.availableSundays.length > 0) {
      formattedResponses.push({
        questionId: 'available_sundays',
        questionText: 'Domingos Disponíveis',
        questionType: 'checkbox',
        answer: response.availableSundays
      });
    }

    if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
      formattedResponses.push({
        questionId: 'preferred_mass_times',
        questionText: 'Horários Preferidos',
        questionType: 'checkbox',
        answer: response.preferredMassTimes
      });
    }

    if (response.alternativeTimes && response.alternativeTimes.length > 0) {
      formattedResponses.push({
        questionId: 'alternative_times',
        questionText: 'Horários Alternativos',
        questionType: 'checkbox',
        answer: response.alternativeTimes
      });
    }

    if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
      formattedResponses.push({
        questionId: 'daily_mass',
        questionText: 'Missas Diárias',
        questionType: 'checkbox',
        answer: response.dailyMassAvailability
      });
    }

    if (response.specialEvents) {
      formattedResponses.push({
        questionId: 'special_events',
        questionText: 'Eventos Especiais',
        questionType: 'text',
        answer: response.specialEvents
      });
    }

    if (response.canSubstitute !== null && response.canSubstitute !== undefined) {
      formattedResponses.push({
        questionId: 'can_substitute',
        questionText: 'Pode Substituir',
        questionType: 'yes_no',
        answer: response.canSubstitute
      });
    }

    if (response.notes) {
      formattedResponses.push({
        questionId: 'notes',
        questionText: 'Observações',
        questionType: 'text',
        answer: response.notes
      });
    }

    // Priority 2: If no structured data, try to extract from JSON responses field
    if (formattedResponses.length === 0 && response.responses) {
      // Se responses é um array (novo formato)
      if (Array.isArray(response.responses)) {
        response.responses.forEach((r: any) => {
          const { questionId, answer } = r;

          // Mapear questionIds para textos legíveis
          const questionTextMap: Record<string, string> = {
            'monthly_availability': 'Disponibilidade Mensal',
            'main_service_time': 'Horário Principal de Serviço',
            'can_substitute': 'Pode Substituir',
            'available_sundays': 'Domingos Disponíveis',
            'other_times_available': 'Outros Horários Disponíveis',
            'preferred_mass_times': 'Horários Preferidos',
            'alternative_times': 'Horários Alternativos',
            'daily_mass': 'Missas Diárias',
            'daily_mass_availability': 'Disponibilidade para Missas Diárias',
            'special_events': 'Eventos Especiais',
            'notes': 'Observações',
            'observations': 'Observações'
          };

          // Determinar o tipo de pergunta baseado na resposta
          let questionType = 'text';
          if (Array.isArray(answer)) {
            questionType = 'checkbox';
          } else if (typeof answer === 'boolean' || answer === 'Sim' || answer === 'Não') {
            questionType = 'yes_no';
          } else if (typeof answer === 'object' && answer.answer) {
            questionType = 'yes_no_with_options';
          }

          formattedResponses.push({
            questionId,
            questionText: questionTextMap[questionId] || questionId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            questionType,
            answer
          });
        });
      }
      // Se responses é um objeto (formato antigo ou mal formatado)
      else if (typeof response.responses === 'object') {
        const responseObj = response.responses as any;

        // Handle nested availability object
        if (responseObj.availability && typeof responseObj.availability === 'object') {
          const avail = responseObj.availability;

          if (avail.sundays && Array.isArray(avail.sundays)) {
            formattedResponses.push({
              questionId: 'available_sundays',
              questionText: 'Domingos Disponíveis',
              questionType: 'checkbox',
              answer: avail.sundays
            });
          }

          if (avail.preferences && Array.isArray(avail.preferences)) {
            formattedResponses.push({
              questionId: 'preferred_mass_times',
              questionText: 'Horários Preferidos',
              questionType: 'checkbox',
              answer: avail.preferences
            });
          }
        }

        // Handle other fields at root level
        Object.entries(responseObj).forEach(([key, value]) => {
          if (key !== 'availability' && value !== null && value !== undefined) {
            // Skip if already added
            if (!formattedResponses.find(r => r.questionId === key)) {
              formattedResponses.push({
                questionId: key,
                questionText: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                questionType: 'text',
                answer: value
              });
            }
          }
        });
      }
    }

    return {
      ministerId: user.id,
      ministerName: user.name,
      ministerEmail: user.email,
      questionnaireTitle: questionnaire.title,
      submittedAt: response.submittedAt,
      responses: formattedResponses
    };
  });

  // Also include ministers who haven't responded yet
  const respondedUserIds = new Set(responsesWithUsers.map((r: any) => r.user.id));

  if (questionnaire.targetUserIds && Array.isArray(questionnaire.targetUserIds)) {
    const nonRespondents = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ministro'));

    nonRespondents
      .filter((user: any) => !respondedUserIds.has(user.id))
      .forEach((user: any) => {
        exportData.push({
          ministerId: user.id,
          ministerName: user.name,
          ministerEmail: user.email,
          questionnaireTitle: questionnaire.title,
          submittedAt: null,
          responses: []
        });
      });
  }

  return exportData;
}

/**
 * Gets all responses for a specific month/year
 */
export async function getMonthlyResponsesForExport(
  month: number,
  year: number
): Promise<CSVExportData[]> {
  if (!db) {
    throw new Error('Database not available');
  }

  // Find questionnaire for the specified month/year
  const [questionnaire] = await db
    .select()
    .from(questionnaires)
    .where(and(
      eq(questionnaires.month, month),
      eq(questionnaires.year, year)
    ))
    .limit(1);

  if (!questionnaire) {
    throw new Error(`No questionnaire found for ${month}/${year}`);
  }

  return getQuestionnaireResponsesForExport(questionnaire.id);
}