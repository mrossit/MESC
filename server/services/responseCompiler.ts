import { db } from '../db';
import { questionnaireResponses, users, questionnaires } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

/**
 * RESPONSE COMPILER SERVICE
 *
 * Compiles questionnaire responses into a standardized format for schedule generation.
 * Handles multiple response formats (V2.0, V1.0 array, legacy fields) automatically.
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
  [key: string]: any;
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
    console.log(`   Questionário ID: ${questionnaireId}`);

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
          year
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
   * Compila resposta individual detectando formato automaticamente
   */
  private static compileUserResponse(
    response: any,
    user: any,
    month: number,
    year: number
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
        compiled = this.processV2Format(rawData, compiled);
        break;

      case 'V1_ARRAY':
        compiled = this.processV1ArrayFormat(rawData, compiled, month, year);
        break;

      case 'LEGACY_FIELDS':
        compiled = this.processLegacyFormat(response, compiled, month, year);
        break;

      default:
        console.warn(`  ⚠️ Formato desconhecido para ${user.name}`);
    }

    return compiled;
  }

  // ===== FORMAT PROCESSORS =====

  /**
   * Processa formato V2.0 (padrão novo)
   * Format: { format_version: '2.0', masses: { '2025-10-28': { '07:00': true } } }
   */
  private static processV2Format(data: any, base: CompiledAvailability): CompiledAvailability {
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
    data: any[],
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
        mainServiceTime = timeMap[item.answer] || '10:00';
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
        base.metadata.notes = answer;
      }
    }

    console.log(`    ✅ V1 Array: ${processedCount} disponibilidades processadas`);
    return base;
  }

  /**
   * Processa formato Legacy (campos diretos)
   */
  private static processLegacyFormat(
    response: any,
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
  private static detectFormat(data: any): string {
    if (data.format_version === '2.0') return 'V2_STANDARD';
    if (Array.isArray(data)) return 'V1_ARRAY';
    if (data.available_sundays || data.daily_mass_availability) return 'LEGACY_FIELDS';
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
