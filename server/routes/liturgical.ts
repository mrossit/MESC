/**
 * Liturgical Calendar API Routes
 * Endpoints for accessing liturgical calendar data
 */

import { Router } from 'express';
import { db } from '../db';
import {
  liturgicalYears,
  liturgicalSeasons,
  liturgicalCelebrations,
  liturgicalMassOverrides,
} from '../../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  getCurrentLiturgicalSeason,
  getMovableFeasts,
  isStJudeDay,
  isStJudeNovena,
  isStJudeFeast,
} from '../utils/liturgicalCalculations';
import { getMassConfigForDate, getSpecialMonthlyMass } from '../../shared/constants/massConfig';
import { generateLiturgicalQuestionnaire, convertToAlgorithmFormat } from '../utils/liturgicalQuestionnaireGenerator';

const router = Router();

/**
 * GET /api/liturgical/current-season
 * Returns current liturgical season and cycle for UI display
 */
router.get('/current-season', async (req, res) => {
  try {
    const currentDate = new Date();
    const seasonInfo = getCurrentLiturgicalSeason(currentDate);
    const year = currentDate.getFullYear();

    // Get liturgical year from database
    const [liturgicalYear] = await db
      .select()
      .from(liturgicalYears)
      .where(eq(liturgicalYears.year, year))
      .limit(1);

    res.json({
      success: true,
      data: {
        season: seasonInfo.name,
        color: seasonInfo.color,
        cycle: seasonInfo.cycle,
        year: liturgicalYear?.year || year,
        easterDate: liturgicalYear?.easterDate,
      },
    });
  } catch (error) {
    console.error('Error fetching current liturgical season:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar temporada litúrgica atual',
    });
  }
});

/**
 * GET /api/liturgical/seasons/:year
 * Returns all liturgical seasons for a specific year
 */
router.get('/seasons/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    // Get liturgical year
    const [liturgicalYear] = await db
      .select()
      .from(liturgicalYears)
      .where(eq(liturgicalYears.year, year))
      .limit(1);

    if (!liturgicalYear) {
      return res.status(404).json({
        success: false,
        message: 'Ano litúrgico não encontrado',
      });
    }

    // Get all seasons for this year
    const seasons = await db
      .select()
      .from(liturgicalSeasons)
      .where(eq(liturgicalSeasons.yearId, liturgicalYear.id));

    res.json({
      success: true,
      data: {
        year: liturgicalYear.year,
        cycle: liturgicalYear.cycle,
        easterDate: liturgicalYear.easterDate,
        seasons,
      },
    });
  } catch (error) {
    console.error('Error fetching liturgical seasons:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar temporadas litúrgicas',
    });
  }
});

/**
 * GET /api/liturgical/celebrations/:year/:month
 * Returns all special celebrations for a specific month
 * Used for questionnaire generation
 */
router.get('/celebrations/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month); // 1-12

    // Get liturgical year
    const [liturgicalYear] = await db
      .select()
      .from(liturgicalYears)
      .where(eq(liturgicalYears.year, year))
      .limit(1);

    if (!liturgicalYear) {
      return res.status(404).json({
        success: false,
        message: 'Ano litúrgico não encontrado',
      });
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    // Get celebrations for this month
    const celebrations = await db
      .select()
      .from(liturgicalCelebrations)
      .where(
        and(
          eq(liturgicalCelebrations.yearId, liturgicalYear.id),
          gte(liturgicalCelebrations.date, startDate.toISOString().split('T')[0]),
          lte(liturgicalCelebrations.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(liturgicalCelebrations.date);

    res.json({
      success: true,
      data: {
        year,
        month,
        celebrations,
      },
    });
  } catch (error) {
    console.error('Error fetching liturgical celebrations:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar celebrações litúrgicas',
    });
  }
});

/**
 * GET /api/liturgical/celebration/:date
 * Returns celebration for a specific date
 */
router.get('/celebration/:date', async (req, res) => {
  try {
    const dateStr = req.params.date; // YYYY-MM-DD format
    const date = new Date(dateStr);
    const year = date.getFullYear();

    // Get liturgical year
    const [liturgicalYear] = await db
      .select()
      .from(liturgicalYears)
      .where(eq(liturgicalYears.year, year))
      .limit(1);

    if (!liturgicalYear) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Get celebration for this date
    const [celebration] = await db
      .select()
      .from(liturgicalCelebrations)
      .where(
        and(
          eq(liturgicalCelebrations.yearId, liturgicalYear.id),
          eq(liturgicalCelebrations.date, dateStr)
        )
      )
      .limit(1);

    res.json({
      success: true,
      data: celebration || null,
    });
  } catch (error) {
    console.error('Error fetching celebration for date:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar celebração',
    });
  }
});

/**
 * GET /api/liturgical/mass-config/:date
 * Returns mass configuration for a specific date
 * Considers special masses, overrides, and regular schedule
 */
router.get('/mass-config/:date', async (req, res) => {
  try {
    const dateStr = req.params.date; // YYYY-MM-DD format
    const date = new Date(dateStr);
    const year = date.getFullYear();

    // Get liturgical year
    const [liturgicalYear] = await db
      .select()
      .from(liturgicalYears)
      .where(eq(liturgicalYears.year, year))
      .limit(1);

    // Check for mass overrides first (coordinator-defined special masses)
    const overrides = await db
      .select()
      .from(liturgicalMassOverrides)
      .where(eq(liturgicalMassOverrides.date, dateStr));

    if (overrides.length > 0) {
      return res.json({
        success: true,
        data: {
          date: dateStr,
          masses: overrides.map(override => ({
            time: override.time,
            min: override.minMinisters,
            max: override.maxMinisters,
            label: override.description || `Missa das ${override.time}`,
            isOverride: true,
          })),
          source: 'override',
        },
      });
    }

    // Check for celebration-specific mass config
    if (liturgicalYear) {
      const [celebration] = await db
        .select()
        .from(liturgicalCelebrations)
        .where(
          and(
            eq(liturgicalCelebrations.yearId, liturgicalYear.id),
            eq(liturgicalCelebrations.date, dateStr)
          )
        )
        .limit(1);

      if (celebration?.specialMassConfig) {
        const config = celebration.specialMassConfig as any;
        if (config.times && config.minMinisters && config.maxMinisters) {
          return res.json({
            success: true,
            data: {
              date: dateStr,
              celebration: celebration.name,
              rank: celebration.rank,
              color: celebration.color,
              masses: config.times.map((time: string) => ({
                time,
                min: config.minMinisters[time],
                max: config.maxMinisters[time],
                label: `${celebration.name} - ${time}`,
                requiresProcession: config.requiresProcession,
                requiresIncense: config.requiresIncense,
              })),
              source: 'celebration',
            },
          });
        }
      }
    }

    // Use default mass configuration based on date
    const massConfig = getMassConfigForDate(date);
    const specialMonthlyMass = getSpecialMonthlyMass(date);

    const masses = massConfig.map(config => ({
      time: config.time,
      min: config.min,
      max: config.max,
      label: config.label || `Missa das ${config.time}`,
    }));

    // Add special monthly mass if applicable
    if (specialMonthlyMass) {
      masses.push({
        time: specialMonthlyMass.time,
        min: specialMonthlyMass.min,
        max: specialMonthlyMass.max,
        label: specialMonthlyMass.label || `Missa das ${specialMonthlyMass.time}`,
      });
    }

    res.json({
      success: true,
      data: {
        date: dateStr,
        masses,
        source: 'default',
        specialInfo: {
          isStJudeDay: isStJudeDay(date),
          isStJudeNovena: isStJudeNovena(date),
          isStJudeFeast: isStJudeFeast(date),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching mass configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração de missas',
    });
  }
});

/**
 * POST /api/liturgical/overrides
 * Create mass time override (Coordinator only)
 */
router.post('/overrides', async (req, res) => {
  try {
    // TODO: Add coordinator authentication check
    // if (!req.user || req.user.role !== 'coordinator') {
    //   return res.status(403).json({ success: false, message: 'Acesso negado' });
    // }

    const { date, time, minMinisters, maxMinisters, description, reason } = req.body;

    if (!date || !time || !minMinisters || !maxMinisters) {
      return res.status(400).json({
        success: false,
        message: 'Dados incompletos: date, time, minMinisters, maxMinisters são obrigatórios',
      });
    }

    const [override] = await db
      .insert(liturgicalMassOverrides)
      .values({
        date,
        time,
        minMinisters,
        maxMinisters,
        description,
        reason,
        createdBy: 'admin', // TODO: Use req.user.id
      })
      .returning();

    res.json({
      success: true,
      data: override,
      message: 'Override de missa criado com sucesso',
    });
  } catch (error) {
    console.error('Error creating mass override:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar override de missa',
    });
  }
});

/**
 * GET /api/liturgical/overrides/:date
 * Get all overrides for a specific date
 */
router.get('/overrides/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const overrides = await db
      .select()
      .from(liturgicalMassOverrides)
      .where(eq(liturgicalMassOverrides.date, date));

    res.json({
      success: true,
      data: overrides,
    });
  } catch (error) {
    console.error('Error fetching mass overrides:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar overrides de missa',
    });
  }
});

/**
 * DELETE /api/liturgical/overrides/:id
 * Delete a mass override (Coordinator only)
 */
router.delete('/overrides/:id', async (req, res) => {
  try {
    // TODO: Add coordinator authentication check
    const { id } = req.params;

    await db
      .delete(liturgicalMassOverrides)
      .where(eq(liturgicalMassOverrides.id, id));

    res.json({
      success: true,
      message: 'Override de missa removido com sucesso',
    });
  } catch (error) {
    console.error('Error deleting mass override:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover override de missa',
    });
  }
});

/**
 * GET /api/liturgical/questionnaire/:year/:month
 * Generate liturgically-aware questionnaire for a specific month
 */
router.get('/questionnaire/:year/:month', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const questionnaire = generateLiturgicalQuestionnaire(month, year);
    res.json(questionnaire);
  } catch (error) {
    console.error('[LITURGICAL] Error generating questionnaire:', error);
    res.status(500).json({ error: 'Failed to generate questionnaire' });
  }
});

/**
 * POST /api/liturgical/convert
 * Convert user responses to algorithm format
 */
router.post('/convert', (req, res) => {
  try {
    const { responses, month, year } = req.body;

    if (!responses || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const algorithmFormat = convertToAlgorithmFormat(responses, month, year);
    res.json(algorithmFormat);
  } catch (error) {
    console.error('[LITURGICAL] Error converting responses:', error);
    res.status(500).json({ error: 'Failed to convert responses' });
  }
});

export default router;
