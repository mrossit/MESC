/**
 * QUESTIONNAIRE DATA CONTRACT TESTS
 *
 * Tests for questionnaire response validation, parsing, and conversion.
 * See: /docs/QUESTIONNAIRE_DATA_CONTRACT.md
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validateQuestionnaireResponse,
  validateLegacyResponse,
  detectResponseVersion,
  validateAnyFormat,
  createEmptyV2Response,
  convertLegacyDateToISO,
  convertLegacyTimeTo24h,
  validateISODate,
  validate24HourTime,
  validateDateTimeKey,
  type QuestionnaireResponseV2
} from '../../shared/validators/questionnaireValidator';
import { ResponseParser } from '../utils/responseParser';

describe('Questionnaire Data Contract v2.0', () => {
  describe('Format Validation', () => {
    it('should validate correct V2.0 format', () => {
      const validResponse: QuestionnaireResponseV2 = {
        version: '2.0',
        questionnaire_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440001',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': {
              '08:00': false,
              '10:00': true,
              '19:00': true
            }
          },
          special_events: {
            saint_judas_novena: [
              '2025-10-20_19:30',
              '2025-10-21_19:30'
            ]
          },
          weekdays: {
            monday: false,
            tuesday: true,
            wednesday: true,
            thursday: false,
            friday: true
          },
          can_substitute: true
        }
      };

      expect(() => validateQuestionnaireResponse(validResponse)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidResponse = {
        version: '2.0',
        questionnaire_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440001',
        responses: {
          format_version: '2.0',
          masses: {
            '05/10/2025': { // WRONG FORMAT
              '08:00': true
            }
          },
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

      expect(() => validateQuestionnaireResponse(invalidResponse)).toThrow();
    });

    it('should reject invalid time format', () => {
      const invalidResponse = {
        version: '2.0',
        questionnaire_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440001',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': {
              '8h': true // WRONG FORMAT
            }
          },
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

      expect(() => validateQuestionnaireResponse(invalidResponse)).toThrow();
    });

    it('should reject invalid novena datetime format', () => {
      const invalidResponse = {
        version: '2.0',
        questionnaire_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440001',
        responses: {
          format_version: '2.0',
          special_events: {
            saint_judas_novena: [
              'Terça 20/10 às 19h30' // WRONG FORMAT
            ]
          },
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

      expect(() => validateQuestionnaireResponse(invalidResponse)).toThrow();
    });
  });

  describe('Version Detection', () => {
    it('should detect V2.0 format', () => {
      const v2Response = {
        version: '2.0',
        responses: {
          format_version: '2.0'
        }
      };

      expect(detectResponseVersion(v2Response)).toBe('2.0');
    });

    it('should detect V1.0 legacy format', () => {
      const v1Response = {
        responses: [
          { questionId: 'available_sundays', answer: ['Domingo 05/10'] }
        ]
      };

      expect(detectResponseVersion(v1Response)).toBe('1.0');
    });

    it('should detect unknown format', () => {
      const unknownResponse = {
        random: 'data'
      };

      expect(detectResponseVersion(unknownResponse)).toBe('unknown');
    });
  });

  describe('Response Parsing', () => {
    it('should parse V2.0 format correctly', () => {
      const v2Response = {
        version: '2.0',
        questionnaire_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440001',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': {
              '08:00': false,
              '10:00': true,
              '19:00': false
            }
          },
          special_events: {
            saint_judas_novena: [
              '2025-10-20_19:30',
              '2025-10-21_19:30'
            ]
          },
          weekdays: {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false
          },
          can_substitute: true
        }
      };

      const parsed = ResponseParser.parseResponse(v2Response);

      expect(parsed['2025-10-05_10:00']).toBe(true);
      expect(parsed['2025-10-05_08:00']).toBeUndefined();
      expect(parsed['2025-10-20_19:30']).toBe(true);
      expect(parsed['2025-10-21_19:30']).toBe(true);
    });

    it('should parse V1.0 legacy format with conversion', () => {
      const v1Response = {
        questionnaire_id: 'oct-2025',
        user_id: 'minister-123',
        responses: [
          {
            questionId: 'saint_judas_novena',
            answer: ['Terça 20/10 às 19h30', 'Quinta 22/10 às 19h30']
          },
          {
            questionId: 'available_sundays',
            answer: ['Domingo 05/10', 'Domingo 12/10']
          },
          {
            questionId: 'main_service_time',
            answer: '10h'
          }
        ]
      };

      const parsed = ResponseParser.parseResponse(v1Response, 2025, 10);

      // Check novena conversions
      expect(parsed['2025-10-20_19:30']).toBe(true);
      expect(parsed['2025-10-22_19:30']).toBe(true);

      // Check Sunday conversions
      expect(parsed['2025-10-05_08:00']).toBe(true);
      expect(parsed['2025-10-05_10:00']).toBe(true);
      expect(parsed['2025-10-05_19:00']).toBe(true);
    });
  });

  describe('Legacy Conversion', () => {
    it('should convert legacy date to ISO', () => {
      expect(convertLegacyDateToISO('Domingo 05/10', 2025, 10)).toBe('2025-10-05');
      expect(convertLegacyDateToISO('05/10', 2025, 10)).toBe('2025-10-05');
      expect(convertLegacyDateToISO('Domingo 12/10', 2025, 10)).toBe('2025-10-12');
    });

    it('should convert legacy time to 24h', () => {
      expect(convertLegacyTimeTo24h('8h')).toBe('08:00');
      expect(convertLegacyTimeTo24h('10h')).toBe('10:00');
      expect(convertLegacyTimeTo24h('19h')).toBe('19:00');
      expect(convertLegacyTimeTo24h('19h30')).toBe('19:30');
    });

    it('should convert full legacy response to V2.0', () => {
      const legacyResponse = {
        questionnaire_id: 'oct-2025',
        user_id: 'minister-123',
        responses: [
          {
            questionId: 'saint_judas_novena',
            answer: ['Terça 20/10 às 19h30', 'Quinta 22/10 às 19h30']
          },
          {
            questionId: 'available_sundays',
            answer: ['Domingo 05/10']
          },
          {
            questionId: 'main_service_time',
            answer: '10h'
          },
          {
            questionId: 'can_substitute',
            answer: 'Sim'
          }
        ]
      };

      const converted = ResponseParser.convertLegacyToV2(legacyResponse, 2025, 10);

      expect(converted).not.toBeNull();
      expect(converted?.version).toBe('2.0');
      expect(converted?.responses.format_version).toBe('2.0');
      expect(converted?.responses.can_substitute).toBe(true);
      expect(converted?.responses.special_events?.saint_judas_novena).toContain('2025-10-20_19:30');
      expect(converted?.responses.masses?.['2025-10-05']?.['10:00']).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should validate ISO dates', () => {
      expect(validateISODate('2025-10-05')).toBe(true);
      expect(validateISODate('2025-10-31')).toBe(true);
      expect(validateISODate('05/10/2025')).toBe(false);
      expect(validateISODate('2025-10-5')).toBe(false);
    });

    it('should validate 24h times', () => {
      expect(validate24HourTime('08:00')).toBe(true);
      expect(validate24HourTime('19:30')).toBe(true);
      expect(validate24HourTime('23:59')).toBe(true);
      expect(validate24HourTime('8h')).toBe(false);
      expect(validate24HourTime('19h30')).toBe(false);
    });

    it('should validate datetime keys', () => {
      expect(validateDateTimeKey('2025-10-20_19:30')).toBe(true);
      expect(validateDateTimeKey('2025-10-28_07:00')).toBe(true);
      expect(validateDateTimeKey('Terça 20/10 às 19h30')).toBe(false);
      expect(validateDateTimeKey('2025-10-20 19:30')).toBe(false);
    });

    it('should create empty V2 response template', () => {
      const empty = createEmptyV2Response('quest-id', 'user-id');

      expect(empty.version).toBe('2.0');
      expect(empty.questionnaire_id).toBe('quest-id');
      expect(empty.user_id).toBe('user-id');
      expect(empty.responses.format_version).toBe('2.0');
      expect(empty.responses.can_substitute).toBe(false);
    });
  });

  describe('Format Detection with Auto-Validation', () => {
    it('should auto-validate V2.0 format', () => {
      const v2Response = {
        version: '2.0',
        questionnaire_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440001',
        responses: {
          format_version: '2.0',
          masses: {},
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

      const result = validateAnyFormat(v2Response);

      expect(result.version).toBe('2.0');
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should auto-validate V1.0 legacy format', () => {
      const v1Response = {
        questionnaire_id: 'oct-2025',
        user_id: 'minister-123',
        responses: [
          { questionId: 'available_sundays', answer: ['Domingo 05/10'] }
        ]
      };

      const result = validateAnyFormat(v1Response);

      expect(result.version).toBe('1.0');
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid formats', () => {
      const invalidResponse = {
        random: 'data',
        invalid: true
      };

      const result = validateAnyFormat(invalidResponse);

      expect(result.version).toBe('unknown');
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
