import { Router } from "express";
import { db } from "../db";
import { activityLogs, users } from "@shared/schema";
import { eq, sql, and, gte, lte, desc, count, like, or } from "drizzle-orm";
import { authenticateToken, requireRole } from "../auth";
import { createActivityLogger } from "../utils/activityLogger";
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  getMimeType,
  getFileExtension,
  type ReportData,
  type ExportFormat
} from "../utils/reportExporter";

const router = Router();

// Type definitions for query results
interface ActivityLogRow {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | null;
}

interface ActionCount {
  action: string;
  count: number;
}

interface LoginStat {
  action: string;
  count: number;
}

interface RecentLogRow {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  details: unknown;
  createdAt: Date | null;
}

interface UserLogRow {
  id: string;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: Date | null;
}

interface ExportLogRow {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: Date | null;
}

// Helper to format date for display
function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Action descriptions in Portuguese
const actionDescriptions: Record<string, string> = {
  'login': 'Fez login no sistema',
  'logout': 'Saiu do sistema',
  'login_failed': 'Tentativa de login falhou',
  'view_schedule': 'Visualizou escala',
  'create_schedule': 'Criou escala',
  'update_schedule': 'Atualizou escala',
  'delete_schedule': 'Excluiu escala',
  'publish_schedule': 'Publicou escala',
  'respond_questionnaire': 'Respondeu questionário',
  'view_questionnaire': 'Visualizou questionário',
  'create_questionnaire': 'Criou questionário',
  'request_substitution': 'Solicitou substituição',
  'approve_substitution': 'Aprovou substituição',
  'reject_substitution': 'Rejeitou substituição',
  'claim_substitution': 'Assumiu substituição',
  'update_profile': 'Atualizou perfil',
  'view_formation': 'Visualizou formação',
  'complete_formation_module': 'Completou módulo de formação',
  'view_reports': 'Visualizou relatórios',
  'export_report': 'Exportou relatório',
  'send_notification': 'Enviou notificação',
  'view_notifications': 'Visualizou notificações',
  'view_dashboard': 'Acessou dashboard',
  'approve_user': 'Aprovou usuário',
  'reject_user': 'Rejeitou usuário',
  'update_user_role': 'Alterou papel de usuário',
  'deactivate_user': 'Desativou usuário',
  'activate_user': 'Ativou usuário',
  'delete_user': 'Excluiu usuário',
  'update_mass_times': 'Atualizou horários de missa',
  'create_mass_time': 'Criou horário de missa',
  'delete_mass_time': 'Excluiu horário de missa',
  'password_reset_request': 'Solicitou redefinição de senha',
  'password_reset_approved': 'Aprovou redefinição de senha',
  'password_changed': 'Alterou senha'
};

// Get description for an action
function getActionDescription(action: string, details?: Record<string, unknown>): string {
  const base = actionDescriptions[action] || action;

  // Add contextual info from details
  if (details) {
    if (details.type) return `${base} (${details.type})`;
    if (details.month && details.year) return `${base} - ${details.month}/${details.year}`;
    if (details.userName) return `${base}: ${details.userName}`;
  }

  return base;
}

// Action categories for filtering
const actionCategories: Record<string, string[]> = {
  'auth': ['login', 'logout', 'login_failed', 'password_reset_request', 'password_reset_approved', 'password_changed'],
  'schedule': ['view_schedule', 'create_schedule', 'update_schedule', 'delete_schedule', 'publish_schedule'],
  'questionnaire': ['respond_questionnaire', 'view_questionnaire', 'create_questionnaire'],
  'substitution': ['request_substitution', 'approve_substitution', 'reject_substitution', 'claim_substitution'],
  'user_management': ['approve_user', 'reject_user', 'update_user_role', 'deactivate_user', 'activate_user', 'delete_user'],
  'formation': ['view_formation', 'complete_formation_module'],
  'reports': ['view_reports', 'export_report'],
  'config': ['update_mass_times', 'create_mass_time', 'delete_mass_time'],
  'profile': ['update_profile'],
  'notifications': ['send_notification', 'view_notifications'],
  'dashboard': ['view_dashboard']
};

// ============================================
// ACTIVITY LOG ENDPOINTS
// ============================================

// Get activity logs with filtering and pagination
router.get("/", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      category,
      startDate,
      endDate,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [];

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }

    if (action) {
      conditions.push(eq(activityLogs.action, action));
    }

    if (category && actionCategories[category]) {
      const categoryActions = actionCategories[category];
      conditions.push(
        or(...categoryActions.map(a => eq(activityLogs.action, a)))
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(activityLogs.createdAt, start));
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(activityLogs.createdAt, end));
      }
    }

    if (search) {
      conditions.push(
        or(
          like(activityLogs.action, `%${search}%`),
          sql`${activityLogs.details}::text ILIKE ${'%' + search + '%'}`
        )
      );
    }

    // Get total count
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    // Get logs with user info
    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: activityLogs.action,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        userAgent: activityLogs.userAgent,
        createdAt: activityLogs.createdAt
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Add descriptions to logs
    const logsWithDescriptions = (logs as ActivityLogRow[]).map((log: ActivityLogRow) => ({
      ...log,
      description: getActionDescription(log.action, log.details as Record<string, unknown>)
    }));

    res.json({
      logs: logsWithDescriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      categories: Object.keys(actionCategories)
    });

  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

// Get activity summary/stats
router.get("/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const { days = 7 } = req.query;
    const numDays = Math.min(90, Math.max(1, parseInt(days) || 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    // Get activity count by action
    const byAction = await db
      .select({
        action: activityLogs.action,
        count: count()
      })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, startDate))
      .groupBy(activityLogs.action)
      .orderBy(desc(count()));

    // Get activity count by day
    const byDay = await db
      .select({
        date: sql<string>`DATE(${activityLogs.createdAt})`.as('date'),
        count: count()
      })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, startDate))
      .groupBy(sql`DATE(${activityLogs.createdAt})`)
      .orderBy(sql`DATE(${activityLogs.createdAt})`);

    // Get most active users
    const topUsers = await db
      .select({
        userId: activityLogs.userId,
        userName: users.name,
        count: count()
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(gte(activityLogs.createdAt, startDate))
      .groupBy(activityLogs.userId, users.name)
      .orderBy(desc(count()))
      .limit(10);

    // Get recent login activity
    const loginStats = await db
      .select({
        action: activityLogs.action,
        count: count()
      })
      .from(activityLogs)
      .where(
        and(
          gte(activityLogs.createdAt, startDate),
          or(
            eq(activityLogs.action, 'login'),
            eq(activityLogs.action, 'logout'),
            eq(activityLogs.action, 'login_failed')
          )
        )
      )
      .groupBy(activityLogs.action);

    // Map by action to category
    const byCategory = Object.entries(actionCategories).map(([category, actions]) => {
      const categoryCount = (byAction as ActionCount[])
        .filter((a: ActionCount) => actions.includes(a.action))
        .reduce((sum: number, a: ActionCount) => sum + a.count, 0);
      return { category, count: categoryCount };
    }).filter(c => c.count > 0);

    res.json({
      period: { days: numDays, startDate: startDate.toISOString() },
      totalActivities: (byAction as ActionCount[]).reduce((sum: number, a: ActionCount) => sum + a.count, 0),
      byAction: (byAction as ActionCount[]).map((a: ActionCount) => ({
        ...a,
        description: actionDescriptions[a.action] || a.action
      })),
      byCategory,
      byDay,
      topUsers,
      loginStats: {
        logins: (loginStats as LoginStat[]).find((s: LoginStat) => s.action === 'login')?.count || 0,
        logouts: (loginStats as LoginStat[]).find((s: LoginStat) => s.action === 'logout')?.count || 0,
        failedLogins: (loginStats as LoginStat[]).find((s: LoginStat) => s.action === 'login_failed')?.count || 0
      }
    });

  } catch (error) {
    console.error("Error fetching activity summary:", error);
    res.status(500).json({ error: "Failed to fetch activity summary" });
  }
});

// Get recent activities (for dashboard widget)
router.get("/recent", authenticateToken, async (req: any, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    // For non-admin users, only show their own activities
    const isAdmin = req.user?.role === 'gestor' || req.user?.role === 'coordenador';
    const userId = req.user?.id;

    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: users.name,
        action: activityLogs.action,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(isAdmin ? undefined : eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limitNum);

    const logsWithDescriptions = (logs as RecentLogRow[]).map((log: RecentLogRow) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName || 'Usuário',
      action: log.action,
      description: getActionDescription(log.action, log.details as Record<string, unknown>),
      metadata: log.details,
      createdAt: log.createdAt?.toISOString() || new Date().toISOString()
    }));

    res.json(logsWithDescriptions);

  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ error: "Failed to fetch recent activities" });
  }
});

// Get user-specific activity log
router.get("/user/:userId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(activityLogs.userId, userId)];

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(activityLogs.createdAt, start));
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(activityLogs.createdAt, end));
      }
    }

    // Get user info
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get count
    const [countResult] = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(and(...conditions));

    const totalCount = countResult?.count || 0;

    // Get logs
    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt
      })
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limitNum)
      .offset(offset);

    const logsWithDescriptions = (logs as UserLogRow[]).map((log: UserLogRow) => ({
      ...log,
      description: getActionDescription(log.action, log.details as Record<string, unknown>)
    }));

    res.json({
      user,
      logs: logsWithDescriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Failed to fetch user activity" });
  }
});

// Export activity logs
router.get("/export", authenticateToken, requireRole(["gestor"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("export_report", { type: "activity_logs" });

  try {
    const { format = 'xlsx', startDate, endDate, category, userId } = req.query;

    if (!['xlsx', 'pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: "Invalid format" });
    }

    const conditions = [];

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }

    if (category && actionCategories[category]) {
      const categoryActions = actionCategories[category];
      conditions.push(
        or(...categoryActions.map(a => eq(activityLogs.action, a)))
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(activityLogs.createdAt, start));
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(activityLogs.createdAt, end));
      }
    }

    // Default to last 30 days if no date specified
    if (!startDate && !endDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      conditions.push(gte(activityLogs.createdAt, thirtyDaysAgo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: activityLogs.action,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(10000); // Max 10k rows for export

    const typedLogs = logs as ExportLogRow[];
    const reportData: ReportData = {
      title: 'Logs de Atividade',
      subtitle: 'Registro de ações no sistema',
      generatedAt: formatDateBR(new Date()),
      period: startDate && endDate
        ? `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
        : 'Últimos 30 dias',
      headers: ['Data/Hora', 'Usuário', 'Ação', 'Descrição', 'IP'],
      rows: typedLogs.map((log: ExportLogRow) => [
        log.createdAt ? formatDateBR(log.createdAt) : 'N/A',
        log.userName || log.userEmail || 'N/A',
        log.action,
        getActionDescription(log.action, log.details as Record<string, unknown>),
        log.ipAddress || 'N/A'
      ]),
      summary: [
        { label: 'Total de Registros', value: typedLogs.length },
        { label: 'Usuários Únicos', value: new Set(typedLogs.map((l: ExportLogRow) => l.userId)).size }
      ]
    };

    let content: Buffer | string;
    if (format === 'xlsx') {
      content = exportToExcel(reportData);
    } else if (format === 'pdf') {
      content = exportToPDF(reportData);
    } else {
      content = exportToCSV(reportData);
    }

    const filename = `logs_atividade_${new Date().toISOString().split('T')[0]}.${getFileExtension(format as ExportFormat)}`;
    res.setHeader('Content-Type', getMimeType(format as ExportFormat));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting activity logs:", error);
    res.status(500).json({ error: "Failed to export activity logs" });
  }
});

export default router;
