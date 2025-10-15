import {
  detectResponseVersion,
  validateQuestionnaireResponse,
  validateLegacyResponse,
  convertLegacyDateToISO,
  convertLegacyTimeTo24h,
  type ParsedAvailability,
  type QuestionnaireResponseV2,
  type QuestionnaireResponseV1
} from '../../shared/validators/questionnaireValidator';
import { logger } from './logger';

/**
 * RESPONSE PARSER
 *
 * Handles parsing of questionnaire responses in multiple formats:
 * - V2.0: Current standard with ISO dates and 24h times
 * - V1.0: Legacy format with text dates and "Xh" times
 * - Auto: Automatic format detection and conversion
 */
export class ResponseParser {
  /**
   * Main entry point: Parse any response format
   */
  static parseResponse(response: any, year?: number, month?: number): ParsedAvailability {
    const version = detectResponseVersion(response);

    console.log(`[RESPONSE_PARSER] Detected format version: ${version}`);

    switch (version) {
      case '2.0':
        return this.parseV2(response);

      case '1.0':
        if (!year || !month) {
          logger.warn('Legacy format detected but year/month not provided for conversion');
          return this.parseV1Legacy(response);
        }
        return this.parseV1LegacyWithConversion(response, year, month);

      default:
        logger.warn('Unknown response format, attempting auto-parse');
        return this.parseAuto(response, year, month);
    }
  }

  /**
   * Parse V2.0 format (current standard)
   */
  static parseV2(response: any): ParsedAvailability {
    console.log('[RESPONSE_PARSER] Using V2.0 parser');

    const availability: ParsedAvailability = {};

    try {
      // Validate structure
      const validated = validateQuestionnaireResponse(response);
      const data = validated.responses;

      // Parse regular Sunday masses
      // Format: { "2025-10-05": { "08:00": true, "10:00": false } }
      if (data.masses) {
        Object.entries(data.masses).forEach(([date, times]) => {
          Object.entries(times).forEach(([time, isAvailable]) => {
            if (isAvailable) {
              const key = `${date}_${time}`;
              availability[key] = true;
              console.log(`[RESPONSE_PARSER V2] ✅ Sunday mass: ${key}`);
            }
          });
        });
      }

      // Parse special events
      if (data.special_events) {
        // Novena: ["2025-10-20_19:30", "2025-10-21_19:30"]
        if (Array.isArray(data.special_events.saint_judas_novena)) {
          data.special_events.saint_judas_novena.forEach(datetime => {
            availability[datetime] = true;
            console.log(`[RESPONSE_PARSER V2] ✅ Novena: ${datetime}`);
          });
        }

        // Feast day masses: { "2025-10-28_07:00": true }
        if (data.special_events.saint_judas_feast) {
          Object.entries(data.special_events.saint_judas_feast).forEach(([datetime, isAvailable]) => {
            if (isAvailable) {
              availability[datetime] = true;
              console.log(`[RESPONSE_PARSER V2] ✅ Feast: ${datetime}`);
            }
          });
        }

        // First Friday/Saturday (need to calculate specific date)
        if (data.special_events.first_friday) {
          // Will be matched by mass type, not date
          console.log(`[RESPONSE_PARSER V2] ✅ First Friday marked available`);
        }

        if (data.special_events.first_saturday) {
          console.log(`[RESPONSE_PARSER V2] ✅ First Saturday marked available`);
        }
      }

      // Parse weekday availability
      if (data.weekdays) {
        // Weekdays will be matched by day of week, not specific date
        const availableDays = Object.entries(data.weekdays)
          .filter(([_, isAvailable]) => isAvailable)
          .map(([day, _]) => day);

        console.log(`[RESPONSE_PARSER V2] ✅ Weekdays available: ${availableDays.join(', ')}`);
      }

      console.log(`[RESPONSE_PARSER V2] Total parsed: ${Object.keys(availability).length} date-times`);
      return availability;

    } catch (error) {
      logger.error('Failed to parse V2.0 response:', error);
      return {};
    }
  }

  /**
   * Parse V1.0 legacy format (October 2025 current format)
   */
  static parseV1Legacy(response: any): ParsedAvailability {
    console.log('[RESPONSE_PARSER] Using V1.0 legacy parser (basic)');

    const availability: ParsedAvailability = {};

    try {
      let responsesArray = response.responses;

      // Handle string-encoded JSON
      if (typeof responsesArray === 'string') {
        responsesArray = JSON.parse(responsesArray);
      }

      if (!Array.isArray(responsesArray)) {
        logger.warn('Legacy response is not an array format');
        return availability;
      }

      // Process each question-answer pair
      responsesArray.forEach((item: any) => {
        // Novena responses
        if (item.questionId === 'saint_judas_novena' && Array.isArray(item.answer)) {
          item.answer.forEach((dateStr: string) => {
            // Store with original text format for now
            // Will be converted when year/month provided
            availability[`legacy_novena_${dateStr}`] = true;
            console.log(`[RESPONSE_PARSER V1] Legacy novena: ${dateStr}`);
          });
        }

        // Sunday availability
        if (item.questionId === 'available_sundays' && Array.isArray(item.answer)) {
          item.answer.forEach((dateStr: string) => {
            availability[`legacy_sunday_${dateStr}`] = true;
            console.log(`[RESPONSE_PARSER V1] Legacy Sunday: ${dateStr}`);
          });
        }

        // Preferred times
        if (item.questionId === 'main_service_time') {
          availability[`legacy_preferred_${item.answer}`] = true;
          console.log(`[RESPONSE_PARSER V1] Legacy preferred time: ${item.answer}`);
        }
      });

      return availability;

    } catch (error) {
      logger.error('Failed to parse V1.0 legacy response:', error);
      return {};
    }
  }

  /**
   * Parse V1.0 format WITH conversion to V2.0 keys
   */
  static parseV1LegacyWithConversion(response: any, year: number, month: number): ParsedAvailability {
    console.log(`[RESPONSE_PARSER] Using V1.0 parser WITH conversion (${month}/${year})`);

    const availability: ParsedAvailability = {};

    try {
      let responsesArray = response.responses;

      // Handle string-encoded JSON
      if (typeof responsesArray === 'string') {
        responsesArray = JSON.parse(responsesArray);
      }

      if (!Array.isArray(responsesArray)) {
        return this.parseV1Legacy(response);
      }

      // Process each question-answer pair
      responsesArray.forEach((item: any) => {
        switch (item.questionId) {
          case 'saint_judas_novena':
            if (Array.isArray(item.answer)) {
              item.answer.forEach((legacyStr: string) => {
                // Parse "Terça 20/10 às 19h30" → "2025-10-20_19:30"
                const converted = this.convertLegacyNovenaString(legacyStr, year, month);
                if (converted) {
                  availability[converted] = true;
                  console.log(`[RESPONSE_PARSER V1→V2] ✅ Novena: "${legacyStr}" → ${converted}`);
                } else {
                  console.warn(`[RESPONSE_PARSER V1→V2] ⚠️ Failed to convert: "${legacyStr}"`);
                }
              });
            }
            break;

          case 'available_sundays':
            if (Array.isArray(item.answer)) {
              item.answer.forEach((legacyStr: string) => {
                // Parse "Domingo 05/10" → "2025-10-05"
                const date = convertLegacyDateToISO(legacyStr, year, month);
                if (date) {
                  // Mark availability for all Sunday times (will be filtered by preferred time)
                  ['08:00', '10:00', '19:00'].forEach(time => {
                    availability[`${date}_${time}`] = true;
                  });
                  console.log(`[RESPONSE_PARSER V1→V2] ✅ Sunday: "${legacyStr}" → ${date}`);
                }
              });
            }
            break;

          case 'main_service_time':
            // Store for reference but already handled in available_sundays
            console.log(`[RESPONSE_PARSER V1→V2] Preferred time: ${item.answer}`);
            break;

          case 'can_substitute':
            // This doesn't map to date-time availability
            console.log(`[RESPONSE_PARSER V1→V2] Can substitute: ${item.answer}`);
            break;
        }
      });

      console.log(`[RESPONSE_PARSER V1→V2] Total converted: ${Object.keys(availability).length} date-times`);
      return availability;

    } catch (error) {
      logger.error('Failed to parse and convert V1.0 response:', error);
      return {};
    }
  }

  /**
   * Auto-parse unknown format
   */
  static parseAuto(response: any, year?: number, month?: number): ParsedAvailability {
    console.log('[RESPONSE_PARSER] Attempting auto-parse');

    // Try direct field access (very old format)
    if (response.availableSundays || response.preferredMassTimes) {
      console.log('[RESPONSE_PARSER] Detected very old direct-field format');
      return {}; // Too old to support
    }

    // Try V1 as last resort
    return this.parseV1Legacy(response);
  }

  /**
   * Helper: Convert legacy novena string to V2.0 format
   * Input: "Terça 20/10 às 19h30"
   * Output: "2025-10-20_19:30"
   */
  private static convertLegacyNovenaString(legacyStr: string, year: number, month: number): string | null {
    // Extract date: "20/10"
    const dateMatch = legacyStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (!dateMatch) return null;

    const day = parseInt(dateMatch[1]);
    const extractedMonth = parseInt(dateMatch[2]);

    // Validate month
    if (extractedMonth !== month) {
      console.warn(`Month mismatch: expected ${month}, got ${extractedMonth}`);
      return null;
    }

    // Extract time: "19h30" or "19h"
    const timeMatch = legacyStr.match(/(\d{1,2})h(\d{2})?/);
    if (!timeMatch) return null;

    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    // Format as ISO date + 24h time
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const time24h = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    return `${isoDate}_${time24h}`;
  }

  /**
   * Convert legacy response to V2.0 format
   */
  static convertLegacyToV2(
    legacyResponse: any,
    year: number,
    month: number
  ): QuestionnaireResponseV2 | null {
    console.log('[RESPONSE_PARSER] Converting legacy to V2.0 format');

    try {
      const validated = validateLegacyResponse(legacyResponse);

      // Create V2.0 structure
      const v2Response: QuestionnaireResponseV2 = {
        version: '2.0',
        questionnaire_id: validated.questionnaire_id,
        user_id: validated.user_id,
        responses: {
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
          can_substitute: false
        }
      };

      // Convert each response
      validated.responses.forEach((item: any) => {
        switch (item.questionId) {
          case 'saint_judas_novena':
            if (Array.isArray(item.answer) && item.answer[0] !== 'Nenhum dia') {
              v2Response.responses.special_events!.saint_judas_novena = item.answer
                .map(str => this.convertLegacyNovenaString(str, year, month))
                .filter((x): x is string => x !== null);
            }
            break;

          case 'available_sundays':
            if (Array.isArray(item.answer)) {
              item.answer.forEach((legacyStr: string) => {
                const date = convertLegacyDateToISO(legacyStr, year, month);
                if (date) {
                  v2Response.responses.masses![date] = {
                    '08:00': false,
                    '10:00': false,
                    '19:00': false
                  };
                }
              });
            }
            break;

          case 'main_service_time':
            const time24h = convertLegacyTimeTo24h(item.answer);
            if (time24h && v2Response.responses.masses) {
              // Mark preferred time as true for all selected Sundays
              Object.keys(v2Response.responses.masses).forEach(date => {
                if (v2Response.responses.masses![date]) {
                  v2Response.responses.masses![date][time24h] = true;
                }
              });
            }
            break;

          case 'can_substitute':
            v2Response.responses.can_substitute = item.answer === 'Sim' || item.answer === true;
            break;
        }
      });

      console.log('[RESPONSE_PARSER] ✅ Successfully converted to V2.0');
      return v2Response;

    } catch (error) {
      logger.error('Failed to convert legacy response to V2.0:', error);
      return null;
    }
  }
}
