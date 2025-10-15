import { z } from 'zod';

/**
 * QUESTIONNAIRE RESPONSE DATA CONTRACT v2.0
 *
 * This schema enforces strict validation for questionnaire responses.
 * See: /docs/QUESTIONNAIRE_DATA_CONTRACT.md
 */

// Date-time format: YYYY-MM-DD_HH:MM
const dateTimeKeySchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/,
  'DateTime must be in format YYYY-MM-DD_HH:MM (e.g., 2025-10-20_19:30)'
);

// ISO Date format: YYYY-MM-DD
const isoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in ISO format YYYY-MM-DD (e.g., 2025-10-05)'
);

// 24-hour time format: HH:MM
const time24Schema = z.string().regex(
  /^\d{2}:\d{2}$/,
  'Time must be in 24h format HH:MM (e.g., 08:00, 19:30)'
);

/**
 * V2.0 Response Schema (STRICT)
 */
export const QuestionnaireResponseV2Schema = z.object({
  // Metadata
  version: z.literal('2.0'),
  questionnaire_id: z.string().uuid('Questionnaire ID must be a valid UUID'),
  user_id: z.string().uuid('User ID must be a valid UUID'),

  // Response data
  responses: z.object({
    format_version: z.literal('2.0'),

    // Sunday masses: { "2025-10-05": { "08:00": true, "10:00": false, "19:00": true } }
    masses: z.record(
      isoDateSchema,
      z.record(time24Schema, z.boolean())
    ).optional(),

    // Special events
    special_events: z.object({
      // Novena: ["2025-10-20_19:30", "2025-10-21_19:30"]
      saint_judas_novena: z.array(dateTimeKeySchema).optional(),

      // Feast day masses: { "2025-10-28_07:00": true, "2025-10-28_10:00": false }
      saint_judas_feast: z.record(dateTimeKeySchema, z.boolean()).optional(),

      // Monthly special masses
      first_friday: z.boolean().optional(),
      first_saturday: z.boolean().optional(),
      healing_liberation: z.boolean().optional(),
    }).optional(),

    // Weekday availability (daily masses 6:30)
    weekdays: z.object({
      monday: z.boolean(),
      tuesday: z.boolean(),
      wednesday: z.boolean(),
      thursday: z.boolean(),
      friday: z.boolean()
    }).optional(),

    // Substitution availability
    can_substitute: z.boolean(),

    // Family preferences
    family_serve_preference: z.enum(['together', 'separate', 'flexible']).optional(),

    // Optional notes
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional()
  }),

  // Timestamps
  submitted_at: z.date().optional(),
  updated_at: z.date().optional()
});

/**
 * Legacy V1.0 Response Schema (for backward compatibility)
 */
export const QuestionnaireResponseV1Schema = z.object({
  questionnaire_id: z.string(),
  user_id: z.string(),
  responses: z.array(z.object({
    questionId: z.string(),
    answer: z.union([
      z.string(),
      z.array(z.string()),
      z.boolean(),
      z.object({}).passthrough()
    ])
  }))
});

/**
 * Parsed availability map for algorithm consumption
 */
export interface ParsedAvailability {
  [dateTimeKey: string]: boolean; // "2025-10-20_19:30": true
}

/**
 * Validate questionnaire response (with version detection)
 */
export function validateQuestionnaireResponse(data: unknown): z.infer<typeof QuestionnaireResponseV2Schema> {
  try {
    // Try V2.0 first (current standard)
    return QuestionnaireResponseV2Schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation failed for V2.0 format:', error.errors);

      // Format user-friendly error message
      const errorDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        issue: err.message,
        received: err.code === 'invalid_type' ? `type ${(err as any).received}` : 'invalid value'
      }));

      throw new Error(
        `Invalid questionnaire response format:\n${
          errorDetails.map(e => `  - ${e.field}: ${e.issue} (got: ${e.received})`).join('\n')
        }\n\nSee /docs/QUESTIONNAIRE_DATA_CONTRACT.md for correct format.`
      );
    }
    throw error;
  }
}

/**
 * Validate legacy format (V1.0) - for backward compatibility
 */
export function validateLegacyResponse(data: unknown): z.infer<typeof QuestionnaireResponseV1Schema> {
  try {
    return QuestionnaireResponseV1Schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation failed for legacy V1.0 format:', error.errors);
      throw new Error('Invalid legacy questionnaire response format');
    }
    throw error;
  }
}

/**
 * Auto-detect response format version
 */
export function detectResponseVersion(data: any): '2.0' | '1.0' | 'unknown' {
  // Check for explicit version field
  if (data.version === '2.0' || data.responses?.format_version === '2.0') {
    return '2.0';
  }

  // Check for V1.0 structure (array of question-answer pairs)
  if (Array.isArray(data.responses) && data.responses.length > 0) {
    if (data.responses[0].questionId && 'answer' in data.responses[0]) {
      return '1.0';
    }
  }

  // Check for legacy direct field access
  if (data.availableSundays || data.preferredMassTimes) {
    return '1.0';
  }

  return 'unknown';
}

/**
 * Validate any response format (auto-detect version)
 */
export function validateAnyFormat(data: unknown): {
  version: '2.0' | '1.0' | 'unknown';
  data: any;
  isValid: boolean;
  errors?: string[];
} {
  const version = detectResponseVersion(data);

  try {
    switch (version) {
      case '2.0':
        return {
          version: '2.0',
          data: validateQuestionnaireResponse(data),
          isValid: true
        };

      case '1.0':
        return {
          version: '1.0',
          data: validateLegacyResponse(data),
          isValid: true
        };

      default:
        return {
          version: 'unknown',
          data: null,
          isValid: false,
          errors: ['Could not detect valid response format']
        };
    }
  } catch (error) {
    return {
      version,
      data: null,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
}

/**
 * Type exports
 */
export type QuestionnaireResponseV2 = z.infer<typeof QuestionnaireResponseV2Schema>;
export type QuestionnaireResponseV1 = z.infer<typeof QuestionnaireResponseV1Schema>;

/**
 * Helper: Create empty V2.0 response template
 */
export function createEmptyV2Response(questionnaireId: string, userId: string): QuestionnaireResponseV2 {
  return {
    version: '2.0',
    questionnaire_id: questionnaireId,
    user_id: userId,
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
}

/**
 * Helper: Validate date format (ISO 8601)
 */
export function validateISODate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Helper: Validate time format (24h)
 */
export function validate24HourTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

/**
 * Helper: Validate datetime key format
 */
export function validateDateTimeKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/.test(key);
}

/**
 * Helper: Convert legacy date to ISO format
 * Examples:
 *   "Domingo 05/10" → "2025-10-05"
 *   "05/10" → "2025-10-05"
 */
export function convertLegacyDateToISO(legacyDate: string, year: number, month: number): string | null {
  // Extract day from patterns like "Domingo 05/10" or "05/10"
  const dayMatch = legacyDate.match(/(\d{1,2})\/(\d{1,2})/);

  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    const extractedMonth = parseInt(dayMatch[2]);

    // Validate month matches
    if (extractedMonth === month) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Helper: Convert legacy time to 24h format
 * Examples:
 *   "8h" → "08:00"
 *   "19h" → "19:00"
 *   "19h30" → "19:30"
 */
export function convertLegacyTimeTo24h(legacyTime: string): string | null {
  // Match patterns like "8h", "19h", "19h30"
  const timeMatch = legacyTime.match(/(\d{1,2})h(\d{2})?/);

  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return null;
}
