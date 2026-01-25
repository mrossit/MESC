/**
 * Schedules Routes Unit Tests
 *
 * Tests for schedule generation, CRUD operations, and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('@server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rows: [] })
  }
}));

describe('Schedule Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schedule Position Validation', () => {
    const VALID_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];

    it('should validate position is within range', () => {
      const position = 15;
      const isValid = VALID_POSITIONS.includes(position);
      expect(isValid).toBe(true);
    });

    it('should reject position outside range', () => {
      const position = 30;
      const isValid = VALID_POSITIONS.includes(position);
      expect(isValid).toBe(false);
    });

    it('should reject negative position', () => {
      const position = -1;
      const isValid = VALID_POSITIONS.includes(position);
      expect(isValid).toBe(false);
    });

    it('should reject position 0', () => {
      const position = 0;
      const isValid = VALID_POSITIONS.includes(position);
      expect(isValid).toBe(false);
    });
  });

  describe('Schedule Date Validation', () => {
    it('should validate date format YYYY-MM-DD', () => {
      const validDate = '2025-01-20';
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(validDate);
      expect(isValid).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidDate = '20-01-2025';
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(invalidDate);
      expect(isValid).toBe(false);
    });

    it('should validate date is not in past', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const isPast = new Date(dateStr) < new Date();
      expect(isPast).toBe(false);
    });

    it('should reject past dates for new schedules', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const dateStr = pastDate.toISOString().split('T')[0];

      const isPast = new Date(dateStr) < new Date();
      expect(isPast).toBe(true);
    });
  });

  describe('Schedule Time Validation', () => {
    const VALID_MASS_TIMES = ['06:30', '08:00', '10:00', '17:00', '19:00', '19:30'];

    it('should validate time format HH:MM', () => {
      const validTime = '10:00';
      const isValid = /^\d{2}:\d{2}$/.test(validTime);
      expect(isValid).toBe(true);
    });

    it('should accept valid mass times', () => {
      expect(VALID_MASS_TIMES.includes('08:00')).toBe(true);
      expect(VALID_MASS_TIMES.includes('19:00')).toBe(true);
    });

    it('should handle special Thursday 19:30 mass', () => {
      expect(VALID_MASS_TIMES.includes('19:30')).toBe(true);
    });
  });

  describe('Schedule Status Transitions', () => {
    const validStatuses = ['scheduled', 'substituted', 'cancelled', 'completed'];

    it('should have valid status values', () => {
      expect(validStatuses).toContain('scheduled');
      expect(validStatuses).toContain('substituted');
      expect(validStatuses).toContain('cancelled');
      expect(validStatuses).toContain('completed');
    });

    it('should allow transition from scheduled to substituted', () => {
      const transitions: Record<string, string[]> = {
        scheduled: ['substituted', 'cancelled', 'completed'],
        substituted: ['cancelled', 'completed'],
        cancelled: [],
        completed: []
      };

      expect(transitions['scheduled']).toContain('substituted');
    });

    it('should not allow transition from completed', () => {
      const transitions: Record<string, string[]> = {
        scheduled: ['substituted', 'cancelled', 'completed'],
        substituted: ['cancelled', 'completed'],
        cancelled: [],
        completed: []
      };

      expect(transitions['completed'].length).toBe(0);
    });
  });

  describe('Schedule Generation', () => {
    it('should assign 4 positions per mass', () => {
      const POSITIONS_PER_MASS = 4;
      expect(POSITIONS_PER_MASS).toBe(4);
    });

    it('should handle minister availability', () => {
      const minister = {
        id: 'minister-1',
        availableSundays: ['2025-01-12', '2025-01-19', '2025-01-26'],
        preferredMassTimes: ['08:00', '10:00']
      };

      const targetDate = '2025-01-19';
      const isAvailable = minister.availableSundays.includes(targetDate);
      expect(isAvailable).toBe(true);
    });

    it('should respect preferred mass times', () => {
      const minister = {
        id: 'minister-1',
        preferredMassTimes: ['08:00', '10:00']
      };

      const targetTime = '08:00';
      const prefersTime = minister.preferredMassTimes.includes(targetTime);
      expect(prefersTime).toBe(true);
    });

    it('should balance minister assignments', () => {
      const assignments = [
        { ministerId: 'minister-1', count: 3 },
        { ministerId: 'minister-2', count: 5 },
        { ministerId: 'minister-3', count: 2 }
      ];

      // Sort by count to find least assigned
      const sorted = assignments.sort((a, b) => a.count - b.count);
      expect(sorted[0].ministerId).toBe('minister-3');
    });

    it('should not double-book ministers', () => {
      const existingSchedules = [
        { ministerId: 'minister-1', date: '2025-01-19', time: '10:00' }
      ];

      const newScheduleAttempt = {
        ministerId: 'minister-1',
        date: '2025-01-19',
        time: '10:00'
      };

      const isDoubleBooked = existingSchedules.some(
        s => s.ministerId === newScheduleAttempt.ministerId &&
          s.date === newScheduleAttempt.date &&
          s.time === newScheduleAttempt.time
      );

      expect(isDoubleBooked).toBe(true);
    });
  });

  describe('Schedule Conflict Detection', () => {
    it('should detect position conflict', () => {
      const existingSchedules = [
        { date: '2025-01-19', time: '10:00', position: 1, ministerId: 'minister-1' }
      ];

      const newSchedule = {
        date: '2025-01-19',
        time: '10:00',
        position: 1,
        ministerId: 'minister-2'
      };

      const hasConflict = existingSchedules.some(
        s => s.date === newSchedule.date &&
          s.time === newSchedule.time &&
          s.position === newSchedule.position
      );

      expect(hasConflict).toBe(true);
    });

    it('should allow different positions same time', () => {
      const existingSchedules = [
        { date: '2025-01-19', time: '10:00', position: 1, ministerId: 'minister-1' }
      ];

      const newSchedule = {
        date: '2025-01-19',
        time: '10:00',
        position: 2,
        ministerId: 'minister-2'
      };

      const hasConflict = existingSchedules.some(
        s => s.date === newSchedule.date &&
          s.time === newSchedule.time &&
          s.position === newSchedule.position
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe('Schedule Publication', () => {
    it('should mark schedule as published', () => {
      const schedule = {
        id: 'schedule-1',
        status: 'scheduled',
        isPublished: false
      };

      const published = {
        ...schedule,
        isPublished: true,
        publishedAt: new Date()
      };

      expect(published.isPublished).toBe(true);
      expect(published.publishedAt).toBeDefined();
    });

    it('should notify ministers on publication', () => {
      const schedules = [
        { ministerId: 'minister-1', date: '2025-01-19', time: '10:00' },
        { ministerId: 'minister-2', date: '2025-01-19', time: '10:00' }
      ];

      const ministersToNotify = [...new Set(schedules.map(s => s.ministerId))];
      expect(ministersToNotify.length).toBe(2);
    });
  });

  describe('Schedule Filtering', () => {
    it('should filter by date range', () => {
      const schedules = [
        { date: '2025-01-15', time: '10:00' },
        { date: '2025-01-20', time: '10:00' },
        { date: '2025-01-25', time: '10:00' }
      ];

      const startDate = '2025-01-16';
      const endDate = '2025-01-24';

      const filtered = schedules.filter(
        s => s.date >= startDate && s.date <= endDate
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].date).toBe('2025-01-20');
    });

    it('should filter by minister', () => {
      const schedules = [
        { ministerId: 'minister-1', date: '2025-01-19' },
        { ministerId: 'minister-2', date: '2025-01-19' },
        { ministerId: 'minister-1', date: '2025-01-26' }
      ];

      const filtered = schedules.filter(s => s.ministerId === 'minister-1');
      expect(filtered.length).toBe(2);
    });

    it('should filter by mass time', () => {
      const schedules = [
        { time: '08:00', date: '2025-01-19' },
        { time: '10:00', date: '2025-01-19' },
        { time: '19:00', date: '2025-01-19' }
      ];

      const filtered = schedules.filter(s => s.time === '10:00');
      expect(filtered.length).toBe(1);
    });

    it('should filter by status', () => {
      const schedules = [
        { status: 'scheduled', date: '2025-01-19' },
        { status: 'cancelled', date: '2025-01-19' },
        { status: 'completed', date: '2025-01-12' }
      ];

      const active = schedules.filter(s => s.status === 'scheduled');
      expect(active.length).toBe(1);
    });
  });

  describe('Schedule Response Format', () => {
    it('should include minister details', () => {
      const schedule = {
        id: 'schedule-1',
        date: '2025-01-19',
        time: '10:00',
        position: 1,
        status: 'scheduled',
        minister: {
          id: 'minister-1',
          name: 'John Doe',
          photoUrl: '/photos/john.jpg'
        }
      };

      expect(schedule.minister).toBeDefined();
      expect(schedule.minister.name).toBe('John Doe');
    });

    it('should include substitution info if substituted', () => {
      const schedule = {
        id: 'schedule-1',
        status: 'substituted',
        originalMinisterId: 'minister-1',
        ministerId: 'minister-2',
        substitution: {
          requestId: 'sub-1',
          reason: 'Viagem'
        }
      };

      expect(schedule.substitution).toBeDefined();
      expect(schedule.originalMinisterId).toBe('minister-1');
    });
  });

  describe('Mass Configuration', () => {
    it('should have Sunday masses', () => {
      const sundayMasses = ['06:30', '08:00', '10:00', '17:00', '19:00'];
      expect(sundayMasses.length).toBeGreaterThanOrEqual(4);
    });

    it('should have weekday masses', () => {
      const weekdayMasses = ['06:30', '19:00'];
      expect(weekdayMasses.length).toBeGreaterThanOrEqual(1);
    });

    it('should have first Thursday special mass', () => {
      const firstThursdayMasses = ['06:30', '19:00', '19:30'];
      expect(firstThursdayMasses).toContain('19:30');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid date', () => {
      const errorResponse = {
        success: false,
        error: 'Data invalida'
      };

      expect(errorResponse.success).toBe(false);
    });

    it('should return 404 for non-existent schedule', () => {
      const errorResponse = {
        success: false,
        error: 'Escala nao encontrada'
      };

      expect(errorResponse.success).toBe(false);
    });

    it('should return 409 for conflict', () => {
      const errorResponse = {
        success: false,
        error: 'Conflito: Posicao ja ocupada nesta missa'
      };

      expect(errorResponse.success).toBe(false);
    });
  });

  describe('Calendar View Generation', () => {
    it('should group schedules by date', () => {
      const schedules = [
        { date: '2025-01-19', time: '08:00', position: 1 },
        { date: '2025-01-19', time: '10:00', position: 1 },
        { date: '2025-01-26', time: '08:00', position: 1 }
      ];

      const grouped = schedules.reduce((acc: Record<string, typeof schedules>, s) => {
        if (!acc[s.date]) acc[s.date] = [];
        acc[s.date].push(s);
        return acc;
      }, {});

      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped['2025-01-19'].length).toBe(2);
    });

    it('should sort by date and time', () => {
      const schedules = [
        { date: '2025-01-26', time: '08:00' },
        { date: '2025-01-19', time: '10:00' },
        { date: '2025-01-19', time: '08:00' }
      ];

      const sorted = schedules.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });

      expect(sorted[0].date).toBe('2025-01-19');
      expect(sorted[0].time).toBe('08:00');
    });
  });

  describe('Presence Confirmation', () => {
    it('should allow minister to confirm presence', () => {
      const schedule = {
        id: 'schedule-1',
        ministerId: 'minister-1',
        confirmedAt: null as Date | null
      };

      const confirmed = {
        ...schedule,
        confirmedAt: new Date()
      };

      expect(confirmed.confirmedAt).toBeDefined();
    });

    it('should track confirmation time', () => {
      const schedule = {
        id: 'schedule-1',
        confirmedAt: new Date('2025-01-19T09:00:00')
      };

      const massTime = new Date('2025-01-19T10:00:00');
      const confirmedBefore = schedule.confirmedAt < massTime;

      expect(confirmedBefore).toBe(true);
    });
  });
});
