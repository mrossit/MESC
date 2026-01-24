/**
 * 🤖 ADAPTIVE LEARNING - PHASE 4: Reliability Metrics API
 *
 * Provides API endpoints for viewing and managing minister reliability metrics.
 * Accessible by coordinators and managers to monitor adaptive learning system.
 */

import { Router, Response } from 'express';
import { AuthRequest, authenticateToken as requireAuth, requireRole } from '../auth';
import {
  getAllReliabilityMetrics,
  getLowReliabilityMinisters,
  getMinisterReliabilityScore,
  updateMinisterReliabilityScore,
} from '../services/reliabilityScoreService';
import { getMinisterLearningInsights } from '../services/scheduleComparisonService';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/reliability/metrics
 * Get reliability metrics for all ministers
 * Requires: gestor or coordenador role
 */
router.get(
  '/metrics',
  requireAuth,
  requireRole(['gestor', 'coordenador']),
  async (req: AuthRequest, res: Response) => {
    try {
      const metrics = await getAllReliabilityMetrics();

      res.json({
        success: true,
        data: metrics,
        summary: {
          total: metrics.length,
          excellent: metrics.filter(m => m.category === 'excellent').length,
          good: metrics.filter(m => m.category === 'good').length,
          fair: metrics.filter(m => m.category === 'fair').length,
          poor: metrics.filter(m => m.category === 'poor').length,
          critical: metrics.filter(m => m.category === 'critical').length,
        },
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar métricas de confiabilidade',
      });
    }
  }
);

/**
 * GET /api/reliability/low
 * Get ministers with low reliability scores
 * Query params:
 *   - threshold (optional): minimum score threshold (default: 60)
 * Requires: gestor or coordenador role
 */
router.get(
  '/low',
  requireAuth,
  requireRole(['gestor', 'coordenador']),
  async (req: AuthRequest, res: Response) => {
    try {
      const threshold = req.query.threshold
        ? parseInt(req.query.threshold as string)
        : 60;

      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        return res.status(400).json({
          success: false,
          message: 'Threshold deve ser um número entre 0 e 100',
        });
      }

      const lowReliability = await getLowReliabilityMinisters(threshold);

      res.json({
        success: true,
        data: lowReliability,
        threshold,
        count: lowReliability.length,
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error fetching low reliability:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar ministros com baixa confiabilidade',
      });
    }
  }
);

/**
 * GET /api/reliability/minister/:ministerId
 * Get detailed reliability information for a specific minister
 * Requires: gestor or coordenador role
 */
router.get(
  '/minister/:ministerId',
  requireAuth,
  requireRole(['gestor', 'coordenador']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { ministerId } = req.params;

      const [score, insights] = await Promise.all([
        getMinisterReliabilityScore(ministerId),
        getMinisterLearningInsights(ministerId),
      ]);

      if (!score) {
        return res.status(404).json({
          success: false,
          message: 'Ministro não encontrado',
        });
      }

      res.json({
        success: true,
        data: {
          score,
          insights,
        },
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error fetching minister data:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar dados do ministro',
      });
    }
  }
);

/**
 * POST /api/reliability/minister/:ministerId/recalculate
 * Recalculate reliability score for a specific minister
 * Requires: gestor or coordenador role
 */
router.post(
  '/minister/:ministerId/recalculate',
  requireAuth,
  requireRole(['gestor', 'coordenador']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { ministerId } = req.params;

      const updatedScore = await updateMinisterReliabilityScore(ministerId);

      if (!updatedScore) {
        return res.status(404).json({
          success: false,
          message: 'Ministro não encontrado',
        });
      }

      res.json({
        success: true,
        message: 'Score recalculado com sucesso',
        data: updatedScore,
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error recalculating score:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao recalcular score',
      });
    }
  }
);

/**
 * POST /api/reliability/minister/:ministerId/reset
 * Reset reliability metrics to default values (100 score, 0 counts)
 * Use case: After conversation with minister, giving them a fresh start
 * Requires: gestor role only (more sensitive operation)
 */
router.post(
  '/minister/:ministerId/reset',
  requireAuth,
  requireRole(['gestor']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { ministerId } = req.params;
      const { reason } = req.body;

      // Verify minister exists
      const minister = await db
        .select()
        .from(users)
        .where(eq(users.id, ministerId))
        .limit(1);

      if (minister.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ministro não encontrado',
        });
      }

      // Reset all reliability metrics
      const result = await db
        .update(users)
        .set({
          reliabilityScore: 100,
          substitutionRequestCount: 0,
          substitutionFulfilledCount: 0,
          manualRemovalCount: 0,
          noShowCount: 0,
          lastReliabilityUpdate: new Date(),
          reliabilityNotes: reason
            ? `Reset em ${new Date().toISOString()} - Motivo: ${reason}`
            : `Reset em ${new Date().toISOString()}`,
        })
        .where(eq(users.id, ministerId))
        .returning();

      console.log(
        `[RELIABILITY API] ♻️ Reset reliability for ${minister[0].name} by user ${req.user?.id}`
      );
      console.log(`  - Reason: ${reason || 'Not provided'}`);

      res.json({
        success: true,
        message: 'Métricas resetadas com sucesso. O ministro recebeu uma nova chance.',
        data: {
          ministerId: result[0].id,
          ministerName: minister[0].name,
          reliabilityScore: result[0].reliabilityScore,
          resetDate: result[0].lastReliabilityUpdate,
          reason: reason || null,
        },
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error resetting metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao resetar métricas',
      });
    }
  }
);

/**
 * POST /api/reliability/minister/:ministerId/note
 * Add a note to minister's reliability record
 * Requires: gestor or coordenador role
 */
router.post(
  '/minister/:ministerId/note',
  requireAuth,
  requireRole(['gestor', 'coordenador']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { ministerId } = req.params;
      const { note } = req.body;

      if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nota é obrigatória',
        });
      }

      // Get current notes
      const minister = await db
        .select()
        .from(users)
        .where(eq(users.id, ministerId))
        .limit(1);

      if (minister.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ministro não encontrado',
        });
      }

      const timestamp = new Date().toISOString();
      const userName = req.user?.name || 'Unknown';
      const newNote = `[${timestamp}] ${userName}: ${note}`;

      const currentNotes = minister[0].reliabilityNotes || '';
      const updatedNotes = currentNotes
        ? `${currentNotes}\n${newNote}`
        : newNote;

      await db
        .update(users)
        .set({
          reliabilityNotes: updatedNotes,
          lastReliabilityUpdate: new Date(),
        })
        .where(eq(users.id, ministerId));

      res.json({
        success: true,
        message: 'Nota adicionada com sucesso',
        data: {
          ministerId,
          note: newNote,
        },
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error adding note:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao adicionar nota',
      });
    }
  }
);

/**
 * GET /api/reliability/stats
 * Get overall reliability system statistics
 * Requires: gestor or coordenador role
 */
router.get(
  '/stats',
  requireAuth,
  requireRole(['gestor', 'coordenador']),
  async (req: AuthRequest, res: Response) => {
    try {
      const metrics = await getAllReliabilityMetrics();

      // Calculate statistics
      const totalMinisters = metrics.length;
      const averageScore = totalMinisters > 0
        ? metrics.reduce((sum, m) => sum + m.reliabilityScore, 0) / totalMinisters
        : 0;

      const totalSubstitutionRequests = metrics.reduce(
        (sum, m) => sum + m.substitutionRequestCount,
        0
      );
      const totalSubstitutionsFulfilled = metrics.reduce(
        (sum, m) => sum + m.substitutionFulfilledCount,
        0
      );
      const totalManualRemovals = metrics.reduce(
        (sum, m) => sum + m.manualRemovalCount,
        0
      );
      const totalNoShows = metrics.reduce((sum, m) => sum + m.noShowCount, 0);

      // Distribution by category
      const distribution = {
        excellent: metrics.filter(m => m.category === 'excellent').length,
        good: metrics.filter(m => m.category === 'good').length,
        fair: metrics.filter(m => m.category === 'fair').length,
        poor: metrics.filter(m => m.category === 'poor').length,
        critical: metrics.filter(m => m.category === 'critical').length,
      };

      // System health
      const criticalPercentage = totalMinisters > 0 ? (distribution.critical / totalMinisters) * 100 : 0;
      const excellentPercentage = totalMinisters > 0 ? (distribution.excellent / totalMinisters) * 100 : 0;

      let systemHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
      if (criticalPercentage >= 20) systemHealth = 'critical';
      else if (criticalPercentage >= 10) systemHealth = 'needs_attention';
      else if (excellentPercentage >= 60) systemHealth = 'excellent';
      else systemHealth = 'good';

      res.json({
        success: true,
        data: {
          overview: {
            totalMinisters,
            averageScore: Math.round(averageScore * 10) / 10,
            systemHealth,
          },
          distribution,
          events: {
            totalSubstitutionRequests,
            totalSubstitutionsFulfilled,
            totalManualRemovals,
            totalNoShows,
          },
          trends: {
            criticalPercentage: Math.round(criticalPercentage * 10) / 10,
            excellentPercentage: Math.round(excellentPercentage * 10) / 10,
          },
        },
      });
    } catch (error) {
      console.error('[RELIABILITY API] Error fetching stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
      });
    }
  }
);

export default router;
