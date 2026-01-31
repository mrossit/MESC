/**
 * Mass Configuration API Routes
 *
 * CRUD endpoints for managing recurring mass configurations.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { massConfigurations, insertMassConfigurationSchema } from '@shared/schema';
import type { MassConfiguration, InsertMassConfiguration } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/mass-config
 * List all mass configurations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let query = db.select().from(massConfigurations);

    if (active !== undefined) {
      const isActive = active === 'true';
      const configs = await db.select()
        .from(massConfigurations)
        .where(eq(massConfigurations.isActive, isActive));
      return res.json(configs);
    }

    const configs = await query;
    res.json(configs);
  } catch (error) {
    console.error('[MassConfig] Error listing configurations:', error);
    res.status(500).json({ error: 'Failed to list mass configurations' });
  }
});

/**
 * GET /api/mass-config/:id
 * Get a single mass configuration
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [config] = await db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.id, id))
      .limit(1);

    if (!config) {
      return res.status(404).json({ error: 'Mass configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('[MassConfig] Error fetching configuration:', error);
    res.status(500).json({ error: 'Failed to fetch mass configuration' });
  }
});

/**
 * POST /api/mass-config
 * Create a new mass configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = insertMassConfigurationSchema.parse(req.body);

    // Convert readonly arrays to mutable arrays for Drizzle compatibility
    const insertData = {
      ...validatedData,
      excludedDates: validatedData.excludedDates ? [...validatedData.excludedDates] : null
    };

    const [newConfig] = await db.insert(massConfigurations)
      .values(insertData)
      .returning();

    console.log(`[MassConfig] Created new configuration: ${newConfig.name} (${newConfig.id})`);
    res.status(201).json(newConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[MassConfig] Error creating configuration:', error);
    res.status(500).json({ error: 'Failed to create mass configuration' });
  }
});

/**
 * PUT /api/mass-config/:id
 * Update an existing mass configuration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if exists
    const [existing] = await db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Mass configuration not found' });
    }

    // Validate partial data
    const partialSchema = insertMassConfigurationSchema.partial();
    const validatedData = partialSchema.parse(req.body);

    // Convert readonly arrays to mutable arrays for Drizzle compatibility
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updatedAt: new Date()
    };
    if (validatedData.excludedDates !== undefined) {
      updateData.excludedDates = validatedData.excludedDates ? [...validatedData.excludedDates] : null;
    }

    const [updated] = await db.update(massConfigurations)
      .set(updateData)
      .where(eq(massConfigurations.id, id))
      .returning();

    console.log(`[MassConfig] Updated configuration: ${updated.name} (${updated.id})`);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[MassConfig] Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update mass configuration' });
  }
});

/**
 * DELETE /api/mass-config/:id
 * Soft-delete a mass configuration (sets isActive to false)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // Optional hard delete

    const [existing] = await db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Mass configuration not found' });
    }

    if (hard === 'true') {
      // Hard delete
      await db.delete(massConfigurations)
        .where(eq(massConfigurations.id, id));
      console.log(`[MassConfig] Hard deleted configuration: ${existing.name} (${id})`);
    } else {
      // Soft delete
      await db.update(massConfigurations)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(massConfigurations.id, id));
      console.log(`[MassConfig] Soft deleted configuration: ${existing.name} (${id})`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[MassConfig] Error deleting configuration:', error);
    res.status(500).json({ error: 'Failed to delete mass configuration' });
  }
});

/**
 * POST /api/mass-config/:id/toggle
 * Toggle active status of a configuration
 */
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Mass configuration not found' });
    }

    const [updated] = await db.update(massConfigurations)
      .set({
        isActive: !existing.isActive,
        updatedAt: new Date()
      })
      .where(eq(massConfigurations.id, id))
      .returning();

    console.log(`[MassConfig] Toggled configuration ${id}: isActive=${updated.isActive}`);
    res.json(updated);
  } catch (error) {
    console.error('[MassConfig] Error toggling configuration:', error);
    res.status(500).json({ error: 'Failed to toggle mass configuration' });
  }
});

/**
 * POST /api/mass-config/:id/exclude-date
 * Add a date to the exclusion list
 */
router.post('/:id/exclude-date', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.body; // Expected: YYYY-MM-DD

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const [existing] = await db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Mass configuration not found' });
    }

    const excludedDates = (existing.excludedDates as string[]) || [];
    if (!excludedDates.includes(date)) {
      excludedDates.push(date);
    }

    const [updated] = await db.update(massConfigurations)
      .set({
        excludedDates,
        updatedAt: new Date()
      })
      .where(eq(massConfigurations.id, id))
      .returning();

    console.log(`[MassConfig] Added excluded date ${date} to configuration ${id}`);
    res.json(updated);
  } catch (error) {
    console.error('[MassConfig] Error adding excluded date:', error);
    res.status(500).json({ error: 'Failed to add excluded date' });
  }
});

/**
 * DELETE /api/mass-config/:id/exclude-date/:date
 * Remove a date from the exclusion list
 */
router.delete('/:id/exclude-date/:date', async (req: Request, res: Response) => {
  try {
    const { id, date } = req.params;

    const [existing] = await db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Mass configuration not found' });
    }

    const excludedDates = (existing.excludedDates as string[]) || [];
    const newExcludedDates = excludedDates.filter(d => d !== date);

    const [updated] = await db.update(massConfigurations)
      .set({
        excludedDates: newExcludedDates,
        updatedAt: new Date()
      })
      .where(eq(massConfigurations.id, id))
      .returning();

    console.log(`[MassConfig] Removed excluded date ${date} from configuration ${id}`);
    res.json(updated);
  } catch (error) {
    console.error('[MassConfig] Error removing excluded date:', error);
    res.status(500).json({ error: 'Failed to remove excluded date' });
  }
});

export default router;
