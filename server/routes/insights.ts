/**
 * Predictive Insights Routes for MESC
 *
 * API endpoints for accessing predictive analytics and recommendations.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../auth';
import {
  generatePredictiveInsights,
  getMinisterRiskProfiles,
  getTimeSlotInsights,
  getSubstitutionPatterns,
  getSeasonalPatterns,
  getEngagementTrends,
  getScheduleRiskAssessment
} from '../services/insightsService';

const router = Router();

// All insights routes require coordinator or higher role
router.use(authenticateToken);
router.use(requireRole(['coordenador', 'gestor']));

/**
 * GET /api/insights
 * Get comprehensive predictive insights dashboard
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const insights = await generatePredictiveInsights();
    res.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Erro ao gerar insights preditivos' });
  }
});

/**
 * GET /api/insights/summary
 * Get quick summary of key metrics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const insights = await generatePredictiveInsights();
    res.json({
      generatedAt: insights.generatedAt,
      summary: insights.summary,
      recommendations: insights.recommendations.slice(0, 5)
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

/**
 * GET /api/insights/ministers
 * Get minister risk profiles
 */
router.get('/ministers', async (req: Request, res: Response) => {
  try {
    const riskFilter = req.query.risk as string;
    let profiles = await getMinisterRiskProfiles();

    // Filter by risk level if specified
    if (riskFilter && ['low', 'medium', 'high', 'critical'].includes(riskFilter)) {
      profiles = profiles.filter(p => p.noShowRisk === riskFilter);
    }

    res.json({
      total: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Error getting minister risks:', error);
    res.status(500).json({ error: 'Erro ao obter perfis de risco' });
  }
});

/**
 * GET /api/insights/ministers/:id
 * Get detailed risk profile for a specific minister
 */
router.get('/ministers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profiles = await getMinisterRiskProfiles();
    const profile = profiles.find(p => p.ministerId === id);

    if (!profile) {
      return res.status(404).json({ error: 'Ministro nao encontrado' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error getting minister profile:', error);
    res.status(500).json({ error: 'Erro ao obter perfil do ministro' });
  }
});

/**
 * GET /api/insights/time-slots
 * Get time slot coverage insights
 */
router.get('/time-slots', async (req: Request, res: Response) => {
  try {
    const insights = await getTimeSlotInsights();

    // Group by status for easier consumption
    const grouped = {
      critical: insights.filter(i => i.coverageStatus === 'critical'),
      warning: insights.filter(i => i.coverageStatus === 'warning'),
      healthy: insights.filter(i => i.coverageStatus === 'healthy'),
      excellent: insights.filter(i => i.coverageStatus === 'excellent')
    };

    res.json({
      total: insights.length,
      byStatus: grouped,
      all: insights
    });
  } catch (error) {
    console.error('Error getting time slot insights:', error);
    res.status(500).json({ error: 'Erro ao obter analise de horarios' });
  }
});

/**
 * GET /api/insights/substitutions
 * Get substitution patterns
 */
router.get('/substitutions', async (req: Request, res: Response) => {
  try {
    const patterns = await getSubstitutionPatterns();

    // Calculate summary stats
    const avgFrequency = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.requestFrequency, 0) / patterns.length
      : 0;

    const increasing = patterns.filter(p => p.trend === 'increasing').length;
    const decreasing = patterns.filter(p => p.trend === 'decreasing').length;

    res.json({
      total: patterns.length,
      summary: {
        avgMonthlyFrequency: Math.round(avgFrequency * 10) / 10,
        trendingUp: increasing,
        trendingDown: decreasing
      },
      patterns
    });
  } catch (error) {
    console.error('Error getting substitution patterns:', error);
    res.status(500).json({ error: 'Erro ao obter padroes de substituicao' });
  }
});

/**
 * GET /api/insights/seasonal
 * Get seasonal patterns
 */
router.get('/seasonal', async (req: Request, res: Response) => {
  try {
    const patterns = await getSeasonalPatterns();

    // Identify high-risk months
    const highRiskMonths = patterns
      .filter(p => p.isHighRisk)
      .map(p => p.monthName);

    res.json({
      patterns,
      highRiskMonths,
      currentMonth: new Date().getMonth() + 1
    });
  } catch (error) {
    console.error('Error getting seasonal patterns:', error);
    res.status(500).json({ error: 'Erro ao obter padroes sazonais' });
  }
});

/**
 * GET /api/insights/engagement
 * Get engagement trends
 */
router.get('/engagement', async (req: Request, res: Response) => {
  try {
    const trends = await getEngagementTrends();

    // Calculate overall trend
    const latestTrend = trends.length > 0 ? trends[trends.length - 1].trend : 'stable';

    res.json({
      trends,
      overallTrend: latestTrend,
      periods: trends.length
    });
  } catch (error) {
    console.error('Error getting engagement trends:', error);
    res.status(500).json({ error: 'Erro ao obter tendencias de engajamento' });
  }
});

/**
 * GET /api/insights/schedule-risk/:date
 * Get risk assessment for a specific schedule date
 */
router.get('/schedule-risk/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Data invalida' });
    }

    const assessment = await getScheduleRiskAssessment(dateObj);
    res.json(assessment);
  } catch (error) {
    console.error('Error getting schedule risk:', error);
    res.status(500).json({ error: 'Erro ao avaliar risco da escala' });
  }
});

/**
 * GET /api/insights/recommendations
 * Get actionable recommendations
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const insights = await generatePredictiveInsights();

    // Categorize recommendations
    const categorized = {
      urgent: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    for (const rec of insights.recommendations) {
      if (rec.includes('urgente') || rec.includes('atencao') || rec.includes('critico')) {
        categorized.urgent.push(rec);
      } else if (rec.includes('proximo') || rec.includes('preparar')) {
        categorized.shortTerm.push(rec);
      } else {
        categorized.longTerm.push(rec);
      }
    }

    res.json({
      total: insights.recommendations.length,
      categorized,
      all: insights.recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Erro ao obter recomendacoes' });
  }
});

export default router;
