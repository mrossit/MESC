import { db } from '../db';
import { userSessions } from '@shared/schema';
import { lt } from 'drizzle-orm';

/**
 * Limpa sessões antigas (mais de 24 horas sem atividade)
 */
export async function cleanOldSessions() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deleted = await db
      .delete(userSessions)
      .where(lt(userSessions.lastActivityAt, oneDayAgo));

    console.log('[SESSION_CLEANER] Sessões antigas limpas');
    return deleted;
  } catch (error) {
    console.error('[SESSION_CLEANER] Erro ao limpar sessões antigas:', error);
  }
}

/**
 * Marca sessões como offline se não houve atividade nos últimos 5 minutos
 */
export async function markInactiveSessions() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    await db
      .update(userSessions)
      .set({ status: 'offline' })
      .where(lt(userSessions.lastActivityAt, fiveMinutesAgo));

    console.log('[SESSION_CLEANER] Sessões inativas marcadas como offline');
  } catch (error) {
    console.error('[SESSION_CLEANER] Erro ao marcar sessões inativas:', error);
  }
}

/**
 * Inicia o limpador de sessões
 * - Limpa sessões antigas a cada 1 hora
 * - Marca sessões inativas a cada 2 minutos
 */
export function startSessionCleaner() {
  // Executar imediatamente
  markInactiveSessions();

  // Marcar sessões inativas a cada 2 minutos
  setInterval(markInactiveSessions, 2 * 60 * 1000);

  // Limpar sessões antigas a cada 1 hora
  setInterval(cleanOldSessions, 60 * 60 * 1000);

  console.log('[SESSION_CLEANER] Iniciado');
}
