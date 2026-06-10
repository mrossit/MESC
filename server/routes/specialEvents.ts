/**
 * Special Events API Routes
 *
 * CRUD endpoints for managing non-recurring special events.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { specialEvents, insertSpecialEventSchema } from '@shared/schema';
import type { SpecialEvent, InsertSpecialEvent } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

/**
 * GET /api/special-events
 * List all special events (optionally filtered by active status)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    if (active !== undefined) {
      const isActive = active === 'true';
      const events = await db.select()
        .from(specialEvents)
        .where(eq(specialEvents.isActive, isActive));
      return res.json(events);
    }

    const events = await db.select().from(specialEvents);
    res.json(events);
  } catch (error) {
    console.error('[SpecialEvents] Error listing events:', error);
    res.status(500).json({ error: 'Failed to list special events' });
  }
});

/**
 * GET /api/special-events/month/:year/:month
 * List special events for a specific month
 */
router.get('/month/:year/:month', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    const events = await db.select()
      .from(specialEvents)
      .where(
        and(
          eq(specialEvents.isActive, true),
          gte(specialEvents.eventDate, startDate),
          lte(specialEvents.eventDate, endDate)
        )
      );

    res.json(events);
  } catch (error) {
    console.error('[SpecialEvents] Error listing events for month:', error);
    res.status(500).json({ error: 'Failed to list special events for month' });
  }
});

/**
 * GET /api/special-events/:id
 * Get a single special event
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [event] = await db.select()
      .from(specialEvents)
      .where(eq(specialEvents.id, id))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: 'Special event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('[SpecialEvents] Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch special event' });
  }
});

/**
 * POST /api/special-events
 * Create a new special event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get user ID from session if available
    const userId = (req as unknown as { user?: { id: string } }).user?.id;

    const validatedData = insertSpecialEventSchema.parse({
      ...req.body,
      createdBy: userId || req.body.createdBy
    });

    // Convert readonly arrays to mutable arrays for Drizzle compatibility
    const insertData = {
      ...validatedData,
      suppressesMassTypes: validatedData.suppressesMassTypes ? [...validatedData.suppressesMassTypes] : null,
      communityId: (req as unknown as { user?: { homeCommunityId?: string } }).user?.homeCommunityId! // comunidade do coordenador
    };

    const [newEvent] = await db.insert(specialEvents)
      .values(insertData)
      .returning();

    console.log(`[SpecialEvents] Created new event: ${newEvent.name} on ${newEvent.eventDate}`);
    res.status(201).json(newEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[SpecialEvents] Error creating event:', error);
    res.status(500).json({ error: 'Failed to create special event' });
  }
});

/**
 * PUT /api/special-events/:id
 * Update an existing special event
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(specialEvents)
      .where(eq(specialEvents.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Special event not found' });
    }

    const partialSchema = insertSpecialEventSchema.partial();
    const validatedData = partialSchema.parse(req.body);

    // Convert readonly arrays to mutable arrays for Drizzle compatibility
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updatedAt: new Date()
    };
    if (validatedData.suppressesMassTypes !== undefined) {
      updateData.suppressesMassTypes = validatedData.suppressesMassTypes ? [...validatedData.suppressesMassTypes] : null;
    }

    const [updated] = await db.update(specialEvents)
      .set(updateData)
      .where(eq(specialEvents.id, id))
      .returning();

    console.log(`[SpecialEvents] Updated event: ${updated.name} (${updated.id})`);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[SpecialEvents] Error updating event:', error);
    res.status(500).json({ error: 'Failed to update special event' });
  }
});

/**
 * DELETE /api/special-events/:id
 * Soft-delete a special event
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    const [existing] = await db.select()
      .from(specialEvents)
      .where(eq(specialEvents.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Special event not found' });
    }

    if (hard === 'true') {
      await db.delete(specialEvents)
        .where(eq(specialEvents.id, id));
      console.log(`[SpecialEvents] Hard deleted event: ${existing.name} (${id})`);
    } else {
      await db.update(specialEvents)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(specialEvents.id, id));
      console.log(`[SpecialEvents] Soft deleted event: ${existing.name} (${id})`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[SpecialEvents] Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete special event' });
  }
});

/**
 * POST /api/special-events/batch
 * Create multiple special events at once (e.g., for novenas)
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Events array is required' });
    }

    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    const validatedEvents: typeof specialEvents.$inferInsert[] = [];

    for (const event of events) {
      const validated = insertSpecialEventSchema.parse({
        ...event,
        createdBy: userId || event.createdBy
      });
      // Convert readonly arrays to mutable arrays for Drizzle compatibility
      validatedEvents.push({
        ...validated,
        suppressesMassTypes: validated.suppressesMassTypes ? [...validated.suppressesMassTypes] : null,
        communityId: (req as unknown as { user?: { homeCommunityId?: string } }).user?.homeCommunityId! // comunidade do coordenador
      } as typeof specialEvents.$inferInsert);
    }

    const newEvents = await db.insert(specialEvents)
      .values(validatedEvents)
      .returning();

    console.log(`[SpecialEvents] Created ${newEvents.length} events in batch`);
    res.status(201).json(newEvents);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[SpecialEvents] Error creating batch events:', error);
    res.status(500).json({ error: 'Failed to create batch events' });
  }
});

export default router;
