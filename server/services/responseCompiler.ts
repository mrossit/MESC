import { db } from '../db';
import { questionnaireResponses, users, questionnaires } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

/**
 * RESPONSE COMPILER SERVICE
 *
 * Compiles questionnaire responses into a standardized format for schedule generation.
 * Handles multiple response formats (V2.0, V1.0 array, legacy fields) automatically.
 *
 * 🔧 FIX 2026-01: Now supports custom questions (custom_*) by parsing date/time from question text
 */

// ===== TYPES =====

export interface WeekdayAvailability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
}

export interface SpecialEvents {
  saint_judas_novena?: string[];
  saint_judas_feast?: Record<string, boolean>;
  first_friday?: boolean;
  first_saturday?: boolean;
  [key: string]: boolean | string[] | Record<string, boolean> | undefined;
}

export interface DayAvailability {
  date: string;
  times: Record<string, boolean>;  // '07:00' => true/false
}

export interface CompiledAvailability {
  userId: string;
  userName: string;
  month: number;
  year: number;
  availability: {
    dates: Record<string, DayAvailability>;  // '2025-10-28' => horários
    weekdays: WeekdayAvailability;
    specialEvents: SpecialEvents;
  };
  metadata: {
    canSubstitute: boolean;
    preferredPosition?: number;
    familyId?: string;
    familyPreference?: 'together' | 'separate';
    notes?: string;
  };
}

/**
 * Parsed custom question with extracted date/time
 */
export interface ParsedCustomQuestion {
  id: string;
  question: string;
  date: string;      // '2026-01-28'
  time: string;      // '07:00'
  category: string;
}

/**
 * V1 Array format item
 */
interface V1ArrayItem {
  questionId: string;
  answer: unknown;
  question?: string;
}

/**
 * V2 format data structure
 */
interface V2FormatData {
  format_version: '2.0';
  masses?: Record<string, Record<string, boolean>>;
  weekdays?: WeekdayAvailability;
  special_events?: SpecialEvents;
  can_substitute?: boolean;
  notes?: string;
  [key: string]: unknown;
}

/**
 * Legacy format response
 */
interface LegacyFormatResponse {
  responses?: unknown;
  availableSundays?: string[];
  dailyMassAvailability?: string[];
  canSubstitute?: boolean;
  notes?: string;
  [key: string]: unknown;
}

// ===== MAIN SERVICE =====

export class ResponseCompiler {

  /**
   * Compila TODAS as respostas de um mês em formato estruturado
   */
  static async compileMonthlyResponses(
    month: number,
    year: number
  ): Promise<Map<string, CompiledAvailability>> {

    console.log(`📚 Compilando respostas para ${month}/${year}...`);

    // 1. Buscar o questionário para o mês/ano
    const questionnaire = await db.select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.month, month),
          eq(questionnaires.year, year)
        )
      )
      .limit(1);

    if (questionnaire.length === 0) {
      console.warn(`⚠️  Nenhum questionário encontrado para ${month}/${year}`);
      return new Map();
    }

    const questionnaireId = questionnaire[0].id;
    const questionnaireQuestions = questionnaire[0].questions;
    console.log(`   Questionário ID: ${questionnaireId}`);

    // 🔧 FIX: Parse custom questions from questionnaire to extract date/time
    const customQuestions = this.parseCustomQuestions(questionnaireQuestions, year);
    if (customQuestions.length > 0) {
      console.log(`   📌 Encontradas ${customQuestions.length} perguntas customizadas:`);
      customQuestions.forEach(q => {
        console.log(`      - ${q.id}: ${q.date} às ${q.time}`);
      });
    }

    // 2. Buscar todas as respostas do banco
    const responses = await db.select()
      .from(questionnaireResponses)
      .leftJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaireId),
          isNotNull(questionnaireResponses.responses)
        )
      );

    console.log(`   Encontradas ${responses.length} respostas`);

    const compiled = new Map<string, CompiledAvailability>();

    // 3. Processar cada resposta
    for (const row of responses) {
      try {
        const compiledData = this.compileUserResponse(
          row.questionnaire_responses,
          row.users,
          month,
          year,
          customQuestions  // 🔧 FIX: Pass custom questions for processing
        );

        compiled.set(compiledData.userId, compiledData);

      } catch (error) {
        console.error(`❌ Erro ao compilar resposta de ${row.users?.name}:`, error);
      }
    }

    console.log(`✅ Compiladas ${compiled.size} respostas`);
    return compiled;
  }

  /**
   * 🔧 FIX: Parse ALL questions with date/time from questionnaire
   *
   * Extracts date and time from ANY question text that contains them, like:
   * - "Você pode servir na Missa em honra à São Judas Tadeu - quarta feira, dia 28/01/2026 às 7h ?"
   * - "Você pode servir sexta-feira dia 28/11/2025 às 15h - Missa votiva..."
   *
   * Works with ANY category: custom, special_event, special, etc.
   * Works with ANY ID format: custom_*, special_event_*, etc.
   */
  private static parseCustomQuestions(questions: unknown, year: number): ParsedCustomQuestion[] {
    const parsed: ParsedCustomQuestion[] = [];

    if (!questions || !Array.isArray(questions)) {
      return parsed;
    }

    interface QuestionItem {
      id?: string;
      question?: string;
      category?: string;
    }

    // Categories that may contain specific date/time questions
    const relevantCategories = ['custom', 'special_event', 'special'];

    for (const item of questions) {
      const q = item as QuestionItem;
      const category = q.category || '';

      // Skip regular/daily categories - they don't have specific dates
      if (category === 'regular' || category === 'daily') {
        continue;
      }

      // Process if it's a relevant category OR if ID suggests it's special
      const isRelevantCategory = relevantCategories.includes(category);
      const isSpecialId = q.id?.startsWith('custom_') || q.id?.startsWith('special_event');

      if (!isRelevantCategory && !isSpecialId) {
        continue;
      }

      const questionText = q.question || '';

      // Try to extract date: "dia 28/01/2026" or "28/01/2026" or "28/01" or "dia 28/11"
      const dateMatch = questionText.match(/(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i);

      // Try to extract time: "às 7h", "às 15h", "às 19h30", "às 19:30", "ás 15h"
      const timeMatch = questionText.match(/(?:às|as|ás)\s*(\d{1,2})(?:h|:)(\d{0,2})?/i);

      if (dateMatch && timeMatch && q.id) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const extractedYear = dateMatch[3] || year.toString();

        const hour = timeMatch[1].padStart(2, '0');
        const minute = (timeMatch[2] || '00').padStart(2, '0');

        parsed.push({
          id: q.id,
          question: questionText,
          date: `${extractedYear}-${month}-${day}`,
          time: `${hour}:${minute}`,
          category: category
        });

        console.log(`      📅 Parsed: ${q.id} -> ${extractedYear}-${month}-${day} às ${hour}:${minute}`);
      }
    }

    return parsed;
  }

  /**
   * Compila resposta individual detectando formato automaticamente
   */
  private static compileUserResponse(
    response: { responses: unknown },
    user: { id: string; name: string; preferredPosition?: number; familyId?: string },
    month: number,
    year: number,
    customQuestions: ParsedCustomQuestion[] = []  // 🔧 FIX: Accept custom questions
  ): CompiledAvailability {

    const rawData = typeof response.responses === 'string'
      ? JSON.parse(response.responses)
      : response.responses;

    // Detectar formato
    const format = this.detectFormat(rawData);
    console.log(`  📝 Processando ${user.name} - Formato: ${format}`);

    let compiled: CompiledAvailability = {
      userId: user.id,
      userName: user.name,
      month,
      year,
      availability: {
        dates: {},
        weekdays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        },
        specialEvents: {}
      },
      metadata: {
        canSubstitute: false,
        preferredPosition: user.preferredPosition,
        familyId: user.familyId
      }
    };

    // Processar baseado no formato
    switch (format) {
      case 'V2_STANDARD':
        compiled = this.processV2Format(rawData as V2FormatData, compiled);
        break;

      case 'V1_ARRAY':
        compiled = this.processV1ArrayFormat(rawData as V1ArrayItem[], compiled, month, year);
        break;

      case 'LEGACY_FIELDS':
        compiled = this.processLegacyFormat(response as LegacyFormatResponse, compiled, month, year);
        break;

      default:
        console.warn(`  ⚠️ Formato desconhecido para ${user.name}`);
    }

    // 🔧 FIX: Process custom questions from responses and special_events fields
    if (customQuestions.length > 0) {
      compiled = this.processCustomQuestions(rawData, response, compiled, customQuestions, user.name);
    }

    return compiled;
  }

  /**
   * 🔧 FIX DEFINITIVO: Process custom questions responses
   *
   * HISTÓRICO DE BUGS:
   * - Bug recorrente: código não encontrava respostas de eventos customizados
   * - Causa: não procurava em rawData.special_events (formato V2.0)
   *
   * LOCAIS ONDE AS RESPOSTAS PODEM ESTAR:
   * 1. rawData.special_events[questionId] - FORMATO V2.0 (principal!)
   * 2. rawData[questionId] - acesso direto (legacy)
   * 3. Array format: [{questionId, answer}] - V1.0
   */
  private static processCustomQuestions(
    rawData: unknown,
    fullResponse: { responses: unknown },
    base: CompiledAvailability,
    customQuestions: ParsedCustomQuestion[],
    userName: string
  ): CompiledAvailability {

    let processedCount = 0;
    let notFoundCount = 0;
    const rawDataObj = rawData as Record<string, unknown> | null;

    for (const customQ of customQuestions) {
      let answer: unknown = null;
      let foundIn: string = '';

      // ========================================
      // FORMATO V2.0 - VERIFICAR PRIMEIRO!
      // As respostas estão em rawData.special_events
      // ========================================
      if (rawDataObj && typeof rawDataObj === 'object' && !Array.isArray(rawDataObj)) {
        // 1. PRINCIPAL: Procurar em special_events (onde V2.0 salva custom events)
        const specialEvents = rawDataObj.special_events as Record<string, unknown> | undefined;
        if (specialEvents && typeof specialEvents === 'object') {
          const seValue = specialEvents[customQ.id];
          if (seValue !== null && seValue !== undefined) {
            answer = seValue;
            foundIn = 'rawData.special_events';
          }
        }

        // 2. Fallback: acesso direto no rawData (caso legado)
        if (answer === null || answer === undefined) {
          const directValue = rawDataObj[customQ.id];
          if (directValue !== null && directValue !== undefined) {
            answer = directValue;
            foundIn = 'rawData (direct)';
          }
        }
      }

      // ========================================
      // FORMATO V1.0 ARRAY - [{questionId, answer}]
      // ========================================
      if ((answer === null || answer === undefined) && Array.isArray(rawData)) {
        const found = rawData.find((item: V1ArrayItem) => item.questionId === customQ.id);
        if (found) {
          answer = found.answer;
          foundIn = 'rawData array';
        }
      }

      // ========================================
      // PROCESSAR RESPOSTA ENCONTRADA
      // ========================================
      if (answer !== null && answer !== undefined) {
        const isAvailable = this.parseAnswer(answer);

        // Add to availability dates
        if (!base.availability.dates[customQ.date]) {
          base.availability.dates[customQ.date] = {
            date: customQ.date,
            times: {}
          };
        }

        base.availability.dates[customQ.date].times[customQ.time] = isAvailable;

        if (isAvailable) {
          processedCount++;
          console.log(`      ✓ Custom: ${customQ.date} às ${customQ.time} = Sim (${foundIn})`);
        }
      } else {
        notFoundCount++;
        console.log(`      ⚠️ Custom: ${customQ.id} - resposta não encontrada`);
      }
    }

    if (processedCount > 0) {
      console.log(`    ✅ ${userName}: ${processedCount} disponibilidades em perguntas customizadas`);
    }
    if (notFoundCount > 0) {
      console.log(`    ⚠️ ${userName}: ${notFoundCount} perguntas customizadas sem resposta`);
    }

    return base;
  }

  /**
   * 🔧 FIX: Parse answer to boolean
   */
  private static parseAnswer(answer: unknown): boolean {
    if (typeof answer === 'boolean') {
      return answer;
    }
    if (typeof answer === 'string') {
      const normalized = answer.toLowerCase().trim();
      return normalized === 'sim' || normalized === 'yes' || normalized === 'true';
    }
    return false;
  }

  // ===== FORMAT PROCESSORS =====

  /**
   * Processa formato V2.0 (padrão novo)
   * Format: { format_version: '2.0', masses: { '2025-10-28': { '07:00': true } } }
   */
  private static processV2Format(data: V2FormatData, base: CompiledAvailability): CompiledAvailability {
    console.log(`    🔄 Processando formato V2.0`);

    // Processar missas regulares
    if (data.masses) {
      for (const [date, times] of Object.entries(data.masses)) {
        base.availability.dates[date] = {
          date,
          times: times as Record<string, boolean>
        };
      }
      console.log(`    ✅ V2: ${Object.keys(data.masses).length} datas de missas`);
    }

    // Processar dias da semana
    if (data.weekdays) {
      base.availability.weekdays = data.weekdays;
      const enabledDays = Object.entries(data.weekdays)
        .filter(([_, enabled]) => enabled)
        .map(([day, _]) => day);
      console.log(`    ✅ V2: Dias da semana: ${enabledDays.join(', ')}`);
    }

    // Processar eventos especiais
    if (data.special_events) {
      base.availability.specialEvents = data.special_events;
      console.log(`    ✅ V2: Eventos especiais processados`);
    }

    // Metadados
    base.metadata.canSubstitute = data.can_substitute || false;
    base.metadata.notes = data.notes;

    return base;
  }

  /**
   * Processa formato V1.0 Array (outubro 2025)
   * Format: [{questionId: 'saint_judas_feast_7h', answer: 'Sim'}]
   */
  private static processV1ArrayFormat(
    data: V1ArrayItem[],
    base: CompiledAvailability,
    month: number,
    year: number
  ): CompiledAvailability {

    console.log(`    🔄 Processando formato V1.0 Array`);
    let processedCount = 0;

    // PRIMEIRA PASSADA: Verificar disponibilidade geral no mês
    let hasMonthlyAvailability = true; // Default: assume que tem disponibilidade
    for (const item of data) {
      if (item.questionId === 'monthly_availability') {
        hasMonthlyAvailability = (item.answer === 'Sim');
        if (!hasMonthlyAvailability) {
          console.log(`      ⚠️  Ministro SEM disponibilidade regular no mês`);
          console.log(`      → Processando apenas disponibilidades ESPECÍFICAS (novena, festas, eventos)`);
        }
        break;
      }
    }

    // SEGUNDA PASSADA: Detectar horário principal (main_service_time)
    let mainServiceTime = '10:00'; // Default
    for (const item of data) {
      if (item.questionId === 'main_service_time' && item.answer) {
        const timeMap: Record<string, string> = {
          '8h': '08:00',
          '10h': '10:00',
          '19h': '19:00'
        };
        const answerKey = typeof item.answer === 'string' ? item.answer : '';
        mainServiceTime = timeMap[answerKey] || '10:00';
        console.log(`      📌 Horário principal detectado: ${mainServiceTime}`);
        break;
      }
    }

    // TERCEIRA PASSADA: Processar disponibilidades
    for (const item of data) {
      const { questionId, answer } = item;

      // Processar dia 28/10 - Festa de São Judas
      if (questionId?.startsWith('saint_judas_feast_')) {
        const timeMap: Record<string, string> = {
          'saint_judas_feast_7h': '07:00',
          'saint_judas_feast_10h': '10:00',
          'saint_judas_feast_12h': '12:00',
          'saint_judas_feast_15h': '15:00',
          'saint_judas_feast_17h': '17:00',
          'saint_judas_feast_evening': '19:30'
        };

        const time = timeMap[questionId];
        if (time) {
          const date = `${year}-${month.toString().padStart(2, '0')}-28`;

          if (!base.availability.dates[date]) {
            base.availability.dates[date] = { date, times: {} };
          }

          base.availability.dates[date].times[time] = (answer === 'Sim');
          if (answer === 'Sim') {
            processedCount++;
            console.log(`      ✓ Festa São Judas: ${date} às ${time}`);
          }
        }
      }

      // Processar domingos disponíveis (SÓ SE TEM DISPONIBILIDADE GERAL NO MÊS)
      else if (questionId === 'available_sundays' && Array.isArray(answer) && hasMonthlyAvailability) {
        for (const sunday of answer) {
          const parsed = this.parseSundayString(sunday, month, year, mainServiceTime);
          if (parsed) {
            const { date, time } = parsed;

            if (!base.availability.dates[date]) {
              base.availability.dates[date] = { date, times: {} };
            }

            base.availability.dates[date].times[time] = true;
            processedCount++;
            console.log(`      ✓ Domingo: ${date} às ${time}`);
          }
        }
      }

      // Processar missas diárias (SÓ SE TEM DISPONIBILIDADE GERAL NO MÊS)
      else if (questionId === 'daily_mass_availability' && hasMonthlyAvailability) {
        if (answer === 'Sim') {
          // Disponível todos os dias
          Object.keys(base.availability.weekdays).forEach(day => {
            base.availability.weekdays[day as keyof WeekdayAvailability] = true;
          });
          console.log(`      ✓ Disponível para missas diárias: todos os dias`);
          processedCount++;
        } else if (Array.isArray(answer)) {
          // Dias específicos
          for (const day of answer) {
            if (day.includes('Segunda')) base.availability.weekdays.monday = true;
            if (day.includes('Terça')) base.availability.weekdays.tuesday = true;
            if (day.includes('Quarta')) base.availability.weekdays.wednesday = true;
            if (day.includes('Quinta')) base.availability.weekdays.thursday = true;
            if (day.includes('Sexta')) base.availability.weekdays.friday = true;
          }
          console.log(`      ✓ Disponível para missas diárias: ${answer.join(', ')}`);
          processedCount++;
        }
      }

      // Processar novena (19-27/10)
      else if (questionId === 'saint_judas_novena' && Array.isArray(answer)) {
        for (const novenaDay of answer) {
          if (novenaDay === 'Nenhum dia') continue;

          const parsed = this.parseNovenaString(novenaDay, year);
          if (parsed) {
            const { date, time } = parsed;

            if (!base.availability.dates[date]) {
              base.availability.dates[date] = { date, times: {} };
            }

            base.availability.dates[date].times[time] = true;
            processedCount++;
            console.log(`      ✓ Novena: ${date} às ${time}`);
          }
        }
      }

      // Metadados
      else if (questionId === 'can_substitute') {
        base.metadata.canSubstitute = answer === 'Sim';
      }

      else if (questionId === 'notes') {
        base.metadata.notes = typeof answer === 'string' ? answer : undefined;
      }
    }

    console.log(`    ✅ V1 Array: ${processedCount} disponibilidades processadas`);
    return base;
  }

  /**
   * Processa formato Legacy (campos diretos)
   */
  private static processLegacyFormat(
    response: LegacyFormatResponse,
    base: CompiledAvailability,
    month: number,
    year: number
  ): CompiledAvailability {

    console.log(`    🔄 Processando formato Legacy`);

    // Processar campos diretos
    if (response.availableSundays && Array.isArray(response.availableSundays)) {
      for (const sunday of response.availableSundays) {
        // Tentar converter formato legado
        const parsed = this.parseSundayString(sunday, month, year);
        if (parsed) {
          const { date, time } = parsed;

          if (!base.availability.dates[date]) {
            base.availability.dates[date] = { date, times: {} };
          }

          base.availability.dates[date].times[time] = true;
        }
      }
    }

    if (response.dailyMassAvailability && Array.isArray(response.dailyMassAvailability)) {
      for (const day of response.dailyMassAvailability) {
        if (day.includes('Segunda')) base.availability.weekdays.monday = true;
        if (day.includes('Terça')) base.availability.weekdays.tuesday = true;
        if (day.includes('Quarta')) base.availability.weekdays.wednesday = true;
        if (day.includes('Quinta')) base.availability.weekdays.thursday = true;
        if (day.includes('Sexta')) base.availability.weekdays.friday = true;
      }
    }

    base.metadata.canSubstitute = response.canSubstitute || false;
    base.metadata.notes = response.notes;

    console.log(`    ✅ Legacy: Processamento concluído`);
    return base;
  }

  // ===== HELPERS =====

  /**
   * Detecta o formato dos dados
   */
  private static detectFormat(data: unknown): string {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.format_version === '2.0') return 'V2_STANDARD';
      if (dataObj.available_sundays || dataObj.daily_mass_availability) return 'LEGACY_FIELDS';
    }
    if (Array.isArray(data)) return 'V1_ARRAY';
    return 'UNKNOWN';
  }

  /**
   * Parse string de domingo: "Domingo 05/10" => { date: '2025-10-05', time: mainServiceTime }
   */
  private static parseSundayString(sunday: string, month: number, year: number, mainServiceTime: string = '10:00') {
    const match = sunday.match(/(\d{1,2})\/(\d{2})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      return {
        date: `${year}-${month.toString().padStart(2, '0')}-${day}`,
        time: mainServiceTime // Usa o horário principal informado pelo ministro
      };
    }
    return null;
  }

  /**
   * Parse string de novena: "Segunda 20/10 às 19h30" => { date: '2025-10-20', time: '19:30' }
   */
  private static parseNovenaString(novenaStr: string, year: number) {
    const match = novenaStr.match(/(\d{1,2})\/(\d{2}).*?(\d{1,2})h(\d{2})?/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2];
      const hour = match[3].padStart(2, '0');
      const minute = match[4] || '30';

      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`
      };
    }
    return null;
  }
}
