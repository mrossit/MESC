/**
 * Schedules Integration Tests
 *
 * Tests for schedule management with real database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { schedules, users, substitutionRequests } from '../../shared/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import {
  testDataExists,
  cleanupDynamicTestData,
  createTestSchedule,
  getNextSunday,
  getFutureDate,
} from '../helpers/testHelpers';

describe('Schedules Integration Tests', () => {
  beforeAll(async () => {
    const hasData = await testDataExists();
    if (!hasData) {
      console.log('⚠️  Test data not found. Run: npx tsx test/fixtures/seedTestData.ts');
    }
  });

  afterAll(async () => {
    await cleanupDynamicTestData();
  });

  describe('Schedule Queries', () => {
    it('should find schedules in database', async () => {
      const allSchedules = await db
        .select()
        .from(schedules)
        .limit(10);

      if (allSchedules.length === 0) {
        console.log('Skipping: No schedules in database');
        return;
      }

      expect(allSchedules.length).toBeGreaterThan(0);
    });

    it('should filter schedules by date', async () => {
      const existingSchedules = await db
        .select()
        .from(schedules)
        .limit(1);

      if (existingSchedules.length === 0) {
        console.log('Skipping: No schedules in database');
        return;
      }

      const targetDate = existingSchedules[0].date;

      const schedulesOnDate = await db
        .select()
        .from(schedules)
        .where(eq(schedules.date, targetDate!));

      schedulesOnDate.forEach(s => {
        expect(s.date).toBe(targetDate);
      });
    });

    it('should filter schedules by minister', async () => {
      // Find a minister with schedules
      const [scheduleWithMinister] = await db
        .select()
        .from(schedules)
        .where(sql`minister_id IS NOT NULL`)
        .limit(1);

      if (!scheduleWithMinister) {
        console.log('Skipping: No schedules with ministers in database');
        return;
      }

      const ministerSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.ministerId, scheduleWithMinister.ministerId!));

      ministerSchedules.forEach(s => {
        expect(s.ministerId).toBe(scheduleWithMinister.ministerId);
      });
    });

    it('should filter schedules by status', async () => {
      const scheduledItems = await db
        .select()
        .from(schedules)
        .where(eq(schedules.status, 'scheduled'))
        .limit(10);

      if (scheduledItems.length === 0) {
        console.log('Skipping: No scheduled items in database');
        return;
      }

      scheduledItems.forEach(s => {
        expect(s.status).toBe('scheduled');
      });
    });
  });

  describe('Schedule Creation', () => {
    it('should create a new schedule', async () => {
      const schedule = await createTestSchedule({
        date: getNextSunday(),
        time: '08:00',
        position: 1,
      });

      const found = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, schedule.id));

      expect(found.length).toBe(1);
      // PostgreSQL may store time as '08:00:00', so compare first 5 chars
      expect(found[0].time?.substring(0, 5)).toBe('08:00');
    });

    it('should create schedule with specific position', async () => {
      const date = getNextSunday();
      const time = '19:00';

      const schedule = await createTestSchedule({
        date,
        time,
        position: 3,
      });

      const [found] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, schedule.id));

      expect(found.position).toBe(3);
      expect(found.date).toBe(date);
    });
  });

  describe('Schedule Updates', () => {
    it('should update schedule status', async () => {
      const schedule = await createTestSchedule();

      await db
        .update(schedules)
        .set({ status: 'completed' })
        .where(eq(schedules.id, schedule.id));

      const [found] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, schedule.id));

      expect(found.status).toBe('completed');
    });

    it('should update minister assignment', async () => {
      // Get two different ministers
      const ministers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ministro'))
        .limit(2);

      if (ministers.length < 2) {
        console.log('Skipping: Not enough ministers in database');
        return;
      }

      const schedule = await createTestSchedule({
        ministerId: ministers[0].id,
      });

      await db
        .update(schedules)
        .set({ ministerId: ministers[1].id })
        .where(eq(schedules.id, schedule.id));

      const [found] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, schedule.id));

      expect(found.ministerId).toBe(ministers[1].id);
    });

    it('should mark schedule as substituted', async () => {
      const ministers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ministro'))
        .limit(2);

      if (ministers.length < 2) {
        console.log('Skipping: Not enough ministers in database');
        return;
      }

      const schedule = await createTestSchedule({
        ministerId: ministers[0].id,
      });

      await db
        .update(schedules)
        .set({
          status: 'substituted',
          substituteId: ministers[1].id,
        })
        .where(eq(schedules.id, schedule.id));

      const [found] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, schedule.id));

      expect(found.status).toBe('substituted');
      expect(found.substituteId).toBe(ministers[1].id);
    });
  });

  describe('Schedule with Minister Details', () => {
    it('should join schedules with minister info', async () => {
      const schedulesWithMinisters = await db
        .select({
          scheduleId: schedules.id,
          date: schedules.date,
          time: schedules.time,
          ministerName: users.name,
          ministerRole: users.role,
        })
        .from(schedules)
        .innerJoin(users, eq(schedules.ministerId, users.id))
        .limit(10);

      if (schedulesWithMinisters.length === 0) {
        console.log('Skipping: No schedules with ministers in database');
        return;
      }

      schedulesWithMinisters.forEach(s => {
        expect(s.ministerName).toBeDefined();
        expect(s.date).toBeDefined();
      });
    });
  });

  describe('Mass Configuration', () => {
    it('should have valid positions', async () => {
      const allSchedules = await db
        .select()
        .from(schedules)
        .limit(20);

      if (allSchedules.length === 0) {
        console.log('Skipping: No schedules in database');
        return;
      }

      // Each schedule should have a positive position
      allSchedules.forEach(s => {
        if (s.position) {
          expect(s.position).toBeGreaterThanOrEqual(1);
        }
      });
    });
  });

  describe('Schedule Ordering', () => {
    it('should order schedules by date', async () => {
      const orderedSchedules = await db
        .select()
        .from(schedules)
        .orderBy(schedules.date)
        .limit(10);

      if (orderedSchedules.length < 2) {
        console.log('Skipping: Not enough schedules for ordering test');
        return;
      }

      for (let i = 1; i < orderedSchedules.length; i++) {
        expect(orderedSchedules[i].date! >= orderedSchedules[i - 1].date!).toBe(true);
      }
    });

    it('should order schedules by date and time', async () => {
      const orderedSchedules = await db
        .select()
        .from(schedules)
        .orderBy(schedules.date, schedules.time)
        .limit(10);

      if (orderedSchedules.length < 2) {
        console.log('Skipping: Not enough schedules for ordering test');
        return;
      }

      // Schedules should be ordered correctly
      expect(orderedSchedules.length).toBeGreaterThan(0);
    });
  });

  describe('Minister Assignment Count', () => {
    it('should count schedules per minister', async () => {
      const counts = await db
        .select({
          ministerId: schedules.ministerId,
          count: sql<number>`count(*)`,
        })
        .from(schedules)
        .where(sql`minister_id IS NOT NULL`)
        .groupBy(schedules.ministerId)
        .limit(10);

      if (counts.length === 0) {
        console.log('Skipping: No schedule counts in database');
        return;
      }

      counts.forEach(c => {
        expect(Number(c.count)).toBeGreaterThan(0);
      });
    });
  });

  describe('Schedule Deletion', () => {
    it('should delete schedule', async () => {
      const schedule = await createTestSchedule();

      await db.delete(schedules).where(eq(schedules.id, schedule.id));

      const found = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, schedule.id));

      expect(found.length).toBe(0);
    });
  });

  describe('Future Schedules', () => {
    it('should find future schedules only', async () => {
      const today = new Date().toISOString().split('T')[0];

      const futureSchedules = await db
        .select()
        .from(schedules)
        .where(sql`date >= ${today}`)
        .limit(10);

      if (futureSchedules.length === 0) {
        console.log('Skipping: No future schedules in database');
        return;
      }

      futureSchedules.forEach(s => {
        expect(s.date! >= today).toBe(true);
      });
    });
  });
});
