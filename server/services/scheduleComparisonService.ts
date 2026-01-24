/**
 * 🤖 ADAPTIVE LEARNING - PHASE 3: Schedule Comparison System
 *
 * Compares auto-generated schedules with manually published ones
 * to identify patterns and improve future generations.
 *
 * This service tracks:
 * - Ministers removed by coordinators (tracks manual removal)
 * - Ministers added manually (potential candidates for future)
 * - Patterns in coordinator modifications
 * - Algorithm acceptance rate
 */

import { db } from '../db';
import { schedules, users } from '../../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { trackManualRemoval } from './reliabilityScoreService';

export interface ScheduleComparison {
  scheduleId: string;
  date: string;
  time: string;
  generatedMinisters: string[]; // IDs from auto-generation
  publishedMinisters: string[]; // IDs in final published version
  removedMinisters: string[];   // Removed by coordinator
  addedMinisters: string[];     // Added by coordinator
  changeReason?: string;
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

/**
 * Compare a single schedule's generated vs published ministers
 */
async function compareSchedule(scheduleId: string): Promise<ScheduleComparison | null> {
  const schedule = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .limit(1);

  if (schedule.length === 0) {
    console.log(`[COMPARISON] Schedule ${scheduleId} not found`);
    return null;
  }

  const scheduleData = schedule[0];

  // Extract minister IDs from both versions
  const generatedMinisters = extractMinisterIds(scheduleData.generatedMinisters);
  const publishedMinisters = extractMinisterIds(scheduleData.assignedMinisters);

  // Find differences
  const removedMinisters = generatedMinisters.filter(id => !publishedMinisters.includes(id));
  const addedMinisters = publishedMinisters.filter(id => !generatedMinisters.includes(id));

  const wasModified = removedMinisters.length > 0 || addedMinisters.length > 0;

  return {
    scheduleId: scheduleData.id,
    date: scheduleData.date.toISOString().split('T')[0],
    time: scheduleData.time,
    generatedMinisters,
    publishedMinisters,
    removedMinisters,
    addedMinisters,
    wasModified,
  };
}

/**
 * Extract minister IDs from ministers JSON field
 */
function extractMinisterIds(ministersData: any): string[] {
  if (!ministersData) return [];

  // Handle both array of objects and direct array formats
  if (Array.isArray(ministersData)) {
    return ministersData
      .filter(m => m && (m.id || m.ministerId))
      .map(m => m.id || m.ministerId);
  }

  return [];
}

/**
 * Compare and learn from all schedules in a month
 * This is the main function called when a schedule is published
 */
export async function compareAndLearn(
  month: number,
  year: number
): Promise<ScheduleComparison[]> {
  console.log(`[COMPARISON] 🔍 Analyzing schedules for ${year}-${String(month).padStart(2, '0')}`);

  // Get all published schedules for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const monthSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.date, startDate),
        lte(schedules.date, endDate),
        eq(schedules.status, 'published')
      )
    );

  console.log(`[COMPARISON] Found ${monthSchedules.length} published schedules`);

  const comparisons: ScheduleComparison[] = [];

  for (const schedule of monthSchedules) {
    const comparison = await compareSchedule(schedule.id);

    if (comparison && comparison.wasModified) {
      comparisons.push(comparison);

      // 🤖 ADAPTIVE LEARNING: Track manual removals
      console.log(`[COMPARISON] 📊 Schedule ${schedule.id} was modified:`);
      console.log(`  - Removed: ${comparison.removedMinisters.length} ministers`);
      console.log(`  - Added: ${comparison.addedMinisters.length} ministers`);

      // Track each removed minister
      for (const ministerId of comparison.removedMinisters) {
        await trackManualRemoval(
          ministerId,
          schedule.id,
          `Removed during ${year}-${month} schedule publication`
        );
        console.log(`[COMPARISON] ⚠️ Tracked manual removal for minister ${ministerId}`);
      }

      // TODO: Future enhancement - track added ministers with small bonus
      // for (const ministerId of comparison.addedMinisters) {
      //   await trackManualAddition(ministerId, schedule.id);
      // }
    } else if (comparison && !comparison.wasModified) {
      comparisons.push(comparison);
      console.log(`[COMPARISON] ✅ Schedule ${schedule.id} accepted without changes`);
    }
  }

  const modifiedCount = comparisons.filter(c => c.wasModified).length;
  const acceptanceRate = comparisons.length > 0
    ? ((comparisons.length - modifiedCount) / comparisons.length * 100).toFixed(1)
    : 0;

  console.log(`[COMPARISON] 📈 Monthly Summary:`);
  console.log(`  - Total schedules: ${comparisons.length}`);
  console.log(`  - Modified: ${modifiedCount}`);
  console.log(`  - Acceptance rate: ${acceptanceRate}%`);

  return comparisons;
}

/**
 * Analyze monthly patterns and generate learning report
 */
export async function analyzeMonthlyPatterns(
  month: number,
  year: number
): Promise<LearningReport> {
  console.log(`[LEARNING] 📊 Generating learning report for ${year}-${month}`);

  const comparisons = await compareAndLearn(month, year);
  const totalSchedules = comparisons.length;
  const modifiedSchedules = comparisons.filter(c => c.wasModified).length;
  const acceptanceRate = totalSchedules > 0
    ? ((totalSchedules - modifiedSchedules) / totalSchedules * 100)
    : 100;

  // Track which ministers were frequently removed
  const removalCounts = new Map<string, number>();
  const additionCounts = new Map<string, number>();
  const massTimeChanges = new Map<string, number>();

  for (const comparison of comparisons) {
    if (!comparison.wasModified) continue;

    // Count removals
    for (const ministerId of comparison.removedMinisters) {
      removalCounts.set(ministerId, (removalCounts.get(ministerId) || 0) + 1);
    }

    // Count additions
    for (const ministerId of comparison.addedMinisters) {
      additionCounts.set(ministerId, (additionCounts.get(ministerId) || 0) + 1);
    }

    // Count changes per mass time
    massTimeChanges.set(
      comparison.time,
      (massTimeChanges.get(comparison.time) || 0) + 1
    );
  }

  // Get minister details for frequently removed
  const frequentlyRemovedMinisters = await getMinisterDetails(removalCounts);
  const addedMinistersRaw = await getMinisterDetails(additionCounts);
  // Map removalCount to additionCount for the added ministers
  const frequentlyAddedMinisters = addedMinistersRaw.map((m: any) => ({
    ministerId: m.ministerId,
    ministerName: m.ministerName,
    additionCount: m.removalCount, // The function returns removalCount but we need additionCount
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

  console.log(`[LEARNING] ✅ Report generated:`);
  console.log(`  - Health: ${algorithmHealth}`);
  console.log(`  - Acceptance: ${acceptanceRate.toFixed(1)}%`);
  console.log(`  - Recommendations: ${recommendations.length}`);

  return report;
}

/**
 * Helper: Get minister details with removal/addition counts
 */
async function getMinisterDetails(
  counts: Map<string, number>
): Promise<Array<{
  ministerId: string;
  ministerName: string;
  removalCount: number;
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
    .where(sql`${users.id} IN ${sql.raw(`('${ministerIds.join("','")}')`)}`)
    .execute();

  return ministers
    .map((m: any) => ({
      ministerId: m.id,
      ministerName: m.name,
      removalCount: counts.get(m.id) || 0,
      reliabilityScore: m.reliabilityScore || 100,
    }))
    .sort((a: any, b: any) => b.removalCount - a.removalCount)
    .slice(0, 10); // Top 10
}

/**
 * Get learning insights for a specific minister
 */
export async function getMinisterLearningInsights(ministerId: string): Promise<{
  ministerId: string;
  ministerName: string;
  reliabilityScore: number;
  totalRemovals: number;
  recentRemovals: number; // Last 3 months
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

  // TODO: Track recent removals from audit log when available
  const recentRemovals = totalRemovals; // Placeholder

  // Determine trend based on reliability score
  const reliabilityScore = ministerData.reliabilityScore || 100;
  let trend: 'improving' | 'stable' | 'declining';
  if (reliabilityScore >= 90) trend = 'stable';
  else if (reliabilityScore >= 70) trend = 'improving';
  else trend = 'declining';

  // Generate recommendation
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
