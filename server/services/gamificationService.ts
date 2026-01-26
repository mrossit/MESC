/**
 * Gamification Service
 *
 * Handles points, badges, levels, and leaderboards for user engagement
 */

import { db } from '../db';
import {
  badges,
  userBadges,
  userPoints,
  pointTransactions,
  leaderboardCache,
  levelDefinitions,
  users
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, inArray } from 'drizzle-orm';

// Point values for different actions
export const POINT_VALUES = {
  mass_served: 50,
  substitution_offered: 20,
  substitution_accepted: 40,
  material_completed: 30,
  quiz_completed: 25,
  quiz_perfect: 50,
  streak_bonus: 10, // Per week
  badge_earned: 0, // Varies by badge
  login_bonus: 5,
  first_action: 100,
  community_help: 35,
  special_event: 100
};

// Level thresholds
export const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Iniciante', minPoints: 0, color: 'gray' },
  { level: 2, name: 'Aprendiz', minPoints: 100, color: 'green' },
  { level: 3, name: 'Ministro Ativo', minPoints: 300, color: 'blue' },
  { level: 4, name: 'Ministro Dedicado', minPoints: 600, color: 'purple' },
  { level: 5, name: 'Ministro Exemplar', minPoints: 1000, color: 'orange' },
  { level: 6, name: 'Ministro Veterano', minPoints: 1500, color: 'red' },
  { level: 7, name: 'Ministro Elite', minPoints: 2500, color: 'yellow' },
  { level: 8, name: 'Mestre', minPoints: 4000, color: 'pink' },
  { level: 9, name: 'Grao-Mestre', minPoints: 6000, color: 'cyan' },
  { level: 10, name: 'Lenda', minPoints: 10000, color: 'gold' }
];

// Default badges to seed
export const DEFAULT_BADGES = [
  // Participation badges
  {
    code: 'first_mass',
    name: 'Primeira Missa',
    description: 'Serviu em sua primeira missa como ministro',
    category: 'participation' as const,
    rarity: 'common' as const,
    iconName: 'Church',
    iconColor: 'blue',
    pointsAwarded: 50,
    requirement: { type: 'masses_served', value: 1, description: 'Servir em 1 missa' }
  },
  {
    code: 'ten_masses',
    name: 'Servidor Dedicado',
    description: 'Serviu em 10 missas',
    category: 'participation' as const,
    rarity: 'uncommon' as const,
    iconName: 'Award',
    iconColor: 'green',
    pointsAwarded: 100,
    requirement: { type: 'masses_served', value: 10, description: 'Servir em 10 missas' }
  },
  {
    code: 'fifty_masses',
    name: 'Veterano do Altar',
    description: 'Serviu em 50 missas',
    category: 'participation' as const,
    rarity: 'rare' as const,
    iconName: 'Medal',
    iconColor: 'purple',
    pointsAwarded: 250,
    requirement: { type: 'masses_served', value: 50, description: 'Servir em 50 missas' }
  },
  {
    code: 'hundred_masses',
    name: 'Centuriao Eucaristico',
    description: 'Serviu em 100 missas',
    category: 'milestone' as const,
    rarity: 'epic' as const,
    iconName: 'Crown',
    iconColor: 'yellow',
    pointsAwarded: 500,
    requirement: { type: 'masses_served', value: 100, description: 'Servir em 100 missas' }
  },

  // Community badges
  {
    code: 'first_substitution',
    name: 'Bom Samaritano',
    description: 'Ajudou alguem assumindo uma substituicao',
    category: 'community' as const,
    rarity: 'common' as const,
    iconName: 'Heart',
    iconColor: 'red',
    pointsAwarded: 50,
    requirement: { type: 'substitutions_helped', value: 1, description: 'Aceitar 1 substituicao' }
  },
  {
    code: 'five_substitutions',
    name: 'Anjo da Guarda',
    description: 'Ajudou em 5 substituicoes',
    category: 'community' as const,
    rarity: 'uncommon' as const,
    iconName: 'Shield',
    iconColor: 'blue',
    pointsAwarded: 100,
    requirement: { type: 'substitutions_helped', value: 5, description: 'Aceitar 5 substituicoes' }
  },
  {
    code: 'twenty_substitutions',
    name: 'Pilar da Comunidade',
    description: 'Ajudou em 20 substituicoes',
    category: 'community' as const,
    rarity: 'rare' as const,
    iconName: 'Building',
    iconColor: 'purple',
    pointsAwarded: 300,
    requirement: { type: 'substitutions_helped', value: 20, description: 'Aceitar 20 substituicoes' }
  },

  // Formation badges
  {
    code: 'first_material',
    name: 'Estudante',
    description: 'Completou seu primeiro material de formacao',
    category: 'formation' as const,
    rarity: 'common' as const,
    iconName: 'BookOpen',
    iconColor: 'green',
    pointsAwarded: 30,
    requirement: { type: 'materials_completed', value: 1, description: 'Completar 1 material' }
  },
  {
    code: 'ten_materials',
    name: 'Sabio',
    description: 'Completou 10 materiais de formacao',
    category: 'formation' as const,
    rarity: 'uncommon' as const,
    iconName: 'GraduationCap',
    iconColor: 'blue',
    pointsAwarded: 150,
    requirement: { type: 'materials_completed', value: 10, description: 'Completar 10 materiais' }
  },
  {
    code: 'quiz_master',
    name: 'Mestre dos Quizzes',
    description: 'Completou 10 quizzes com nota maxima',
    category: 'formation' as const,
    rarity: 'rare' as const,
    iconName: 'Brain',
    iconColor: 'purple',
    pointsAwarded: 200,
    requirement: { type: 'quizzes_perfect', value: 10, description: '10 quizzes com 100%' }
  },

  // Streak badges
  {
    code: 'week_streak',
    name: 'Consistente',
    description: 'Serviu por 4 semanas consecutivas',
    category: 'streak' as const,
    rarity: 'uncommon' as const,
    iconName: 'Flame',
    iconColor: 'orange',
    pointsAwarded: 100,
    requirement: { type: 'streak', value: 4, description: '4 semanas consecutivas' }
  },
  {
    code: 'month_streak',
    name: 'Inabalavel',
    description: 'Serviu por 12 semanas consecutivas',
    category: 'streak' as const,
    rarity: 'rare' as const,
    iconName: 'Zap',
    iconColor: 'yellow',
    pointsAwarded: 300,
    requirement: { type: 'streak', value: 12, description: '12 semanas consecutivas' }
  },
  {
    code: 'year_streak',
    name: 'Lenda Viva',
    description: 'Serviu por 52 semanas consecutivas',
    category: 'streak' as const,
    rarity: 'legendary' as const,
    iconName: 'Star',
    iconColor: 'gold',
    pointsAwarded: 1000,
    requirement: { type: 'streak', value: 52, description: '52 semanas consecutivas' }
  },

  // Milestone badges
  {
    code: 'level_5',
    name: 'Ascensao',
    description: 'Alcancou o nivel 5',
    category: 'milestone' as const,
    rarity: 'uncommon' as const,
    iconName: 'TrendingUp',
    iconColor: 'green',
    pointsAwarded: 100,
    requirement: { type: 'level', value: 5, description: 'Alcancar nivel 5' }
  },
  {
    code: 'level_10',
    name: 'Apice',
    description: 'Alcancou o nivel maximo',
    category: 'milestone' as const,
    rarity: 'legendary' as const,
    iconName: 'Trophy',
    iconColor: 'gold',
    pointsAwarded: 500,
    requirement: { type: 'level', value: 10, description: 'Alcancar nivel 10' }
  },

  // Special badges
  {
    code: 'early_adopter',
    name: 'Pioneiro',
    description: 'Um dos primeiros a usar o sistema',
    category: 'special' as const,
    rarity: 'epic' as const,
    iconName: 'Rocket',
    iconColor: 'purple',
    pointsAwarded: 200,
    requirement: { type: 'special', value: 1, description: 'Badge especial' },
    isSecret: true
  }
];

/**
 * Initialize user points record if not exists
 */
export async function initializeUserPoints(userId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId));

  if (!existing) {
    await db.insert(userPoints).values({
      userId,
      totalPoints: 0,
      level: 1,
      levelProgress: 0
    });
  }
}

/**
 * Award points to user
 */
export async function awardPoints(
  userId: string,
  action: keyof typeof POINT_VALUES | string,
  customPoints?: number,
  description?: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<{ points: number; newTotal: number; leveledUp: boolean; newLevel?: number }> {
  await initializeUserPoints(userId);

  const points = customPoints ?? POINT_VALUES[action as keyof typeof POINT_VALUES] ?? 0;

  // Create transaction record
  await db.insert(pointTransactions).values({
    userId,
    action: action as any,
    points,
    description: description || `Pontos por ${action}`,
    relatedEntityType,
    relatedEntityId
  });

  // Update user points
  const [userPointsRecord] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId));

  const newTotal = (userPointsRecord?.totalPoints || 0) + points;
  const currentLevel = userPointsRecord?.level || 1;
  const newLevel = calculateLevel(newTotal);
  const leveledUp = newLevel > currentLevel;

  // Calculate progress to next level
  const currentLevelThreshold = LEVEL_THRESHOLDS.find(l => l.level === newLevel);
  const nextLevelThreshold = LEVEL_THRESHOLDS.find(l => l.level === newLevel + 1);

  let levelProgress = 100;
  if (nextLevelThreshold && currentLevelThreshold) {
    const pointsInLevel = newTotal - currentLevelThreshold.minPoints;
    const pointsNeeded = nextLevelThreshold.minPoints - currentLevelThreshold.minPoints;
    levelProgress = Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100));
  }

  await db
    .update(userPoints)
    .set({
      totalPoints: newTotal,
      level: newLevel,
      levelProgress,
      lastActivityAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(userPoints.userId, userId));

  // Check for level-up badge
  if (leveledUp && (newLevel === 5 || newLevel === 10)) {
    const badgeCode = newLevel === 5 ? 'level_5' : 'level_10';
    await awardBadge(userId, badgeCode);
  }

  return { points, newTotal, leveledUp, newLevel: leveledUp ? newLevel : undefined };
}

/**
 * Calculate user level based on points
 */
export function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].minPoints) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

/**
 * Get user's gamification profile
 */
export async function getUserGamificationProfile(userId: string) {
  await initializeUserPoints(userId);

  const [pointsRecord] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId));

  const earnedBadges = await db
    .select({
      badge: badges,
      earnedAt: userBadges.earnedAt,
      isFeatured: userBadges.isFeatured
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.earnedAt));

  const recentTransactions = await db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(10);

  const levelInfo = LEVEL_THRESHOLDS.find(l => l.level === (pointsRecord?.level || 1));
  const nextLevelInfo = LEVEL_THRESHOLDS.find(l => l.level === (pointsRecord?.level || 1) + 1);

  return {
    points: pointsRecord?.totalPoints || 0,
    level: pointsRecord?.level || 1,
    levelName: levelInfo?.name || 'Iniciante',
    levelColor: levelInfo?.color || 'gray',
    levelProgress: pointsRecord?.levelProgress || 0,
    nextLevelPoints: nextLevelInfo?.minPoints || null,
    currentStreak: pointsRecord?.currentStreak || 0,
    longestStreak: pointsRecord?.longestStreak || 0,
    massesServed: pointsRecord?.massesServed || 0,
    substitutionsHelped: pointsRecord?.substitutionsHelped || 0,
    materialsCompleted: pointsRecord?.materialsCompleted || 0,
    badges: earnedBadges.map((eb: typeof earnedBadges[number]) => ({
      ...eb.badge,
      earnedAt: eb.earnedAt,
      isFeatured: eb.isFeatured
    })),
    recentActivity: recentTransactions
  };
}

/**
 * Award badge to user
 */
export async function awardBadge(userId: string, badgeCode: string): Promise<boolean> {
  // Get badge
  const [badge] = await db
    .select()
    .from(badges)
    .where(eq(badges.code, badgeCode));

  if (!badge) {
    console.warn(`Badge ${badgeCode} not found`);
    return false;
  }

  // Check if already earned
  const [existing] = await db
    .select()
    .from(userBadges)
    .where(and(
      eq(userBadges.userId, userId),
      eq(userBadges.badgeId, badge.id)
    ));

  if (existing) {
    return false; // Already has badge
  }

  // Award badge
  await db.insert(userBadges).values({
    userId,
    badgeId: badge.id
  });

  // Award bonus points for badge
  if (badge.pointsAwarded && badge.pointsAwarded > 0) {
    await awardPoints(
      userId,
      'badge_earned',
      badge.pointsAwarded,
      `Badge conquistado: ${badge.name}`,
      'badge',
      badge.id
    );
  }

  return true;
}

/**
 * Check and award badges based on user stats
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const [stats] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId));

  if (!stats) return [];

  const awardedBadges: string[] = [];
  const allBadges = await db.select().from(badges).where(eq(badges.isActive, true));

  for (const badge of allBadges) {
    if (!badge.requirement) continue;

    const req = badge.requirement as { type: string; value: number };
    let shouldAward = false;

    switch (req.type) {
      case 'masses_served':
        shouldAward = (stats.massesServed || 0) >= req.value;
        break;
      case 'substitutions_helped':
        shouldAward = (stats.substitutionsHelped || 0) >= req.value;
        break;
      case 'materials_completed':
        shouldAward = (stats.materialsCompleted || 0) >= req.value;
        break;
      case 'streak':
        shouldAward = (stats.currentStreak || 0) >= req.value || (stats.longestStreak || 0) >= req.value;
        break;
      case 'level':
        shouldAward = (stats.level || 1) >= req.value;
        break;
    }

    if (shouldAward) {
      const awarded = await awardBadge(userId, badge.code);
      if (awarded) {
        awardedBadges.push(badge.code);
      }
    }
  }

  return awardedBadges;
}

/**
 * Update user stats and check badges
 */
export async function updateUserStats(
  userId: string,
  updates: {
    massesServed?: number;
    substitutionsHelped?: number;
    materialsCompleted?: number;
    quizzesCompleted?: number;
  }
): Promise<void> {
  await initializeUserPoints(userId);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.massesServed !== undefined) {
    updateData.massesServed = sql`COALESCE(masses_served, 0) + ${updates.massesServed}`;
  }
  if (updates.substitutionsHelped !== undefined) {
    updateData.substitutionsHelped = sql`COALESCE(substitutions_helped, 0) + ${updates.substitutionsHelped}`;
  }
  if (updates.materialsCompleted !== undefined) {
    updateData.materialsCompleted = sql`COALESCE(materials_completed, 0) + ${updates.materialsCompleted}`;
  }
  if (updates.quizzesCompleted !== undefined) {
    updateData.quizzesCompleted = sql`COALESCE(quizzes_completed, 0) + ${updates.quizzesCompleted}`;
  }

  await db
    .update(userPoints)
    .set(updateData)
    .where(eq(userPoints.userId, userId));

  // Check and award any new badges
  await checkAndAwardBadges(userId);
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  period: 'weekly' | 'monthly' | 'yearly' | 'alltime' = 'alltime',
  limit: number = 10
) {
  // For simplicity, we'll query directly instead of using cache
  // In production, you'd want to use the cache table and update it periodically

  const leaderboardData = await db
    .select({
      userId: userPoints.userId,
      totalPoints: userPoints.totalPoints,
      level: userPoints.level,
      userName: users.name,
      userPhotoUrl: users.photoUrl
    })
    .from(userPoints)
    .innerJoin(users, eq(userPoints.userId, users.id))
    .where(eq(users.status, 'active'))
    .orderBy(desc(userPoints.totalPoints))
    .limit(limit);

  return leaderboardData.map((entry: typeof leaderboardData[number], index: number) => ({
    rank: index + 1,
    userId: entry.userId,
    points: entry.totalPoints || 0,
    level: entry.level || 1,
    userName: entry.userName,
    userPhotoUrl: entry.userPhotoUrl
  }));
}

/**
 * Get user rank
 */
export async function getUserRank(userId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) + 1 as rank
    FROM user_points up
    JOIN users u ON up.user_id = u.id
    WHERE u.status = 'active'
    AND up.total_points > (
      SELECT COALESCE(total_points, 0)
      FROM user_points
      WHERE user_id = ${userId}
    )
  `);

  return (result.rows[0] as any)?.rank || 1;
}

/**
 * Seed default badges
 */
export async function seedDefaultBadges(): Promise<void> {
  for (const badge of DEFAULT_BADGES) {
    const [existing] = await db
      .select()
      .from(badges)
      .where(eq(badges.code, badge.code));

    if (!existing) {
      await db.insert(badges).values(badge as any);
      console.log(`Badge '${badge.name}' created`);
    }
  }
}

/**
 * Seed level definitions
 */
export async function seedLevelDefinitions(): Promise<void> {
  for (const level of LEVEL_THRESHOLDS) {
    const [existing] = await db
      .select()
      .from(levelDefinitions)
      .where(eq(levelDefinitions.level, level.level));

    if (!existing) {
      await db.insert(levelDefinitions).values({
        level: level.level,
        name: level.name,
        minPoints: level.minPoints,
        color: level.color
      });
    }
  }
}
