/**
 * 🤖 ADAPTIVE LEARNING - PHASE 5: Cron/Scheduled Tasks
 *
 * These endpoints can be called by external schedulers (e.g., GitHub Actions, cron jobs, or cloud schedulers)
 * to run periodic maintenance tasks.
 *
 * Security: Protected by API key to prevent unauthorized access
 */

import { Router, Request, Response } from 'express';
import { checkAndAlertLowReliability } from '../services/reliabilityScoreService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Middleware to verify cron API key
 * The API key should be set in environment variables
 */
function verifyCronKey(req: Request, res: Response, next: Function) {
  const cronKey = req.headers['x-cron-key'] || req.query.key;
  const expectedKey = process.env.CRON_API_KEY || 'development-cron-key';

  if (cronKey !== expectedKey) {
    logger.warn('[CRON] Unauthorized cron request attempt', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid cron API key',
    });
  }

  next();
}

/**
 * POST /api/cron/reliability-check
 * Run reliability check and send alerts for low-reliability ministers
 *
 * This should be called weekly (e.g., every Sunday at 8 PM)
 * Example cron schedule: 0 20 * * 0 (every Sunday at 8 PM)
 *
 * Usage with curl:
 * curl -X POST https://your-domain.com/api/cron/reliability-check \
 *   -H "x-cron-key: your-secret-key"
 */
router.post('/reliability-check', verifyCronKey, async (req: Request, res: Response) => {
  try {
    logger.info('[CRON] 🕐 Starting scheduled reliability check...');

    const result = await checkAndAlertLowReliability();

    logger.info('[CRON] ✅ Reliability check completed successfully', result);

    res.json({
      success: true,
      message: 'Reliability check completed',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[CRON] ❌ Reliability check failed:', error);

    res.status(500).json({
      success: false,
      message: 'Reliability check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cron/health
 * Health check endpoint for cron jobs
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Cron endpoints are healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
