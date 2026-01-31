/**
 * Learning Patterns API Routes
 *
 * Endpoints for viewing and managing learned patterns from schedule edits.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { learnedPatterns, users, insertLearnedPatternSchema } from '@shared/schema';
import type { LearnedPattern, InsertLearnedPattern } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { learningService } from '../services/learningService';

const router = Router();

/**
 * GET /api/learning/patterns
 * List all learned patterns
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const { active, type, ministerId, limit: limitParam } = req.query;

    let conditions = [];

    if (active !== undefined) {
      conditions.push(eq(learnedPatterns.isActive, active === 'true'));
    }

    if (type) {
      conditions.push(eq(learnedPatterns.patternType, type as typeof learnedPatterns.patternType.enumValues[number]));
    }

    if (ministerId) {
      conditions.push(eq(learnedPatterns.ministerId, ministerId as string));
    }

    const limit = limitParam ? parseInt(limitParam as string, 10) : 100;

    const patterns = await db.select({
      id: learnedPatterns.id,
      patternType: learnedPatterns.patternType,
      ministerId: learnedPatterns.ministerId,
      massType: learnedPatterns.massType,
      dayOfWeek: learnedPatterns.dayOfWeek,
      timeSlot: learnedPatterns.timeSlot,
      occurrenceCount: learnedPatterns.occurrenceCount,
      confidence: learnedPatterns.confidence,
      weightAdjustment: learnedPatterns.weightAdjustment,
      lastOccurrence: learnedPatterns.lastOccurrence,
      notes: learnedPatterns.notes,
      isActive: learnedPatterns.isActive,
      createdAt: learnedPatterns.createdAt,
      ministerName: users.name
    })
    .from(learnedPatterns)
    .leftJoin(users, eq(learnedPatterns.ministerId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(learnedPatterns.lastOccurrence))
    .limit(limit);

    res.json(patterns);
  } catch (error) {
    console.error('[LearningPatterns] Error listing patterns:', error);
    res.status(500).json({ error: 'Failed to list learned patterns' });
  }
});

/**
 * GET /api/learning/patterns/:id
 * Get a single pattern
 */
router.get('/patterns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [pattern] = await db.select({
      id: learnedPatterns.id,
      patternType: learnedPatterns.patternType,
      ministerId: learnedPatterns.ministerId,
      massType: learnedPatterns.massType,
      dayOfWeek: learnedPatterns.dayOfWeek,
      timeSlot: learnedPatterns.timeSlot,
      occurrenceCount: learnedPatterns.occurrenceCount,
      confidence: learnedPatterns.confidence,
      weightAdjustment: learnedPatterns.weightAdjustment,
      lastOccurrence: learnedPatterns.lastOccurrence,
      notes: learnedPatterns.notes,
      isActive: learnedPatterns.isActive,
      createdAt: learnedPatterns.createdAt,
      ministerName: users.name
    })
    .from(learnedPatterns)
    .leftJoin(users, eq(learnedPatterns.ministerId, users.id))
    .where(eq(learnedPatterns.id, id))
    .limit(1);

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    res.json(pattern);
  } catch (error) {
    console.error('[LearningPatterns] Error fetching pattern:', error);
    res.status(500).json({ error: 'Failed to fetch pattern' });
  }
});

/**
 * GET /api/learning/report/:year/:month
 * Get learning report for a month
 */
router.get('/report/:year/:month', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const report = await learningService.getLearningReport(year, month);

    // Enrich with minister names
    const ministerIds = new Set<string>();
    [...report.topRemovals, ...report.topAdditions, ...report.recentChanges].forEach(p => {
      if (p.ministerId) ministerIds.add(p.ministerId);
    });

    const ministerNames = new Map<string, string>();
    if (ministerIds.size > 0) {
      const ministers = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(sql`${users.id} = ANY(${Array.from(ministerIds)})`);
      ministers.forEach(m => ministerNames.set(m.id, m.name));
    }

    res.json({
      ...report,
      topRemovals: report.topRemovals.map(p => ({
        ...p,
        ministerName: p.ministerId ? ministerNames.get(p.ministerId) : null
      })),
      topAdditions: report.topAdditions.map(p => ({
        ...p,
        ministerName: p.ministerId ? ministerNames.get(p.ministerId) : null
      })),
      recentChanges: report.recentChanges.map(p => ({
        ...p,
        ministerName: p.ministerId ? ministerNames.get(p.ministerId) : null
      }))
    });
  } catch (error) {
    console.error('[LearningPatterns] Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate learning report' });
  }
});

/**
 * GET /api/learning/minister/:id
 * Get all patterns for a specific minister
 */
router.get('/minister/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const patterns = await db.select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.ministerId, id),
          eq(learnedPatterns.isActive, true)
        )
      )
      .orderBy(desc(learnedPatterns.lastOccurrence));

    const [minister] = await db.select({ name: users.name })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    res.json({
      ministerId: id,
      ministerName: minister?.name,
      patterns,
      summary: {
        total: patterns.length,
        removals: patterns.filter(p => p.patternType === 'minister_removal').length,
        additions: patterns.filter(p => p.patternType === 'minister_addition').length,
        positionPreferences: patterns.filter(p => p.patternType === 'position_preference').length
      }
    });
  } catch (error) {
    console.error('[LearningPatterns] Error fetching minister patterns:', error);
    res.status(500).json({ error: 'Failed to fetch minister patterns' });
  }
});

/**
 * POST /api/learning/patterns
 * Manually create a pattern (for testing or manual adjustment)
 */
router.post('/patterns', async (req: Request, res: Response) => {
  try {
    const validatedData = insertLearnedPatternSchema.parse(req.body);

    const [newPattern] = await db.insert(learnedPatterns)
      .values(validatedData)
      .returning();

    console.log(`[LearningPatterns] Created pattern: ${newPattern.patternType} for minister ${newPattern.ministerId}`);
    res.status(201).json(newPattern);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[LearningPatterns] Error creating pattern:', error);
    res.status(500).json({ error: 'Failed to create pattern' });
  }
});

/**
 * PUT /api/learning/patterns/:id
 * Update a pattern (e.g., adjust weight or deactivate)
 */
router.put('/patterns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(learnedPatterns)
      .where(eq(learnedPatterns.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const partialSchema = insertLearnedPatternSchema.partial();
    const validatedData = partialSchema.parse(req.body);

    const [updated] = await db.update(learnedPatterns)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(learnedPatterns.id, id))
      .returning();

    console.log(`[LearningPatterns] Updated pattern ${id}`);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[LearningPatterns] Error updating pattern:', error);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

/**
 * DELETE /api/learning/patterns/:id
 * Deactivate a pattern (soft delete)
 */
router.delete('/patterns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    const [existing] = await db.select()
      .from(learnedPatterns)
      .where(eq(learnedPatterns.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    if (hard === 'true') {
      await db.delete(learnedPatterns)
        .where(eq(learnedPatterns.id, id));
      console.log(`[LearningPatterns] Hard deleted pattern ${id}`);
    } else {
      await db.update(learnedPatterns)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(learnedPatterns.id, id));
      console.log(`[LearningPatterns] Soft deleted pattern ${id}`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[LearningPatterns] Error deleting pattern:', error);
    res.status(500).json({ error: 'Failed to delete pattern' });
  }
});

/**
 * POST /api/learning/reset-minister/:id
 * Reset all patterns for a minister
 */
router.post('/reset-minister/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    if (hard === 'true') {
      const result = await db.delete(learnedPatterns)
        .where(eq(learnedPatterns.ministerId, id));
      console.log(`[LearningPatterns] Hard deleted all patterns for minister ${id}`);
    } else {
      await db.update(learnedPatterns)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(learnedPatterns.ministerId, id));
      console.log(`[LearningPatterns] Soft deleted all patterns for minister ${id}`);
    }

    res.json({ success: true, message: `Patterns reset for minister ${id}` });
  } catch (error) {
    console.error('[LearningPatterns] Error resetting minister patterns:', error);
    res.status(500).json({ error: 'Failed to reset minister patterns' });
  }
});

/**
 * GET /api/learning/stats
 * Get overall learning statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allPatterns = await db.select()
      .from(learnedPatterns)
      .where(eq(learnedPatterns.isActive, true));

    const byType: Record<string, number> = {};
    const byMassType: Record<string, number> = {};
    let totalOccurrences = 0;
    let avgConfidence = 0;

    for (const pattern of allPatterns) {
      byType[pattern.patternType] = (byType[pattern.patternType] || 0) + 1;
      if (pattern.massType) {
        byMassType[pattern.massType] = (byMassType[pattern.massType] || 0) + 1;
      }
      totalOccurrences += pattern.occurrenceCount ?? 0;
      avgConfidence += pattern.confidence ?? 0;
    }

    if (allPatterns.length > 0) {
      avgConfidence = Math.round(avgConfidence / allPatterns.length);
    }

    res.json({
      totalPatterns: allPatterns.length,
      totalOccurrences,
      averageConfidence: avgConfidence,
      patternsByType: byType,
      patternsByMassType: byMassType
    });
  } catch (error) {
    console.error('[LearningPatterns] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch learning stats' });
  }
});

export default router;
