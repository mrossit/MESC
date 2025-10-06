import { Router } from 'express';
import { db } from '../db';
import { activeSessions, users } from '@shared/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';
import { nanoid } from 'nanoid';

const router = Router();

// Configuração de timeout (10 minutos)
const INACTIVITY_TIMEOUT_MINUTES = 10;
const SESSION_EXPIRES_HOURS = 12;

// POST /api/session/verify - Verifica se a sessão está ativa
router.post('/verify', async (req, res) => {
  const sessionToken = req.body.sessionToken || req.cookies?.session_token;

  if (!sessionToken) {
    return res.json({ expired: true, reason: 'no_token' });
  }

  try {
    // Busca sessão no banco
    const [session] = await db
      .select()
      .from(activeSessions)
      .where(
        and(
          eq(activeSessions.sessionToken, sessionToken),
          eq(activeSessions.isActive, true),
          gt(activeSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      return res.json({ expired: true, reason: 'session_not_found' });
    }

    // Calcula minutos desde última atividade usando PostgreSQL
    const now = new Date();
    const lastActivity = new Date(session.lastActivityAt);
    const minutesInactive = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);

    console.log(`[SESSION] User ${session.userId}: ${minutesInactive} min inactive`);

    // Se passou 10 minutos, expira
    if (minutesInactive > INACTIVITY_TIMEOUT_MINUTES) {
      // Marca sessão como inativa
      await db
        .update(activeSessions)
        .set({ isActive: false })
        .where(eq(activeSessions.id, session.id));

      console.log(`[SESSION] ❌ Expired - User ${session.userId} (${minutesInactive}min)`);

      return res.json({
        expired: true,
        reason: 'inactivity',
        minutesInactive
      });
    }

    // Sessão ainda válida
    return res.json({
      expired: false,
      minutesInactive,
      minutesRemaining: INACTIVITY_TIMEOUT_MINUTES - minutesInactive
    });

  } catch (error) {
    console.error('[SESSION] Error verifying:', error);
    return res.status(500).json({
      expired: true,
      reason: 'server_error'
    });
  }
});

// POST /api/session/heartbeat - Atualiza última atividade
router.post('/heartbeat', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const sessionToken = req.cookies?.session_token || req.body.sessionToken;

  if (!userId || !sessionToken) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }

  try {
    // Atualiza last_activity_at
    const result = await db
      .update(activeSessions)
      .set({ lastActivityAt: new Date() })
      .where(
        and(
          eq(activeSessions.userId, userId),
          eq(activeSessions.sessionToken, sessionToken),
          eq(activeSessions.isActive, true)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Sessão não encontrada' });
    }

    console.log(`[SESSION] 💓 Heartbeat - User ${userId}`);
    res.json({ success: true, timestamp: new Date() });

  } catch (error) {
    console.error('[SESSION] Error updating heartbeat:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar sessão' });
  }
});

// POST /api/session/create - Cria sessão ao fazer login (chamada internamente)
export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const sessionToken = nanoid(64);

  // Expira em 12 horas (JWT expiration)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRES_HOURS);

  try {
    // IMPORTANTE: Desativar todas as sessões antigas deste usuário
    await db
      .update(activeSessions)
      .set({ isActive: false })
      .where(
        and(
          eq(activeSessions.userId, userId),
          eq(activeSessions.isActive, true)
        )
      );

    // Criar nova sessão
    await db.insert(activeSessions).values({
      userId,
      sessionToken,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });

    console.log(`[SESSION] ✅ Created - User ${userId}`);
    return sessionToken;

  } catch (error) {
    console.error('[SESSION] Error creating:', error);
    throw new Error('Erro ao criar sessão');
  }
}

// POST /api/session/destroy - Destroi sessão ao fazer logout
router.post('/destroy', async (req, res) => {
  const sessionToken = req.cookies?.session_token || req.body.sessionToken;

  if (sessionToken) {
    try {
      await db
        .update(activeSessions)
        .set({ isActive: false })
        .where(eq(activeSessions.sessionToken, sessionToken));

      console.log('[SESSION] 🚪 Destroyed - Token:', sessionToken.substring(0, 10) + '...');
    } catch (error) {
      console.error('[SESSION] Error destroying:', error);
    }
  }

  res.clearCookie('session_token');
  res.json({ success: true });
});

// GET /api/session/cleanup - Limpa sessões expiradas (pode ser chamado via cron)
router.get('/cleanup', async (req, res) => {
  try {
    // Marca como inativa sessões com mais de 10 minutos sem atividade
    const inactiveResult = await db
      .update(activeSessions)
      .set({ isActive: false })
      .where(
        and(
          eq(activeSessions.isActive, true),
          sql`EXTRACT(EPOCH FROM (NOW() - ${activeSessions.lastActivityAt})) / 60 > ${INACTIVITY_TIMEOUT_MINUTES}`
        )
      )
      .returning({ id: activeSessions.id });

    // Remove sessões inativas antigas (mais de 30 dias)
    const deleteResult = await db
      .delete(activeSessions)
      .where(
        and(
          eq(activeSessions.isActive, false),
          sql`${activeSessions.createdAt} < NOW() - INTERVAL '30 days'`
        )
      )
      .returning({ id: activeSessions.id });

    console.log(`[SESSION] 🧹 Cleanup: ${inactiveResult.length} expired, ${deleteResult.length} deleted`);

    res.json({
      success: true,
      expired: inactiveResult.length,
      deleted: deleteResult.length
    });

  } catch (error) {
    console.error('[SESSION] Error in cleanup:', error);
    res.status(500).json({ success: false, message: 'Erro ao limpar sessões' });
  }
});

export default router;
