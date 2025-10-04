/**
 * Routes: Fixed Footer
 * Endpoints para menu inferior (badges, contadores, logs)
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import type { Request, Response } from 'express';

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/escala/unread-count
 * Retorna contagem de escalas não lidas do usuário
 */
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.query.user_id as string || req.userId;

    if (!userId) {
      return res.status(400).json({ message: 'user_id é obrigatório' });
    }

    // Contar escalas criadas/modificadas após last_seen_schedules do usuário
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT s.id) as unread
      FROM schedules s
      LEFT JOIN schedule_assignments sa ON sa.schedule_id = s.id
      LEFT JOIN users u ON u.id = ${userId}
      WHERE (
        sa.user_id = ${userId}
        OR s.created_by = ${userId}
      )
      AND (
        u.last_seen_schedules IS NULL
        OR s.updated_at > u.last_seen_schedules
        OR s.created_at > u.last_seen_schedules
      )
      AND s.date >= CURRENT_DATE
    `);

    const unread = parseInt(result.rows[0]?.unread || '0', 10);

    res.json({ unread });
  } catch (error) {
    console.error('[Footer] Erro ao buscar unread count:', error);
    res.status(500).json({ message: 'Erro ao buscar escalas não lidas' });
  }
});

/**
 * POST /api/escala/mark-seen
 * Marca escalas como vistas pelo usuário
 */
router.post('/mark-seen', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.body.user_id || req.userId;

    if (!userId) {
      return res.status(400).json({ message: 'user_id é obrigatório' });
    }

    await db.execute(sql`
      UPDATE users
      SET last_seen_schedules = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `);

    res.json({ success: true });
  } catch (error) {
    console.error('[Footer] Erro ao marcar escalas como vistas:', error);
    res.status(500).json({ message: 'Erro ao atualizar status de visualização' });
  }
});

/**
 * GET /api/user/:userId/profile-alert
 * Verifica se há alertas de perfil para o usuário
 */
router.get('/:userId/profile-alert', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verificar se perfil está incompleto
    const result = await db.execute(sql`
      SELECT
        CASE
          WHEN nome IS NULL OR nome = '' THEN TRUE
          WHEN email IS NULL OR email = '' THEN TRUE
          WHEN phone IS NULL OR phone = '' THEN TRUE
          ELSE FALSE
        END as has_alert
      FROM users
      WHERE id = ${userId}
    `);

    const hasAlert = result.rows[0]?.has_alert || false;

    res.json({ hasAlert });
  } catch (error) {
    console.error('[Footer] Erro ao verificar alertas de perfil:', error);
    res.status(500).json({ message: 'Erro ao verificar alertas' });
  }
});

/**
 * POST /api/navigation/log
 * Registra navegação do usuário para analytics
 */
router.post('/log', async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, route, timestamp } = req.body;

    if (!user_id || !route) {
      return res.status(400).json({ message: 'user_id e route são obrigatórios' });
    }

    // Inserir log de navegação (tabela opcional para analytics)
    await db.execute(sql`
      INSERT INTO navigation_logs (user_id, route, timestamp, user_agent, ip)
      VALUES (
        ${user_id},
        ${route},
        ${timestamp || new Date().toISOString()},
        ${req.headers['user-agent'] || 'unknown'},
        ${req.ip || 'unknown'}
      )
      ON CONFLICT DO NOTHING
    `);

    res.json({ success: true });
  } catch (error) {
    // Falha silenciosa - analytics não deve quebrar a aplicação
    console.error('[Footer] Erro ao logar navegação:', error);
    res.json({ success: false });
  }
});

/**
 * GET /api/navigation/stats
 * Retorna estatísticas de navegação (admin only)
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Adicionar middleware de autorização para admin

    const result = await db.execute(sql`
      SELECT
        route,
        COUNT(*) as visits,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(timestamp) as last_visit
      FROM navigation_logs
      WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY route
      ORDER BY visits DESC
      LIMIT 20
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('[Footer] Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

export default router;
