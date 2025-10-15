/**
 * QuestionnaireService - Standardizes ALL questionnaire responses to v2.0 format
 *
 * This service ensures that regardless of input format, all responses are
 * stored in a consistent v2.0 structure with:
 * - ISO 8601 dates (YYYY-MM-DD)
 * - 24-hour times (HH:MM)
 * - Boolean values (not strings)
 * - Structured masses, special_events, weekdays, family objects
 */

interface StandardizedResponse {
  format_version: '2.0';
  masses: {
    [isoDate: string]: {
      [time24h: string]: boolean;
    };
  };
  special_events: {
    saint_judas_novena?: string[];
    saint_judas_feast?: {
      [dateTime: string]: boolean;
    };
    first_friday?: boolean;
    first_saturday?: boolean;
    healing_liberation?: boolean;
  };
  weekdays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
  };
  family?: {
    serve_preference?: 'together' | 'separately' | 'flexible';
    shared_with?: string[];
  };
  can_substitute: boolean;
  notes?: string;
}

interface LegacyResponseItem {
  questionId: string;
  answer: any;
  metadata?: any;
}

export class QuestionnaireService {
  /**
   * Standardize ALL responses to v2.0 format before saving
   */
  static standardizeResponse(rawResponse: any, month?: number, year?: number): StandardizedResponse {
    // If already v2.0 format, validate and return
    if (rawResponse.format_version === '2.0') {
      return this.validateV2Format(rawResponse);
    }

    // Initialize standardized structure
    const standardized: StandardizedResponse = {
      format_version: '2.0',
      masses: {},
      special_events: {},
      weekdays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      },
      family: {},
      can_substitute: false
    };

    // Handle October 2025 legacy format (array)
    if (Array.isArray(rawResponse)) {
      this.parseLegacyArrayFormat(rawResponse, standardized, month, year);
    }
    // Handle possible object format
    else if (typeof rawResponse === 'object') {
      // Check if it's a responses wrapper
      if (rawResponse.responses && Array.isArray(rawResponse.responses)) {
        this.parseLegacyArrayFormat(rawResponse.responses, standardized, month, year);
      } else {
        // Try to parse as direct v2.0-like structure
        Object.assign(standardized, rawResponse);
      }
    }

    return standardized;
  }

  /**
   * Parse legacy array format: [{questionId, answer}, ...]
   */
  private static parseLegacyArrayFormat(
    responses: LegacyResponseItem[],
    standardized: StandardizedResponse,
    month?: number,
    year?: number
  ): void {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    for (const item of responses) {
      const { questionId, answer } = item;

      // Map available_sundays to masses object
      if (questionId === 'available_sundays' && Array.isArray(answer)) {
        this.parseAvailableSundays(answer, standardized, currentYear, currentMonth);
      }

      // Map main_service_time
      if (questionId === 'main_service_time' || questionId === 'primary_mass_time') {
        // Store the preferred time (used when mapping available_sundays)
        (standardized as any)._preferredTime = this.normalizeTime(answer);
      }

      // Map Saint Judas feast day masses (October 28, 2025)
      if (questionId.startsWith('saint_judas_feast_')) {
        const feastDate = this.getSaintJudasFeastDate(currentYear, currentMonth);
        const time = this.extractTimeFromQuestionId(questionId);
        const value = this.normalizeValue(answer);

        if (!standardized.special_events.saint_judas_feast) {
          standardized.special_events.saint_judas_feast = {};
        }
        standardized.special_events.saint_judas_feast[`${feastDate}_${time}`] = value;
      }

      // Map Saint Judas novena
      if (questionId === 'saint_judas_novena') {
        standardized.special_events.saint_judas_novena = this.parseNovenaArray(answer);
      }

      // Map healing/liberation mass (first Thursday)
      if (questionId === 'healing_liberation_mass') {
        standardized.special_events.healing_liberation = this.normalizeValue(answer);
      }

      // Map Sacred Heart mass (first Friday)
      if (questionId === 'sacred_heart_mass') {
        standardized.special_events.first_friday = this.normalizeValue(answer);
      }

      // Map Immaculate Heart mass (first Saturday)
      if (questionId === 'immaculate_heart_mass') {
        standardized.special_events.first_saturday = this.normalizeValue(answer);
      }

      // Map daily mass availability
      if (questionId === 'daily_mass_availability' || questionId === 'daily_mass') {
        this.parseDailyMassAvailability(answer, standardized);
      }

      // Map daily mass days (specific days)
      if (questionId === 'daily_mass_days' && Array.isArray(answer)) {
        this.parseDailyMassDays(answer, standardized);
      }

      // Map substitution availability
      if (questionId === 'can_substitute') {
        standardized.can_substitute = this.normalizeValue(answer);
      }

      // Map notes/observations
      if ((questionId === 'notes' || questionId === 'observations') && typeof answer === 'string') {
        standardized.notes = answer;
      }

      // Map family serve preference
      if (questionId === 'family_serve_preference') {
        if (!standardized.family) standardized.family = {};
        standardized.family.serve_preference = this.normalizeFamilyPreference(answer);
      }
    }

    // Apply preferred time to all available Sunday masses if not already set
    if ((standardized as any)._preferredTime) {
      const preferredTime = (standardized as any)._preferredTime;
      for (const date in standardized.masses) {
        if (!standardized.masses[date][preferredTime]) {
          // If the Sunday is marked available but no time is set, use preferred time
          const hasAnyTime = Object.values(standardized.masses[date]).some(v => v === true);
          if (!hasAnyTime) {
            standardized.masses[date][preferredTime] = true;
          }
        }
      }
      delete (standardized as any)._preferredTime;
    }
  }

  /**
   * Parse available_sundays array like ["Domingo 05/10", "Domingo 12/10"]
   */
  private static parseAvailableSundays(
    sundays: string[],
    standardized: StandardizedResponse,
    year: number,
    month: number
  ): void {
    for (const sunday of sundays) {
      // Extract day from formats like "Domingo 05/10" or "Domingo (12/10) – Description"
      const dayMatch = sunday.match(/(\d{1,2})\/(\d{1,2})/);
      if (dayMatch) {
        const day = dayMatch[1].padStart(2, '0');
        const monthNum = dayMatch[2].padStart(2, '0');
        const isoDate = `${year}-${monthNum}-${day}`;

        if (!standardized.masses[isoDate]) {
          standardized.masses[isoDate] = {};
        }

        // Mark as available (time will be set based on main_service_time later)
        // For now, set a default time or mark all common times as false
        // We'll update with the actual preferred time after parsing all responses
        standardized.masses[isoDate]['08:00'] = false;
        standardized.masses[isoDate]['10:00'] = false;
        standardized.masses[isoDate]['19:00'] = false;
        standardized.masses[isoDate]['19:30'] = false;
      }
    }
  }

  /**
   * Parse novena array like ["Terça 20/10 às 19h30", "Quinta 22/10 às 19h30"]
   */
  private static parseNovenaArray(novenaAnswers: any): string[] {
    if (!Array.isArray(novenaAnswers)) {
      return [];
    }

    // Filter out "Nenhum dia" responses
    const validDays = novenaAnswers.filter(day =>
      typeof day === 'string' &&
      !day.includes('Nenhum dia') &&
      day.trim() !== ''
    );

    return validDays.map(day => {
      // Parse format: "Terça 20/10 às 19h30" → "2025-10-20_19:30"
      const dateMatch = day.match(/(\d{1,2})\/(\d{1,2})/);
      const timeMatch = day.match(/(\d{1,2})h(\d{2})?/);

      if (dateMatch && timeMatch) {
        const dayNum = dateMatch[1].padStart(2, '0');
        const monthNum = dateMatch[2].padStart(2, '0');
        const hour = timeMatch[1].padStart(2, '0');
        const minute = timeMatch[2] || '00';

        // Infer year (assume current year or based on context)
        const year = new Date().getFullYear();
        return `${year}-${monthNum}-${dayNum}_${hour}:${minute}`;
      }

      return day; // Return as-is if can't parse
    });
  }

  /**
   * Parse daily mass availability
   */
  private static parseDailyMassAvailability(answer: any, standardized: StandardizedResponse): void {
    if (!standardized.weekdays) {
      standardized.weekdays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      };
    }

    if (answer === 'Sim' || answer === true) {
      // Available all weekdays
      standardized.weekdays.monday = true;
      standardized.weekdays.tuesday = true;
      standardized.weekdays.wednesday = true;
      standardized.weekdays.thursday = true;
      standardized.weekdays.friday = true;
    } else if (answer === 'Apenas em alguns dias') {
      // Will be filled by daily_mass_days question
      // Don't change anything here
    }
  }

  /**
   * Parse specific daily mass days
   */
  private static parseDailyMassDays(days: string[], standardized: StandardizedResponse): void {
    if (!standardized.weekdays) {
      standardized.weekdays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      };
    }

    const dayMapping: Record<string, keyof typeof standardized.weekdays> = {
      'Segunda': 'monday',
      'Segunda-feira': 'monday',
      'Terça': 'tuesday',
      'Terça-feira': 'tuesday',
      'Quarta': 'wednesday',
      'Quarta-feira': 'wednesday',
      'Quinta': 'thursday',
      'Quinta-feira': 'thursday',
      'Sexta': 'friday',
      'Sexta-feira': 'friday'
    };

    for (const day of days) {
      const normalizedDay = dayMapping[day];
      if (normalizedDay) {
        standardized.weekdays[normalizedDay] = true;
      }
    }
  }

  /**
   * Get Saint Judas feast date (October 28)
   */
  private static getSaintJudasFeastDate(year: number, month: number): string {
    // Saint Judas feast is always October 28
    return `${year}-10-28`;
  }

  /**
   * Extract time from questionId
   */
  private static extractTimeFromQuestionId(questionId: string): string {
    const timeMapping: Record<string, string> = {
      'saint_judas_feast_7h': '07:00',
      'saint_judas_feast_10h': '10:00',
      'saint_judas_feast_12h': '12:00',
      'saint_judas_feast_15h': '15:00',
      'saint_judas_feast_17h': '17:00',
      'saint_judas_feast_evening': '19:30'
    };
    return timeMapping[questionId] || '06:30';
  }

  /**
   * Normalize time format to 24h HH:MM
   */
  private static normalizeTime(time: any): string {
    if (typeof time !== 'string') {
      return '10:00'; // Default
    }

    // Handle formats: "8h", "10h", "19h", "19h30", "8:00", "10:00"
    const match = time.match(/(\d{1,2})(?:h|:)?(\d{2})?/);
    if (match) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2] || '00';
      return `${hour}:${minute}`;
    }

    return time;
  }

  /**
   * Normalize all values to boolean
   */
  static normalizeValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized === 'sim' ||
             normalized === 'yes' ||
             normalized === 'true' ||
             normalized === 's';
    }
    if (Array.isArray(value)) {
      // If array doesn't include "Nenhum dia" and has items, consider true
      return value.length > 0 &&
             !value.some(v =>
               typeof v === 'string' &&
               (v.includes('Nenhum') || v.includes('Não posso'))
             );
    }
    return false;
  }

  /**
   * Normalize family serve preference
   */
  private static normalizeFamilyPreference(value: any): 'together' | 'separately' | 'flexible' {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized.includes('juntos') || normalized === 'together') {
        return 'together';
      }
      if (normalized.includes('separado') || normalized === 'separately') {
        return 'separately';
      }
    }
    return 'flexible';
  }

  /**
   * Validate v2.0 format structure
   */
  private static validateV2Format(response: any): StandardizedResponse {
    // Ensure all required fields exist
    if (!response.masses) response.masses = {};
    if (!response.special_events) response.special_events = {};
    if (!response.weekdays) {
      response.weekdays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      };
    }
    if (typeof response.can_substitute !== 'boolean') {
      response.can_substitute = false;
    }

    return response as StandardizedResponse;
  }

  /**
   * Extract legacy structured data for backward compatibility
   * This maintains compatibility with existing extractQuestionnaireData() expectations
   */
  static extractStructuredData(standardized: StandardizedResponse): {
    availableSundays: string[] | null;
    preferredMassTimes: string[] | null;
    alternativeTimes: string[] | null;
    dailyMassAvailability: string[] | null;
    specialEvents: any;
    canSubstitute: boolean;
    notes: string | null;
  } {
    // 🔥 CRITICAL FIX: Extract available Sundays WITH TIME
    // Format: "2025-10-05 10:00" instead of just "2025-10-05"
    const availableSundays: string[] = [];
    Object.entries(standardized.masses).forEach(([date, times]) => {
      Object.entries(times).forEach(([time, available]) => {
        if (available === true) {
          availableSundays.push(`${date} ${time}`);
        }
      });
    });

    // Extract preferred mass times (times that appear most frequently as true)
    const timeCounts: Record<string, number> = {};
    Object.values(standardized.masses).forEach(massDay => {
      Object.entries(massDay).forEach(([time, available]) => {
        if (available) {
          timeCounts[time] = (timeCounts[time] || 0) + 1;
        }
      });
    });
    const preferredMassTimes = Object.keys(timeCounts).sort((a, b) => timeCounts[b] - timeCounts[a]);

    // Daily mass availability
    const dailyMassAvailability: string[] = [];
    if (standardized.weekdays) {
      const dayMap: Record<string, string> = {
        monday: 'Segunda-feira',
        tuesday: 'Terça-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira'
      };

      Object.entries(standardized.weekdays).forEach(([day, available]) => {
        if (available) {
          dailyMassAvailability.push(dayMap[day as keyof typeof standardized.weekdays]);
        }
      });
    }

    return {
      availableSundays: availableSundays.length > 0 ? availableSundays : null,
      preferredMassTimes: preferredMassTimes.length > 0 ? preferredMassTimes : null,
      alternativeTimes: null, // Not used in v2.0
      dailyMassAvailability: dailyMassAvailability.length > 0 ? dailyMassAvailability : null,
      specialEvents: standardized.special_events,
      canSubstitute: standardized.can_substitute,
      notes: standardized.notes || null
    };
  }
}
