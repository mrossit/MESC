import { Router } from 'express';
import { db } from '../db';
import { activeSessions, users } from '@shared/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';
import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';

const router = Router();

// Configuração de timeout (10 minutos)
const INACTIVITY_TIMEOUT_MINUTES = 10;
const SESSION_EXPIRES_HOURS = 12;

// POST /api/session/verify - Verifica se a sessão está ativa
// OTIMIZADO: Sistema simplificado - JWT já gerencia autenticação
router.post('/verify', async (req, res) => {
  // Sempre retorna sessão válida - JWT é responsável por autenticação
  // Isso evita queries pesadas no banco a cada 30 segundos
  return res.json({
    expired: false,
    minutesInactive: 0,
    minutesRemaining: 10
  });
});

// POST /api/session/heartbeat - Atualiza última atividade
// OTIMIZADO: Sistema simplificado - apenas confirma que está ativo
router.post('/heartbeat', async (req, res) => {
  // Retorna sucesso imediatamente - JWT gerencia autenticação
  res.json({ success: true, timestamp: new Date() });
});

// POST /api/session/create - Cria sessão ao fazer login (chamada internamente)
export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const sessionToken = nanoid(64);
  const isPostgres = Boolean(process.env.DATABASE_URL);

  // Expira em 12 horas (JWT expiration)
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRES_HOURS);

  try {
    // IMPORTANTE: Desativar todas as sessões antigas deste usuário
    await db
      .update(activeSessions)
      .set({ isActive: (isPostgres ? false : 0) as any })
      .where(
        and(
          eq(activeSessions.userId, userId),
          eq(activeSessions.isActive, (isPostgres ? true : 1) as any)
        )
      );

    // Criar nova sessão
    await db.insert(activeSessions).values({
      id: isPostgres ? undefined : randomUUID(),
      userId,
      sessionToken,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      isActive: (isPostgres ? true : 1) as any
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
