import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import {
  users,
  questionnaireResponses,
  substitutionRequests,
  schedules,
  formationProgress,
  activityLogs,
  families,
  familyRelationships
} from "@shared/schema";
import { eq, sql, and, gte, lte, desc, asc, count, avg } from "drizzle-orm";
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

// Helper to safely parse date strings
function parseQueryDate(dateStr: unknown): Date | null {
  if (typeof dateStr !== 'string' || !dateStr) return null;
  const parsed = new Date(dateStr);
  // Check if date is valid
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

const router = Router();

// Get minister availability metrics
router.get("/availability", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "availability" });

  try {
    const { startDate, endDate, limit = 10 } = req.query;

    // Query to get ministers with highest availability
    const availabilityData = await db
      .select({
        userId: questionnaireResponses.userId,
        userName: users.name,
        totalResponses: count(questionnaireResponses.id),
        availableDays: sql<number>`
          COALESCE(
            SUM(
              jsonb_array_length(
                COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
              )
            ), 0
          )
        `.as('available_days')
      })
      .from(questionnaireResponses)
      .leftJoin(users, eq(users.id, questionnaireResponses.userId))
      .where(
        and(
          parseQueryDate(startDate) ? gte(questionnaireResponses.submittedAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(questionnaireResponses.submittedAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(questionnaireResponses.userId, users.name)
      .orderBy(desc(sql`available_days`))
      .limit(Number(limit));

    res.json({
      topAvailable: availabilityData,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching availability metrics:", error);
    res.status(500).json({ error: "Failed to fetch availability metrics" });
  }
});

// Get substitution metrics
router.get("/substitutions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "substitutions" });

  try {
    const { startDate, endDate } = req.query;

    // Ministers who request most substitutions
    const mostRequests = await db
      .select({
        userId: substitutionRequests.requesterId,
        userName: users.name,
        totalRequests: count(substitutionRequests.id),
        approvedRequests: sql<number>`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as('approved_requests'),
        pendingRequests: sql<number>`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'pending' THEN 1 END)
        `.as('pending_requests')
      })
      .from(substitutionRequests)
      .leftJoin(users, eq(users.id, substitutionRequests.requesterId))
      .where(
        and(
          parseQueryDate(startDate) ? gte(substitutionRequests.createdAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(substitutionRequests.createdAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(substitutionRequests.requesterId, users.name)
      .orderBy(desc(count(substitutionRequests.id)))
      .limit(10);

    // Ministers who serve most without requesting substitutions
    const reliableServers = await db
      .select({
        userId: schedules.ministerId,
        userName: users.name,
        totalAssignments: count(schedules.id),
        substitutionRequests: sql<number>`
          (SELECT COUNT(*) FROM ${substitutionRequests}
           WHERE ${substitutionRequests.requesterId} = ${schedules.ministerId}
           ${startDate ? sql`AND ${substitutionRequests.createdAt} >= ${parseQueryDate(startDate)!}` : sql``}
           ${endDate ? sql`AND ${substitutionRequests.createdAt} <= ${parseQueryDate(endDate)!}` : sql``})
        `.as('substitution_requests')
      })
      .from(schedules)
      .leftJoin(users, eq(users.id, schedules.ministerId))
      .where(
        and(
          schedules.status ? eq(schedules.status, "published") : sql`true`,
          parseQueryDate(startDate) ? gte(schedules.createdAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(schedules.createdAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(schedules.ministerId, users.name)
      .having(sql`COUNT(${schedules.id}) > 0`)
      .orderBy(asc(sql`substitution_requests`), desc(count(schedules.id)))
      .limit(10);

    res.json({
      mostRequests,
      reliableServers,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching substitution metrics:", error);
    res.status(500).json({ error: "Failed to fetch substitution metrics" });
  }
});

// Get engagement metrics
router.get("/engagement", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "engagement" });

  try {
    const { startDate, endDate, limit = 10 } = req.query;

    // Most active users (by activity logs)
    const mostActive = await db
      .select({
        userId: activityLogs.userId,
        userName: users.name,
        totalActions: count(activityLogs.id),
        lastActivity: sql<Date>`MAX(${activityLogs.createdAt})`.as('last_activity'),
        uniqueDays: sql<number>`
          COUNT(DISTINCT DATE(${activityLogs.createdAt}))
        `.as('unique_days')
      })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.userId))
      .where(
        and(
          parseQueryDate(startDate) ? gte(activityLogs.createdAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(activityLogs.createdAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(activityLogs.userId, users.name)
      .orderBy(desc(count(activityLogs.id)))
      .limit(Number(limit));

    // Questionnaire response rates
    const responseRates = await db
      .select({
        totalMinisters: count(users.id),
        respondedMinisters: sql<number>`
          COUNT(DISTINCT ${questionnaireResponses.userId})
        `.as('responded_ministers'),
        responseRate: sql<number>`
          ROUND(
            COUNT(DISTINCT ${questionnaireResponses.userId})::numeric /
            NULLIF(COUNT(DISTINCT ${users.id}), 0) * 100,
            2
          )
        `.as('response_rate')
      })
      .from(users)
      .leftJoin(
        questionnaireResponses,
        and(
          eq(users.id, questionnaireResponses.userId),
          parseQueryDate(startDate) ? gte(questionnaireResponses.submittedAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(questionnaireResponses.submittedAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .where(eq(users.status, "active"));

    res.json({
      mostActive,
      responseRates: responseRates[0],
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    res.status(500).json({ error: "Failed to fetch engagement metrics" });
  }
});

// Get formation metrics
router.get("/formation", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "formation" });

  try {
    const { limit = 10 } = req.query;

    // Top performers in formation
    const topPerformers = await db
      .select({
        userId: formationProgress.userId,
        userName: users.name,
        completedModules: sql<number>`
          COUNT(CASE WHEN ${formationProgress.status} = 'completed' THEN 1 END)
        `.as('completed_modules'),
        inProgressModules: sql<number>`
          COUNT(CASE WHEN ${formationProgress.status} = 'in_progress' THEN 1 END)
        `.as('in_progress_modules'),
        avgProgress: avg(formationProgress.progressPercentage)
      })
      .from(formationProgress)
      .leftJoin(users, eq(users.id, formationProgress.userId))
      .groupBy(formationProgress.userId, users.name)
      .orderBy(desc(sql`completed_modules`))
      .limit(Number(limit));

    // Overall formation statistics
    const formationStats = await db
      .select({
        totalModules: sql<number>`
          (SELECT COUNT(*) FROM formation_modules)
        `.as('total_modules'),
        totalEnrolled: count(sql`DISTINCT ${formationProgress.userId}`),
        avgCompletionRate: avg(formationProgress.progressPercentage)
      })
      .from(formationProgress);

    res.json({
      topPerformers,
      stats: formationStats[0]
    });
  } catch (error) {
    console.error("Error fetching formation metrics:", error);
    res.status(500).json({ error: "Failed to fetch formation metrics" });
  }
});

// Get family engagement metrics
router.get("/families", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "families" });

  try {
    // Families with most active members
    const activeFamilies = await db
      .select({
        familyId: families.id,
        familyName: families.name,
        totalMembers: count(users.id),
        activeMembers: sql<number>`
          COUNT(CASE WHEN ${users.status} = 'active' THEN 1 END)
        `.as('active_members'),
        totalServices: sql<number>`
          COALESCE(SUM(${users.totalServices}), 0)
        `.as('total_services')
      })
      .from(families)
      .leftJoin(users, eq(users.familyId, families.id))
      .groupBy(families.id, families.name)
      .having(sql`COUNT(${users.id}) > 1`)
      .orderBy(desc(sql`active_members`), desc(sql`total_services`))
      .limit(10);

    res.json({
      activeFamilies
    });
  } catch (error) {
    console.error("Error fetching family metrics:", error);
    res.status(500).json({ error: "Failed to fetch family metrics" });
  }
});

// Get dashboard summary
router.get("/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "summary" });

  try {
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Active ministers count
    const activeMinistersCount = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "active"));

    // Month's substitutions
    const monthSubstitutions = await db
      .select({
        total: count(),
        approved: sql<number>`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as('approved')
      })
      .from(substitutionRequests)
      .where(
        and(
          gte(substitutionRequests.createdAt, startOfMonth),
          lte(substitutionRequests.createdAt, endOfMonth)
        )
      );

    // Formation completion this month
    const formationThisMonth = await db
      .select({ count: count() })
      .from(formationProgress)
      .where(
        and(
          eq(formationProgress.status, "completed"),
          formationProgress.completedAt ? gte(formationProgress.completedAt, startOfMonth) : sql`false`,
          formationProgress.completedAt ? lte(formationProgress.completedAt, endOfMonth) : sql`false`
        )
      );

    // Average availability
    const avgAvailability = await db
      .select({
        avgDays: sql<number>`
          AVG(
            jsonb_array_length(
              COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
            )
          )
        `.as('avg_days')
      })
      .from(questionnaireResponses)
      .where(
        and(
          gte(questionnaireResponses.submittedAt, startOfMonth),
          lte(questionnaireResponses.submittedAt, endOfMonth)
        )
      );

    res.json({
      activeMinisters: activeMinistersCount[0]?.count || 0,
      monthSubstitutions: {
        total: monthSubstitutions[0]?.total || 0,
        approved: monthSubstitutions[0]?.approved || 0
      },
      formationCompleted: formationThisMonth[0]?.count || 0,
      avgAvailabilityDays: Math.round(avgAvailability[0]?.avgDays || 0),
      period: {
        month: now.toLocaleString('pt-BR', { month: 'long' }),
        year: now.getFullYear()
      }
    });
  } catch (error) {
    console.error("Error fetching summary metrics:", error);
    res.status(500).json({ error: "Failed to fetch summary metrics" });
  }
});

// ============================================
// TRENDS ENDPOINTS
// ============================================

// Get monthly trends data for the last N months
router.get("/trends", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "trends" });

  try {
    const { months = 6 } = req.query;
    const numMonths = Math.min(Math.max(parseInt(months) || 6, 3), 12);

    // Generate array of last N months
    const now = new Date();
    const monthsArray: { year: number; month: number; label: string }[] = [];

    for (let i = numMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsArray.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      });
    }

    // Fetch trends data for each month
    const trendsData = await Promise.all(monthsArray.map(async ({ year, month, label }) => {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      // Substitutions count
      const [substitutionsResult] = await db
        .select({
          total: count(),
          approved: sql<number>`COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)`.as('approved')
        })
        .from(substitutionRequests)
        .where(and(
          gte(substitutionRequests.createdAt, startOfMonth),
          lte(substitutionRequests.createdAt, endOfMonth)
        ));

      // Schedules count (published)
      const [schedulesResult] = await db
        .select({ total: count() })
        .from(schedules)
        .where(and(
          eq(schedules.status, 'published'),
          gte(schedules.createdAt, startOfMonth),
          lte(schedules.createdAt, endOfMonth)
        ));

      // Questionnaire responses count
      const [responsesResult] = await db
        .select({ total: count() })
        .from(questionnaireResponses)
        .where(and(
          gte(questionnaireResponses.submittedAt, startOfMonth),
          lte(questionnaireResponses.submittedAt, endOfMonth)
        ));

      // Activity logs count
      const [activityResult] = await db
        .select({
          total: count(),
          uniqueUsers: sql<number>`COUNT(DISTINCT ${activityLogs.userId})`.as('unique_users')
        })
        .from(activityLogs)
        .where(and(
          gte(activityLogs.createdAt, startOfMonth),
          lte(activityLogs.createdAt, endOfMonth)
        ));

      // Formation completions
      const [formationResult] = await db
        .select({ total: count() })
        .from(formationProgress)
        .where(and(
          eq(formationProgress.status, 'completed'),
          formationProgress.completedAt ? gte(formationProgress.completedAt, startOfMonth) : sql`false`,
          formationProgress.completedAt ? lte(formationProgress.completedAt, endOfMonth) : sql`false`
        ));

      return {
        month: label,
        year,
        monthNum: month,
        substitutions: substitutionsResult?.total || 0,
        substitutionsApproved: substitutionsResult?.approved || 0,
        schedules: schedulesResult?.total || 0,
        responses: responsesResult?.total || 0,
        activities: activityResult?.total || 0,
        activeUsers: activityResult?.uniqueUsers || 0,
        formationCompleted: formationResult?.total || 0
      };
    }));

    // Calculate growth percentages (current vs previous month)
    const current = trendsData[trendsData.length - 1];
    const previous = trendsData[trendsData.length - 2];

    const calculateGrowth = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const growth = previous ? {
      substitutions: calculateGrowth(current.substitutions, previous.substitutions),
      responses: calculateGrowth(current.responses, previous.responses),
      activities: calculateGrowth(current.activities, previous.activities),
      activeUsers: calculateGrowth(current.activeUsers, previous.activeUsers)
    } : null;

    res.json({
      trends: trendsData,
      growth,
      period: {
        months: numMonths,
        from: monthsArray[0].label,
        to: monthsArray[monthsArray.length - 1].label
      }
    });
  } catch (error) {
    console.error("Error fetching trends data:", error);
    res.status(500).json({ error: "Failed to fetch trends data" });
  }
});

// Get availability patterns (by day of week and time)
router.get("/trends/availability-patterns", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "availability_patterns" });

  try {
    // Get schedule distribution by day of week
    const dayOfWeekData = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${schedules.date}::date)`.as('day_of_week'),
        total: count()
      })
      .from(schedules)
      .where(eq(schedules.status, 'published'))
      .groupBy(sql`EXTRACT(DOW FROM ${schedules.date}::date)`)
      .orderBy(sql`day_of_week`);

    // Map day numbers to names
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const byDayOfWeek = dayOfWeekData.map((item: { dayOfWeek: number; total: number }) => ({
      day: dayNames[item.dayOfWeek] || 'N/A',
      dayNum: item.dayOfWeek,
      schedules: item.total
    }));

    // Get schedule distribution by time
    const timeData = await db
      .select({
        time: schedules.time,
        total: count()
      })
      .from(schedules)
      .where(eq(schedules.status, 'published'))
      .groupBy(schedules.time)
      .orderBy(schedules.time);

    const byTime = timeData.map((item: { time: string | null; total: number }) => ({
      time: item.time || 'N/A',
      schedules: item.total
    }));

    res.json({
      byDayOfWeek,
      byTime
    });
  } catch (error) {
    console.error("Error fetching availability patterns:", error);
    res.status(500).json({ error: "Failed to fetch availability patterns" });
  }
});

// ============================================
// EXPORT ENDPOINTS
// ============================================

const exportFormatSchema = z.enum(['xlsx', 'pdf', 'csv']);

// Types for report data
interface AvailabilityRow {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  totalResponses: number;
  availableDays: number;
}

interface SubstitutionRow {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
}

interface EngagementRow {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  totalActions: number;
  lastActivity: Date | null;
  uniqueDays: number;
}

interface FormationRow {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  completedModules: number;
  inProgressModules: number;
  avgProgress: string | null;
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

// Helper to format period
function formatPeriod(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'Todo o período';
  const start = startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'início';
  const end = endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'hoje';
  return `${start} a ${end}`;
}

// Export availability report
router.get("/export/availability", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const format = exportFormatSchema.parse(req.query.format || 'xlsx');
    const { startDate, endDate } = req.query;

    // Fetch data
    const availabilityData = await db
      .select({
        userId: questionnaireResponses.userId,
        userName: users.name,
        userEmail: users.email,
        totalResponses: count(questionnaireResponses.id),
        availableDays: sql<number>`
          COALESCE(
            SUM(
              jsonb_array_length(
                COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
              )
            ), 0
          )
        `.as('available_days')
      })
      .from(questionnaireResponses)
      .leftJoin(users, eq(users.id, questionnaireResponses.userId))
      .where(
        and(
          parseQueryDate(startDate) ? gte(questionnaireResponses.submittedAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(questionnaireResponses.submittedAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(questionnaireResponses.userId, users.name, users.email)
      .orderBy(desc(sql`available_days`));

    const reportData: ReportData = {
      title: 'Relatório de Disponibilidade',
      subtitle: 'Ministros com maior disponibilidade no período',
      generatedAt: formatDateBR(new Date()),
      period: formatPeriod(startDate, endDate),
      headers: ['Posição', 'Nome', 'Email', 'Dias Disponíveis', 'Questionários Respondidos'],
      rows: availabilityData.map((item: AvailabilityRow, index: number) => [
        index + 1,
        item.userName || 'N/A',
        item.userEmail || 'N/A',
        item.availableDays || 0,
        item.totalResponses || 0
      ]),
      summary: [
        { label: 'Total de Ministros', value: availabilityData.length },
        { label: 'Média de Dias Disponíveis', value: Math.round(availabilityData.reduce((acc: number, item: AvailabilityRow) => acc + (item.availableDays || 0), 0) / (availabilityData.length || 1)) }
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

    const filename = `disponibilidade_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting availability report:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// Export substitutions report
router.get("/export/substitutions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const format = exportFormatSchema.parse(req.query.format || 'xlsx');
    const { startDate, endDate } = req.query;

    // Fetch data
    const substitutionsData = await db
      .select({
        userId: substitutionRequests.requesterId,
        userName: users.name,
        userEmail: users.email,
        totalRequests: count(substitutionRequests.id),
        approvedRequests: sql<number>`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as('approved_requests'),
        pendingRequests: sql<number>`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'pending' THEN 1 END)
        `.as('pending_requests'),
        rejectedRequests: sql<number>`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'rejected' THEN 1 END)
        `.as('rejected_requests')
      })
      .from(substitutionRequests)
      .leftJoin(users, eq(users.id, substitutionRequests.requesterId))
      .where(
        and(
          parseQueryDate(startDate) ? gte(substitutionRequests.createdAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(substitutionRequests.createdAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(substitutionRequests.requesterId, users.name, users.email)
      .orderBy(desc(count(substitutionRequests.id)));

    const totalRequests = substitutionsData.reduce((acc: number, item: SubstitutionRow) => acc + (item.totalRequests || 0), 0);
    const totalApproved = substitutionsData.reduce((acc: number, item: SubstitutionRow) => acc + (item.approvedRequests || 0), 0);

    const reportData: ReportData = {
      title: 'Relatório de Substituições',
      subtitle: 'Solicitações de substituição por ministro',
      generatedAt: formatDateBR(new Date()),
      period: formatPeriod(startDate, endDate),
      headers: ['Posição', 'Nome', 'Email', 'Total', 'Aprovadas', 'Pendentes', 'Rejeitadas'],
      rows: substitutionsData.map((item: SubstitutionRow, index: number) => [
        index + 1,
        item.userName || 'N/A',
        item.userEmail || 'N/A',
        item.totalRequests || 0,
        item.approvedRequests || 0,
        item.pendingRequests || 0,
        item.rejectedRequests || 0
      ]),
      summary: [
        { label: 'Total de Solicitações', value: totalRequests },
        { label: 'Aprovadas', value: totalApproved },
        { label: 'Taxa de Aprovação', value: `${totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100) : 0}%` }
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

    const filename = `substituicoes_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting substitutions report:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// Export engagement report
router.get("/export/engagement", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const format = exportFormatSchema.parse(req.query.format || 'xlsx');
    const { startDate, endDate } = req.query;

    // Fetch data
    const engagementData = await db
      .select({
        userId: activityLogs.userId,
        userName: users.name,
        userEmail: users.email,
        totalActions: count(activityLogs.id),
        lastActivity: sql<Date>`MAX(${activityLogs.createdAt})`.as('last_activity'),
        uniqueDays: sql<number>`
          COUNT(DISTINCT DATE(${activityLogs.createdAt}))
        `.as('unique_days')
      })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.userId))
      .where(
        and(
          parseQueryDate(startDate) ? gte(activityLogs.createdAt, parseQueryDate(startDate)!) : sql`true`,
          parseQueryDate(endDate) ? lte(activityLogs.createdAt, parseQueryDate(endDate)!) : sql`true`
        )
      )
      .groupBy(activityLogs.userId, users.name, users.email)
      .orderBy(desc(count(activityLogs.id)));

    const reportData: ReportData = {
      title: 'Relatório de Engajamento',
      subtitle: 'Atividade dos ministros no sistema',
      generatedAt: formatDateBR(new Date()),
      period: formatPeriod(startDate, endDate),
      headers: ['Posição', 'Nome', 'Email', 'Total de Ações', 'Dias Ativos', 'Última Atividade'],
      rows: engagementData.map((item: EngagementRow, index: number) => [
        index + 1,
        item.userName || 'N/A',
        item.userEmail || 'N/A',
        item.totalActions || 0,
        item.uniqueDays || 0,
        item.lastActivity ? new Date(item.lastActivity).toLocaleDateString('pt-BR') : 'N/A'
      ]),
      summary: [
        { label: 'Total de Usuários Ativos', value: engagementData.length },
        { label: 'Total de Ações', value: engagementData.reduce((acc: number, item: EngagementRow) => acc + (item.totalActions || 0), 0) }
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

    const filename = `engajamento_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting engagement report:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// Export formation report
router.get("/export/formation", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const format = exportFormatSchema.parse(req.query.format || 'xlsx');

    // Fetch data
    const formationData = await db
      .select({
        userId: formationProgress.userId,
        userName: users.name,
        userEmail: users.email,
        completedModules: sql<number>`
          COUNT(CASE WHEN ${formationProgress.status} = 'completed' THEN 1 END)
        `.as('completed_modules'),
        inProgressModules: sql<number>`
          COUNT(CASE WHEN ${formationProgress.status} = 'in_progress' THEN 1 END)
        `.as('in_progress_modules'),
        avgProgress: avg(formationProgress.progressPercentage)
      })
      .from(formationProgress)
      .leftJoin(users, eq(users.id, formationProgress.userId))
      .groupBy(formationProgress.userId, users.name, users.email)
      .orderBy(desc(sql`completed_modules`));

    const reportData: ReportData = {
      title: 'Relatório de Formação',
      subtitle: 'Progresso dos ministros nos módulos de formação',
      generatedAt: formatDateBR(new Date()),
      headers: ['Posição', 'Nome', 'Email', 'Módulos Concluídos', 'Em Andamento', 'Progresso Médio (%)'],
      rows: formationData.map((item: FormationRow, index: number) => [
        index + 1,
        item.userName || 'N/A',
        item.userEmail || 'N/A',
        item.completedModules || 0,
        item.inProgressModules || 0,
        Math.round(Number(item.avgProgress) || 0)
      ]),
      summary: [
        { label: 'Total de Ministros em Formação', value: formationData.length },
        { label: 'Módulos Concluídos (Total)', value: formationData.reduce((acc: number, item: FormationRow) => acc + (item.completedModules || 0), 0) }
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

    const filename = `formacao_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting formation report:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// Export complete summary report
router.get("/export/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: any, res) => {
  try {
    const format = exportFormatSchema.parse(req.query.format || 'xlsx');

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all summary data
    const [activeMinistersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "active"));

    const [substitutionsResult] = await db
      .select({
        total: count(),
        approved: sql<number>`COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)`.as('approved')
      })
      .from(substitutionRequests)
      .where(and(gte(substitutionRequests.createdAt, startOfMonth), lte(substitutionRequests.createdAt, endOfMonth)));

    const [formationResult] = await db
      .select({ count: count() })
      .from(formationProgress)
      .where(eq(formationProgress.status, "completed"));

    const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const reportData: ReportData = {
      title: 'Relatório Resumo Mensal',
      subtitle: `MESC - Santuário São Judas Tadeu`,
      generatedAt: formatDateBR(new Date()),
      period: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      headers: ['Métrica', 'Valor'],
      rows: [
        ['Ministros Ativos', activeMinistersResult?.count || 0],
        ['Substituições no Mês', substitutionsResult?.total || 0],
        ['Substituições Aprovadas', substitutionsResult?.approved || 0],
        ['Taxa de Aprovação', `${substitutionsResult?.total ? Math.round((substitutionsResult.approved / substitutionsResult.total) * 100) : 0}%`],
        ['Módulos de Formação Concluídos', formationResult?.count || 0]
      ],
      summary: [
        { label: 'Período', value: monthName.charAt(0).toUpperCase() + monthName.slice(1) },
        { label: 'Data de Geração', value: formatDateBR(new Date()) }
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

    const filename = `resumo_mensal_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting summary report:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

export default router;