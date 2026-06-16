/**
 * 🤖 ADAPTIVE LEARNING - PHASE 3: Schedule Comparison System
 *
 * Compares auto-generated schedules with manually published ones
 * to identify patterns and improve future generations.
 *
 * Uses the `differences` JSON stored in `scheduleGenerations` table
 * (calculated when a generation is published via the generation route).
 *
 * This service tracks:
 * - Ministers removed by coordinators (tracks manual removal)
 * - Ministers added manually (potential candidates for future)
 * - Patterns in coordinator modifications
 * - Algorithm acceptance rate
 */

import { db } from '../db';
import { scheduleGenerations, users } from '../../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { trackManualRemoval } from './reliabilityScoreService';

export interface ScheduleComparison {
  date: string;
  time: string;
  generatedMinisters: string[]; // IDs from auto-generation
  publishedMinisters: string[]; // IDs in final published version
  removedMinisters: string[];   // Removed by coordinator
  addedMinisters: string[];     // Added by coordinator
  wasModified: boolean;
}

export interface LearningReport {
  month: number;
  year: number;
  totalSchedules: number;
  modifiedSchedules: number;
  acceptanceRate: number; // Percentage of schedules accepted without changes

  // Minister-level insights
  frequentlyRemovedMinisters: Array<{
    ministerId: string;
    ministerName: string;
    removalCount: number;
    reliabilityScore: number;
  }>;

  frequentlyAddedMinisters: Array<{
    ministerId: string;
    ministerName: string;
    additionCount: number;
    reliabilityScore: number;
  }>;

  // Mass time patterns
  massTimesWithMostChanges: Array<{
    time: string;
    changeCount: number;
  }>;

  // Overall health metrics
  algorithmHealth: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  recommendations: string[];
}

// Interfaces for the differences JSON stored in scheduleGenerations
interface DiffChange {
  type: 'minister_removed' | 'minister_added' | 'minister_changed' | string;
  date: string;
  time: string;
  original?: { id: string | null; name: string; position?: number } | null;
  final?: { id: string | null; name: string; position?: number } | null;
}

interface DiffSummary {
  totalChanges: number;
  [key: string]: unknown;
}

interface StoredDifferences {
  summary: DiffSummary;
  changes: DiffChange[];
}

/**
 * Extract comparisons from the stored differences in scheduleGenerations.
 * Groups changes by date+time to produce per-slot comparisons.
 */
function extractComparisonsFromDifferences(differences: StoredDifferences): ScheduleComparison[] {
  if (!differences?.changes || !Array.isArray(differences.changes)) {
    return [];
  }

  // Group changes by date+time
  const slotMap = new Map<string, { date: string; time: string; removed: string[]; added: string[] }>();

  for (const change of differences.changes) {
    if (!change.date || !change.time) continue;

    const key = `${change.date}|${change.time}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, { date: change.date, time: change.time, removed: [], added: [] });
    }
    const slot = slotMap.get(key)!;

    if (change.type === 'minister_removed' && change.original?.id) {
      slot.removed.push(change.original.id);
    } else if (change.type === 'minister_added' && change.final?.id) {
      slot.added.push(change.final.id);
    }
  }

  const comparisons: ScheduleComparison[] = [];
  for (const slot of slotMap.values()) {
    const wasModified = slot.removed.length > 0 || slot.added.length > 0;
    comparisons.push({
      date: slot.date,
      time: slot.time,
      generatedMinisters: [], // Not tracked per-slot, only diffs
      publishedMinisters: [],
      removedMinisters: slot.removed,
      addedMinisters: slot.added,
      wasModified,
    });
  }

  return comparisons;
}

/**
 * Compare and learn from all schedules in a month.
 * Uses the `differences` JSON from `scheduleGenerations` table.
 */
export async function compareAndLearn(
  month: number,
  year: number
): Promise<ScheduleComparison[]> {
  console.log(`[COMPARISON] Analyzing schedules for ${year}-${String(month).padStart(2, '0')}`);

  // Look up the published generation record for this month
  const generations = await db
    .select({
      id: scheduleGenerations.id,
      differences: scheduleGenerations.differences,
    })
    .from(scheduleGenerations)
    .where(
      and(
        eq(scheduleGenerations.month, month),
        eq(scheduleGenerations.year, year),
        eq(scheduleGenerations.status, 'published')
      )
    );

  if (generations.length === 0) {
    console.log(`[COMPARISON] No published generation found for ${month}/${year} - skipping comparison`);
    return [];
  }

  // Use the most recent generation (last one)
  const generation = generations[generations.length - 1];
  const differences = generation.differences as StoredDifferences | null;

  if (!differences || !differences.changes) {
    console.log(`[COMPARISON] No differences data in generation ${generation.id} - schedule was accepted as-is`);
    return [];
  }

  const comparisons = extractComparisonsFromDifferences(differences);

  console.log(`[COMPARISON] Found ${comparisons.length} time slots with changes`);

  // Track manual removals for reliability scoring
  for (const comparison of comparisons) {
    if (!comparison.wasModified) continue;

    for (const ministerId of comparison.removedMinisters) {
      try {
        await trackManualRemoval(
          ministerId,
          generation.id,
          `Removed during ${year}-${month} schedule publication`
        );
      } catch (err) {
        console.error(`[COMPARISON] Failed to track removal for minister ${ministerId}:`, err);
      }
    }
  }

  const modifiedCount = comparisons.filter(c => c.wasModified).length;
  const totalSlots = comparisons.length;
  const acceptanceRate = totalSlots > 0
    ? ((totalSlots - modifiedCount) / totalSlots * 100).toFixed(1)
    : '100.0';

  console.log(`[COMPARISON] Monthly Summary: ${totalSlots} slots, ${modifiedCount} modified, ${acceptanceRate}% acceptance`);

  return comparisons;
}

/**
 * Analyze monthly patterns and generate learning report
 */
export async function analyzeMonthlyPatterns(
  month: number,
  year: number
): Promise<LearningReport> {
  console.log(`[LEARNING] Generating learning report for ${year}-${month}`);

  const comparisons = await compareAndLearn(month, year);
  const totalSchedules = comparisons.length;
  const modifiedSchedules = comparisons.filter(c => c.wasModified).length;
  const acceptanceRate = totalSchedules > 0
    ? ((totalSchedules - modifiedSchedules) / totalSchedules * 100)
    : 100;

  // Track which ministers were frequently removed/added
  const removalCounts = new Map<string, number>();
  const additionCounts = new Map<string, number>();
  const massTimeChanges = new Map<string, number>();

  for (const comparison of comparisons) {
    if (!comparison.wasModified) continue;

    for (const ministerId of comparison.removedMinisters) {
      removalCounts.set(ministerId, (removalCounts.get(ministerId) || 0) + 1);
    }

    for (const ministerId of comparison.addedMinisters) {
      additionCounts.set(ministerId, (additionCounts.get(ministerId) || 0) + 1);
    }

    massTimeChanges.set(
      comparison.time,
      (massTimeChanges.get(comparison.time) || 0) + 1
    );
  }

  // Get minister details
  const removedMinistersRaw = await getMinisterDetails(removalCounts);
  const frequentlyRemovedMinisters = removedMinistersRaw.map(m => ({
    ministerId: m.ministerId,
    ministerName: m.ministerName,
    removalCount: m.count,
    reliabilityScore: m.reliabilityScore,
  }));
  const addedMinistersRaw = await getMinisterDetails(additionCounts);
  const frequentlyAddedMinisters = addedMinistersRaw.map(m => ({
    ministerId: m.ministerId,
    ministerName: m.ministerName,
    additionCount: m.count,
    reliabilityScore: m.reliabilityScore,
  }));

  // Sort mass times by change count
  const massTimesWithMostChanges = Array.from(massTimeChanges.entries())
    .map(([time, count]) => ({ time, changeCount: count }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 5);

  // Determine algorithm health
  let algorithmHealth: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  if (acceptanceRate >= 85) algorithmHealth = 'excellent';
  else if (acceptanceRate >= 70) algorithmHealth = 'good';
  else if (acceptanceRate >= 50) algorithmHealth = 'needs_improvement';
  else algorithmHealth = 'critical';

  // Generate recommendations
  const recommendations: string[] = [];

  if (acceptanceRate < 85) {
    recommendations.push(`Acceptance rate (${acceptanceRate.toFixed(1)}%) is below target (85%). Review algorithm parameters.`);
  }

  if (frequentlyRemovedMinisters.length > 0) {
    recommendations.push(
      `${frequentlyRemovedMinisters.length} ministers were frequently removed. Their reliability scores have been automatically adjusted.`
    );
  }

  if (massTimesWithMostChanges.length > 0 && massTimesWithMostChanges[0].changeCount > 3) {
    recommendations.push(
      `Mass time "${massTimesWithMostChanges[0].time}" had ${massTimesWithMostChanges[0].changeCount} modifications. Review availability patterns for this time.`
    );
  }

  const report: LearningReport = {
    month,
    year,
    totalSchedules,
    modifiedSchedules,
    acceptanceRate,
    frequentlyRemovedMinisters,
    frequentlyAddedMinisters,
    massTimesWithMostChanges,
    algorithmHealth,
    recommendations,
  };

  console.log(`[LEARNING] Report: health=${algorithmHealth}, acceptance=${acceptanceRate.toFixed(1)}%, recommendations=${recommendations.length}`);

  return report;
}

/**
 * Helper: Get minister details with counts (safe query using inArray)
 */
async function getMinisterDetails(
  counts: Map<string, number>
): Promise<Array<{
  ministerId: string;
  ministerName: string;
  count: number;
  reliabilityScore: number;
}>> {
  const ministerIds = Array.from(counts.keys());

  if (ministerIds.length === 0) return [];

  const ministers = await db
    .select({
      id: users.id,
      name: users.name,
      reliabilityScore: users.reliabilityScore,
    })
    .from(users)
    .where(inArray(users.id, ministerIds));

  return ministers
    .map(m => ({
      ministerId: m.id,
      ministerName: m.name,
      count: counts.get(m.id) || 0,
      reliabilityScore: m.reliabilityScore || 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Get learning insights for a specific minister
 */
export async function getMinisterLearningInsights(ministerId: string): Promise<{
  ministerId: string;
  ministerName: string;
  reliabilityScore: number;
  totalRemovals: number;
  recentRemovals: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendation: string;
}> {
  const minister = await db
    .select({
      id: users.id,
      name: users.name,
      reliabilityScore: users.reliabilityScore,
      manualRemovalCount: users.manualRemovalCount,
    })
    .from(users)
    .where(eq(users.id, ministerId))
    .limit(1);

  if (minister.length === 0) {
    throw new Error(`Minister ${ministerId} not found`);
  }

  const ministerData = minister[0];
  const totalRemovals = ministerData.manualRemovalCount || 0;
  const recentRemovals = totalRemovals;

  const reliabilityScore = ministerData.reliabilityScore || 100;
  let trend: 'improving' | 'stable' | 'declining';
  if (reliabilityScore >= 90) trend = 'stable';
  else if (reliabilityScore >= 70) trend = 'improving';
  else trend = 'declining';

  let recommendation = '';
  if (reliabilityScore < 50) {
    recommendation = 'CRITICAL: Consider discussing with minister about availability and commitment.';
  } else if (reliabilityScore < 70) {
    recommendation = 'ATTENTION: Monitor closely. Reliability score is below average.';
  } else if (reliabilityScore >= 95) {
    recommendation = 'EXCELLENT: Highly reliable minister. Prioritize in future schedules.';
  } else {
    recommendation = 'GOOD: Performing well. Continue current pattern.';
  }

  return {
    ministerId: ministerData.id,
    ministerName: ministerData.name,
    reliabilityScore,
    totalRemovals,
    recentRemovals,
    trend,
    recommendation,
  };
}
