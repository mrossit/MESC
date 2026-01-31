/**
 * Question-Mass Mappings API Routes
 *
 * Endpoints for managing explicit mappings between custom questions and masses.
 * This replaces the fragile regex parsing of question text.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { questionMassMappings, questionnaires, massConfigurations, specialEvents, insertQuestionMassMappingSchema } from '@shared/schema';
import type { QuestionMassMapping, InsertQuestionMassMapping } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/question-mappings/questionnaire/:id
 * List all mappings for a specific questionnaire
 */
router.get('/questionnaire/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if questionnaire exists
    const [questionnaire] = await db.select()
      .from(questionnaires)
      .where(eq(questionnaires.id, id))
      .limit(1);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    const mappings = await db.select()
      .from(questionMassMappings)
      .where(eq(questionMassMappings.questionnaireId, id));

    // Enrich with configuration/event details
    const enrichedMappings = await Promise.all(mappings.map(async (mapping) => {
      let massConfig = null;
      let specialEvent = null;

      if (mapping.massConfigurationId) {
        const [config] = await db.select()
          .from(massConfigurations)
          .where(eq(massConfigurations.id, mapping.massConfigurationId))
          .limit(1);
        massConfig = config;
      }

      if (mapping.specialEventId) {
        const [event] = await db.select()
          .from(specialEvents)
          .where(eq(specialEvents.id, mapping.specialEventId))
          .limit(1);
        specialEvent = event;
      }

      return {
        ...mapping,
        massConfiguration: massConfig,
        specialEvent
      };
    }));

    res.json(enrichedMappings);
  } catch (error) {
    console.error('[QuestionMappings] Error listing mappings:', error);
    res.status(500).json({ error: 'Failed to list question mappings' });
  }
});

/**
 * GET /api/question-mappings/:id
 * Get a single mapping
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [mapping] = await db.select()
      .from(questionMassMappings)
      .where(eq(questionMassMappings.id, id))
      .limit(1);

    if (!mapping) {
      return res.status(404).json({ error: 'Question mapping not found' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('[QuestionMappings] Error fetching mapping:', error);
    res.status(500).json({ error: 'Failed to fetch question mapping' });
  }
});

/**
 * POST /api/question-mappings
 * Create a new question-mass mapping
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = insertQuestionMassMappingSchema.parse(req.body);

    // Validate that at least one target is specified
    if (!validatedData.massConfigurationId && !validatedData.specialEventId &&
        (!validatedData.targetDate || !validatedData.targetTime)) {
      return res.status(400).json({
        error: 'Must specify either massConfigurationId, specialEventId, or targetDate+targetTime'
      });
    }

    // Check for existing mapping
    const existing = await db.select()
      .from(questionMassMappings)
      .where(
        and(
          eq(questionMassMappings.questionnaireId, validatedData.questionnaireId),
          eq(questionMassMappings.questionId, validatedData.questionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Mapping already exists for this question',
        existingMapping: existing[0]
      });
    }

    const [newMapping] = await db.insert(questionMassMappings)
      .values(validatedData)
      .returning();

    console.log(`[QuestionMappings] Created mapping for question ${validatedData.questionId}`);
    res.status(201).json(newMapping);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[QuestionMappings] Error creating mapping:', error);
    res.status(500).json({ error: 'Failed to create question mapping' });
  }
});

/**
 * PUT /api/question-mappings/:id
 * Update an existing mapping
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(questionMassMappings)
      .where(eq(questionMassMappings.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Question mapping not found' });
    }

    const partialSchema = insertQuestionMassMappingSchema.partial();
    const validatedData = partialSchema.parse(req.body);

    const [updated] = await db.update(questionMassMappings)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(questionMassMappings.id, id))
      .returning();

    console.log(`[QuestionMappings] Updated mapping ${id}`);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[QuestionMappings] Error updating mapping:', error);
    res.status(500).json({ error: 'Failed to update question mapping' });
  }
});

/**
 * DELETE /api/question-mappings/:id
 * Delete a mapping
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(questionMassMappings)
      .where(eq(questionMassMappings.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Question mapping not found' });
    }

    await db.delete(questionMassMappings)
      .where(eq(questionMassMappings.id, id));

    console.log(`[QuestionMappings] Deleted mapping ${id}`);
    res.status(204).send();
  } catch (error) {
    console.error('[QuestionMappings] Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete question mapping' });
  }
});

/**
 * POST /api/question-mappings/batch
 * Create multiple mappings at once
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: 'Mappings array is required' });
    }

    const validatedMappings: InsertQuestionMassMapping[] = [];

    for (const mapping of mappings) {
      const validated = insertQuestionMassMappingSchema.parse(mapping);

      // Validate that at least one target is specified
      if (!validated.massConfigurationId && !validated.specialEventId &&
          (!validated.targetDate || !validated.targetTime)) {
        return res.status(400).json({
          error: `Mapping for question ${validated.questionId}: Must specify target`
        });
      }

      validatedMappings.push(validated);
    }

    const newMappings = await db.insert(questionMassMappings)
      .values(validatedMappings)
      .returning();

    console.log(`[QuestionMappings] Created ${newMappings.length} mappings in batch`);
    res.status(201).json(newMappings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[QuestionMappings] Error creating batch mappings:', error);
    res.status(500).json({ error: 'Failed to create batch mappings' });
  }
});

/**
 * POST /api/question-mappings/infer
 * Attempt to infer mapping from question text (fallback to regex)
 * This is a helper endpoint for backwards compatibility
 */
router.post('/infer', async (req: Request, res: Response) => {
  try {
    const { questionText } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }

    // Try to extract date and time from question text using regex
    // Patterns like: "dia 28/01 às 7h", "28 de janeiro às 19:30", etc.
    const datePatterns = [
      /dia\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i,
      /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
      /(\d{4})-(\d{2})-(\d{2})/
    ];

    const timePatterns = [
      /(?:às?\s*)?(\d{1,2})[h:](\d{2})?/i,
      /(\d{1,2})\s*horas?/i
    ];

    let extractedDate: string | null = null;
    let extractedTime: string | null = null;

    // Try date patterns
    for (const pattern of datePatterns) {
      const match = questionText.match(pattern);
      if (match) {
        // This is a simplified extraction - real implementation would be more robust
        if (pattern.source.includes('de')) {
          const monthMap: Record<string, string> = {
            'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
            'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
            'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
          };
          const day = match[1].padStart(2, '0');
          const month = monthMap[match[2].toLowerCase()];
          const year = new Date().getFullYear();
          extractedDate = `${year}-${month}-${day}`;
        } else if (match[3]) {
          // Format: day/month/year
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          extractedDate = `${year}-${month}-${day}`;
        } else if (match[2]) {
          // Format: day/month
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = new Date().getFullYear();
          extractedDate = `${year}-${month}-${day}`;
        }
        break;
      }
    }

    // Try time patterns
    for (const pattern of timePatterns) {
      const match = questionText.match(pattern);
      if (match) {
        const hour = match[1].padStart(2, '0');
        const minutes = match[2] ? match[2].padStart(2, '0') : '00';
        extractedTime = `${hour}:${minutes}`;
        break;
      }
    }

    res.json({
      extractedDate,
      extractedTime,
      success: !!(extractedDate && extractedTime),
      note: extractedDate && extractedTime
        ? 'Extraction successful. Consider creating an explicit mapping for reliability.'
        : 'Could not extract date/time from question text. Manual mapping required.'
    });
  } catch (error) {
    console.error('[QuestionMappings] Error inferring mapping:', error);
    res.status(500).json({ error: 'Failed to infer mapping from question text' });
  }
});

export default router;
