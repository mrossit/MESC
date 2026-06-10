/**
 * WebSocket Server for Real-time Notifications
 * Provides live updates for dashboard alerts and substitution requests
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';
import { schedules, substitutionRequests, users } from '../shared/schema';
import { isAdmin as isAdminRole } from '../shared/roles';
import { eq, and, gte, lte, sql, or } from 'drizzle-orm';
import { format, addDays } from 'date-fns';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
}

interface CriticalMassAlert {
  date: string;
  time: string;
  vacancies: number;
  hoursUntil: number;
  massTime: string;
}

interface UrgentSubstitution {
  id: string;
  scheduleId: string;
  requesterId: string;
  requesterName: string | null;
  reason: string | null;
  status: string;
  massDate: string;
  massTime: string;
  hoursUntil: number;
}

interface AlertData {
  criticalMasses: CriticalMassAlert[];
  urgentSubstitutions: UrgentSubstitution[];
  totalCritical: number;
}

interface SubstitutionRequestData {
  id: string;
  scheduleId: string;
  requesterId: string;
  requesterName?: string;
  massDate?: string;
  massTime?: string;
}

interface CriticalMassData {
  date: string;
  time: string;
  vacancies: number;
}

interface UserNotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string | null;
  createdAt: string;
}

interface UnreadCountData {
  count: number;
}

interface AuxiliaryPanelUpdate {
  scheduleId: string;
  updateType: 'check_in' | 'redistribute' | 'standby_call' | 'report';
  ministerId?: string;
  ministerName?: string;
  position?: string;
  status?: string;
  changes?: Record<string, unknown> | Record<string, unknown>[];
}

type NotificationData = AlertData | SubstitutionRequestData | CriticalMassData | UserNotificationData | UnreadCountData | AuxiliaryPanelUpdate | undefined;

interface NotificationMessage {
  type: 'SUBSTITUTION_REQUEST' | 'CRITICAL_MASS' | 'ALERT_UPDATE' | 'USER_NOTIFICATION' | 'UNREAD_COUNT' | 'AUXILIARY_PANEL_UPDATE' | 'PING';
  data?: NotificationData;
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

          // Send initial alerts to newly connected coordinator
          if (isAdminRole(ws.userRole)) {
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

  if (process.env.NODE_ENV === 'development') {
    console.log('🔌 WebSocket server initialized');
  }
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

  type CriticalMassResult = typeof criticalMasses[number];
  const criticalWithHours: CriticalMassAlert[] = criticalMasses.map((m: CriticalMassResult) => ({
    date: m.date,
    time: m.time,
    vacancies: m.vacancies,
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

  type SubstitutionResult = typeof urgentSubstitutions[number];
  return {
    criticalMasses: criticalWithHours,
    urgentSubstitutions: urgentSubstitutions.map((s: SubstitutionResult) => ({
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
        isAdminRole(client.userRole)
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
export function notifySubstitutionRequest(substitutionData: SubstitutionRequestData) {
  const message: NotificationMessage = {
    type: 'SUBSTITUTION_REQUEST',
    data: substitutionData,
    timestamp: new Date().toISOString()
  };

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      isAdminRole(client.userRole)
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

/**
 * Notify about critical mass alert
 */
export function notifyCriticalMass(massData: CriticalMassData) {
  const message: NotificationMessage = {
    type: 'CRITICAL_MASS',
    data: massData,
    timestamp: new Date().toISOString()
  };

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      isAdminRole(client.userRole)
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

/**
 * Send notification to specific users via WebSocket
 */
export function notifyUsers(userIds: string[], notificationData: UserNotificationData) {
  const message: NotificationMessage = {
    type: 'USER_NOTIFICATION',
    data: notificationData,
    timestamp: new Date().toISOString()
  };

  const messageStr = JSON.stringify(message);
  const userIdSet = new Set(userIds);

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId &&
      userIdSet.has(client.userId)
    ) {
      client.send(messageStr);
    }
  });
}

/**
 * Send updated unread count to a specific user
 */
export function notifyUnreadCount(userId: string, count: number) {
  const message: NotificationMessage = {
    type: 'UNREAD_COUNT',
    data: { count },
    timestamp: new Date().toISOString()
  };

  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId === userId
    ) {
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast notification to all connected users
 */
export function broadcastNotification(notificationData: UserNotificationData) {
  const message: NotificationMessage = {
    type: 'USER_NOTIFICATION',
    data: notificationData,
    timestamp: new Date().toISOString()
  };

  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId) {
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast auxiliary panel updates for real-time sync
 * Sends updates to coordinators, managers, and relevant auxiliaries
 */
export function broadcastAuxiliaryPanelUpdate(updateData: AuxiliaryPanelUpdate) {
  const message: NotificationMessage = {
    type: 'AUXILIARY_PANEL_UPDATE',
    data: updateData,
    timestamp: new Date().toISOString()
  };

  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId &&
      (isAdminRole(client.userRole) || client.userRole === 'auxiliar')
    ) {
      client.send(messageStr);
    }
  });
}
