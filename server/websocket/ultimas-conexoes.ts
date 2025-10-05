/**
 * WebSocket Server: Últimas Conexões
 * Gerenciamento de conexões em tempo real
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { getHumanizedTime, getUserStatus } from '../utils/timeFormatter';

interface AuthenticatedSocket {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

function getJWTSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'sjt-mesc-development-secret-2025';
  }
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = getJWTSecret();

// Mapa de usuários conectados: userId -> Set<socketId>
const connectedUsers = new Map<string, Set<string>>();

// Rate limiting: userId -> { count: number, resetAt: number }
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 60; // 60 mensagens
const RATE_LIMIT_WINDOW = 60000; // por minuto

/**
 * Verifica rate limit para um usuário
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || userLimit.resetAt < now) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Busca status atual dos usuários online
 */
async function getOnlineUsers(limit = 20) {
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

  return result.rows.map((row: any) => {
    const timeInfo = getHumanizedTime(row.last_activity_at || row.last_seen);
    return {
      user_id: row.user_id,
      nome: row.nome || 'Usuário',
      avatar_url: row.avatar_url,
      whatsapp: row.whatsapp,
      status: row.status as 'online' | 'away' | 'offline',
      last_seen_iso: timeInfo.iso,
      last_seen_human: timeInfo.human
    };
  });
}

/**
 * Registra conexão de usuário
 */
async function registerUserConnection(userId: string, socketId: string, ip: string) {
  try {
    await db.execute(sql`
      INSERT INTO user_connections (user_id, session_id, ip, last_activity_at)
      VALUES (${userId}, ${socketId}, ${ip}, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `);

    await db.execute(sql`
      UPDATE users
      SET last_seen = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `);

    // Adicionar ao mapa de conectados
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socketId);

    console.log(`[WS] Usuário ${userId} conectado (socket: ${socketId})`);
  } catch (error) {
    console.error('[WS] Erro ao registrar conexão:', error);
  }
}

/**
 * Registra desconexão de usuário
 */
async function registerUserDisconnection(userId: string, socketId: string) {
  try {
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        connectedUsers.delete(userId);

        // Marcar todas as conexões como desconectadas
        await db.execute(sql`
          UPDATE user_connections
          SET disconnected_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId} AND disconnected_at IS NULL
        `);
      }
    }

    console.log(`[WS] Usuário ${userId} desconectado (socket: ${socketId})`);
  } catch (error) {
    console.error('[WS] Erro ao registrar desconexão:', error);
  }
}

/**
 * Inicializa servidor WebSocket
 */
export function initializeUltimasConexoesWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: '/sockets/ultimas-conexoes',
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5000',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Middleware de autenticação
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = decoded.id;
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const authSocket = socket as any as AuthenticatedSocket;
    const userId = authSocket.userId;
    const socketId = socket.id;
    const ip = socket.handshake.address;

    console.log(`[WS] Nova conexão: ${userId} (${socketId})`);

    // Registrar conexão no banco
    await registerUserConnection(userId, socketId, ip);

    // Enviar lista inicial
    const initialData = await getOnlineUsers();
    socket.emit('update', { type: 'update', payload: initialData });

    // Broadcast para outros usuários que alguém conectou
    socket.broadcast.emit('status', {
      event: 'status',
      user_id: userId,
      status: 'online',
      last_seen_iso: new Date().toISOString()
    });

    // Heartbeat: atualizar última atividade
    socket.on('heartbeat', async () => {
      if (!checkRateLimit(userId)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      try {
        await db.execute(sql`
          UPDATE user_connections
          SET last_activity_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId} AND session_id = ${socketId}
        `);

        await db.execute(sql`
          UPDATE users
          SET last_seen = CURRENT_TIMESTAMP
          WHERE id = ${userId}
        `);

        socket.emit('heartbeat_ack', { timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('[WS] Erro no heartbeat:', error);
      }
    });

    // Request de atualização manual
    socket.on('request_update', async () => {
      if (!checkRateLimit(userId)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const data = await getOnlineUsers();
      socket.emit('update', { type: 'update', payload: data });
    });

    // Desconexão
    socket.on('disconnect', async () => {
      console.log(`[WS] Desconexão: ${userId} (${socketId})`);
      await registerUserDisconnection(userId, socketId);

      // Broadcast para outros usuários
      const updatedData = await getOnlineUsers();
      socket.broadcast.emit('update', { type: 'update', payload: updatedData });
    });
  });

  // Broadcast periódico de atualizações (a cada 30s)
  setInterval(async () => {
    const data = await getOnlineUsers();
    io.emit('update', { type: 'update', payload: data });
  }, 30000);

  console.log('[WS] Servidor de Últimas Conexões inicializado');

  return io;
}
