/**
 * 🤖 ADAPTIVE LEARNING: Reliability Score Service
 *
 * This service calculates and maintains reliability scores for ministers based on their behavior.
 * Similar to social media algorithms, it tracks patterns and adjusts minister prioritization.
 *
 * Scoring Formula:
 * reliabilityScore = 100 - (substitutionPenalty + manualRemovalPenalty + noShowPenalty)
 *
 * Components:
 * - Substitution Penalty (40% weight): More substitution requests = lower score
 * - Manual Removal Penalty (40% weight): Removed from auto-generated schedules = lower score
 * - No-Show Penalty (20% weight): Failed to attend scheduled masses = severe penalty
 */

import { db } from '../db';
import { users, substitutionRequests, notifications } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface ReliabilityMetrics {
  ministerId: string;
  ministerName: string;
  reliabilityScore: number;
  substitutionRequestCount: number;
  substitutionFulfilledCount: number;
  manualRemovalCount: number;
  noShowCount: number;
  lastUpdate: Date | null;
  trend: 'improving' | 'declining' | 'stable';
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface ReliabilityScoreComponents {
  baseScore: number;
  substitutionPenalty: number;
  manualRemovalPenalty: number;
  noShowPenalty: number;
  helpBonus: number;
  finalScore: number;
}

/**
 * Penalty constants (similar to credit score algorithms)
 */
const PENALTIES = {
  SUBSTITUTION_REQUEST: 5,      // Each substitution request reduces score by 5 points
  MANUAL_REMOVAL: 8,             // Each manual removal reduces score by 8 points
  NO_SHOW: 20,                   // Each no-show drastically reduces score by 20 points
};

const BONUSES = {
  SUBSTITUTION_FULFILLED: 3,     // Each time helping as substitute adds 3 points (max +15)
};

const SCORE_CATEGORIES = {
  EXCELLENT: { min: 90, max: 100, label: 'Excelente' },
  GOOD: { min: 75, max: 89, label: 'Bom' },
  FAIR: { min: 60, max: 74, label: 'Regular' },
  POOR: { min: 40, max: 59, label: 'Ruim' },
  CRITICAL: { min: 0, max: 39, label: 'Crítico' }
};

/**
 * Calculate reliability score components for a minister
 */
export function calculateReliabilityScore(
  substitutionRequestCount: number,
  substitutionFulfilledCount: number,
  manualRemovalCount: number,
  noShowCount: number
): ReliabilityScoreComponents {
  const baseScore = 100;

  // Calculate penalties
  const substitutionPenalty = substitutionRequestCount * PENALTIES.SUBSTITUTION_REQUEST;
  const manualRemovalPenalty = manualRemovalCount * PENALTIES.MANUAL_REMOVAL;
  const noShowPenalty = noShowCount * PENALTIES.NO_SHOW;

  // Calculate bonuses (capped at +15 to prevent gaming the system)
  const helpBonus = Math.min(substitutionFulfilledCount * BONUSES.SUBSTITUTION_FULFILLED, 15);

  // Final score (cannot go below 0 or above 100)
  let finalScore = baseScore - substitutionPenalty - manualRemovalPenalty - noShowPenalty + helpBonus;
  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    baseScore,
    substitutionPenalty,
    manualRemovalPenalty,
    noShowPenalty,
    helpBonus,
    finalScore
  };
}

/**
 * Get score category based on final score
 */
export function getScoreCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= SCORE_CATEGORIES.EXCELLENT.min) return 'excellent';
  if (score >= SCORE_CATEGORIES.GOOD.min) return 'good';
  if (score >= SCORE_CATEGORIES.FAIR.min) return 'fair';
  if (score >= SCORE_CATEGORIES.POOR.min) return 'poor';
  return 'critical';
}

/**
 * Get current reliability score for a specific minister (without updating)
 */
export async function getMinisterReliabilityScore(ministerId: string): Promise<ReliabilityMetrics | null> {
  try {
    const [minister] = await db
      .select()
      .from(users)
      .where(eq(users.id, ministerId))
      .limit(1);

    if (!minister) {
      return null;
    }

    const score = minister.reliabilityScore || 100;

    return {
      ministerId,
      ministerName: minister.name,
      reliabilityScore: score,
      substitutionRequestCount: minister.substitutionRequestCount || 0,
      substitutionFulfilledCount: minister.substitutionFulfilledCount || 0,
      manualRemovalCount: minister.manualRemovalCount || 0,
      noShowCount: minister.noShowCount || 0,
      lastUpdate: minister.lastReliabilityUpdate,
      trend: 'stable', // Trend calculation would require historical data
      category: getScoreCategory(score),
    };
  } catch (error) {
    logger.error(`Error getting reliability score for minister ${ministerId}:`, error);
    return null;
  }
}

/**
 * Recalculate and update reliability score for a specific minister
 */
export async function updateMinisterReliabilityScore(ministerId: string): Promise<ReliabilityMetrics | null> {
  try {
    // Get current minister data
    const [minister] = await db
      .select()
      .from(users)
      .where(eq(users.id, ministerId))
      .limit(1);

    if (!minister) {
      logger.error(`Minister ${ministerId} not found for reliability update`);
      return null;
    }

    // Calculate new score
    const scoreComponents = calculateReliabilityScore(
      minister.substitutionRequestCount || 0,
      minister.substitutionFulfilledCount || 0,
      minister.manualRemovalCount || 0,
      minister.noShowCount || 0
    );

    // Determine trend (comparing with previous score)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    const oldScore = minister.reliabilityScore || 100;
    if (scoreComponents.finalScore > oldScore + 5) trend = 'improving';
    else if (scoreComponents.finalScore < oldScore - 5) trend = 'declining';

    // Update database
    await db
      .update(users)
      .set({
        reliabilityScore: scoreComponents.finalScore,
        lastReliabilityUpdate: new Date()
      })
      .where(eq(users.id, ministerId));

    const metrics: ReliabilityMetrics = {
      ministerId,
      ministerName: minister.name,
      reliabilityScore: scoreComponents.finalScore,
      substitutionRequestCount: minister.substitutionRequestCount || 0,
      substitutionFulfilledCount: minister.substitutionFulfilledCount || 0,
      manualRemovalCount: minister.manualRemovalCount || 0,
      noShowCount: minister.noShowCount || 0,
      lastUpdate: new Date(),
      trend,
      category: getScoreCategory(scoreComponents.finalScore)
    };

    logger.info(`[RELIABILITY] Updated score for ${minister.name}: ${oldScore} → ${scoreComponents.finalScore} (${trend})`);

    return metrics;
  } catch (error) {
    logger.error(`Error updating reliability score for minister ${ministerId}:`, error);
    return null;
  }
}

/**
 * Track substitution request (when a minister asks for a substitute)
 */
export async function trackSubstitutionRequest(ministerId: string, scheduleId: string): Promise<void> {
  try {
    // Increment substitution request count
    await db
      .update(users)
      .set({
        substitutionRequestCount: sql`${users.substitutionRequestCount} + 1`
      })
      .where(eq(users.id, ministerId));

    logger.info(`[RELIABILITY] Tracked substitution request for minister ${ministerId}`);

    // Recalculate reliability score
    await updateMinisterReliabilityScore(ministerId);
  } catch (error) {
    logger.error(`Error tracking substitution request:`, error);
  }
}

/**
 * Track substitution fulfillment (when a minister helps as a substitute)
 */
export async function trackSubstitutionFulfillment(substituteId: string, scheduleId: string): Promise<void> {
  try {
    // Increment substitution fulfilled count
    await db
      .update(users)
      .set({
        substitutionFulfilledCount: sql`${users.substitutionFulfilledCount} + 1`
      })
      .where(eq(users.id, substituteId));

    logger.info(`[RELIABILITY] Tracked substitution fulfillment for minister ${substituteId} (BONUS)`);

    // Recalculate reliability score (will add bonus)
    await updateMinisterReliabilityScore(substituteId);
  } catch (error) {
    logger.error(`Error tracking substitution fulfillment:`, error);
  }
}

/**
 * Track manual removal from auto-generated schedule
 */
export async function trackManualRemoval(ministerId: string, scheduleId: string, reason?: string): Promise<void> {
  try {
    // Increment manual removal count
    await db
      .update(users)
      .set({
        manualRemovalCount: sql`${users.manualRemovalCount} + 1`,
        reliabilityNotes: reason
          ? sql`COALESCE(${users.reliabilityNotes}, '') || E'\n[' || NOW() || '] Manual removal: ' || ${reason}`
          : users.reliabilityNotes
      })
      .where(eq(users.id, ministerId));

    logger.warn(`[RELIABILITY] Tracked manual removal for minister ${ministerId}${reason ? `: ${reason}` : ''}`);

    // Recalculate reliability score
    await updateMinisterReliabilityScore(ministerId);
  } catch (error) {
    logger.error(`Error tracking manual removal:`, error);
  }
}

/**
 * Track no-show (minister failed to attend scheduled mass)
 */
export async function trackNoShow(ministerId: string, scheduleId: string, notes?: string): Promise<void> {
  try {
    // Increment no-show count (severe penalty)
    await db
      .update(users)
      .set({
        noShowCount: sql`${users.noShowCount} + 1`,
        reliabilityNotes: notes
          ? sql`COALESCE(${users.reliabilityNotes}, '') || E'\n[' || NOW() || '] No-show: ' || ${notes}`
          : sql`COALESCE(${users.reliabilityNotes}, '') || E'\n[' || NOW() || '] No-show registrado'`
      })
      .where(eq(users.id, ministerId));

    logger.error(`[RELIABILITY] 🚨 NO-SHOW tracked for minister ${ministerId} - SEVERE PENALTY`);

    // Recalculate reliability score (severe impact)
    const metrics = await updateMinisterReliabilityScore(ministerId);

    // Alert if score drops to critical
    if (metrics && metrics.category === 'critical') {
      logger.error(`[RELIABILITY] ⚠️ ALERT: Minister ${metrics.ministerName} now has CRITICAL reliability score: ${metrics.reliabilityScore}`);
    }
  } catch (error) {
    logger.error(`Error tracking no-show:`, error);
  }
}

/**
 * Get all ministers with their reliability metrics
 */
export async function getAllReliabilityMetrics(): Promise<ReliabilityMetrics[]> {
  try {
    const ministers = await db
      .select({
        id: users.id,
        name: users.name,
        reliabilityScore: users.reliabilityScore,
        substitutionRequestCount: users.substitutionRequestCount,
        substitutionFulfilledCount: users.substitutionFulfilledCount,
        manualRemovalCount: users.manualRemovalCount,
        noShowCount: users.noShowCount,
        lastReliabilityUpdate: users.lastReliabilityUpdate
      })
      .from(users)
      .where(eq(users.status, 'active'));

    return ministers.map(m => {
      const score = m.reliabilityScore || 100;
      return {
        ministerId: m.id,
        ministerName: m.name,
        reliabilityScore: score,
        substitutionRequestCount: m.substitutionRequestCount || 0,
        substitutionFulfilledCount: m.substitutionFulfilledCount || 0,
        manualRemovalCount: m.manualRemovalCount || 0,
        noShowCount: m.noShowCount || 0,
        lastUpdate: m.lastReliabilityUpdate,
        trend: 'stable',
        category: getScoreCategory(score)
      };
    });
  } catch (error) {
    logger.error('Error getting all reliability metrics:', error);
    return [];
  }
}

/**
 * Get ministers with low reliability (for coordinator alerts)
 */
export async function getLowReliabilityMinisters(threshold: number = 60): Promise<ReliabilityMetrics[]> {
  try {
    const allMetrics = await getAllReliabilityMetrics();
    return allMetrics.filter(m => m.reliabilityScore < threshold);
  } catch (error) {
    logger.error('Error getting low reliability ministers:', error);
    return [];
  }
}

/**
 * 🤖 ADAPTIVE LEARNING - PHASE 5: Automated Alert System
 * Check for ministers with low reliability and send notifications to coordinators
 */
export async function checkAndAlertLowReliability(): Promise<{
  alertsSent: number;
  ministersChecked: number;
  criticalMinisters: number;
}> {
  try {
    logger.info('[ADAPTIVE ALERTS] 🔍 Running reliability check...');

    const lowReliabilityMinisters = await getLowReliabilityMinisters(50); // Critical threshold
    const ministersChecked = (await getAllReliabilityMetrics()).length;

    logger.info(`[ADAPTIVE ALERTS] Found ${lowReliabilityMinisters.length} ministers with low reliability out of ${ministersChecked} total`);

    if (lowReliabilityMinisters.length === 0) {
      logger.info('[ADAPTIVE ALERTS] ✅ No alerts needed - all ministers have acceptable reliability');
      return {
        alertsSent: 0,
        ministersChecked,
        criticalMinisters: 0,
      };
    }

    // Get all coordinators and gestors
    const coordinators = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          sql`${users.role} IN ('coordenador', 'gestor')`,
          eq(users.status, 'active')
        )
      );

    logger.info(`[ADAPTIVE ALERTS] Notifying ${coordinators.length} coordinators/gestors`);

    let alertsSent = 0;
    let criticalCount = 0;

    for (const minister of lowReliabilityMinisters) {
      const isCritical = minister.category === 'critical'; // Score < 40
      if (isCritical) criticalCount++;

      const message = isCritical
        ? `🚨 CRÍTICO: ${minister.ministerName} está com confiabilidade muito baixa (${minister.reliabilityScore} pontos). ` +
          `Pedidos de substituição: ${minister.substitutionRequestCount}, ` +
          `Remoções manuais: ${minister.manualRemovalCount}, ` +
          `Faltas: ${minister.noShowCount}. ` +
          `Recomenda-se conversar com o ministro.`
        : `⚠️ ATENÇÃO: ${minister.ministerName} está com confiabilidade baixa (${minister.reliabilityScore} pontos). ` +
          `Pedidos de substituição: ${minister.substitutionRequestCount}, ` +
          `Remoções manuais: ${minister.manualRemovalCount}, ` +
          `Faltas: ${minister.noShowCount}.`;

      // Send notification to all coordinators
      for (const coordinator of coordinators) {
        try {
          await db.insert(notifications).values({
            userId: coordinator.id,
            type: isCritical ? 'alert' : 'info',
            title: isCritical
              ? 'Alerta Crítico: Confiabilidade Muito Baixa'
              : 'Atenção: Confiabilidade Baixa',
            message,
            actionUrl: `/admin/users/${minister.ministerId}`, // Link to minister profile
            priority: isCritical ? 'high' : 'medium',
            metadata: JSON.stringify({
              ministerId: minister.ministerId,
              ministerName: minister.ministerName,
              reliabilityScore: minister.reliabilityScore,
              category: minister.category,
              substitutionRequestCount: minister.substitutionRequestCount,
              manualRemovalCount: minister.manualRemovalCount,
              noShowCount: minister.noShowCount,
            }),
          });

          alertsSent++;
        } catch (notifError) {
          logger.error(`[ADAPTIVE ALERTS] Failed to send notification to ${coordinator.name}:`, notifError);
        }
      }

      logger.info(
        `[ADAPTIVE ALERTS] ${isCritical ? '🚨' : '⚠️'} Alert sent for ${minister.ministerName} (score: ${minister.reliabilityScore})`
      );
    }

    logger.info(`[ADAPTIVE ALERTS] ✅ Completed: ${alertsSent} alerts sent for ${lowReliabilityMinisters.length} ministers`);

    return {
      alertsSent,
      ministersChecked,
      criticalMinisters: criticalCount,
    };
  } catch (error) {
    logger.error('[ADAPTIVE ALERTS] ⚠️ Error during reliability check:', error);
    throw error;
  }
}
