/**
 * API Routes: Últimas Conexões
 * Endpoints para tracking de usuários online/offline
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';
import { getHumanizedTime, getUserStatus, maskEmail } from '../utils/timeFormatter';

const router = Router();

interface UltimaConexao {
  user_id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  avatar_url: string | null;
  status: 'online' | 'away' | 'offline';
  last_seen_iso: string;
  last_seen_human: string;
  ultima_funcao?: string;
}

/**
 * GET /api/header/ultimas-conexoes
 * Retorna lista de últimas conexões, ordenada por status e atividade
 */
router.get('/ultimas-conexoes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;

    // Consulta otimizada usando a view
    const result = await db.execute(sql`
      SELECT
        user_id,
        nome,
        email,
        whatsapp,
        avatar_url,
        last_seen,
        computed_status as status,
        last_activity_at
      FROM users_online_status
      ORDER BY
        CASE computed_status
          WHEN 'online' THEN 1
          WHEN 'away' THEN 2
          ELSE 3
        END,
        COALESCE(last_activity_at, last_seen, '1970-01-01'::timestamp) DESC
      LIMIT ${limit}
    `);

    const conexoes: UltimaConexao[] = await Promise.all(
      result.rows.map(async (row: any) => {
        const timeInfo = getHumanizedTime(row.last_activity_at || row.last_seen);

        // Buscar última função (escala mais recente)
        const ultimaFuncaoResult = await db.execute(sql`
          SELECT position
          FROM schedules
          WHERE minister_id = ${row.user_id}
          ORDER BY date DESC, mass_time DESC
          LIMIT 1
        `);

        const ultimaFuncao = ultimaFuncaoResult.rows[0]?.position
          ? `Posição ${ultimaFuncaoResult.rows[0].position}`
          : undefined;

        return {
          user_id: row.user_id,
          nome: row.nome || 'Usuário',
          email: row.email,
          whatsapp: row.whatsapp,
          avatar_url: row.avatar_url,
          status: row.status as 'online' | 'away' | 'offline',
          last_seen_iso: timeInfo.iso,
          last_seen_human: timeInfo.human,
          ultima_funcao: ultimaFuncao
        };
      })
    );

    res.json(conexoes);
  } catch (error) {
    console.error('[API] Erro ao buscar últimas conexões:', error);
    res.status(500).json({ error: 'Erro ao buscar últimas conexões' });
  }
});

/**
 * GET /api/header/ultimas-conexoes/:userId
 * Retorna detalhes de um usuário específico
 */
router.get('/ultimas-conexoes/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const result = await db.execute(sql`
      SELECT
        user_id,
        nome,
        email,
        whatsapp,
        avatar_url,
        last_seen,
        computed_status as status,
        last_activity_at
      FROM users_online_status
      WHERE user_id = ${userId}
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const row = result.rows[0] as any;
    const timeInfo = getHumanizedTime(row.last_activity_at || row.last_seen);

    // Buscar última função
    const ultimaFuncaoResult = await db.execute(sql`
      SELECT position, date, mass_time
      FROM schedules
      WHERE minister_id = ${userId}
      ORDER BY date DESC, mass_time DESC
      LIMIT 1
    `);

    const userDetail = {
      user_id: row.user_id,
      nome: row.nome || 'Usuário',
      email: row.email,
      email_mascarado: maskEmail(row.email),
      whatsapp: row.whatsapp,
      avatar_url: row.avatar_url,
      status: row.status as 'online' | 'away' | 'offline',
      last_seen_iso: timeInfo.iso,
      last_seen_human: timeInfo.human,
      ultima_escala: ultimaFuncaoResult.rows[0] || null
    };

    res.json(userDetail);
  } catch (error) {
    console.error('[API] Erro ao buscar detalhes do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do usuário' });
  }
});

/**
 * POST /api/header/ultimas-conexoes/heartbeat
 * Atualiza última atividade do usuário logado
 */
router.post('/ultimas-conexoes/heartbeat', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Atualizar last_seen do usuário
    await db.execute(sql`
      UPDATE users
      SET last_seen = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `);

    // Atualizar ou criar conexão ativa
    const sessionId = req.cookies?.connect_sid || req.headers['x-session-id'];

    await db.execute(sql`
      INSERT INTO user_connections (user_id, session_id, ip, last_activity_at)
      VALUES (
        ${userId},
        ${sessionId},
        ${req.ip},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, session_id)
      DO UPDATE SET
        last_activity_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_connections.disconnected_at IS NULL
    `);

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[API] Erro no heartbeat:', error);
    res.status(500).json({ error: 'Erro ao registrar atividade' });
  }
});

/**
 * GET /admin/ultimas-conexoes/logs
 * Retorna logs de conexão para auditoria (apenas admin)
 */
router.get('/logs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Verificar se é admin/gestor
    if (req.user?.role !== 'gestor' && req.user?.role !== 'coordenador') {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    const result = await db.execute(sql`
      SELECT
        uc.user_id,
        u.name as nome,
        MIN(uc.connected_at) as first_seen,
        MAX(uc.last_activity_at) as last_seen,
        COUNT(DISTINCT uc.id) as connections_count
      FROM user_connections uc
      JOIN users u ON u.id = uc.user_id
      GROUP BY uc.user_id, u.name
      ORDER BY last_seen DESC
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('[API] Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de conexão' });
  }
});

export default router;
