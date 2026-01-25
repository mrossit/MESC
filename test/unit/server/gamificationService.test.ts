import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  POINT_VALUES,
  LEVEL_THRESHOLDS,
  DEFAULT_BADGES,
  calculateLevel
} from '@server/services/gamificationService';

// Mock the database
vi.mock('@server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rows: [{ rank: 1 }] })
  }
}));

describe('GamificationService', () => {
  describe('POINT_VALUES', () => {
    it('should have correct point values for mass_served', () => {
      expect(POINT_VALUES.mass_served).toBe(50);
    });

    it('should have correct point values for substitution actions', () => {
      expect(POINT_VALUES.substitution_offered).toBe(20);
      expect(POINT_VALUES.substitution_accepted).toBe(40);
    });

    it('should have correct point values for learning actions', () => {
      expect(POINT_VALUES.material_completed).toBe(30);
      expect(POINT_VALUES.quiz_completed).toBe(25);
      expect(POINT_VALUES.quiz_perfect).toBe(50);
    });

    it('should have correct point values for bonus actions', () => {
      expect(POINT_VALUES.streak_bonus).toBe(10);
      expect(POINT_VALUES.login_bonus).toBe(5);
      expect(POINT_VALUES.first_action).toBe(100);
    });

    it('should have correct point values for special actions', () => {
      expect(POINT_VALUES.community_help).toBe(35);
      expect(POINT_VALUES.special_event).toBe(100);
    });

    it('should have badge_earned as 0 (varies by badge)', () => {
      expect(POINT_VALUES.badge_earned).toBe(0);
    });

    it('should have all expected action types', () => {
      const expectedActions = [
        'mass_served',
        'substitution_offered',
        'substitution_accepted',
        'material_completed',
        'quiz_completed',
        'quiz_perfect',
        'streak_bonus',
        'badge_earned',
        'login_bonus',
        'first_action',
        'community_help',
        'special_event'
      ];
      expect(Object.keys(POINT_VALUES)).toEqual(expect.arrayContaining(expectedActions));
    });
  });

  describe('LEVEL_THRESHOLDS', () => {
    it('should have 10 levels', () => {
      expect(LEVEL_THRESHOLDS.length).toBe(10);
    });

    it('should start at level 1 with 0 points', () => {
      const level1 = LEVEL_THRESHOLDS[0];
      expect(level1.level).toBe(1);
      expect(level1.minPoints).toBe(0);
      expect(level1.name).toBe('Iniciante');
    });

    it('should end at level 10 with 10000 points', () => {
      const level10 = LEVEL_THRESHOLDS[9];
      expect(level10.level).toBe(10);
      expect(level10.minPoints).toBe(10000);
      expect(level10.name).toBe('Lenda');
    });

    it('should have strictly increasing level numbers', () => {
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        expect(LEVEL_THRESHOLDS[i].level).toBe(LEVEL_THRESHOLDS[i - 1].level + 1);
      }
    });

    it('should have strictly increasing point thresholds', () => {
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        expect(LEVEL_THRESHOLDS[i].minPoints).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1].minPoints);
      }
    });

    it('should have all required properties for each level', () => {
      LEVEL_THRESHOLDS.forEach(level => {
        expect(level).toHaveProperty('level');
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('minPoints');
        expect(level).toHaveProperty('color');
        expect(typeof level.level).toBe('number');
        expect(typeof level.name).toBe('string');
        expect(typeof level.minPoints).toBe('number');
        expect(typeof level.color).toBe('string');
      });
    });

    it('should have unique level names', () => {
      const names = LEVEL_THRESHOLDS.map(l => l.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have specific milestones at expected points', () => {
      const level5 = LEVEL_THRESHOLDS.find(l => l.level === 5);
      expect(level5?.minPoints).toBe(1000);
      expect(level5?.name).toBe('Ministro Exemplar');

      const level8 = LEVEL_THRESHOLDS.find(l => l.level === 8);
      expect(level8?.minPoints).toBe(4000);
      expect(level8?.name).toBe('Mestre');
    });
  });

  describe('DEFAULT_BADGES', () => {
    it('should have at least 15 badges', () => {
      expect(DEFAULT_BADGES.length).toBeGreaterThanOrEqual(15);
    });

    it('should have all required properties for each badge', () => {
      DEFAULT_BADGES.forEach(badge => {
        expect(badge).toHaveProperty('code');
        expect(badge).toHaveProperty('name');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('category');
        expect(badge).toHaveProperty('rarity');
        expect(badge).toHaveProperty('iconName');
        expect(badge).toHaveProperty('iconColor');
        expect(badge).toHaveProperty('pointsAwarded');
        expect(badge).toHaveProperty('requirement');
      });
    });

    it('should have unique badge codes', () => {
      const codes = DEFAULT_BADGES.map(b => b.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have valid categories', () => {
      const validCategories = ['participation', 'community', 'formation', 'streak', 'milestone', 'special'];
      DEFAULT_BADGES.forEach(badge => {
        expect(validCategories).toContain(badge.category);
      });
    });

    it('should have valid rarities', () => {
      const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      DEFAULT_BADGES.forEach(badge => {
        expect(validRarities).toContain(badge.rarity);
      });
    });

    it('should have participation badges', () => {
      const participationBadges = DEFAULT_BADGES.filter(b => b.category === 'participation');
      expect(participationBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('should have community badges', () => {
      const communityBadges = DEFAULT_BADGES.filter(b => b.category === 'community');
      expect(communityBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('should have formation badges', () => {
      const formationBadges = DEFAULT_BADGES.filter(b => b.category === 'formation');
      expect(formationBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('should have streak badges', () => {
      const streakBadges = DEFAULT_BADGES.filter(b => b.category === 'streak');
      expect(streakBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('should have milestone badges', () => {
      const milestoneBadges = DEFAULT_BADGES.filter(b => b.category === 'milestone');
      expect(milestoneBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('should have at least one secret badge', () => {
      const secretBadges = DEFAULT_BADGES.filter(b => b.isSecret);
      expect(secretBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('should have first_mass badge for first participation', () => {
      const firstMass = DEFAULT_BADGES.find(b => b.code === 'first_mass');
      expect(firstMass).toBeDefined();
      expect(firstMass?.category).toBe('participation');
      expect(firstMass?.rarity).toBe('common');
      expect(firstMass?.requirement.value).toBe(1);
    });

    it('should have progressive mass badges', () => {
      const massBadges = DEFAULT_BADGES.filter(b =>
        b.requirement?.type === 'masses_served'
      );
      const values = massBadges.map(b => b.requirement.value).sort((a, b) => a - b);
      expect(values).toEqual([1, 10, 50, 100]);
    });

    it('should have level-up badges at 5 and 10', () => {
      const level5Badge = DEFAULT_BADGES.find(b => b.code === 'level_5');
      const level10Badge = DEFAULT_BADGES.find(b => b.code === 'level_10');

      expect(level5Badge).toBeDefined();
      expect(level5Badge?.requirement.value).toBe(5);

      expect(level10Badge).toBeDefined();
      expect(level10Badge?.requirement.value).toBe(10);
      expect(level10Badge?.rarity).toBe('legendary');
    });
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 points', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 1 for points below 100', () => {
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
    });

    it('should return level 2 for 100 points', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('should return level 2 for points between 100 and 299', () => {
      expect(calculateLevel(150)).toBe(2);
      expect(calculateLevel(299)).toBe(2);
    });

    it('should return level 3 for 300 points', () => {
      expect(calculateLevel(300)).toBe(3);
    });

    it('should return level 5 for 1000 points', () => {
      expect(calculateLevel(1000)).toBe(5);
    });

    it('should return level 10 for 10000 points', () => {
      expect(calculateLevel(10000)).toBe(10);
    });

    it('should return level 10 for points above 10000', () => {
      expect(calculateLevel(15000)).toBe(10);
      expect(calculateLevel(999999)).toBe(10);
    });

    it('should handle negative points as level 1', () => {
      expect(calculateLevel(-100)).toBe(1);
    });

    it('should handle exact threshold boundaries', () => {
      // Test all level thresholds
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(300)).toBe(3);
      expect(calculateLevel(600)).toBe(4);
      expect(calculateLevel(1000)).toBe(5);
      expect(calculateLevel(1500)).toBe(6);
      expect(calculateLevel(2500)).toBe(7);
      expect(calculateLevel(4000)).toBe(8);
      expect(calculateLevel(6000)).toBe(9);
      expect(calculateLevel(10000)).toBe(10);
    });

    it('should handle points just below thresholds', () => {
      expect(calculateLevel(99)).toBe(1);
      expect(calculateLevel(299)).toBe(2);
      expect(calculateLevel(599)).toBe(3);
      expect(calculateLevel(999)).toBe(4);
      expect(calculateLevel(1499)).toBe(5);
      expect(calculateLevel(2499)).toBe(6);
      expect(calculateLevel(3999)).toBe(7);
      expect(calculateLevel(5999)).toBe(8);
      expect(calculateLevel(9999)).toBe(9);
    });
  });

  describe('Badge Rarity Distribution', () => {
    it('should have appropriate rarity distribution', () => {
      const rarityCount = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      };

      DEFAULT_BADGES.forEach(badge => {
        rarityCount[badge.rarity]++;
      });

      // Common should be most frequent
      expect(rarityCount.common).toBeGreaterThanOrEqual(3);
      // Legendary should be rare
      expect(rarityCount.legendary).toBeLessThanOrEqual(3);
      // Should have badges of all rarities
      expect(rarityCount.common).toBeGreaterThan(0);
      expect(rarityCount.uncommon).toBeGreaterThan(0);
      expect(rarityCount.rare).toBeGreaterThan(0);
    });
  });

  describe('Badge Points Distribution', () => {
    it('should award more points for rarer badges', () => {
      const commonBadges = DEFAULT_BADGES.filter(b => b.rarity === 'common');
      const rareBadges = DEFAULT_BADGES.filter(b => b.rarity === 'rare');
      const epicBadges = DEFAULT_BADGES.filter(b => b.rarity === 'epic');
      const legendaryBadges = DEFAULT_BADGES.filter(b => b.rarity === 'legendary');

      const avgCommon = commonBadges.reduce((sum, b) => sum + b.pointsAwarded, 0) / commonBadges.length;
      const avgRare = rareBadges.reduce((sum, b) => sum + b.pointsAwarded, 0) / rareBadges.length;

      if (epicBadges.length > 0 && legendaryBadges.length > 0) {
        const avgEpic = epicBadges.reduce((sum, b) => sum + b.pointsAwarded, 0) / epicBadges.length;
        const avgLegendary = legendaryBadges.reduce((sum, b) => sum + b.pointsAwarded, 0) / legendaryBadges.length;

        expect(avgRare).toBeGreaterThan(avgCommon);
        expect(avgEpic).toBeGreaterThan(avgRare);
        expect(avgLegendary).toBeGreaterThan(avgEpic);
      }
    });

    it('should have positive points for all non-secret badges', () => {
      const nonSecretBadges = DEFAULT_BADGES.filter(b => !b.isSecret);
      nonSecretBadges.forEach(badge => {
        expect(badge.pointsAwarded).toBeGreaterThan(0);
      });
    });
  });

  describe('Level Progression', () => {
    it('should require reasonable point gaps between levels', () => {
      // Gap between levels should increase progressively
      const gaps: number[] = [];
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        gaps.push(LEVEL_THRESHOLDS[i].minPoints - LEVEL_THRESHOLDS[i - 1].minPoints);
      }

      // Early levels should have smaller gaps
      expect(gaps[0]).toBeLessThan(gaps[gaps.length - 1]);
    });

    it('should allow reaching level 2 with ~2 masses served', () => {
      const pointsFor2Masses = POINT_VALUES.mass_served * 2;
      expect(calculateLevel(pointsFor2Masses)).toBe(2);
    });

    it('should require significant effort for level 10', () => {
      // Level 10 requires 10000 points
      // With 50 points per mass, that's 200 masses
      const massesForLevel10 = 10000 / POINT_VALUES.mass_served;
      expect(massesForLevel10).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Badge Requirements Validation', () => {
    it('should have valid requirement types', () => {
      const validTypes = ['masses_served', 'substitutions_helped', 'materials_completed', 'quizzes_perfect', 'streak', 'level', 'special'];

      DEFAULT_BADGES.forEach(badge => {
        expect(validTypes).toContain(badge.requirement.type);
      });
    });

    it('should have positive requirement values', () => {
      DEFAULT_BADGES.forEach(badge => {
        expect(badge.requirement.value).toBeGreaterThan(0);
      });
    });

    it('should have descriptions for all requirements', () => {
      DEFAULT_BADGES.forEach(badge => {
        expect(badge.requirement.description).toBeDefined();
        expect(badge.requirement.description.length).toBeGreaterThan(0);
      });
    });
  });
});
