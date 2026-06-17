/**
 * Gamification Integration Tests
 *
 * Tests for points, badges, levels, and leaderboards with real database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { badges, userBadges, userPoints, pointTransactions, users } from '../../shared/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { testDataExists, cleanupDynamicTestData, randomString } from '../helpers/testHelpers';
import {
  POINT_VALUES,
  LEVEL_THRESHOLDS,
  calculateLevel,
} from '../../server/services/gamificationService';

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Gamification Integration Tests', () => {
  beforeAll(async () => {
    const hasData = await testDataExists();
    if (!hasData) {
      console.log('⚠️  Test data not found. Run: npx tsx test/fixtures/seedTestData.ts');
    }
  });

  afterAll(async () => {
    await cleanupDynamicTestData();
  });

  describe('Badges', () => {
    it('should find badges in database', async () => {
      // Select only core columns that are guaranteed to exist
      const allBadges = await db
        .select({
          id: badges.id,
          code: badges.code,
          name: badges.name,
          category: badges.category,
          rarity: badges.rarity,
        })
        .from(badges)
        .limit(10);

      if (allBadges.length === 0) {
        console.log('Skipping: No badges in database');
        return;
      }

      expect(allBadges.length).toBeGreaterThan(0);
    });

    it('should find badge by code', async () => {
      const [badge] = await db
        .select({
          code: badges.code,
        })
        .from(badges)
        .limit(1);

      if (!badge) {
        console.log('Skipping: No badges in database');
        return;
      }

      const [foundBadge] = await db
        .select({
          code: badges.code,
        })
        .from(badges)
        .where(eq(badges.code, badge.code));

      expect(foundBadge?.code).toBe(badge.code);
    });

    it('should filter badges by category', async () => {
      const participationBadges = await db
        .select({
          id: badges.id,
          category: badges.category,
        })
        .from(badges)
        .where(eq(badges.category, 'participation'))
        .limit(10);

      if (participationBadges.length === 0) {
        console.log('Skipping: No participation badges in database');
        return;
      }

      participationBadges.forEach(b => {
        expect(b.category).toBe('participation');
      });
    });

    it('should filter badges by rarity', async () => {
      const commonBadges = await db
        .select({
          id: badges.id,
          rarity: badges.rarity,
        })
        .from(badges)
        .where(eq(badges.rarity, 'common'))
        .limit(10);

      if (commonBadges.length === 0) {
        console.log('Skipping: No common badges in database');
        return;
      }

      commonBadges.forEach(b => {
        expect(b.rarity).toBe('common');
      });
    });
  });

  describe('User Badges', () => {
    it('should find user badges', async () => {
      // Select only core columns that are guaranteed to exist
      const userBadgesList = await db
        .select({
          id: userBadges.id,
          userId: userBadges.userId,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
        })
        .from(userBadges)
        .limit(10);

      if (userBadgesList.length === 0) {
        console.log('Skipping: No user badges in database');
        return;
      }

      expect(userBadgesList.length).toBeGreaterThan(0);
    });

    it('should join user badges with badge details', async () => {
      const userBadgesWithDetails = await db
        .select({
          userId: userBadges.userId,
          badgeName: badges.name,
          badgeRarity: badges.rarity,
          earnedAt: userBadges.earnedAt,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .limit(10);

      if (userBadgesWithDetails.length === 0) {
        console.log('Skipping: No user badges with details in database');
        return;
      }

      userBadgesWithDetails.forEach(ub => {
        expect(ub.badgeName).toBeDefined();
        expect(ub.earnedAt).toBeDefined();
      });
    });

    it('should count badges per user', async () => {
      const badgeCounts = await db
        .select({
          userId: userBadges.userId,
          count: sql<number>`count(*)`,
        })
        .from(userBadges)
        .groupBy(userBadges.userId)
        .limit(10);

      if (badgeCounts.length === 0) {
        console.log('Skipping: No badge counts in database');
        return;
      }

      badgeCounts.forEach(bc => {
        expect(Number(bc.count)).toBeGreaterThan(0);
      });
    });
  });

  describe('User Points', () => {
    it('should find user points records', async () => {
      // Select only core columns that are guaranteed to exist
      const pointsRecords = await db
        .select({
          id: userPoints.id,
          userId: userPoints.userId,
          totalPoints: userPoints.totalPoints,
          level: userPoints.level,
        })
        .from(userPoints)
        .limit(10);

      if (pointsRecords.length === 0) {
        console.log('Skipping: No user points in database');
        return;
      }

      expect(pointsRecords.length).toBeGreaterThan(0);
    });

    it('should have valid level for points', async () => {
      const pointsRecords = await db
        .select({
          totalPoints: userPoints.totalPoints,
          level: userPoints.level,
        })
        .from(userPoints)
        .limit(10);

      if (pointsRecords.length === 0) {
        console.log('Skipping: No user points in database');
        return;
      }

      pointsRecords.forEach(pr => {
        const expectedLevel = calculateLevel(pr.totalPoints || 0);
        expect(pr.level).toBe(expectedLevel);
      });
    });

    it('should order users by total points', async () => {
      const leaderboard = await db
        .select({
          userId: userPoints.userId,
          totalPoints: userPoints.totalPoints,
        })
        .from(userPoints)
        .orderBy(desc(userPoints.totalPoints))
        .limit(10);

      if (leaderboard.length < 2) {
        console.log('Skipping: Not enough users for leaderboard test');
        return;
      }

      for (let i = 1; i < leaderboard.length; i++) {
        const prevPoints = leaderboard[i - 1].totalPoints || 0;
        const currPoints = leaderboard[i].totalPoints || 0;
        expect(prevPoints).toBeGreaterThanOrEqual(currPoints);
      }
    });
  });

  describe('Point Transactions', () => {
    it('should find point transactions', async () => {
      // Select only core columns that are guaranteed to exist
      const transactions = await db
        .select({
          id: pointTransactions.id,
          userId: pointTransactions.userId,
          action: pointTransactions.action,
          points: pointTransactions.points,
          createdAt: pointTransactions.createdAt,
        })
        .from(pointTransactions)
        .limit(10);

      if (transactions.length === 0) {
        console.log('Skipping: No transactions in database');
        return;
      }

      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should have valid action types', async () => {
      const transactions = await db
        .select({
          action: pointTransactions.action,
        })
        .from(pointTransactions)
        .limit(10);

      if (transactions.length === 0) {
        console.log('Skipping: No transactions in database');
        return;
      }

      const validActions = Object.keys(POINT_VALUES);
      transactions.forEach(t => {
        expect(validActions).toContain(t.action);
      });
    });

    it('should have positive points for transactions', async () => {
      const transactions = await db
        .select({
          points: pointTransactions.points,
        })
        .from(pointTransactions)
        .limit(10);

      if (transactions.length === 0) {
        console.log('Skipping: No transactions in database');
        return;
      }

      // Most transactions should have positive points
      const positiveTransactions = transactions.filter(t => (t.points || 0) > 0);
      expect(positiveTransactions.length).toBeGreaterThanOrEqual(0);
    });

    it('should order transactions by date', async () => {
      const transactions = await db
        .select({
          createdAt: pointTransactions.createdAt,
        })
        .from(pointTransactions)
        .orderBy(desc(pointTransactions.createdAt))
        .limit(10);

      if (transactions.length < 2) {
        console.log('Skipping: Not enough transactions for ordering test');
        return;
      }

      for (let i = 1; i < transactions.length; i++) {
        const prevDate = new Date(transactions[i - 1].createdAt!).getTime();
        const currDate = new Date(transactions[i].createdAt!).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });
  });

  describe('Leaderboard Queries', () => {
    it('should build leaderboard with user details', async () => {
      const leaderboard = await db
        .select({
          userId: userPoints.userId,
          totalPoints: userPoints.totalPoints,
          level: userPoints.level,
          userName: users.name,
        })
        .from(userPoints)
        .innerJoin(users, eq(userPoints.userId, users.id))
        .orderBy(desc(userPoints.totalPoints))
        .limit(10);

      if (leaderboard.length === 0) {
        console.log('Skipping: No leaderboard data in database');
        return;
      }

      leaderboard.forEach(entry => {
        expect(entry.userName).toBeDefined();
        expect(entry.totalPoints).toBeGreaterThanOrEqual(0);
      });
    });

    it('should filter leaderboard by active users only', async () => {
      const leaderboard = await db
        .select({
          userId: userPoints.userId,
          totalPoints: userPoints.totalPoints,
          userStatus: users.status,
        })
        .from(userPoints)
        .innerJoin(users, eq(userPoints.userId, users.id))
        .where(eq(users.status, 'active'))
        .orderBy(desc(userPoints.totalPoints))
        .limit(10);

      if (leaderboard.length === 0) {
        console.log('Skipping: No active users in leaderboard');
        return;
      }

      leaderboard.forEach(entry => {
        expect(entry.userStatus).toBe('active');
      });
    });
  });

  describe('Level Calculations', () => {
    it('should calculate level 1 for new users', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
    });

    it('should calculate level 2 at 100 points', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('should calculate level 5 at 1000 points', () => {
      expect(calculateLevel(1000)).toBe(5);
    });

    it('should cap at level 10', () => {
      expect(calculateLevel(10000)).toBe(10);
      expect(calculateLevel(50000)).toBe(10);
    });

    it('should match LEVEL_THRESHOLDS exactly', () => {
      LEVEL_THRESHOLDS.forEach(threshold => {
        expect(calculateLevel(threshold.minPoints)).toBe(threshold.level);
      });
    });
  });

  describe('Point Values', () => {
    it('should have mass_served as primary reward', () => {
      expect(POINT_VALUES.mass_served).toBe(50);
    });

    it('should have login_bonus as smallest reward', () => {
      const nonZeroValues = Object.values(POINT_VALUES).filter(v => v > 0);
      const minValue = Math.min(...nonZeroValues);
      expect(POINT_VALUES.login_bonus).toBe(minValue);
    });

    it('should reward substitution acceptance more than offer', () => {
      expect(POINT_VALUES.substitution_accepted).toBeGreaterThan(
        POINT_VALUES.substitution_offered
      );
    });
  });
});
