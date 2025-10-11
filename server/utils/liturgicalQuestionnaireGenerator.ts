/**
 * 🕊️ LITURGICALLY-AWARE QUESTIONNAIRE GENERATOR
 *
 * Generates month-specific questionnaires with:
 * - Liturgical themes
 * - Auto-generated mass options
 * - Special month handling (November, December, etc)
 * - Algorithm-friendly structure
 */

import { format, addDays, startOfMonth, endOfMonth, getDay, isSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getLiturgicalTheme } from '../../shared/constants/liturgicalThemes.js';

export interface MassOption {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  displayText: string;
  type: 'sunday' | 'weekday' | 'special';
}

export interface QuestionnaireQuestion {
  id: string;
  type: 'checkbox_grid' | 'multiselect' | 'checkbox_list' | 'radio';
  question: string;
  description?: string;
  options: any[];
  required: boolean;
  section?: string;
}

export interface LiturgicalQuestionnaire {
  month: number;
  year: number;
  theme: {
    name: string;
    color: string;
    colorHex: string;
    description: string;
  };
  questions: QuestionnaireQuestion[];
  metadata: {
    version: string;
    structure: string;
    totalSundays: number;
    hasSpecialMasses: boolean;
  };
}

/**
 * Generate all Sunday masses for a month
 */
function generateSundayMasses(month: number, year: number): MassOption[] {
  const masses: MassOption[] = [];
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  let current = start;
  while (current <= end) {
    if (isSunday(current)) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const displayDate = format(current, "dd 'de' MMMM", { locale: ptBR });

      // Standard Sunday masses: 8h, 10h, 19h
      masses.push({
        id: `${dateStr}_08:00`,
        date: dateStr,
        time: '08:00',
        displayText: `${displayDate} às 8h`,
        type: 'sunday'
      });

      masses.push({
        id: `${dateStr}_10:00`,
        date: dateStr,
        time: '10:00',
        displayText: `${displayDate} às 10h`,
        type: 'sunday'
      });

      masses.push({
        id: `${dateStr}_19:00`,
        date: dateStr,
        time: '19:00',
        displayText: `${displayDate} às 19h`,
        type: 'sunday'
      });
    }

    current = addDays(current, 1);
  }

  return masses;
}

/**
 * Generate special masses for a month
 */
function generateSpecialMasses(month: number, year: number): MassOption[] {
  const masses: MassOption[] = [];
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  let current = start;
  let firstThursday: Date | null = null;
  let firstFriday: Date | null = null;
  let firstSaturday: Date | null = null;

  // Find first Thursday, Friday, Saturday
  while (current <= end) {
    const dayOfWeek = getDay(current);

    if (dayOfWeek === 4 && !firstThursday) {
      // First Thursday (healing mass)
      firstThursday = current;
      masses.push({
        id: `${format(current, 'yyyy-MM-dd')}_19:30`,
        date: format(current, 'yyyy-MM-dd'),
        time: '19:30',
        displayText: `Primeira Quinta-feira (${format(current, 'dd/MM')}) - Missa de Cura e Libertação às 19h30`,
        type: 'special'
      });
    }

    if (dayOfWeek === 5 && !firstFriday) {
      // First Friday (Sacred Heart)
      firstFriday = current;
      masses.push({
        id: `${format(current, 'yyyy-MM-dd')}_06:30`,
        date: format(current, 'yyyy-MM-dd'),
        time: '06:30',
        displayText: `Primeira Sexta-feira (${format(current, 'dd/MM')}) - Sagrado Coração às 6h30`,
        type: 'special'
      });
    }

    if (dayOfWeek === 6 && !firstSaturday) {
      // First Saturday (Immaculate Heart)
      firstSaturday = current;
      masses.push({
        id: `${format(current, 'yyyy-MM-dd')}_06:30`,
        date: format(current, 'yyyy-MM-dd'),
        time: '06:30',
        displayText: `Primeiro Sábado (${format(current, 'dd/MM')}) - Imaculado Coração às 6h30`,
        type: 'special'
      });
    }

    current = addDays(current, 1);
  }

  return masses;
}

/**
 * Generate November-specific masses (All Souls Day)
 */
function generateNovemberSpecialMasses(year: number): MassOption[] {
  const masses: MassOption[] = [];

  // November 2 - All Souls Day (multiple masses)
  const allSoulsDay = `${year}-11-02`;

  masses.push({
    id: `${allSoulsDay}_07:00`,
    date: allSoulsDay,
    time: '07:00',
    displayText: 'Dia de Finados (2 de novembro) - Missa das 7h',
    type: 'special'
  });

  masses.push({
    id: `${allSoulsDay}_10:00`,
    date: allSoulsDay,
    time: '10:00',
    displayText: 'Dia de Finados (2 de novembro) - Missa das 10h',
    type: 'special'
  });

  masses.push({
    id: `${allSoulsDay}_15:00`,
    date: allSoulsDay,
    time: '15:00',
    displayText: 'Dia de Finados (2 de novembro) - Missa das 15h',
    type: 'special'
  });

  return masses;
}

/**
 * Generate December-specific masses (Christmas)
 */
function generateDecemberSpecialMasses(year: number): MassOption[] {
  const masses: MassOption[] = [];

  // December 24 - Christmas Eve (Midnight Mass)
  masses.push({
    id: `${year}-12-24_00:00`,
    date: `${year}-12-24`,
    time: '00:00',
    displayText: 'Missa do Galo (24 de dezembro - 00h)',
    type: 'special'
  });

  // December 25 - Christmas Day
  masses.push({
    id: `${year}-12-25_08:00`,
    date: `${year}-12-25`,
    time: '08:00',
    displayText: 'Natal (25 de dezembro) - Missa das 8h',
    type: 'special'
  });

  masses.push({
    id: `${year}-12-25_10:00`,
    date: `${year}-12-25`,
    time: '10:00',
    displayText: 'Natal (25 de dezembro) - Missa das 10h',
    type: 'special'
  });

  masses.push({
    id: `${year}-12-25_19:00`,
    date: `${year}-12-25`,
    time: '19:00',
    displayText: 'Natal (25 de dezembro) - Missa das 19h',
    type: 'special'
  });

  // December 31 - New Year's Eve
  masses.push({
    id: `${year}-12-31_19:00`,
    date: `${year}-12-31`,
    time: '19:00',
    displayText: 'Réveillon (31 de dezembro) - Missa das 19h',
    type: 'special'
  });

  return masses;
}

/**
 * 🕊️ MAIN FUNCTION: Generate liturgically-aware questionnaire
 */
export function generateLiturgicalQuestionnaire(
  month: number,
  year: number
): LiturgicalQuestionnaire {
  const theme = getLiturgicalTheme(month);

  if (!theme) {
    throw new Error(`No liturgical theme found for month ${month}`);
  }

  // Generate mass options
  const sundayMasses = generateSundayMasses(month, year);
  const specialMasses = generateSpecialMasses(month, year);

  // Add month-specific masses
  if (month === 11) {
    specialMasses.push(...generateNovemberSpecialMasses(year));
  } else if (month === 12) {
    specialMasses.push(...generateDecemberSpecialMasses(year));
  }

  // Build questions
  const questions: QuestionnaireQuestion[] = [];

  // 1. Sunday Masses - Grid format
  questions.push({
    id: 'sunday_masses',
    type: 'checkbox_grid',
    question: `Missas Dominicais - ${theme.name}`,
    description: `Marque os horários em que você pode servir. Tema litúrgico: ${theme.description}`,
    options: sundayMasses.map(mass => ({
      id: mass.id,
      date: mass.date,
      time: mass.time,
      label: mass.displayText
    })),
    required: true,
    section: 'Missas Dominicais'
  });

  // 2. Weekday Masses
  questions.push({
    id: 'weekday_masses',
    type: 'multiselect',
    question: 'Missas Diárias (6h30)',
    description: 'Em quais dias da semana você pode servir nas missas diárias?',
    options: [
      { value: 'monday', label: 'Segunda-feira' },
      { value: 'tuesday', label: 'Terça-feira' },
      { value: 'wednesday', label: 'Quarta-feira' },
      { value: 'thursday', label: 'Quinta-feira' },
      { value: 'friday', label: 'Sexta-feira' }
    ],
    required: false,
    section: 'Missas Diárias'
  });

  // 3. Special Masses
  if (specialMasses.length > 0) {
    questions.push({
      id: 'special_masses',
      type: 'checkbox_list',
      question: 'Missas Especiais do Mês',
      description: 'Marque as missas especiais em que você pode servir',
      options: specialMasses.map(mass => ({
        id: mass.id,
        date: mass.date,
        time: mass.time,
        label: mass.displayText
      })),
      required: false,
      section: 'Missas Especiais'
    });
  }

  // 4. Substitution availability
  questions.push({
    id: 'can_substitute',
    type: 'radio',
    question: 'Disponível para substituições de última hora?',
    description: 'Podemos contar com você para substituir ministros ausentes?',
    options: [
      { value: 'yes', label: 'Sim, disponível para qualquer missa' },
      { value: 'sundays_only', label: 'Apenas para missas dominicais' },
      { value: 'no', label: 'Não posso fazer substituições' }
    ],
    required: true,
    section: 'Disponibilidade'
  });

  return {
    month,
    year,
    theme: {
      name: theme.name,
      color: theme.color,
      colorHex: theme.colorHex,
      description: theme.description
    },
    questions,
    metadata: {
      version: '2.0',
      structure: 'liturgical',
      totalSundays: sundayMasses.length / 3, // 3 times per Sunday
      hasSpecialMasses: specialMasses.length > 0
    }
  };
}

/**
 * 📊 Convert user responses to algorithm-friendly format
 */
export function convertToAlgorithmFormat(
  responses: any,
  month: number,
  year: number
): any {
  const result: any = {
    version: '2.0',
    structure: 'liturgical',
    availability: {},
    preferences: {
      max_per_month: 4, // Default
      preferred_times: [],
      avoid_times: []
    },
    substitute: {
      available: false,
      conditions: 'no'
    },
    metadata: {
      total_availability: 0,
      submitted_at: new Date().toISOString()
    }
  };

  // Parse Sunday masses
  if (responses.sunday_masses) {
    Object.keys(responses.sunday_masses).forEach(massId => {
      if (responses.sunday_masses[massId] === true) {
        result.availability[massId] = true;
        result.metadata.total_availability++;
      }
    });
  }

  // Parse weekday masses
  if (responses.weekday_masses && Array.isArray(responses.weekday_masses)) {
    const weekdayKey = 'weekday_06:30';
    result.availability[weekdayKey] = responses.weekday_masses.map((day: string) => day);
    result.metadata.total_availability += responses.weekday_masses.length;
  }

  // Parse special masses
  if (responses.special_masses) {
    Object.keys(responses.special_masses).forEach(massId => {
      if (responses.special_masses[massId] === true) {
        result.availability[massId] = true;
        result.metadata.total_availability++;
      }
    });
  }

  // Parse substitution
  if (responses.can_substitute) {
    switch (responses.can_substitute) {
      case 'yes':
        result.substitute.available = true;
        result.substitute.conditions = 'any';
        break;
      case 'sundays_only':
        result.substitute.available = true;
        result.substitute.conditions = 'only_sundays';
        break;
      case 'no':
        result.substitute.available = false;
        result.substitute.conditions = 'no';
        break;
    }
  }

  return result;
}

/**
 * 🔍 Check if minister is available for a specific mass
 */
export function isMinisterAvailableForMass(
  questionnaireResponse: any,
  massDate: string,
  massTime: string
): boolean {
  if (!questionnaireResponse || !questionnaireResponse.availability) {
    return false;
  }

  const massKey = `${massDate}_${massTime}`;
  return questionnaireResponse.availability[massKey] === true;
}
