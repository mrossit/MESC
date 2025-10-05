import { Router } from "express";
import { db } from "../db";
import { userSessions, users } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { authenticateToken, type AuthRequest } from "../auth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const router = Router();

router.get("/api/header/ultimas-conexoes", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Considerar online se last_activity_at >= now() - 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    // Buscar últimas sessões ativas com informações do usuário
    const recentSessions = await db
      .select({
        userId: users.id,
        nome: users.name,
        email: users.email,
        whatsapp: users.whatsapp,
        avatarUrl: users.photoUrl,
        lastActivityAt: userSessions.lastActivityAt,
        status: userSessions.status,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(users.status, 'active'),
          gte(userSessions.lastActivityAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Últimas 24h
        )
      )
      .orderBy(
        desc(userSessions.lastActivityAt)
      )
      .limit(limit * 2); // Buscar mais para filtrar depois

    // Agrupar por userId e pegar apenas a sessão mais recente de cada usuário
    const userMap = new Map();
    for (const session of recentSessions) {
      if (!userMap.has(session.userId)) {
        userMap.set(session.userId, session);
      }
    }

    const uniqueSessions = Array.from(userMap.values());

    // Formatar os dados
    const formattedData = uniqueSessions.slice(0, limit).map((session: any) => {
      const isOnline = session.lastActivityAt >= twoMinutesAgo || session.status === 'online';
      
      // Formatar tempo desde última atividade
      let lastSeenHuman = 'agora';
      if (!isOnline && session.lastActivityAt) {
        try {
          lastSeenHuman = formatDistanceToNow(session.lastActivityAt, {
            addSuffix: true,
            locale: ptBR
          });
        } catch (e) {
          lastSeenHuman = 'há algum tempo';
        }
      }

      // Mascarar email parcialmente
      const maskedEmail = session.email.replace(/(.{1})(.*)(@.*)/, (_match: string, first: string, middle: string, domain: string) => {
        return first + '*'.repeat(middle.length) + domain;
      });

      return {
        user_id: session.userId,
        nome: session.nome,
        avatar_url: session.avatarUrl,
        whatsapp: session.whatsapp,
        email: maskedEmail,
        status: isOnline ? 'online' : 'offline',
        last_seen_iso: session.lastActivityAt?.toISOString(),
        last_seen_human: lastSeenHuman
      };
    });

    // Ordenar: online primeiro, depois por last_seen
    formattedData.sort((a, b) => {
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (b.status === 'online' && a.status !== 'online') return 1;
      return new Date(b.last_seen_iso).getTime() - new Date(a.last_seen_iso).getTime();
    });

    res.json(formattedData);
  } catch (error) {
    console.error("[HEADER] Erro ao buscar últimas conexões:", error);
    res.status(500).json({ message: "Erro ao buscar últimas conexões" });
  }
});

export default router;
