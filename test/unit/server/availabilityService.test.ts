/**
 * Availability Service Tests
 *
 * Tests for the AvailabilityService which provides query methods
 * for compiled minister availability data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AvailabilityService } from '../../../server/services/availabilityService';
import type { CompiledAvailability } from '../../../server/services/responseCompiler';

// Mock console.log to suppress output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});

// Helper to create test availability data
function createTestAvailability(
  userId: string,
  userName: string,
  options: Partial<{
    dates: Record<string, { times: Record<string, boolean> }>;
    weekdays: Record<string, boolean>;
    canSubstitute: boolean;
    familyId: string;
    familyPreference: 'together' | 'separate';
  }> = {}
): CompiledAvailability {
  return {
    userId,
    userName,
    month: 1,
    year: 2026,
    availability: {
      dates: options.dates || {},
      weekdays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        ...options.weekdays,
      },
      specialEvents: {
        christmas: false,
        newYear: false,
        holyWeek: false,
        patronSaint: false,
      },
    },
    metadata: {
      canSubstitute: options.canSubstitute || false,
      familyId: options.familyId,
      familyPreference: options.familyPreference,
    },
  };
}

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let testData: Map<string, CompiledAvailability>;

  beforeEach(() => {
    testData = new Map();
  });

  describe('Constructor and Basic Queries', () => {
    it('should create service with empty data', () => {
      service = new AvailabilityService(testData);
      expect(service.hasData()).toBe(false);
      expect(service.getTotalMinisters()).toBe(0);
    });

    it('should create service with minister data', () => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva'));
      testData.set('user-2', createTestAvailability('user-2', 'Maria Santos'));

      service = new AvailabilityService(testData);

      expect(service.hasData()).toBe(true);
      expect(service.getTotalMinisters()).toBe(2);
    });

    it('should return minister name', () => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva'));
      service = new AvailabilityService(testData);

      expect(service.getMinisterName('user-1')).toBe('João Silva');
      expect(service.getMinisterName('nonexistent')).toBeUndefined();
    });

    it('should return minister availability data', () => {
      const availability = createTestAvailability('user-1', 'João Silva', {
        canSubstitute: true,
      });
      testData.set('user-1', availability);
      service = new AvailabilityService(testData);

      const result = service.getMinisterAvailability('user-1');
      expect(result).toEqual(availability);
      expect(service.getMinisterAvailability('nonexistent')).toBeUndefined();
    });
  });

  describe('Availability Checking', () => {
    beforeEach(() => {
      // Minister 1: Available on specific dates
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        dates: {
          '2026-01-25': { times: { '08:00': true, '10:00': true, '18:00': false } },
          '2026-01-26': { times: { '07:00': true, '09:00': true } },
        },
        weekdays: { monday: true, wednesday: true },
        canSubstitute: true,
      }));

      // Minister 2: Available only weekdays
      testData.set('user-2', createTestAvailability('user-2', 'Maria Santos', {
        weekdays: { tuesday: true, thursday: true, friday: true },
        canSubstitute: false,
      }));

      // Minister 3: Limited availability
      testData.set('user-3', createTestAvailability('user-3', 'Pedro Costa', {
        dates: {
          '2026-01-25': { times: { '08:00': true } },
        },
        canSubstitute: true,
      }));

      service = new AvailabilityService(testData);
    });

    it('should check if minister is available for specific date/time', () => {
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '08:00')).toBe(true);
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '10:00')).toBe(true);
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '18:00')).toBe(false);
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '12:00')).toBe(false);
    });

    it('should handle time format normalization', () => {
      // With seconds
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '08:00:00')).toBe(true);
      // Without seconds
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '08:00')).toBe(true);
    });

    it('should return false for nonexistent minister', () => {
      expect(service.isMinisterAvailable('nonexistent', '2026-01-25', '08:00')).toBe(false);
    });

    it('should check weekday availability for daily masses', () => {
      // Monday (2026-01-26 is a Monday) at 06:30 (daily mass time)
      // user-1 has Monday availability
      expect(service.isMinisterAvailable('user-1', '2026-01-27', '06:30')).toBe(false); // Tuesday

      // user-2 has Tuesday and Thursday availability
      expect(service.isMinisterAvailable('user-2', '2026-01-27', '06:30')).toBe(true); // Tuesday
    });

    it('should get available ministers for mass', () => {
      const available = service.getAvailableMinistersForMass('2026-01-25', '08:00');

      expect(available).toContain('user-1');
      expect(available).toContain('user-3');
      expect(available).not.toContain('user-2');
      expect(available.length).toBe(2);
    });

    it('should return empty array when no ministers available', () => {
      const available = service.getAvailableMinistersForMass('2026-01-25', '12:00');
      expect(available).toEqual([]);
    });
  });

  describe('Substitution Eligibility', () => {
    beforeEach(() => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        dates: { '2026-01-25': { times: { '08:00': true } } },
        canSubstitute: true,
      }));
      testData.set('user-2', createTestAvailability('user-2', 'Maria Santos', {
        dates: { '2026-01-25': { times: { '08:00': true } } },
        canSubstitute: false,
      }));
      testData.set('user-3', createTestAvailability('user-3', 'Pedro Costa', {
        dates: { '2026-01-25': { times: { '10:00': true } } },
        canSubstitute: true,
      }));

      service = new AvailabilityService(testData);
    });

    it('should get substitute eligible ministers', () => {
      const eligible = service.getSubstituteEligibleMinisters();

      expect(eligible).toContain('user-1');
      expect(eligible).toContain('user-3');
      expect(eligible).not.toContain('user-2');
      expect(eligible.length).toBe(2);
    });

    it('should get available substitutes for date/time', () => {
      // 08:00 - user-1 and user-2 are available, but only user-1 can substitute
      const substitutes = service.getAvailableSubstitutes('2026-01-25', '08:00');

      expect(substitutes).toContain('user-1');
      expect(substitutes).not.toContain('user-2');
      expect(substitutes).not.toContain('user-3');
      expect(substitutes.length).toBe(1);
    });

    it('should return empty array when no substitutes available', () => {
      const substitutes = service.getAvailableSubstitutes('2026-01-25', '12:00');
      expect(substitutes).toEqual([]);
    });
  });

  describe('Family Functions', () => {
    beforeEach(() => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        familyId: 'family-1',
        familyPreference: 'together',
      }));
      testData.set('user-2', createTestAvailability('user-2', 'Maria Silva', {
        familyId: 'family-1',
        familyPreference: 'together',
      }));
      testData.set('user-3', createTestAvailability('user-3', 'Pedro Costa', {
        familyId: 'family-2',
        familyPreference: 'separate',
      }));
      testData.set('user-4', createTestAvailability('user-4', 'Ana Santos'));

      service = new AvailabilityService(testData);
    });

    it('should get family members', () => {
      const familyMembers = service.getFamilyMembers('user-1');

      expect(familyMembers).toContain('user-2');
      expect(familyMembers).not.toContain('user-1'); // Self
      expect(familyMembers).not.toContain('user-3'); // Different family
      expect(familyMembers).not.toContain('user-4'); // No family
      expect(familyMembers.length).toBe(1);
    });

    it('should return empty array for minister without family', () => {
      const familyMembers = service.getFamilyMembers('user-4');
      expect(familyMembers).toEqual([]);
    });

    it('should check if minister should serve with family', () => {
      expect(service.shouldServeWithFamily('user-1')).toBe(true);
      expect(service.shouldServeWithFamily('user-2')).toBe(true);
      expect(service.shouldServeWithFamily('user-3')).toBe(false); // separate preference
      expect(service.shouldServeWithFamily('user-4')).toBe(false); // no family
    });
  });

  describe('Date and Time Queries', () => {
    beforeEach(() => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        dates: {
          '2026-01-25': { times: { '08:00': true, '10:00': true, '18:00': false } },
          '2026-01-26': { times: { '07:00': true } },
          '2026-01-28': { times: { '08:00': true, '09:00': true } },
        },
      }));

      service = new AvailabilityService(testData);
    });

    it('should get minister available dates', () => {
      const dates = service.getMinisterAvailableDates('user-1');

      expect(dates).toContain('2026-01-25');
      expect(dates).toContain('2026-01-26');
      expect(dates).toContain('2026-01-28');
      expect(dates.length).toBe(3);
    });

    it('should return empty array for nonexistent minister dates', () => {
      const dates = service.getMinisterAvailableDates('nonexistent');
      expect(dates).toEqual([]);
    });

    it('should get minister available times for date', () => {
      const times = service.getMinisterAvailableTimes('user-1', '2026-01-25');

      expect(times).toContain('08:00');
      expect(times).toContain('10:00');
      expect(times).not.toContain('18:00'); // marked as false
      expect(times.length).toBe(2);
    });

    it('should return empty array for date without availability', () => {
      const times = service.getMinisterAvailableTimes('user-1', '2026-01-30');
      expect(times).toEqual([]);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        dates: {
          '2026-01-25': { times: { '08:00': true, '10:00': true } },
          '2026-01-26': { times: { '07:00': true } },
        },
        weekdays: { monday: true },
        canSubstitute: true,
        familyId: 'family-1',
      }));
      testData.set('user-2', createTestAvailability('user-2', 'Maria Santos', {
        dates: {
          '2026-01-25': { times: { '08:00': true } },
        },
        canSubstitute: false,
      }));
      testData.set('user-3', createTestAvailability('user-3', 'Pedro Costa', {
        weekdays: { tuesday: true, wednesday: true },
        canSubstitute: true,
        familyId: 'family-1',
      }));

      service = new AvailabilityService(testData);
    });

    it('should calculate availability stats for mass', () => {
      const stats = service.getAvailabilityStats('2026-01-25', '08:00');

      expect(stats.total).toBe(3);
      expect(stats.available).toBe(2); // user-1 and user-2
      expect(stats.percentage).toBe(67); // 2/3 * 100 rounded
      expect(stats.ministers.length).toBe(2);
    });

    it('should calculate monthly stats', () => {
      const stats = service.getMonthlyStats();

      expect(stats.totalMinisters).toBe(3);
      expect(stats.totalAvailabilities).toBe(4); // 3 from user-1, 1 from user-2
      expect(stats.avgAvailabilitiesPerMinister).toBe(1); // 4/3 rounded
      expect(stats.ministersWithWeekdayAvailability).toBe(2); // user-1 and user-3
      expect(stats.ministersCanSubstitute).toBe(2); // user-1 and user-3
      expect(stats.ministersWithFamily).toBe(2); // user-1 and user-3
    });

    it('should handle empty data for stats', () => {
      service = new AvailabilityService(new Map());
      const stats = service.getMonthlyStats();

      expect(stats.totalMinisters).toBe(0);
      expect(stats.totalAvailabilities).toBe(0);
      expect(stats.avgAvailabilitiesPerMinister).toBe(0);
      expect(stats.percentageWeekdayAvailable).toBe(0);
    });
  });

  describe('getAllMinisters', () => {
    it('should return all ministers with summary', () => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        dates: {
          '2026-01-25': { times: { '08:00': true, '10:00': true } },
        },
        canSubstitute: true,
        familyId: 'family-1',
      }));
      testData.set('user-2', createTestAvailability('user-2', 'Maria Santos', {
        dates: {
          '2026-01-25': { times: { '08:00': true } },
        },
        canSubstitute: false,
      }));

      service = new AvailabilityService(testData);
      const ministers = service.getAllMinisters();

      expect(ministers.length).toBe(2);

      const joao = ministers.find(m => m.id === 'user-1');
      expect(joao?.name).toBe('João Silva');
      expect(joao?.canSubstitute).toBe(true);
      expect(joao?.familyId).toBe('family-1');
      expect(joao?.totalAvailabilities).toBe(2);

      const maria = ministers.find(m => m.id === 'user-2');
      expect(maria?.name).toBe('Maria Santos');
      expect(maria?.canSubstitute).toBe(false);
      expect(maria?.familyId).toBeUndefined();
      expect(maria?.totalAvailabilities).toBe(1);
    });
  });

  describe('Time Normalization Edge Cases', () => {
    beforeEach(() => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        dates: {
          '2026-01-25': { times: { '08:00:00': true, '10:00': true } },
        },
      }));

      service = new AvailabilityService(testData);
    });

    it('should match times regardless of format', () => {
      // Query with seconds, stored without
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '10:00:00')).toBe(true);

      // Query without seconds, stored with
      expect(service.isMinisterAvailable('user-1', '2026-01-25', '08:00')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minister with no availability', () => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva'));
      service = new AvailabilityService(testData);

      const dates = service.getMinisterAvailableDates('user-1');
      expect(dates).toEqual([]);

      const available = service.getAvailableMinistersForMass('2026-01-25', '08:00');
      expect(available).toEqual([]);
    });

    it('should handle single minister in family', () => {
      testData.set('user-1', createTestAvailability('user-1', 'João Silva', {
        familyId: 'family-1',
      }));
      service = new AvailabilityService(testData);

      const familyMembers = service.getFamilyMembers('user-1');
      expect(familyMembers).toEqual([]);
    });
  });
});
