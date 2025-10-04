import { Router } from 'express';
import { db } from '../db';
import { users, activeSessions } from '@shared/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';

const router = Router();

interface RecentUser {
  id: string;
  name: string;
  photoUrl?: string;
  isOnline: boolean;
  lastSeen: Date;
}

// GET /api/users/recent-connections - Busca últimos usuários conectados
router.get('/recent-connections', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Buscar as 10 sessões mais recentes (ativas ou inativas recentes)
    const recentSessions = await db
      .select({
        userId: activeSessions.userId,
        lastActivity: activeSessions.lastActivityAt,
        isActive: activeSessions.isActive,
      })
      .from(activeSessions)
      .orderBy(desc(activeSessions.lastActivityAt))
      .limit(10);

    // Pegar IDs únicos de usuários
    const uniqueUserIds = [...new Set(recentSessions.map((s: any) => s.userId))];

    // Buscar informações dos usuários
    if (uniqueUserIds.length === 0) {
      return res.json([]);
    }

    // Buscar todos os usuários relevantes de uma vez
    const allUsersData = await db
      .select({
        id: users.id,
        name: users.name,
        photoUrl: users.photoUrl,
      })
      .from(users)
      .where(inArray(users.id, uniqueUserIds));

    // Criar mapa de usuários
    const userMap = new Map(allUsersData.map(u => [u.id, u]));

    // Combinar dados de sessão com dados de usuário
    const recentUsers: RecentUser[] = uniqueUserIds
      .slice(0, 8) // Limitar a 8 usuários
      .map(userId => {
        const user = userMap.get(userId);
        const session = recentSessions.find((s: any) => s.userId === userId);

        if (!user || !session) return null;

        // Considerar online se a última atividade foi há menos de 10 minutos
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const isOnline = session.isActive && new Date(session.lastActivity) > tenMinutesAgo;

        return {
          id: user.id,
          name: user.name,
          photoUrl: user.photoUrl ? `/api/users/${user.id}/photo` : undefined,
          isOnline,
          lastSeen: session.lastActivity,
        };
      })
      .filter((u): u is RecentUser => u !== null);

    res.json(recentUsers);
  } catch (error) {
    console.error('[USERS] Error fetching recent connections:', error);
    res.status(500).json({ error: 'Erro ao buscar conexões recentes' });
  }
});

export default router;
