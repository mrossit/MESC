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
    response: any,
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
    if (response?.format_version === '2.0') {
      return {
        masses: response.masses || {},
        weekdays: response.weekdays || parsed.weekdays,
        specialEvents: response.special_events || {},
        canSubstitute: response.can_substitute || false,
        notes: response.notes
      };
    }

    // Handle V1 format (array of {questionId, answer})
    if (Array.isArray(response)) {
      response.forEach(item => {
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
              const mainTime = response.find((r: any) => r.questionId === 'main_service_time')?.answer;
              if (mainTime) {
                const normalizedTime = this.normalizeTime(mainTime);
                parsed.masses[date][normalizedTime] = true;
              }
            }
          });
        }

        // Parse weekday availability
        if (item.questionId === 'daily_mass_availability') {
          if (item.answer === 'Sim') {
            // All weekdays available
            Object.keys(parsed.weekdays).forEach(day => {
              (parsed.weekdays as any)[day] = true;
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
        if (item.questionId === 'notes' && item.answer) {
          parsed.notes = item.answer;
        }
      });
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
