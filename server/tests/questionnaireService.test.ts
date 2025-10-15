/**
 * QuestionnaireService Tests
 *
 * Tests the standardization of questionnaire responses from legacy format to v2.0
 */

import { QuestionnaireService } from '../services/questionnaireService';

describe('QuestionnaireService - Standardization', () => {
  describe('normalizeValue', () => {
    it('should normalize boolean values', () => {
      expect(QuestionnaireService.normalizeValue(true)).toBe(true);
      expect(QuestionnaireService.normalizeValue(false)).toBe(false);
    });

    it('should normalize string values', () => {
      expect(QuestionnaireService.normalizeValue('Sim')).toBe(true);
      expect(QuestionnaireService.normalizeValue('sim')).toBe(true);
      expect(QuestionnaireService.normalizeValue('SIM')).toBe(true);
      expect(QuestionnaireService.normalizeValue('yes')).toBe(true);
      expect(QuestionnaireService.normalizeValue('Yes')).toBe(true);
      expect(QuestionnaireService.normalizeValue('true')).toBe(true);

      expect(QuestionnaireService.normalizeValue('Não')).toBe(false);
      expect(QuestionnaireService.normalizeValue('no')).toBe(false);
      expect(QuestionnaireService.normalizeValue('false')).toBe(false);
    });

    it('should normalize array values', () => {
      expect(QuestionnaireService.normalizeValue(['Domingo 05/10'])).toBe(true);
      expect(QuestionnaireService.normalizeValue(['Terça 20/10'])).toBe(true);
      expect(QuestionnaireService.normalizeValue(['Nenhum dia'])).toBe(false);
      expect(QuestionnaireService.normalizeValue(['Não posso'])).toBe(false);
      expect(QuestionnaireService.normalizeValue([])).toBe(false);
    });
  });

  describe('standardizeResponse - October 2025 Legacy Format', () => {
    it('should standardize available_sundays to masses object', () => {
      const legacyResponse = [
        { questionId: 'available_sundays', answer: ['Domingo 05/10', 'Domingo 12/10'] },
        { questionId: 'main_service_time', answer: '10h' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.format_version).toBe('2.0');
      expect(result.masses['2025-10-05']).toBeDefined();
      expect(result.masses['2025-10-12']).toBeDefined();
      expect(result.masses['2025-10-05']['10:00']).toBe(true);
      expect(result.masses['2025-10-12']['10:00']).toBe(true);
    });

    it('should standardize Saint Judas feast day masses', () => {
      const legacyResponse = [
        { questionId: 'saint_judas_feast_7h', answer: 'Não' },
        { questionId: 'saint_judas_feast_10h', answer: 'Sim' },
        { questionId: 'saint_judas_feast_evening', answer: 'Sim' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.special_events.saint_judas_feast).toBeDefined();
      expect(result.special_events.saint_judas_feast!['2025-10-28_07:00']).toBe(false);
      expect(result.special_events.saint_judas_feast!['2025-10-28_10:00']).toBe(true);
      expect(result.special_events.saint_judas_feast!['2025-10-28_19:30']).toBe(true);
    });

    it('should standardize Saint Judas novena', () => {
      const legacyResponse = [
        {
          questionId: 'saint_judas_novena',
          answer: [
            'Terça 20/10 às 19h30',
            'Quinta 22/10 às 19h30',
            'Terça 27/10 às 19h30'
          ]
        }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.special_events.saint_judas_novena).toBeDefined();
      expect(result.special_events.saint_judas_novena!.length).toBeGreaterThan(0);
      expect(result.special_events.saint_judas_novena).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/2025-10-20_19:30/),
          expect.stringMatching(/2025-10-22_19:30/),
          expect.stringMatching(/2025-10-27_19:30/)
        ])
      );
    });

    it('should filter out "Nenhum dia" from novena', () => {
      const legacyResponse = [
        {
          questionId: 'saint_judas_novena',
          answer: ['Nenhum dia']
        }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.special_events.saint_judas_novena).toEqual([]);
    });

    it('should standardize special event masses', () => {
      const legacyResponse = [
        { questionId: 'healing_liberation_mass', answer: 'Sim' },
        { questionId: 'sacred_heart_mass', answer: 'Não' },
        { questionId: 'immaculate_heart_mass', answer: 'Sim' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.special_events.healing_liberation).toBe(true);
      expect(result.special_events.first_friday).toBe(false);
      expect(result.special_events.first_saturday).toBe(true);
    });

    it('should standardize daily mass availability - all days', () => {
      const legacyResponse = [
        { questionId: 'daily_mass_availability', answer: 'Sim' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.weekdays).toBeDefined();
      expect(result.weekdays!.monday).toBe(true);
      expect(result.weekdays!.tuesday).toBe(true);
      expect(result.weekdays!.wednesday).toBe(true);
      expect(result.weekdays!.thursday).toBe(true);
      expect(result.weekdays!.friday).toBe(true);
    });

    it('should standardize daily mass availability - specific days', () => {
      const legacyResponse = [
        { questionId: 'daily_mass_availability', answer: 'Apenas em alguns dias' },
        { questionId: 'daily_mass_days', answer: ['Segunda-feira', 'Quarta-feira', 'Sexta-feira'] }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.weekdays).toBeDefined();
      expect(result.weekdays!.monday).toBe(true);
      expect(result.weekdays!.tuesday).toBe(false);
      expect(result.weekdays!.wednesday).toBe(true);
      expect(result.weekdays!.thursday).toBe(false);
      expect(result.weekdays!.friday).toBe(true);
    });

    it('should standardize can_substitute flag', () => {
      const legacyResponse = [
        { questionId: 'can_substitute', answer: 'Sim' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.can_substitute).toBe(true);
    });

    it('should standardize notes', () => {
      const legacyResponse = [
        { questionId: 'notes', answer: 'Prefiro servir com minha família' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.notes).toBe('Prefiro servir com minha família');
    });

    it('should handle complete October 2025 response', () => {
      const legacyResponse = [
        { questionId: 'monthly_availability', answer: 'Sim' },
        { questionId: 'main_service_time', answer: '10h' },
        { questionId: 'available_sundays', answer: ['Domingo 05/10', 'Domingo 19/10', 'Domingo 26/10'] },
        { questionId: 'daily_mass_availability', answer: 'Não' },
        { questionId: 'healing_liberation_mass', answer: 'Sim' },
        { questionId: 'sacred_heart_mass', answer: 'Não' },
        { questionId: 'immaculate_heart_mass', answer: 'Sim' },
        { questionId: 'saint_judas_feast_7h', answer: 'Não' },
        { questionId: 'saint_judas_feast_10h', answer: 'Sim' },
        { questionId: 'saint_judas_feast_evening', answer: 'Sim' },
        { questionId: 'saint_judas_novena', answer: ['Terça 20/10 às 19h30', 'Quinta 22/10 às 19h30'] },
        { questionId: 'can_substitute', answer: 'Sim' },
        { questionId: 'notes', answer: 'Disponível para eventos especiais' }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.format_version).toBe('2.0');
      expect(Object.keys(result.masses).length).toBe(3);
      expect(result.masses['2025-10-05']['10:00']).toBe(true);
      expect(result.special_events.saint_judas_feast!['2025-10-28_10:00']).toBe(true);
      expect(result.special_events.saint_judas_novena!.length).toBe(2);
      expect(result.special_events.healing_liberation).toBe(true);
      expect(result.can_substitute).toBe(true);
      expect(result.notes).toBe('Disponível para eventos especiais');
    });
  });

  describe('extractStructuredData', () => {
    it('should extract available Sundays from v2.0 format', () => {
      const v2Response = {
        format_version: '2.0' as const,
        masses: {
          '2025-10-05': { '10:00': true, '19:00': false },
          '2025-10-12': { '10:00': false, '19:00': true }
        },
        special_events: {},
        weekdays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        },
        can_substitute: false
      };

      const result = QuestionnaireService.extractStructuredData(v2Response);

      expect(result.availableSundays).toEqual(['2025-10-05', '2025-10-12']);
    });

    it('should extract preferred mass times from v2.0 format', () => {
      const v2Response = {
        format_version: '2.0' as const,
        masses: {
          '2025-10-05': { '10:00': true, '19:00': false },
          '2025-10-12': { '10:00': true, '19:00': false },
          '2025-10-19': { '10:00': true, '19:00': true }
        },
        special_events: {},
        weekdays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        },
        can_substitute: false
      };

      const result = QuestionnaireService.extractStructuredData(v2Response);

      expect(result.preferredMassTimes).toContain('10:00');
      expect(result.preferredMassTimes![0]).toBe('10:00'); // Most frequent time should be first
    });

    it('should extract daily mass availability', () => {
      const v2Response = {
        format_version: '2.0' as const,
        masses: {},
        special_events: {},
        weekdays: {
          monday: true,
          tuesday: false,
          wednesday: true,
          thursday: false,
          friday: true
        },
        can_substitute: false
      };

      const result = QuestionnaireService.extractStructuredData(v2Response);

      expect(result.dailyMassAvailability).toEqual([
        'Segunda-feira',
        'Quarta-feira',
        'Sexta-feira'
      ]);
    });

    it('should extract special events', () => {
      const v2Response = {
        format_version: '2.0' as const,
        masses: {},
        special_events: {
          healing_liberation: true,
          first_friday: false,
          saint_judas_feast: {
            '2025-10-28_10:00': true
          }
        },
        weekdays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        },
        can_substitute: true
      };

      const result = QuestionnaireService.extractStructuredData(v2Response);

      expect(result.specialEvents).toEqual(v2Response.special_events);
      expect(result.canSubstitute).toBe(true);
    });
  });

  describe('v2.0 format validation', () => {
    it('should accept and validate v2.0 format input', () => {
      const v2Response = {
        format_version: '2.0',
        masses: {
          '2025-10-05': { '10:00': true }
        },
        special_events: {
          healing_liberation: true
        },
        weekdays: {
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        },
        can_substitute: true
      };

      const result = QuestionnaireService.standardizeResponse(v2Response, 10, 2025);

      expect(result.format_version).toBe('2.0');
      expect(result.masses['2025-10-05']['10:00']).toBe(true);
      expect(result.can_substitute).toBe(true);
    });

    it('should add missing fields to v2.0 format', () => {
      const incompleteV2 = {
        format_version: '2.0',
        masses: {}
      };

      const result = QuestionnaireService.standardizeResponse(incompleteV2, 10, 2025);

      expect(result.special_events).toBeDefined();
      expect(result.weekdays).toBeDefined();
      expect(result.can_substitute).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty legacy response', () => {
      const result = QuestionnaireService.standardizeResponse([], 10, 2025);

      expect(result.format_version).toBe('2.0');
      expect(result.masses).toEqual({});
      expect(result.can_substitute).toBe(false);
    });

    it('should handle malformed dates gracefully', () => {
      const legacyResponse = [
        { questionId: 'available_sundays', answer: ['Invalid date', 'Domingo 05/10'] }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      expect(result.masses['2025-10-05']).toBeDefined();
    });

    it('should handle missing time in novena', () => {
      const legacyResponse = [
        {
          questionId: 'saint_judas_novena',
          answer: ['Terça 20/10'] // Missing time
        }
      ];

      const result = QuestionnaireService.standardizeResponse(legacyResponse, 10, 2025);

      // Should still create some entry or handle gracefully
      expect(result.special_events.saint_judas_novena).toBeDefined();
    });
  });
});
