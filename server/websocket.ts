/**
 * WebSocket Server for Real-time Notifications
 * Provides live updates for dashboard alerts and substitution requests
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';
import { schedules, substitutionRequests, users } from '../shared/schema';
import { eq, and, gte, lte, sql, or } from 'drizzle-orm';
import { format, addDays } from 'date-fns';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
}

interface NotificationMessage {
  type: 'SUBSTITUTION_REQUEST' | 'CRITICAL_MASS' | 'ALERT_UPDATE' | 'PING';
  data?: any;
  timestamp: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<AuthenticatedWebSocket>();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('[WS] New WebSocket connection');

    ws.isAlive = true;
    clients.add(ws);

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication
        if (data.type === 'AUTH') {
          ws.userId = data.userId;
          ws.userRole = data.userRole;
          console.log(`[WS] Client authenticated: ${ws.userId} (${ws.userRole})`);

          // Send initial alerts to newly connected coordinator
          if (ws.userRole === 'coordenador' || ws.userRole === 'gestor') {
            const alerts = await getCriticalAlerts();
            ws.send(JSON.stringify({
              type: 'ALERT_UPDATE',
              data: alerts,
              timestamp: new Date().toISOString()
            }));
          }
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss?.clients.forEach((ws: WebSocket) => {
      const client = ws as AuthenticatedWebSocket;
      if (client.isAlive === false) {
        clients.delete(client);
        return client.terminate();
      }

      client.isAlive = false;
      client.ping();
    });
  }, 30000); // Every 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // Periodic check for critical alerts (every 30 seconds)
  setInterval(async () => {
    await broadcastCriticalAlerts();
  }, 30000);

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

/**
 * Get critical alerts that need immediate attention
 */
async function getCriticalAlerts() {
  const now = new Date();
  const next12Hours = addDays(now, 0.5); // 12 hours
  const next48Hours = addDays(now, 2);

  // Find critical masses (< 12h with vacancies)
  const criticalMasses = await db
    .select({
      date: schedules.date,
      time: schedules.time,
      vacancies: sql<number>`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`,
    })
    .from(schedules)
    .where(
      and(
        gte(schedules.date, format(now, 'yyyy-MM-dd')),
        lte(schedules.date, format(next12Hours, 'yyyy-MM-dd'))
      )
    )
    .groupBy(schedules.date, schedules.time)
    .having(sql`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END) > 0`);

  const criticalWithHours = criticalMasses.map(m => ({
    ...m,
    hoursUntil: Math.round((new Date(m.date).getTime() - now.getTime()) / (1000 * 60 * 60)),
    massTime: m.time,
  }));

  // Find urgent substitutions (< 48h)
  const urgentSubstitutions = await db
    .select({
      id: substitutionRequests.id,
      scheduleId: substitutionRequests.scheduleId,
      requesterId: substitutionRequests.requesterId,
      requesterName: users.name,
      reason: substitutionRequests.reason,
      status: substitutionRequests.status,
      massDate: schedules.date,
      massTime: schedules.time,
    })
    .from(substitutionRequests)
    .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
    .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
    .where(
      and(
        or(
          eq(substitutionRequests.status, 'pending'),
          eq(substitutionRequests.status, 'available')
        ),
        gte(schedules.date, format(now, 'yyyy-MM-dd')),
        lte(schedules.date, format(next48Hours, 'yyyy-MM-dd'))
      )
    )
    .orderBy(schedules.date);

  return {
    criticalMasses: criticalWithHours,
    urgentSubstitutions: urgentSubstitutions.map(s => ({
      ...s,
      hoursUntil: Math.round((new Date(s.massDate).getTime() - now.getTime()) / (1000 * 60 * 60)),
    })),
    totalCritical: criticalWithHours.length + urgentSubstitutions.length,
  };
}

/**
 * Broadcast critical alerts to all connected coordinators
 */
async function broadcastCriticalAlerts() {
  try {
    const alerts = await getCriticalAlerts();

    clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        (client.userRole === 'coordenador' || client.userRole === 'gestor')
      ) {
        client.send(JSON.stringify({
          type: 'ALERT_UPDATE',
          data: alerts,
          timestamp: new Date().toISOString()
        }));
      }
    });
  } catch (error) {
    console.error('[WS] Error broadcasting critical alerts:', error);
  }
}

/**
 * Notify about new substitution request
 */
export function notifySubstitutionRequest(substitutionData: any) {
  const message: NotificationMessage = {
    type: 'SUBSTITUTION_REQUEST',
    data: substitutionData,
    timestamp: new Date().toISOString()
  };

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      (client.userRole === 'coordenador' || client.userRole === 'gestor')
    ) {
      client.send(JSON.stringify(message));
    }
  });

  console.log('[WS] Notified coordinators about new substitution request');
}

/**
 * Notify about critical mass alert
 */
export function notifyCriticalMass(massData: any) {
  const message: NotificationMessage = {
    type: 'CRITICAL_MASS',
    data: massData,
    timestamp: new Date().toISOString()
  };

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      (client.userRole === 'coordenador' || client.userRole === 'gestor')
    ) {
      client.send(JSON.stringify(message));
    }
  });

  console.log('[WS] Notified coordinators about critical mass');
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
