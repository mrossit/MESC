import { format, getDaysInMonth, getDay, lastDayOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from './logger';

interface Question {
  id: string;
  type: 'multiple_choice' | 'checkbox' | 'text' | 'time_selection' | 'yes_no_with_options';
  question: string;
  options?: string[];
  required: boolean;
  category: 'regular' | 'daily' | 'special_event' | 'custom';
  metadata?: {
    eventDate?: string;
    eventName?: string;
    availableTimes?: string[];
    conditionalOptions?: string[];
    dependsOn?: string;
    showIf?: string;
    filterMode?: 'exclude' | 'include';
    sundayDates?: string[];
  };
  order?: number;
}

// Mapa de temas mensais
const MONTHLY_THEMES: { [key: number]: string } = {
  1: 'Renovação',
  2: 'Amor',
  3: 'Conversão',
  4: 'Ressurreição',
  5: 'Maria',
  6: 'Sagrado Coração',
  7: 'Família',
  8: 'Vocações',
  9: 'Bíblia',
  10: 'Missões',
  11: 'Finados',
  12: 'Natal'
};

export function generateQuestionnaireQuestions(month: number, year: number): Question[] {
  logger.debug(`Iniciando geração de questionário para ${month}/${year}`);
  const questions: Question[] = [];
  const monthName = format(new Date(year, month - 1), 'MMMM', { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const theme = MONTHLY_THEMES[month] || 'do mês';
  logger.debug(`Tema detectado para questionário: ${theme}`);
  
  // Obter todos os domingos do mês
  const sundayDates: string[] = [];
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (getDay(date) === 0) { // Domingo
      sundayDates.push(`Domingo ${format(date, 'dd/MM')}`);
    }
  }

  // 1. Disponibilidade mensal com tema
  questions.push({
    id: 'monthly_availability',
    type: 'multiple_choice',
    question: `Neste mês de ${capitalizedMonth} dedicado à "${theme}", você tem disponibilidade para servir no seu horário de costume?`,
    options: ['Sim', 'Não'],
    required: true,
    category: 'regular',
    order: 1
  });

  // 2. Horário principal de serviço
  questions.push({
    id: 'main_service_time',
    type: 'multiple_choice',
    question: 'Em qual horário você normalmente serve aos domingos?',
    options: ['8h', '10h', '19h'],
    required: false,
    category: 'regular',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim'
    },
    order: 2
  });

  // 3. Disponibilidade para substituição
  questions.push({
    id: 'can_substitute',
    type: 'multiple_choice',
    question: 'Poderá substituir algum ministro caso alguém precise?',
    options: ['Sim', 'Não'],
    required: false,
    category: 'regular',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim'
    },
    order: 3
  });

  // 4. Domingos disponíveis
  questions.push({
    id: 'available_sundays',
    type: 'checkbox',
    question: 'Em quais domingos deste mês você estará disponível para servir no seu horário principal?',
    options: ['Nenhum domingo', ...sundayDates],
    required: false,
    category: 'regular',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim'
    },
    order: 4
  });

  // 5. Disponibilidade para outros horários (pergunta unificada)
  questions.push({
    id: 'other_times_available',
    type: 'yes_no_with_options',
    question: 'Este mês você poderá servir em outros horários além do seu horário principal?',
    options: ['Sim', 'Não'],
    required: false,
    category: 'regular',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
      conditionalOptions: ['8h', '10h', '19h']
    },
    order: 5
  });

  // 6. Missas diárias 6h30
  questions.push({
    id: 'daily_mass_availability',
    type: 'multiple_choice',
    question: 'Este mês você pode servir nas missas diárias das 6h30?',
    options: ['Sim', 'Não', 'Apenas em alguns dias'],
    required: false,
    category: 'daily',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim'
    },
    order: 6
  });

  // 7. Dias específicos para missas diárias
  questions.push({
    id: 'daily_mass_days',
    type: 'checkbox',
    question: 'Selecione os dias que você pode servir:',
    options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
    required: false,
    category: 'daily',
    metadata: {
      dependsOn: 'daily_mass_availability',
      showIf: 'Apenas em alguns dias'
    },
    order: 7
  });

  // 8. Adoração segunda-feira 22h
  questions.push({
    id: 'adoration_monday',
    type: 'multiple_choice',
    question: 'Você pode conduzir o terço da nossa adoração - Segunda-feira 22h? (faremos revezamento de ministros que conduzem o terço)',
    options: ['Sim, posso conduzir', 'Não posso conduzir'],
    required: false,
    category: 'special_event',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim'
    },
    order: 8
  });

  // 9. Eventos especiais do mês
  // Para setembro, adicionar São Miguel Arcanjo (29/09)
  if (month === 9) {
    questions.push({
      id: 'special_event_sao_miguel',
      type: 'multiple_choice',
      question: `Você pode servir Segunda-feira dia 29/09/${year} às 19h30 - Missa em honra à São Miguel Arcanjo?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '29/09',
        eventName: 'São Miguel Arcanjo',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9
    });
  }

  // Adicionar outros eventos especiais baseados no mês
  const specialEvents = getSpecialEvents(month, year);
  specialEvents.forEach((event, index) => {
    questions.push({
      id: `special_event_${index + 1}`,
      type: 'multiple_choice',
      question: `Você pode servir em ${event.name} (${event.date})?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: event.date,
        eventName: event.name,
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 10 + index
    });
  });

  // Última pergunta - Observações
  questions.push({
    id: 'observations',
    type: 'text',
    question: 'Observações adicionais (opcional)',
    required: false,
    category: 'regular',
    order: 99
  });

  logger.debug(`Total de perguntas geradas: ${questions.length}`);
  logger.debug(`Primeira pergunta: "${questions[0]?.question}"`);
  return questions;
}

interface SpecialEvent {
  name: string;
  date: string;
}

function getSpecialEvents(month: number, year: number): SpecialEvent[] {
  const events: SpecialEvent[] = [];
  
  // Feriados fixos
  const fixedHolidays: { [key: string]: string } = {
    '1-1': 'Ano Novo',
    '4-21': 'Tiradentes',
    '5-1': 'Dia do Trabalho',
    '9-7': 'Independência do Brasil',
    '10-12': 'Nossa Senhora Aparecida',
    '11-2': 'Finados',
    '11-15': 'Proclamação da República',
    '11-20': 'Consciência Negra',
    '12-25': 'Natal'
  };
  
  // Verificar feriados fixos no mês
  Object.entries(fixedHolidays).forEach(([dateKey, name]) => {
    const [holidayMonth, holidayDay] = dateKey.split('-').map(Number);
    if (holidayMonth === month) {
      events.push({
        name,
        date: `${holidayDay.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`
      });
    }
  });
  
  // Eventos religiosos especiais
  // Festa de São Judas Tadeu (28 de outubro)
  if (month === 10) {
    events.push({
      name: 'Festa de São Judas Tadeu',
      date: '28/10'
    });
  }
  
  // Mês de Maria (maio)
  if (month === 5) {
    events.push({
      name: 'Coroação de Nossa Senhora',
      date: 'último domingo'
    });
  }
  
  // Junho - festas juninas
  if (month === 6) {
    events.push({
      name: 'Festa de São João',
      date: '24/06'
    });
  }
  
  return events;
}

// Função para analisar respostas
export function analyzeResponses(responses: any[]): any {
  const analysis = {
    totalResponses: responses.length,
    responsesByQuestion: {} as any,
    availability: {
      available: 0,
      unavailable: 0,
      partial: 0
    }
  };

  responses.forEach(response => {
    // Analisar disponibilidade
    const monthlyAvailability = response.responses?.find((r: any) => r.questionId === 'monthly_availability');
    if (monthlyAvailability) {
      if (monthlyAvailability.answer === 'Sim') {
        analysis.availability.available++;
      } else if (monthlyAvailability.answer === 'Não') {
        analysis.availability.unavailable++;
      } else {
        analysis.availability.partial++;
      }
    }

    // Analisar outras respostas
    if (response.responses && Array.isArray(response.responses)) {
      response.responses.forEach((r: any) => {
        if (!analysis.responsesByQuestion[r.questionId]) {
          analysis.responsesByQuestion[r.questionId] = {};
        }
        
        const answer = r.answer;
        if (Array.isArray(answer)) {
          // Para checkboxes
          answer.forEach((option: string) => {
            if (!analysis.responsesByQuestion[r.questionId][option]) {
              analysis.responsesByQuestion[r.questionId][option] = 0;
            }
            analysis.responsesByQuestion[r.questionId][option]++;
          });
        } else if (typeof answer === 'object' && answer.answer) {
          // Para yes_no_with_options
          const mainAnswer = answer.answer;
          if (!analysis.responsesByQuestion[r.questionId][mainAnswer]) {
            analysis.responsesByQuestion[r.questionId][mainAnswer] = 0;
          }
          analysis.responsesByQuestion[r.questionId][mainAnswer]++;
        } else if (typeof answer === 'string') {
          // Para respostas simples
          if (!analysis.responsesByQuestion[r.questionId][answer]) {
            analysis.responsesByQuestion[r.questionId][answer] = 0;
          }
          analysis.responsesByQuestion[r.questionId][answer]++;
        }
      });
    }
  });

  return analysis;
}