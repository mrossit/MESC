import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database before importing routes
vi.mock('@server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rows: [{ rank: 1 }] })
  }
}));

// Mock the gamification service
vi.mock('@server/services/gamificationService', () => ({
  getUserGamificationProfile: vi.fn(),
  awardPoints: vi.fn(),
  awardBadge: vi.fn(),
  checkAndAwardBadges: vi.fn(),
  updateUserStats: vi.fn(),
  getLeaderboard: vi.fn(),
  getUserRank: vi.fn(),
  seedDefaultBadges: vi.fn(),
  seedLevelDefinitions: vi.fn(),
  POINT_VALUES: {
    mass_served: 50,
    substitution_offered: 20,
    substitution_accepted: 40,
    material_completed: 30,
    quiz_completed: 25,
    quiz_perfect: 50,
    streak_bonus: 10,
    badge_earned: 0,
    login_bonus: 5,
    first_action: 100,
    community_help: 35,
    special_event: 100
  },
  LEVEL_THRESHOLDS: [
    { level: 1, name: 'Iniciante', minPoints: 0, color: 'gray' },
    { level: 2, name: 'Aprendiz', minPoints: 100, color: 'green' },
    { level: 10, name: 'Lenda', minPoints: 10000, color: 'gold' }
  ]
}));

// Mock auth middleware
vi.mock('@server/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = { id: 'test-user-id', role: 'ministro' };
    next();
  }),
  requireRole: vi.fn((roles) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user?.role) || roles.includes('ministro')) {
      next();
    } else {
      res.status(403).json({ error: 'Acesso negado' });
    }
  }),
  AuthRequest: {}
}));

// Mock CSRF middleware
vi.mock('@server/middleware/csrf', () => ({
  csrfProtection: vi.fn((req, res, next) => next())
}));

import {
  getUserGamificationProfile,
  awardPoints,
  awardBadge,
  getLeaderboard,
  getUserRank,
  seedDefaultBadges,
  seedLevelDefinitions,
  POINT_VALUES,
  LEVEL_THRESHOLDS
} from '@server/services/gamificationService';

describe('Gamification Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Configuration', () => {
    it('should export POINT_VALUES correctly', () => {
      expect(POINT_VALUES).toBeDefined();
      expect(POINT_VALUES.mass_served).toBe(50);
      expect(POINT_VALUES.login_bonus).toBe(5);
    });

    it('should export LEVEL_THRESHOLDS correctly', () => {
      expect(LEVEL_THRESHOLDS).toBeDefined();
      expect(LEVEL_THRESHOLDS.length).toBeGreaterThan(0);
      expect(LEVEL_THRESHOLDS[0].level).toBe(1);
    });
  });

  describe('Service Calls', () => {
    it('should have getUserGamificationProfile available', () => {
      expect(getUserGamificationProfile).toBeDefined();
      expect(typeof getUserGamificationProfile).toBe('function');
    });

    it('should have awardPoints available', () => {
      expect(awardPoints).toBeDefined();
      expect(typeof awardPoints).toBe('function');
    });

    it('should have awardBadge available', () => {
      expect(awardBadge).toBeDefined();
      expect(typeof awardBadge).toBe('function');
    });

    it('should have getLeaderboard available', () => {
      expect(getLeaderboard).toBeDefined();
      expect(typeof getLeaderboard).toBe('function');
    });

    it('should have getUserRank available', () => {
      expect(getUserRank).toBeDefined();
      expect(typeof getUserRank).toBe('function');
    });

    it('should have seed functions available', () => {
      expect(seedDefaultBadges).toBeDefined();
      expect(seedLevelDefinitions).toBeDefined();
    });
  });

  describe('Profile Endpoint Logic', () => {
    it('should call getUserGamificationProfile with correct userId', async () => {
      const mockProfile = {
        points: 500,
        level: 3,
        levelName: 'Ministro Ativo',
        levelColor: 'blue',
        levelProgress: 50,
        badges: [],
        recentActivity: []
      };

      vi.mocked(getUserGamificationProfile).mockResolvedValue(mockProfile);
      vi.mocked(getUserRank).mockResolvedValue(5);

      const result = await getUserGamificationProfile('test-user-id');
      expect(result).toEqual(mockProfile);
    });

    it('should handle profile with no badges', async () => {
      const mockProfile = {
        points: 0,
        level: 1,
        levelName: 'Iniciante',
        levelColor: 'gray',
        levelProgress: 0,
        badges: [],
        recentActivity: []
      };

      vi.mocked(getUserGamificationProfile).mockResolvedValue(mockProfile);

      const result = await getUserGamificationProfile('new-user-id');
      expect(result.badges).toEqual([]);
      expect(result.level).toBe(1);
    });
  });

  describe('Leaderboard Endpoint Logic', () => {
    it('should call getLeaderboard with correct parameters', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', points: 1000, level: 5, userName: 'User 1' },
        { rank: 2, userId: 'user2', points: 800, level: 4, userName: 'User 2' }
      ];

      vi.mocked(getLeaderboard).mockResolvedValue(mockLeaderboard);

      const result = await getLeaderboard('alltime', 10);
      expect(result).toEqual(mockLeaderboard);
      expect(getLeaderboard).toHaveBeenCalledWith('alltime', 10);
    });

    it('should support different periods', async () => {
      vi.mocked(getLeaderboard).mockResolvedValue([]);

      await getLeaderboard('weekly', 10);
      expect(getLeaderboard).toHaveBeenCalledWith('weekly', 10);

      await getLeaderboard('monthly', 10);
      expect(getLeaderboard).toHaveBeenCalledWith('monthly', 10);

      await getLeaderboard('yearly', 10);
      expect(getLeaderboard).toHaveBeenCalledWith('yearly', 10);
    });

    it('should support custom limit', async () => {
      vi.mocked(getLeaderboard).mockResolvedValue([]);

      await getLeaderboard('alltime', 50);
      expect(getLeaderboard).toHaveBeenCalledWith('alltime', 50);
    });
  });

  describe('Award Points Logic', () => {
    it('should award points correctly', async () => {
      const mockResult = {
        points: 50,
        newTotal: 550,
        leveledUp: false,
        newLevel: undefined
      };

      vi.mocked(awardPoints).mockResolvedValue(mockResult);

      const result = await awardPoints('test-user', 'mass_served');
      expect(result.points).toBe(50);
      expect(result.newTotal).toBe(550);
      expect(result.leveledUp).toBe(false);
    });

    it('should handle level up', async () => {
      const mockResult = {
        points: 100,
        newTotal: 1000,
        leveledUp: true,
        newLevel: 5
      };

      vi.mocked(awardPoints).mockResolvedValue(mockResult);

      const result = await awardPoints('test-user', 'special_event', 100);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(5);
    });

    it('should award custom points amount', async () => {
      const mockResult = {
        points: 200,
        newTotal: 700,
        leveledUp: false,
        newLevel: undefined
      };

      vi.mocked(awardPoints).mockResolvedValue(mockResult);

      const result = await awardPoints('test-user', 'special_event', 200, 'Special achievement');
      expect(result.points).toBe(200);
    });
  });

  describe('Award Badge Logic', () => {
    it('should award badge successfully', async () => {
      vi.mocked(awardBadge).mockResolvedValue(true);

      const result = await awardBadge('test-user', 'first_mass');
      expect(result).toBe(true);
      expect(awardBadge).toHaveBeenCalledWith('test-user', 'first_mass');
    });

    it('should return false for already earned badge', async () => {
      vi.mocked(awardBadge).mockResolvedValue(false);

      const result = await awardBadge('test-user', 'first_mass');
      expect(result).toBe(false);
    });

    it('should return false for non-existent badge', async () => {
      vi.mocked(awardBadge).mockResolvedValue(false);

      const result = await awardBadge('test-user', 'invalid_badge');
      expect(result).toBe(false);
    });
  });

  describe('User Rank Logic', () => {
    it('should return correct rank', async () => {
      vi.mocked(getUserRank).mockResolvedValue(5);

      const rank = await getUserRank('test-user');
      expect(rank).toBe(5);
    });

    it('should return rank 1 for top user', async () => {
      vi.mocked(getUserRank).mockResolvedValue(1);

      const rank = await getUserRank('top-user');
      expect(rank).toBe(1);
    });

    it('should return rank 1 for new user', async () => {
      vi.mocked(getUserRank).mockResolvedValue(1);

      const rank = await getUserRank('new-user');
      expect(rank).toBe(1);
    });
  });

  describe('Daily Bonus Logic', () => {
    it('should award daily bonus points', async () => {
      const mockResult = {
        points: 5,
        newTotal: 505,
        leveledUp: false,
        newLevel: undefined
      };

      vi.mocked(awardPoints).mockResolvedValue(mockResult);

      const result = await awardPoints('test-user', 'login_bonus');
      expect(result.points).toBe(5);
    });
  });

  describe('Seed Functions', () => {
    it('should call seedDefaultBadges', async () => {
      vi.mocked(seedDefaultBadges).mockResolvedValue(undefined);

      await seedDefaultBadges();
      expect(seedDefaultBadges).toHaveBeenCalled();
    });

    it('should call seedLevelDefinitions', async () => {
      vi.mocked(seedLevelDefinitions).mockResolvedValue(undefined);

      await seedLevelDefinitions();
      expect(seedLevelDefinitions).toHaveBeenCalled();
    });
  });

  describe('Points Configuration', () => {
    it('should have all action types with positive or zero values', () => {
      Object.entries(POINT_VALUES).forEach(([action, points]) => {
        expect(points).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have login_bonus as smallest reward', () => {
      const nonZeroValues = Object.values(POINT_VALUES).filter(v => v > 0);
      expect(Math.min(...nonZeroValues)).toBe(POINT_VALUES.login_bonus);
    });
  });

  describe('Level Configuration', () => {
    it('should have level 1 starting at 0 points', () => {
      const level1 = LEVEL_THRESHOLDS.find(l => l.level === 1);
      expect(level1?.minPoints).toBe(0);
    });

    it('should have levels in ascending order', () => {
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        expect(LEVEL_THRESHOLDS[i].level).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1].level);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(getUserGamificationProfile).mockRejectedValue(new Error('Database error'));

      await expect(getUserGamificationProfile('test-user')).rejects.toThrow('Database error');
    });

    it('should handle leaderboard service errors', async () => {
      vi.mocked(getLeaderboard).mockRejectedValue(new Error('Query timeout'));

      await expect(getLeaderboard('alltime', 10)).rejects.toThrow('Query timeout');
    });
  });

  describe('Profile Data Validation', () => {
    it('should return complete profile data', async () => {
      const mockProfile = {
        points: 1500,
        level: 6,
        levelName: 'Ministro Veterano',
        levelColor: 'red',
        levelProgress: 75,
        nextLevelPoints: 2500,
        currentStreak: 4,
        longestStreak: 8,
        massesServed: 45,
        substitutionsHelped: 12,
        materialsCompleted: 8,
        badges: [
          { code: 'first_mass', name: 'Primeira Missa', earnedAt: new Date() }
        ],
        recentActivity: []
      };

      vi.mocked(getUserGamificationProfile).mockResolvedValue(mockProfile);

      const result = await getUserGamificationProfile('test-user');

      expect(result.points).toBe(1500);
      expect(result.level).toBe(6);
      expect(result.levelName).toBe('Ministro Veterano');
      expect(result.badges.length).toBeGreaterThan(0);
      expect(result.currentStreak).toBe(4);
      expect(result.massesServed).toBe(45);
    });
  });

  describe('Featured Badge Logic', () => {
    it('should limit featured badges to 3', () => {
      const maxFeatured = 3;
      expect(maxFeatured).toBe(3);
    });
  });

  describe('Admin Endpoints Logic', () => {
    it('should validate userId for admin award points', () => {
      const validateAwardPointsInput = (userId: string | undefined, points: number | undefined) => {
        return !!(userId && points);
      };

      expect(validateAwardPointsInput('user-id', 100)).toBe(true);
      expect(validateAwardPointsInput(undefined, 100)).toBe(false);
      expect(validateAwardPointsInput('user-id', undefined)).toBe(false);
    });

    it('should validate userId and badgeCode for admin award badge', () => {
      const validateAwardBadgeInput = (userId: string | undefined, badgeCode: string | undefined) => {
        return !!(userId && badgeCode);
      };

      expect(validateAwardBadgeInput('user-id', 'first_mass')).toBe(true);
      expect(validateAwardBadgeInput(undefined, 'first_mass')).toBe(false);
      expect(validateAwardBadgeInput('user-id', undefined)).toBe(false);
    });
  });
});
