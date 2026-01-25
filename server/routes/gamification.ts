/**
 * Gamification API Routes
 *
 * Endpoints for points, badges, levels, and leaderboards
 */

import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { csrfProtection } from '../middleware/csrf';
import { db } from '../db';
import { badges, userBadges, userPoints, pointTransactions, users } from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import {
  getUserGamificationProfile,
  awardPoints,
  awardBadge,
  checkAndAwardBadges,
  updateUserStats,
  getLeaderboard,
  getUserRank,
  seedDefaultBadges,
  seedLevelDefinitions,
  POINT_VALUES,
  LEVEL_THRESHOLDS
} from '../services/gamificationService';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/gamification/profile
 * Get current user's gamification profile
 */
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const profile = await getUserGamificationProfile(userId);
    const rank = await getUserRank(userId);

    res.json({
      ...profile,
      rank
    });
  } catch (error) {
    console.error('Error fetching gamification profile:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil de gamificacao' });
  }
});

/**
 * GET /api/gamification/profile/:userId
 * Get specific user's gamification profile (for viewing others)
 */
router.get('/profile/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await getUserGamificationProfile(userId);
    const rank = await getUserRank(userId);

    // Remove sensitive data for public profile
    res.json({
      points: profile.points,
      level: profile.level,
      levelName: profile.levelName,
      levelColor: profile.levelColor,
      badges: profile.badges.filter((b: { isSecret?: boolean }) => !b.isSecret),
      massesServed: profile.massesServed,
      currentStreak: profile.currentStreak,
      rank
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard
 */
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'alltime', limit = '10' } = req.query;
    const userId = req.user?.id;

    const leaderboard = await getLeaderboard(
      period as 'weekly' | 'monthly' | 'yearly' | 'alltime',
      parseInt(limit as string)
    );

    // Get current user's rank if not in top
    let userRank = null;
    let userEntry = null;

    if (userId) {
      const isInLeaderboard = leaderboard.some((e: { userId: string }) => e.userId === userId);
      if (!isInLeaderboard) {
        userRank = await getUserRank(userId);
        const profile = await getUserGamificationProfile(userId);
        const [user] = await db.select({ name: users.name, photoUrl: users.photoUrl }).from(users).where(eq(users.id, userId));

        userEntry = {
          rank: userRank,
          userId,
          points: profile.points,
          level: profile.level,
          userName: user?.name,
          userPhotoUrl: user?.photoUrl
        };
      }
    }

    res.json({
      leaderboard,
      currentUser: userEntry,
      period
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

/**
 * GET /api/gamification/badges
 * Get all available badges
 */
router.get('/badges', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get all visible badges
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(badges.category, badges.rarity);

    // Get user's earned badges
    let earnedBadgeIds: string[] = [];
    if (userId) {
      const earned = await db
        .select({ badgeId: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId));
      earnedBadgeIds = earned.map((e: { badgeId: string }) => e.badgeId);
    }

    // Map badges with earned status
    type BadgeRecord = typeof allBadges[number];
    const badgesWithStatus = allBadges
      .filter((b: BadgeRecord) => !b.isSecret || earnedBadgeIds.includes(b.id))
      .map((b: BadgeRecord) => ({
        ...b,
        earned: earnedBadgeIds.includes(b.id)
      }));

    res.json({ badges: badgesWithStatus });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Erro ao buscar badges' });
  }
});

/**
 * GET /api/gamification/levels
 * Get level definitions
 */
router.get('/levels', async (req: AuthRequest, res: Response) => {
  try {
    res.json({ levels: LEVEL_THRESHOLDS });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Erro ao buscar niveis' });
  }
});

/**
 * GET /api/gamification/points-config
 * Get point values for actions
 */
router.get('/points-config', async (req: AuthRequest, res: Response) => {
  try {
    res.json({ pointValues: POINT_VALUES });
  } catch (error) {
    console.error('Error fetching points config:', error);
    res.status(500).json({ error: 'Erro ao buscar configuracao de pontos' });
  }
});

/**
 * GET /api/gamification/history
 * Get user's point transaction history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const { limit = '50', offset = '0' } = req.query;

    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId));

    res.json({
      transactions,
      total: countResult?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Erro ao buscar historico' });
  }
});

/**
 * POST /api/gamification/feature-badge
 * Set a badge as featured on profile
 */
router.post('/feature-badge', csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const { badgeId, featured } = req.body;

    if (!badgeId) {
      return res.status(400).json({ error: 'Badge ID obrigatorio' });
    }

    // Verify user owns this badge
    const [userBadge] = await db
      .select()
      .from(userBadges)
      .where(and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeId, badgeId)
      ));

    if (!userBadge) {
      return res.status(404).json({ error: 'Badge nao encontrado' });
    }

    // Limit featured badges to 3
    if (featured) {
      const featuredCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(userBadges)
        .where(and(
          eq(userBadges.userId, userId),
          eq(userBadges.isFeatured, true)
        ));

      if ((featuredCount[0]?.count || 0) >= 3) {
        return res.status(400).json({ error: 'Maximo de 3 badges em destaque' });
      }
    }

    await db
      .update(userBadges)
      .set({ isFeatured: featured })
      .where(eq(userBadges.id, userBadge.id));

    res.json({ success: true });
  } catch (error) {
    console.error('Error featuring badge:', error);
    res.status(500).json({ error: 'Erro ao destacar badge' });
  }
});

/**
 * POST /api/gamification/claim-daily
 * Claim daily login bonus
 */
router.post('/claim-daily', csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    // Check if already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingClaim] = await db
      .select()
      .from(pointTransactions)
      .where(and(
        eq(pointTransactions.userId, userId),
        eq(pointTransactions.action, 'login_bonus'),
        sql`${pointTransactions.createdAt} >= ${today}`
      ));

    if (existingClaim) {
      return res.status(400).json({ error: 'Bonus diario ja coletado hoje', alreadyClaimed: true });
    }

    // Award daily bonus
    const result = await awardPoints(
      userId,
      'login_bonus',
      undefined,
      'Bonus de login diario'
    );

    res.json({
      success: true,
      points: result.points,
      newTotal: result.newTotal,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel
    });
  } catch (error) {
    console.error('Error claiming daily bonus:', error);
    res.status(500).json({ error: 'Erro ao coletar bonus' });
  }
});

/**
 * POST /api/gamification/admin/award-points
 * Admin: Award points to a user
 */
router.post('/admin/award-points', requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || !points) {
      return res.status(400).json({ error: 'userId e points sao obrigatorios' });
    }

    const result = await awardPoints(
      userId,
      'special_event',
      points,
      reason || 'Pontos concedidos pelo coordenador'
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: 'Erro ao conceder pontos' });
  }
});

/**
 * POST /api/gamification/admin/award-badge
 * Admin: Award badge to a user
 */
router.post('/admin/award-badge', requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, badgeCode } = req.body;

    if (!userId || !badgeCode) {
      return res.status(400).json({ error: 'userId e badgeCode sao obrigatorios' });
    }

    const awarded = await awardBadge(userId, badgeCode);

    if (!awarded) {
      return res.status(400).json({ error: 'Badge ja foi concedido ou nao existe' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ error: 'Erro ao conceder badge' });
  }
});

/**
 * POST /api/gamification/admin/seed
 * Admin: Seed default badges and levels
 */
router.post('/admin/seed', requireRole(['gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    await seedDefaultBadges();
    await seedLevelDefinitions();

    res.json({ success: true, message: 'Badges e niveis criados com sucesso' });
  } catch (error) {
    console.error('Error seeding gamification data:', error);
    res.status(500).json({ error: 'Erro ao criar dados de gamificacao' });
  }
});

/**
 * GET /api/gamification/stats
 * Get gamification statistics (admin)
 */
router.get('/stats', requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res: Response) => {
  try {
    // Total points distributed
    const [totalPointsResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(total_points), 0)` })
      .from(userPoints);

    // Total badges earned
    const [totalBadgesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userBadges);

    // Active users with points
    const [activeUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userPoints)
      .where(sql`total_points > 0`);

    // Badge distribution
    const badgeDistribution = await db
      .select({
        badgeId: userBadges.badgeId,
        badgeName: badges.name,
        count: sql<number>`count(*)`
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .groupBy(userBadges.badgeId, badges.name)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Level distribution
    const levelDistribution = await db
      .select({
        level: userPoints.level,
        count: sql<number>`count(*)`
      })
      .from(userPoints)
      .groupBy(userPoints.level)
      .orderBy(userPoints.level);

    res.json({
      totalPointsDistributed: totalPointsResult?.total || 0,
      totalBadgesEarned: totalBadgesResult?.count || 0,
      activeUsersWithPoints: activeUsersResult?.count || 0,
      badgeDistribution,
      levelDistribution
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatisticas' });
  }
});

export default router;
