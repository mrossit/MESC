import { format, getDaysInMonth, getDay, lastDayOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from './logger';
import { LITURGICAL_THEMES, getMonthDescription } from '../../shared/constants/liturgicalThemes';

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

// Temas mensais são importados de shared/constants/liturgicalThemes.ts
// Esta abordagem centraliza os temas e garante consistência em toda a aplicação

// Funções auxiliares para calcular datas de missas especiais
function getFirstThursdayOfMonth(month: number, year: number): { day: number; isHoliday: boolean } {
  const firstDay = new Date(year, month - 1, 1);
  let day = 1;
  
  // Encontrar a primeira quinta-feira
  while (new Date(year, month - 1, day).getDay() !== 4) {
    day++;
  }
  
  // Verificar se é feriado (simplificado - pode ser expandido)
  const date = new Date(year, month - 1, day);
  const isHoliday = isHolidayDate(date);
  
  return { day, isHoliday };
}

function getFirstFridayOfMonth(month: number, year: number): number {
  let day = 1;
  while (new Date(year, month - 1, day).getDay() !== 5) {
    day++;
  }
  return day;
}

function getFirstSaturdayOfMonth(month: number, year: number): number {
  let day = 1;
  while (new Date(year, month - 1, day).getDay() !== 6) {
    day++;
  }
  return day;
}

function isHolidayDate(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Feriados fixos nacionais
  const holidays = [
    { month: 1, day: 1 },   // Ano Novo
    { month: 4, day: 21 },  // Tiradentes
    { month: 5, day: 1 },   // Dia do Trabalho
    { month: 9, day: 7 },   // Independência
    { month: 10, day: 12 }, // Nossa Senhora Aparecida
    { month: 11, day: 2 },  // Finados
    { month: 11, day: 15 }, // Proclamação da República
    { month: 11, day: 20 }, // Consciência Negra
    { month: 12, day: 25 }  // Natal
  ];
  
  return holidays.some(h => h.month === month && h.day === day);
}

function isOctoberSpecialPeriod(month: number, year: number): boolean {
  return month === 10; // Outubro - mês especial de São Judas Tadeu
}

function getOctoberSpecialDates(year: number): { novena: { start: number; end: number }, feast: number } {
  // Novena: 19 a 27 de outubro (9 dias antes da festa)
  // Festa: 28 de outubro
  return {
    novena: { start: 19, end: 27 },
    feast: 28
  };
}

export function generateQuestionnaireQuestions(month: number, year: number): Question[] {
  logger.debug(`Iniciando geração de questionário para ${month}/${year}`);
  const questions: Question[] = [];
  const monthName = format(new Date(year, month - 1), 'MMMM', { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const theme = LITURGICAL_THEMES[month];
  const themeName = theme ? theme.name : 'do mês';
  const themeDedication = theme ? theme.dedication : 'ao mês';
  logger.debug(`Tema detectado para questionário: ${themeName}`);
  
  // Obter todos os domingos do mês
  const sundayDates: string[] = [];
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (getDay(date) === 0) { // Domingo
      let sundayLabel = `Domingo ${format(date, 'dd/MM')}`;
      
      // Verificar se 12/10 (Nossa Senhora Aparecida) cai em domingo
      if (month === 10 && day === 12) {
        sundayLabel = `Domingo (12/10) – Missa em honra à Nossa Senhora Aparecida`;
      }
      
      sundayDates.push(sundayLabel);
    }
  }

  // 1. Disponibilidade mensal com tema e concordância correta
  questions.push({
    id: 'monthly_availability',
    type: 'multiple_choice',
    question: `Neste mês de ${capitalizedMonth} dedicado ${themeDedication}, você tem disponibilidade para servir no seu horário de costume?`,
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

  // 6. Missas diárias 6h30 (pergunta unificada com opções condicionais)
  questions.push({
    id: 'daily_mass_availability',
    type: 'yes_no_with_options',
    question: 'Este mês você pode servir nas missas diárias das 6h30?',
    options: ['Sim', 'Não', 'Apenas em alguns dias'],
    required: false,
    category: 'daily',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
      conditionalOptions: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
    },
    order: 6
  });

  // 7. Missas especiais mensais
  // 7.1 Missa por Cura e Libertação (primeira quinta-feira)
  const firstThursday = getFirstThursdayOfMonth(month, year);
  const healingMassTime = firstThursday.isHoliday ? '19h' : '19h30';
  questions.push({
    id: 'healing_liberation_mass',
    type: 'multiple_choice',
    question: `Você pode servir na Missa por Cura e Libertação - primeira quinta-feira (${firstThursday.day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}) às ${healingMassTime}?`,
    options: ['Sim', 'Não'],
    required: false,
    category: 'special_event',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
      eventDate: `${firstThursday.day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      eventName: 'Missa por Cura e Libertação'
    },
    order: 7.1
  });

  // 7.2 Missa votiva ao Sagrado Coração de Jesus (primeira sexta-feira)
  const firstFriday = getFirstFridayOfMonth(month, year);
  questions.push({
    id: 'sacred_heart_mass',
    type: 'multiple_choice',
    question: `Você pode servir na Missa votiva ao Sagrado Coração de Jesus - primeira sexta-feira (${firstFriday.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}) às 6h30?`,
    options: ['Sim', 'Não'],
    required: false,
    category: 'special_event',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
      eventDate: `${firstFriday.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      eventName: 'Missa votiva ao Sagrado Coração de Jesus'
    },
    order: 7.2
  });

  // 7.3 Missa votiva ao Imaculado Coração de Maria (primeiro sábado)
  const firstSaturday = getFirstSaturdayOfMonth(month, year);
  questions.push({
    id: 'immaculate_heart_mass',
    type: 'multiple_choice',
    question: `Você pode servir na Missa votiva ao Imaculado Coração de Maria - primeiro sábado (${firstSaturday.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}) às 6h30?`,
    options: ['Sim', 'Não'],
    required: false,
    category: 'special_event',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
      eventDate: `${firstSaturday.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      eventName: 'Missa votiva ao Imaculado Coração de Maria'
    },
    order: 7.3
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

  // Para outubro - Situação especial de São Judas Tadeu
  if (month === 10) {
    const octoberDates = getOctoberSpecialDates(year);
    const feastDate = new Date(year, 9, octoberDates.feast); // outubro = mês 9 (0-indexed)
    const dayOfWeek = feastDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou sábado
    const eveningMassTime = isWeekend ? '19h' : '19h30';

    // Festa de São Judas Tadeu (28/10)
    questions.push({
      id: 'saint_judas_feast_7h',
      type: 'multiple_choice',
      question: `Você pode servir na Festa de São Judas Tadeu - 28/10/${year} às 7h?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '28/10',
        eventName: 'Festa de São Judas Tadeu - 7h',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.1
    });

    questions.push({
      id: 'saint_judas_feast_10h',
      type: 'multiple_choice',
      question: `Você pode servir na Festa de São Judas Tadeu - 28/10/${year} às 10h?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '28/10',
        eventName: 'Festa de São Judas Tadeu - 10h',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.2
    });

    questions.push({
      id: 'saint_judas_feast_12h',
      type: 'multiple_choice',
      question: `Você pode servir na Festa de São Judas Tadeu - 28/10/${year} às 12h?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '28/10',
        eventName: 'Festa de São Judas Tadeu - 12h',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.3
    });

    questions.push({
      id: 'saint_judas_feast_15h',
      type: 'multiple_choice',
      question: `Você pode servir na Festa de São Judas Tadeu - 28/10/${year} às 15h?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '28/10',
        eventName: 'Festa de São Judas Tadeu - 15h',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.4
    });

    questions.push({
      id: 'saint_judas_feast_17h',
      type: 'multiple_choice',
      question: `Você pode servir na Festa de São Judas Tadeu - 28/10/${year} às 17h?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '28/10',
        eventName: 'Festa de São Judas Tadeu - 17h',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.5
    });

    questions.push({
      id: 'saint_judas_feast_evening',
      type: 'multiple_choice',
      question: `Você pode servir na Festa de São Judas Tadeu - 28/10/${year} às ${eveningMassTime}?`,
      options: ['Sim', 'Não'],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '28/10',
        eventName: `Festa de São Judas Tadeu - ${eveningMassTime}`,
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.6
    });

    // Novena de São Judas Tadeu (19 a 27/10)
    questions.push({
      id: 'saint_judas_novena',
      type: 'checkbox',
      question: `Você pode servir na Novena de São Judas Tadeu (19 a 27/10/${year})? Marque os dias disponíveis:`,
      options: [
        'Nenhum dia',
        'Segunda 20/10 às 19h30',
        'Terça 21/10 às 19h30',
        'Quarta 22/10 às 19h30',
        'Quinta 24/10 às 19h30',
        'Sexta 25/10 às 19h30',
        'Sábado 26/10 às 19h',
        'Segunda 27/10 às 19h30'
      ],
      required: false,
      category: 'special_event',
      metadata: {
        eventDate: '19-27/10',
        eventName: 'Novena de São Judas Tadeu',
        dependsOn: 'monthly_availability',
        showIf: 'Sim'
      },
      order: 9.7
    });
  }

  // Adicionar outros eventos especiais baseados no mês
  const specialEvents = getSpecialEvents(month, year);
  
  // Filtrar eventos especiais para evitar duplicações
  const filteredEvents = specialEvents.filter(event => {
    // Remover São Judas Tadeu em outubro (já tem perguntas específicas por horário)
    if (month === 10 && event.name.includes('São Judas Tadeu')) {
      return false;
    }
    
    // Remover Nossa Senhora Aparecida quando 12/10 for domingo (já incluído na pergunta dos domingos)
    if (month === 10 && event.name === 'Nossa Senhora Aparecida') {
      const date = new Date(year, 9, 12); // outubro = mês 9 (0-indexed)
      const isOurLadySunday = getDay(date) === 0;
      if (isOurLadySunday) {
        return false;
      }
    }
    
    // Remover Finados genérico (já tem pergunta específica sobre missa do cemitério)
    if (month === 11 && event.name === 'Finados') {
      return false;
    }
    
    return true;
  });

  filteredEvents.forEach((event, index) => {
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
  
  // Novembro - Missa de Finados no cemitério
  if (month === 11) {
    events.push({
      name: 'Missa de Finados às 15h30 (Cemitério)',
      date: '02/11'
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