/**
 * Learning Service
 *
 * Analyzes differences between generated and published schedules
 * to learn patterns and improve future schedule generation.
 */

import { db } from '../db';
import { learnedPatterns, scheduleGenerations } from '@shared/schema';
import type { LearnedPattern, InsertLearnedPattern, ScheduleGeneration } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getDay, format } from 'date-fns';

interface ScheduleDifference {
  type: 'minister_removed' | 'minister_added' | 'position_changed';
  ministerId: string;
  ministerName: string;
  date: string;
  time: string;
  massType: string;
  originalPosition?: number;
  finalPosition?: number;
}

interface MinisterAssignment {
  ministerId: string;
  ministerName: string;
  position: number;
}

interface MassAssignment {
  date: string;
  time: string;
  type: string;
  ministers: MinisterAssignment[];
}

export class LearningService {
  /**
   * Analyze differences between original and final schedule
   */
  calculateDifferences(
    originalSchedule: MassAssignment[],
    finalSchedule: MassAssignment[]
  ): ScheduleDifference[] {
    const differences: ScheduleDifference[] = [];

    // Create maps for easier lookup
    const originalByKey = new Map<string, MassAssignment>();
    const finalByKey = new Map<string, MassAssignment>();

    for (const mass of originalSchedule) {
      originalByKey.set(`${mass.date}-${mass.time}`, mass);
    }

    for (const mass of finalSchedule) {
      finalByKey.set(`${mass.date}-${mass.time}`, mass);
    }

    // Compare each mass time
    for (const [key, originalMass] of originalByKey) {
      const finalMass = finalByKey.get(key);
      if (!finalMass) continue;

      const originalMinisters = new Map(
        originalMass.ministers.map(m => [m.ministerId, m])
      );
      const finalMinisters = new Map(
        finalMass.ministers.map(m => [m.ministerId, m])
      );

      // Find removed ministers
      for (const [ministerId, minister] of originalMinisters) {
        if (!finalMinisters.has(ministerId)) {
          differences.push({
            type: 'minister_removed',
            ministerId,
            ministerName: minister.ministerName,
            date: originalMass.date,
            time: originalMass.time,
            massType: originalMass.type,
            originalPosition: minister.position
          });
        }
      }

      // Find added ministers
      for (const [ministerId, minister] of finalMinisters) {
        if (!originalMinisters.has(ministerId)) {
          differences.push({
            type: 'minister_added',
            ministerId,
            ministerName: minister.ministerName,
            date: finalMass.date,
            time: finalMass.time,
            massType: finalMass.type,
            finalPosition: minister.position
          });
        }
      }

      // Find position changes
      for (const [ministerId, originalMinister] of originalMinisters) {
        const finalMinister = finalMinisters.get(ministerId);
        if (finalMinister && originalMinister.position !== finalMinister.position) {
          differences.push({
            type: 'position_changed',
            ministerId,
            ministerName: originalMinister.ministerName,
            date: originalMass.date,
            time: originalMass.time,
            massType: originalMass.type,
            originalPosition: originalMinister.position,
            finalPosition: finalMinister.position
          });
        }
      }
    }

    return differences;
  }

  /**
   * Learn from differences when a schedule is published
   */
  async learnFromDifferences(differences: ScheduleDifference[]): Promise<void> {
    console.log(`[LearningService] Processing ${differences.length} differences for learning`);

    for (const diff of differences) {
      await this.upsertLearnedPattern(diff);
    }
  }

  /**
   * Update or insert a learned pattern based on a difference
   */
  private async upsertLearnedPattern(diff: ScheduleDifference): Promise<void> {
    const diffDate = new Date(diff.date);
    const dayOfWeek = getDay(diffDate);

    // Map difference type to pattern type
    let patternType: 'minister_removal' | 'minister_addition' | 'position_preference';
    switch (diff.type) {
      case 'minister_removed':
        patternType = 'minister_removal';
        break;
      case 'minister_added':
        patternType = 'minister_addition';
        break;
      case 'position_changed':
        patternType = 'position_preference';
        break;
    }

    // Check if pattern already exists
    const existing = await db.select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.ministerId, diff.ministerId),
          eq(learnedPatterns.patternType, patternType),
          eq(learnedPatterns.massType, diff.massType as typeof learnedPatterns.massType.enumValues[number]),
          eq(learnedPatterns.dayOfWeek, dayOfWeek),
          eq(learnedPatterns.timeSlot, diff.time)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing pattern
      const pattern = existing[0];
      const newOccurrenceCount = (pattern.occurrenceCount ?? 1) + 1;
      const newConfidence = Math.min(100, 50 + (newOccurrenceCount * 10)); // Cap at 100%

      // Calculate weight adjustment based on pattern type
      let weightAdjustment = pattern.weightAdjustment ?? 0;
      if (patternType === 'minister_removal') {
        weightAdjustment = Math.max(-100, weightAdjustment - 10); // Decrease score
      } else if (patternType === 'minister_addition') {
        weightAdjustment = Math.min(100, weightAdjustment + 10); // Increase score
      }

      await db.update(learnedPatterns)
        .set({
          occurrenceCount: newOccurrenceCount,
          confidence: newConfidence,
          weightAdjustment,
          lastOccurrence: new Date(),
          updatedAt: new Date()
        })
        .where(eq(learnedPatterns.id, pattern.id));

      console.log(`[LearningService] Updated pattern ${pattern.id}: count=${newOccurrenceCount}, confidence=${newConfidence}%`);
    } else {
      // Create new pattern
      const initialConfidence = 50;
      let initialWeightAdjustment = 0;

      if (patternType === 'minister_removal') {
        initialWeightAdjustment = -10;
      } else if (patternType === 'minister_addition') {
        initialWeightAdjustment = 10;
      }

      const newPattern: InsertLearnedPattern = {
        patternType,
        ministerId: diff.ministerId,
        massType: diff.massType as typeof learnedPatterns.massType.enumValues[number],
        dayOfWeek,
        timeSlot: diff.time,
        occurrenceCount: 1,
        confidence: initialConfidence,
        weightAdjustment: initialWeightAdjustment,
        notes: `First occurrence: ${diff.ministerName} on ${diff.date}`
      };

      await db.insert(learnedPatterns).values(newPattern);
      console.log(`[LearningService] Created new pattern for minister ${diff.ministerId}: ${patternType}`);
    }
  }

  /**
   * Get learning report for a month
   */
  async getLearningReport(year: number, month: number): Promise<{
    totalPatterns: number;
    patternsByType: Record<string, number>;
    topRemovals: LearnedPattern[];
    topAdditions: LearnedPattern[];
    recentChanges: LearnedPattern[];
  }> {
    const allPatterns = await db.select()
      .from(learnedPatterns)
      .where(eq(learnedPatterns.isActive, true));

    const patternsByType: Record<string, number> = {};
    for (const pattern of allPatterns) {
      patternsByType[pattern.patternType] = (patternsByType[pattern.patternType] || 0) + 1;
    }

    const removals = allPatterns
      .filter(p => p.patternType === 'minister_removal')
      .sort((a, b) => (b.occurrenceCount ?? 0) - (a.occurrenceCount ?? 0))
      .slice(0, 10);

    const additions = allPatterns
      .filter(p => p.patternType === 'minister_addition')
      .sort((a, b) => (b.occurrenceCount ?? 0) - (a.occurrenceCount ?? 0))
      .slice(0, 10);

    const recentChanges = allPatterns
      .sort((a, b) => {
        const aTime = a.lastOccurrence?.getTime() ?? 0;
        const bTime = b.lastOccurrence?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return {
      totalPatterns: allPatterns.length,
      patternsByType,
      topRemovals: removals,
      topAdditions: additions,
      recentChanges
    };
  }

  /**
   * Apply learned patterns to calculate minister score adjustments
   */
  async getScoreAdjustments(
    ministerId: string,
    massType: string,
    dayOfWeek: number,
    time: string
  ): Promise<number> {
    const patterns = await db.select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.ministerId, ministerId),
          eq(learnedPatterns.isActive, true)
        )
      );

    let totalAdjustment = 0;

    for (const pattern of patterns) {
      // Check if pattern applies to this context
      let applies = true;

      if (pattern.massType && pattern.massType !== massType) {
        applies = false;
      }
      if (pattern.dayOfWeek !== null && pattern.dayOfWeek !== undefined && pattern.dayOfWeek !== dayOfWeek) {
        applies = false;
      }
      if (pattern.timeSlot && pattern.timeSlot !== time) {
        applies = false;
      }

      if (applies) {
        // Weight the adjustment by confidence
        const confidenceWeight = (pattern.confidence ?? 50) / 100;
        const adjustment = (pattern.weightAdjustment ?? 0) * confidenceWeight;
        totalAdjustment += adjustment;
      }
    }

    return totalAdjustment;
  }

  /**
   * Store schedule generation for future comparison
   */
  async storeScheduleGeneration(
    month: number,
    year: number,
    originalSchedule: MassAssignment[],
    createdById: string
  ): Promise<string> {
    const [result] = await db.insert(scheduleGenerations)
      .values({
        month,
        year,
        status: 'draft',
        originalSchedule: originalSchedule as unknown as Record<string, unknown>,
        createdById
      })
      .returning({ id: scheduleGenerations.id });

    return result.id;
  }

  /**
   * Publish schedule and learn from differences
   */
  async publishScheduleAndLearn(
    generationId: string,
    finalSchedule: MassAssignment[]
  ): Promise<void> {
    // Load original schedule
    const [generation] = await db.select()
      .from(scheduleGenerations)
      .where(eq(scheduleGenerations.id, generationId))
      .limit(1);

    if (!generation) {
      throw new Error(`Schedule generation ${generationId} not found`);
    }

    const originalSchedule = generation.originalSchedule as unknown as MassAssignment[];

    // Calculate differences
    const differences = this.calculateDifferences(originalSchedule, finalSchedule);

    // Learn from differences
    await this.learnFromDifferences(differences);

    // Update generation record
    await db.update(scheduleGenerations)
      .set({
        status: 'published',
        finalSchedule: finalSchedule as unknown as Record<string, unknown>,
        differences: differences as unknown as Record<string, unknown>,
        publishedAt: new Date()
      })
      .where(eq(scheduleGenerations.id, generationId));

    console.log(`[LearningService] Published schedule ${generationId} with ${differences.length} learned differences`);
  }
}

export const learningService = new LearningService();
