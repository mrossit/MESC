/**
 * Questionnaire Parser
 *
 * Unified parser for questionnaire responses that handles both v1 (legacy array)
 * and v2 (object with format_version) formats.
 */

interface ParsedAvailability {
  masses: Record<string, Record<string, boolean>>;
  weekdays: Record<string, boolean>;
  specialEvents: Record<string, boolean>;
  canSubstitute: boolean;
  notes?: string;
}

export class QuestionnaireParser {
  /**
   * Parse responses regardless of format (v1 array or v2 object)
   */
  static parseMinisterAvailability(
    response: unknown,
    month: number,
    year: number
  ): ParsedAvailability {
    const parsed: ParsedAvailability = {
      masses: {},
      weekdays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      },
      specialEvents: {},
      canSubstitute: false
    };

    // Handle V2 format (object with format_version)
    const responseObj = response as Record<string, unknown> | null | undefined;
    if (responseObj?.format_version === '2.0') {
      const result: ParsedAvailability = {
        masses: (responseObj.masses as Record<string, Record<string, boolean>>) || {},
        weekdays: (responseObj.weekdays as Record<string, boolean>) || parsed.weekdays,
        specialEvents: (responseObj.special_events as Record<string, boolean>) || {},
        canSubstitute: Boolean(responseObj.can_substitute) || false,
        notes: responseObj.notes as string | undefined
      };

      // Handle substitute_only: minister declined regular and alternative availability
      // but is still eligible as substitute
      if (responseObj.substitute_only === true) {
        result.canSubstitute = true;
      }

      return result;
    }

    // V1 item type
    type V1ResponseItem = { questionId?: string; answer?: unknown };

    // Handle V1 format (array of {questionId, answer})
    if (Array.isArray(response)) {
      const responseArray = response as V1ResponseItem[];

      // First pass: detect alternative availability flow
      const altAvailability = responseArray.find(r => r.questionId === 'alternative_availability');
      const isSubstituteOnly = altAvailability?.answer === 'Não';
      const hasAlternativeAvailability = altAvailability?.answer === 'Sim';

      // If substitute-only, set canSubstitute and skip regular availability processing
      if (isSubstituteOnly) {
        parsed.canSubstitute = true;
      }

      responseArray.forEach(item => {
        // Parse October 28 responses
        if (item.questionId?.startsWith('saint_judas_feast_')) {
          const timeMap: Record<string, string> = {
            'saint_judas_feast_7h': '07:00',
            'saint_judas_feast_10h': '10:00',
            'saint_judas_feast_12h': '12:00',
            'saint_judas_feast_15h': '15:00',
            'saint_judas_feast_17h': '17:00',
            'saint_judas_feast_evening': '19:30'
          };

          const time = timeMap[item.questionId];
          if (time) {
            if (!parsed.masses['2025-10-28']) {
              parsed.masses['2025-10-28'] = {};
            }
            parsed.masses['2025-10-28'][time] = item.answer === 'Sim';
          }
        }

        // Parse Sunday availability
        if (item.questionId === 'available_sundays' && Array.isArray(item.answer)) {
          item.answer.forEach((sunday: string) => {
            const dateMatch = sunday.match(/(\d{1,2})\/(\d{2})/);
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const date = `${year}-${month.toString().padStart(2, '0')}-${day}`;
              if (!parsed.masses[date]) {
                parsed.masses[date] = {};
              }
              // Use main_service_time if available
              const mainTime = responseArray.find((r: V1ResponseItem) => r.questionId === 'main_service_time')?.answer;
              if (mainTime && typeof mainTime === 'string') {
                const normalizedTime = this.normalizeTime(mainTime);
                parsed.masses[date][normalizedTime] = true;
              }
            }
          });
        }

        // Parse alternative Sundays (Q1=Não, Q2=Sim flow)
        if (item.questionId === 'alternative_sundays' && Array.isArray(item.answer) && hasAlternativeAvailability) {
          // Find alternative time selection
          const altTimesItem = responseArray.find(r => r.questionId === 'alternative_times');
          let altTime = '10:00'; // Default
          // New format: direct array ["8h", "10h"]
          if (Array.isArray(altTimesItem?.answer) && altTimesItem.answer.length > 0) {
            altTime = this.normalizeTime(altTimesItem.answer[0] as string);
          }
          // Legacy format: { answer: "Sim", selectedOptions: ["8h", ...] }
          else if (altTimesItem?.answer && typeof altTimesItem.answer === 'object' && !Array.isArray(altTimesItem.answer)) {
            const answerObj = altTimesItem.answer as Record<string, unknown>;
            if (Array.isArray(answerObj.selectedOptions) && answerObj.selectedOptions.length > 0) {
              altTime = this.normalizeTime(answerObj.selectedOptions[0] as string);
            }
          }

          item.answer.forEach((sunday: string) => {
            if (sunday === 'Nenhum domingo') return;
            const dateMatch = sunday.match(/(\d{1,2})\/(\d{2})/);
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const date = `${year}-${month.toString().padStart(2, '0')}-${day}`;
              if (!parsed.masses[date]) {
                parsed.masses[date] = {};
              }
              parsed.masses[date][altTime] = true;
            }
          });
        }

        // Parse weekday availability
        if (item.questionId === 'daily_mass_availability') {
          if (item.answer === 'Sim') {
            // All weekdays available
            Object.keys(parsed.weekdays).forEach(day => {
              parsed.weekdays[day as keyof typeof parsed.weekdays] = true;
            });
          } else if (Array.isArray(item.answer)) {
            // Specific days selected
            item.answer.forEach((day: string) => {
              if (day.includes('Segunda')) parsed.weekdays.monday = true;
              if (day.includes('Terça')) parsed.weekdays.tuesday = true;
              if (day.includes('Quarta')) parsed.weekdays.wednesday = true;
              if (day.includes('Quinta')) parsed.weekdays.thursday = true;
              if (day.includes('Sexta')) parsed.weekdays.friday = true;
            });
          }
        }

        // Parse special events
        if (item.questionId === 'healing_liberation_mass') {
          parsed.specialEvents.first_thursday = item.answer === 'Sim';
        }
        if (item.questionId === 'sacred_heart_mass') {
          parsed.specialEvents.first_friday = item.answer === 'Sim';
        }
        if (item.questionId === 'immaculate_heart_mass') {
          parsed.specialEvents.first_saturday = item.answer === 'Sim';
        }

        // Parse substitution availability
        if (item.questionId === 'can_substitute') {
          parsed.canSubstitute = item.answer === 'Sim';
        }

        // Parse notes
        if (item.questionId === 'notes' && item.answer && typeof item.answer === 'string') {
          parsed.notes = item.answer;
        }
      });

      // Ensure substitute-only ministers retain canSubstitute even if can_substitute question wasn't answered
      if (isSubstituteOnly) {
        parsed.canSubstitute = true;
      }
    }

    return parsed;
  }

  private static normalizeTime(time: string): string {
    // Convert "10h" to "10:00", etc.
    if (time.includes('h')) {
      const parts = time.split('h');
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1] ? parts[1].padStart(2, '0') : '00';
      return `${hours}:${minutes}`;
    }
    // Already in "HH:MM" format
    if (time.match(/^\d{1,2}:\d{2}$/)) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    // Default
    return '10:00';
  }
}
