import { Router, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import {
  users,
  questionnaires,
  questionnaireResponses,
  substitutionRequests,
  schedules,
  formationProgress,
  activityLogs,
  families,
  familyRelationships,
  ministerCheckIns,
  massTimesConfig
} from "@shared/schema";
import { eq, sql, and, gte, lte, desc, asc, count, avg } from "drizzle-orm";
import { authenticateToken, requireRole, AuthRequest } from "../auth";
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

// Helper to safely extract string from query parameter
function getQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

// Helper to safely extract number from query parameter
function getQueryNumber(value: unknown, defaultValue: number): number {
  const strValue = getQueryString(value);
  if (!strValue) return defaultValue;
  const num = parseInt(strValue, 10);
  return isNaN(num) ? defaultValue : num;
}

const router = Router();

// Get minister availability metrics
router.get("/availability", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/substitutions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/engagement", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/formation", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/families", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
// ATTENDANCE/PRESENCE ENDPOINTS
// ============================================

// Get attendance summary for all ministers
router.get("/attendance", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "attendance" });

  try {
    const { startDate, endDate } = req.query;

    // Get all ministers with their attendance stats
    const attendanceData = await db
      .select({
        odministerIdl: users.id,
        ministerName: users.name,
        ministerEmail: users.email,
        totalServices: users.totalServices,
        lastService: users.lastService,
        noShowCount: users.noShowCount,
        reliabilityScore: users.reliabilityScore,
        status: users.status
      })
      .from(users)
      .where(eq(users.role, 'ministro'))
      .orderBy(desc(users.totalServices));

    // Get check-in statistics for the period
    const checkInStats = await db
      .select({
        ministerId: ministerCheckIns.ministerId,
        totalCheckIns: count(),
        presentCount: sql<number>`COUNT(CASE WHEN ${ministerCheckIns.status} = 'present' THEN 1 END)`.as('present_count'),
        lateCount: sql<number>`COUNT(CASE WHEN ${ministerCheckIns.status} = 'late' THEN 1 END)`.as('late_count'),
        absentCount: sql<number>`COUNT(CASE WHEN ${ministerCheckIns.status} = 'absent' THEN 1 END)`.as('absent_count')
      })
      .from(ministerCheckIns)
      .leftJoin(schedules, eq(ministerCheckIns.scheduleId, schedules.id))
      .where(
        and(
          parseQueryDate(startDate) ? gte(schedules.date, parseQueryDate(startDate)!.toISOString().split('T')[0]) : sql`true`,
          parseQueryDate(endDate) ? lte(schedules.date, parseQueryDate(endDate)!.toISOString().split('T')[0]) : sql`true`
        )
      )
      .groupBy(ministerCheckIns.ministerId);

    // Merge the data
    interface CheckInStat {
      ministerId: string;
      totalCheckIns: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
    }
    const checkInMap = new Map<string, CheckInStat>(checkInStats.map((c: CheckInStat) => [c.ministerId, c]));

    interface MinisterData {
      odministerIdl: string;
      ministerName: string | null;
      ministerEmail: string | null;
      totalServices: number | null;
      lastService: Date | null;
      noShowCount: number | null;
      reliabilityScore: number | null;
      status: string | null;
    }
    const result = attendanceData.map((minister: MinisterData) => {
      const checkIn = checkInMap.get(minister.odministerIdl);
      const presentCount = checkIn?.presentCount || 0;
      const lateCount = checkIn?.lateCount || 0;
      const absentCount = checkIn?.absentCount || 0;
      const totalMarked = presentCount + lateCount + absentCount;

      return {
        odministerIdl: minister.odministerIdl,
        ministerName: minister.ministerName,
        ministerEmail: minister.ministerEmail,
        totalServices: minister.totalServices || 0,
        lastService: minister.lastService,
        noShowCount: minister.noShowCount || 0,
        reliabilityScore: minister.reliabilityScore || 100,
        status: minister.status,
        periodStats: {
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          total: totalMarked,
          attendanceRate: totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : null
        }
      };
    });

    // Calculate global stats
    type ResultItem = typeof result[number];
    const totalMinisters = result.length;
    const activeMinisters = result.filter((m: ResultItem) => m.status === 'active').length;
    const totalPresent = result.reduce((acc: number, m: ResultItem) => acc + m.periodStats.present, 0);
    const totalLate = result.reduce((acc: number, m: ResultItem) => acc + m.periodStats.late, 0);
    const totalAbsent = result.reduce((acc: number, m: ResultItem) => acc + m.periodStats.absent, 0);
    const totalMarked = totalPresent + totalLate + totalAbsent;

    res.json({
      ministers: result,
      summary: {
        totalMinisters,
        activeMinisters,
        periodStats: {
          present: totalPresent,
          late: totalLate,
          absent: totalAbsent,
          total: totalMarked,
          attendanceRate: totalMarked > 0 ? Math.round(((totalPresent + totalLate) / totalMarked) * 100) : null
        }
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
});

// Get attendance history for a specific minister
router.get("/attendance/:ministerId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "attendance_detail", ministerId: req.params.ministerId });

  try {
    const { ministerId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    // Get minister info
    const [minister] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        totalServices: users.totalServices,
        lastService: users.lastService,
        noShowCount: users.noShowCount,
        reliabilityScore: users.reliabilityScore
      })
      .from(users)
      .where(eq(users.id, ministerId))
      .limit(1);

    if (!minister) {
      return res.status(404).json({ error: "Minister not found" });
    }

    // Get scheduled masses for this minister
    const scheduledMasses = await db
      .select({
        scheduleId: schedules.id,
        date: schedules.date,
        time: schedules.time,
        position: schedules.position,
        location: schedules.location,
        status: schedules.status
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, ministerId),
          eq(schedules.status, 'published'),
          parseQueryDate(startDate) ? gte(schedules.date, parseQueryDate(startDate)!.toISOString().split('T')[0]) : sql`true`,
          parseQueryDate(endDate) ? lte(schedules.date, parseQueryDate(endDate)!.toISOString().split('T')[0]) : sql`true`
        )
      )
      .orderBy(desc(schedules.date), desc(schedules.time))
      .limit(Number(limit));

    // Get check-ins for these schedules
    interface ScheduledMass {
      scheduleId: string;
      date: string;
      time: string | null;
      position: number | null;
      location: string | null;
      status: string | null;
    }
    const scheduleIds = scheduledMasses.map((s: ScheduledMass) => s.scheduleId);

    interface CheckInRecord {
      scheduleId: string;
      checkedInAt: Date | null;
      status: string | null;
      notes: string | null;
    }
    const checkIns: CheckInRecord[] = scheduleIds.length > 0 ? await db
      .select({
        scheduleId: ministerCheckIns.scheduleId,
        checkedInAt: ministerCheckIns.checkedInAt,
        status: ministerCheckIns.status,
        notes: ministerCheckIns.notes
      })
      .from(ministerCheckIns)
      .where(
        and(
          eq(ministerCheckIns.ministerId, ministerId),
          sql`${ministerCheckIns.scheduleId} = ANY(${scheduleIds})`
        )
      ) : [];

    // Merge scheduled masses with check-in status
    const checkInMap = new Map(checkIns.map((c: CheckInRecord) => [c.scheduleId, c]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = scheduledMasses.map((mass: ScheduledMass) => {
      const checkIn = checkInMap.get(mass.scheduleId);
      const massDate = new Date(mass.date + 'T00:00:00');
      const isPast = massDate < today;

      let attendanceStatus: 'present' | 'late' | 'absent' | 'pending' | 'scheduled' = 'scheduled';

      if (checkIn) {
        attendanceStatus = checkIn.status as 'present' | 'late' | 'absent';
      } else if (isPast) {
        attendanceStatus = 'pending'; // Past mass without check-in record
      }

      return {
        scheduleId: mass.scheduleId,
        date: mass.date,
        time: mass.time,
        position: mass.position,
        location: mass.location,
        attendanceStatus,
        checkedInAt: checkIn?.checkedInAt || null,
        notes: checkIn?.notes || null
      };
    });

    // Calculate statistics
    type HistoryItem = typeof history[number];
    const presentCount = history.filter((h: HistoryItem) => h.attendanceStatus === 'present').length;
    const lateCount = history.filter((h: HistoryItem) => h.attendanceStatus === 'late').length;
    const absentCount = history.filter((h: HistoryItem) => h.attendanceStatus === 'absent').length;
    const pendingCount = history.filter((h: HistoryItem) => h.attendanceStatus === 'pending').length;
    const totalPast = presentCount + lateCount + absentCount + pendingCount;

    res.json({
      minister,
      history,
      statistics: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        pending: pendingCount,
        scheduled: history.filter((h: HistoryItem) => h.attendanceStatus === 'scheduled').length,
        totalPast,
        attendanceRate: totalPast > 0 ? Math.round(((presentCount + lateCount) / totalPast) * 100) : null
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching minister attendance:", error);
    res.status(500).json({ error: "Failed to fetch minister attendance" });
  }
});

// Export attendance report
router.get("/export/attendance", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  try {
    const format = exportFormatSchema.parse(req.query.format || 'xlsx');
    const { startDate, endDate } = req.query;

    // Get attendance data
    const attendanceData = await db
      .select({
        odministerIdl: users.id,
        ministerName: users.name,
        ministerEmail: users.email,
        totalServices: users.totalServices,
        noShowCount: users.noShowCount,
        reliabilityScore: users.reliabilityScore,
        lastService: users.lastService
      })
      .from(users)
      .where(eq(users.role, 'ministro'))
      .orderBy(desc(users.totalServices));

    // Get check-in stats
    const checkInStats = await db
      .select({
        ministerId: ministerCheckIns.ministerId,
        presentCount: sql<number>`COUNT(CASE WHEN ${ministerCheckIns.status} = 'present' THEN 1 END)`.as('present_count'),
        lateCount: sql<number>`COUNT(CASE WHEN ${ministerCheckIns.status} = 'late' THEN 1 END)`.as('late_count'),
        absentCount: sql<number>`COUNT(CASE WHEN ${ministerCheckIns.status} = 'absent' THEN 1 END)`.as('absent_count')
      })
      .from(ministerCheckIns)
      .leftJoin(schedules, eq(ministerCheckIns.scheduleId, schedules.id))
      .where(
        and(
          parseQueryDate(startDate) ? gte(schedules.date, parseQueryDate(startDate)!.toISOString().split('T')[0]) : sql`true`,
          parseQueryDate(endDate) ? lte(schedules.date, parseQueryDate(endDate)!.toISOString().split('T')[0]) : sql`true`
        )
      )
      .groupBy(ministerCheckIns.ministerId);

    interface CheckInStat {
      ministerId: string;
      totalCheckIns: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
    }
    const checkInMap = new Map<string, CheckInStat>(checkInStats.map((c: CheckInStat) => [c.ministerId, c]));

    interface MinisterData {
      odministerIdl: string;
      ministerName: string | null;
      ministerEmail: string | null;
      totalServices: number | null;
      lastService: Date | null;
      noShowCount: number | null;
      reliabilityScore: number | null;
      status: string | null;
    }

    const reportData: ReportData = {
      title: 'Relatório de Presença',
      subtitle: 'Controle de presença dos ministros',
      generatedAt: formatDateBR(new Date()),
      period: formatPeriod(startDate, endDate),
      headers: ['Nome', 'Email', 'Total Serviços', 'Presenças', 'Atrasos', 'Ausências', 'Taxa (%)', 'Confiabilidade'],
      rows: (attendanceData as MinisterData[]).map((minister: MinisterData) => {
        const stats = checkInMap.get(minister.odministerIdl);
        const present = stats?.presentCount || 0;
        const late = stats?.lateCount || 0;
        const absent = stats?.absentCount || 0;
        const total = present + late + absent;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : '-';

        return [
          minister.ministerName || 'N/A',
          minister.ministerEmail || 'N/A',
          minister.totalServices || 0,
          present,
          late,
          absent,
          rate,
          minister.reliabilityScore || 100
        ];
      }),
      summary: [
        { label: 'Total de Ministros', value: attendanceData.length },
        { label: 'Total de Serviços', value: (attendanceData as MinisterData[]).reduce((acc: number, m: MinisterData) => acc + (m.totalServices || 0), 0) }
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

    const filename = `presenca_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting attendance report:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// ============================================
// TRENDS ENDPOINTS
// ============================================

// Get monthly trends data for the last N months
router.get("/trends", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "trends" });

  try {
    const numMonths = Math.min(Math.max(getQueryNumber(req.query.months, 6), 3), 12);

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
router.get("/trends/availability-patterns", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
function formatPeriod(startDate: unknown, endDate: unknown): string {
  const start = getQueryString(startDate);
  const end = getQueryString(endDate);
  if (!start && !end) return 'Todo o período';
  const startFormatted = start ? new Date(start).toLocaleDateString('pt-BR') : 'início';
  const endFormatted = end ? new Date(end).toLocaleDateString('pt-BR') : 'hoje';
  return `${startFormatted} a ${endFormatted}`;
}

// Export availability report
router.get("/export/availability", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/export/substitutions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/export/engagement", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/export/formation", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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
router.get("/export/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
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

// ============================================
// AVAILABILITY ANALYSIS ENDPOINTS (FR-8.3)
// ============================================

// Get comprehensive availability analysis
router.get("/availability-analysis", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  const logActivity = createActivityLogger(req);
  await logActivity("view_reports", { type: "availability_analysis" });

  try {
    const numMonths = Math.min(Math.max(getQueryNumber(req.query.months, 6), 3), 12);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);

    // Get all questionnaire responses in the period
    const responses = await db
      .select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        userName: users.name,
        preferredMassTimes: questionnaireResponses.preferredMassTimes,
        alternativeTimes: questionnaireResponses.alternativeTimes,
        availableSundays: questionnaireResponses.availableSundays,
        canSubstitute: questionnaireResponses.canSubstitute,
        month: questionnaires.month,
        year: questionnaires.year
      })
      .from(questionnaireResponses)
      .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(
        and(
          gte(sql`MAKE_DATE(${questionnaires.year}, ${questionnaires.month}, 1)`, startDate),
          lte(sql`MAKE_DATE(${questionnaires.year}, ${questionnaires.month}, 1)`, endDate)
        )
      );

    // Get all active mass times
    const massTimes = await db
      .select()
      .from(massTimesConfig)
      .where(eq(massTimesConfig.isActive, true));

    // Day of week mapping
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Type for responses
    interface ResponseData {
      id: string;
      userId: string;
      userName: string | null;
      preferredMassTimes: string[] | null;
      alternativeTimes: string[] | null;
      availableSundays: string[] | null;
      canSubstitute: boolean | null;
      month: number;
      year: number;
    }

    // Type for mass times
    interface MassTimeData {
      id: string;
      dayOfWeek: number;
      time: string;
      minMinisters: number;
      maxMinisters: number;
      isActive: boolean | null;
      specialEvent: boolean | null;
      eventName: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }

    // Analyze availability by mass time
    interface TimeAvailability {
      dayOfWeek: number;
      dayName: string;
      time: string;
      preferredCount: number;
      alternativeCount: number;
      totalAvailable: number;
      minRequired: number;
      coverage: number;
      status: 'critical' | 'warning' | 'ok' | 'excellent';
    }
    const timeAnalysis: TimeAvailability[] = (massTimes as MassTimeData[]).map((mt: MassTimeData) => {
      const timeStr = mt.time;
      let preferredCount = 0;
      let alternativeCount = 0;

      (responses as ResponseData[]).forEach((r: ResponseData) => {
        const preferred = r.preferredMassTimes || [];
        const alternative = r.alternativeTimes || [];

        if (preferred.includes(timeStr)) preferredCount++;
        else if (alternative.includes(timeStr)) alternativeCount++;
      });

      const totalAvailable = preferredCount + alternativeCount;
      const coverage = mt.minMinisters > 0 ? (totalAvailable / mt.minMinisters) * 100 : 100;

      let status: 'critical' | 'warning' | 'ok' | 'excellent';
      if (coverage < 100) status = 'critical';
      else if (coverage < 150) status = 'warning';
      else if (coverage < 200) status = 'ok';
      else status = 'excellent';

      return {
        dayOfWeek: mt.dayOfWeek,
        dayName: dayNames[mt.dayOfWeek] || 'N/A',
        time: timeStr,
        preferredCount,
        alternativeCount,
        totalAvailable,
        minRequired: mt.minMinisters,
        coverage: Math.round(coverage),
        status
      };
    }).sort((a: TimeAvailability, b: TimeAvailability) => a.coverage - b.coverage);

    // Analyze availability by minister
    interface MinisterAvailability {
      odministerIdl: string;
      name: string;
      totalResponses: number;
      avgAvailableDays: number;
      canSubstitute: boolean;
      preferredTimesCount: number;
      reliabilityScore: number;
    }
    const ministerMap = new Map<string, {
      name: string;
      responses: number;
      totalDays: number;
      canSubstitute: boolean;
      preferredTimes: Set<string>;
    }>();

    (responses as ResponseData[]).forEach((r: ResponseData) => {
      const existing = ministerMap.get(r.userId);
      const availableDays = r.availableSundays?.length || 0;
      const preferred = r.preferredMassTimes || [];

      if (existing) {
        existing.responses++;
        existing.totalDays += availableDays;
        if (r.canSubstitute) existing.canSubstitute = true;
        preferred.forEach((t: string) => existing.preferredTimes.add(t));
      } else {
        ministerMap.set(r.userId, {
          name: r.userName || 'N/A',
          responses: 1,
          totalDays: availableDays,
          canSubstitute: r.canSubstitute || false,
          preferredTimes: new Set(preferred)
        });
      }
    });

    const ministerAnalysis: MinisterAvailability[] = Array.from(ministerMap.entries())
      .map(([id, data]) => ({
        odministerIdl: id,
        name: data.name,
        totalResponses: data.responses,
        avgAvailableDays: data.responses > 0 ? Math.round(data.totalDays / data.responses * 10) / 10 : 0,
        canSubstitute: data.canSubstitute,
        preferredTimesCount: data.preferredTimes.size,
        reliabilityScore: Math.min(100, Math.round((data.responses / numMonths) * 100))
      }))
      .sort((a, b) => b.avgAvailableDays - a.avgAvailableDays);

    // Calculate trends by month
    interface MonthTrend {
      month: string;
      year: number;
      monthNum: number;
      totalResponses: number;
      avgAvailability: number;
      substitutesAvailable: number;
    }
    const monthTrendsMap = new Map<string, { total: number; days: number; substitutes: number }>();

    (responses as ResponseData[]).forEach((r: ResponseData) => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const existing = monthTrendsMap.get(key);
      const days = r.availableSundays?.length || 0;

      if (existing) {
        existing.total++;
        existing.days += days;
        if (r.canSubstitute) existing.substitutes++;
      } else {
        monthTrendsMap.set(key, {
          total: 1,
          days,
          substitutes: r.canSubstitute ? 1 : 0
        });
      }
    });

    const monthTrends: MonthTrend[] = Array.from(monthTrendsMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month - 1);
        return {
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          year,
          monthNum: month,
          totalResponses: data.total,
          avgAvailability: data.total > 0 ? Math.round(data.days / data.total * 10) / 10 : 0,
          substitutesAvailable: data.substitutes
        };
      })
      .sort((a, b) => a.year - b.year || a.monthNum - b.monthNum);

    // Generate recommendations
    const recommendations: string[] = [];

    const criticalTimes = timeAnalysis.filter(t => t.status === 'critical');
    if (criticalTimes.length > 0) {
      recommendations.push(
        `⚠️ ${criticalTimes.length} horário(s) com cobertura crítica: ${criticalTimes.map(t => `${t.dayName} ${t.time}`).join(', ')}. Considere recrutar mais ministros ou revisar os requisitos mínimos.`
      );
    }

    const lowResponseMinisters = ministerAnalysis.filter(m => m.reliabilityScore < 50);
    if (lowResponseMinisters.length > 0) {
      recommendations.push(
        `📋 ${lowResponseMinisters.length} ministro(s) com baixa taxa de resposta aos questionários. Considere entrar em contato para verificar a situação.`
      );
    }

    const avgSubstitutes = ministerAnalysis.filter(m => m.canSubstitute).length;
    const substitutePct = ministerAnalysis.length > 0 ? (avgSubstitutes / ministerAnalysis.length) * 100 : 0;
    if (substitutePct < 30) {
      recommendations.push(
        `🔄 Apenas ${Math.round(substitutePct)}% dos ministros estão disponíveis como suplentes. Incentive mais ministros a se disponibilizarem para substituições.`
      );
    }

    const recentTrend = monthTrends.slice(-3);
    if (recentTrend.length >= 2) {
      const first = recentTrend[0].avgAvailability;
      const last = recentTrend[recentTrend.length - 1].avgAvailability;
      if (last < first * 0.8) {
        recommendations.push(
          `📉 A disponibilidade média caiu ${Math.round((1 - last / first) * 100)}% nos últimos meses. Verifique se há algum problema afetando a participação.`
        );
      } else if (last > first * 1.2) {
        recommendations.push(
          `📈 A disponibilidade média aumentou ${Math.round((last / first - 1) * 100)}% nos últimos meses. Ótimo progresso!`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ A disponibilidade geral está em níveis saudáveis. Continue monitorando regularmente.');
    }

    // Summary statistics
    const summary = {
      totalMinisters: ministerAnalysis.length,
      totalResponses: responses.length,
      avgResponseRate: ministerAnalysis.length > 0
        ? Math.round(ministerAnalysis.reduce((sum, m) => sum + m.reliabilityScore, 0) / ministerAnalysis.length)
        : 0,
      criticalTimeSlots: criticalTimes.length,
      warningTimeSlots: timeAnalysis.filter(t => t.status === 'warning').length,
      availableSubstitutes: avgSubstitutes,
      periodMonths: numMonths
    };

    res.json({
      summary,
      timeAnalysis,
      ministerAnalysis: ministerAnalysis.slice(0, 20), // Top 20
      leastAvailable: ministerAnalysis.slice(-10).reverse(), // Bottom 10
      monthTrends,
      recommendations
    });

  } catch (error) {
    console.error("Error fetching availability analysis:", error);
    res.status(500).json({ error: "Failed to fetch availability analysis" });
  }
});

// Get detailed availability by mass time
router.get("/availability-analysis/by-time/:timeId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  try {
    const { timeId } = req.params;
    const numMonths = Math.min(Math.max(getQueryNumber(req.query.months, 3), 1), 12);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);

    // Get the mass time config
    const [massTime] = await db
      .select()
      .from(massTimesConfig)
      .where(eq(massTimesConfig.id, timeId));

    if (!massTime) {
      return res.status(404).json({ error: "Mass time not found" });
    }

    // Get all ministers who selected this time
    const responses = await db
      .select({
        userId: questionnaireResponses.userId,
        userName: users.name,
        preferredMassTimes: questionnaireResponses.preferredMassTimes,
        alternativeTimes: questionnaireResponses.alternativeTimes,
        canSubstitute: questionnaireResponses.canSubstitute,
        month: questionnaires.month,
        year: questionnaires.year
      })
      .from(questionnaireResponses)
      .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(
        and(
          gte(sql`MAKE_DATE(${questionnaires.year}, ${questionnaires.month}, 1)`, startDate),
          lte(sql`MAKE_DATE(${questionnaires.year}, ${questionnaires.month}, 1)`, endDate)
        )
      );

    const timeStr = massTime.time;

    interface TimeResponseData {
      userId: string;
      userName: string | null;
      preferredMassTimes: string[] | null;
      alternativeTimes: string[] | null;
      canSubstitute: boolean | null;
      month: number;
      year: number;
    }

    interface MinisterInfo {
      id: string;
      name: string;
      isPreferred: boolean;
      isAlternative: boolean;
      canSubstitute: boolean;
      responseCount: number;
    }
    const ministersForTime: MinisterInfo[] = [];
    const ministerSet = new Map<string, MinisterInfo>();

    (responses as TimeResponseData[]).forEach((r: TimeResponseData) => {
      const preferred = r.preferredMassTimes || [];
      const alternative = r.alternativeTimes || [];
      const isPreferred = preferred.includes(timeStr);
      const isAlternative = alternative.includes(timeStr);

      if (isPreferred || isAlternative) {
        const existing = ministerSet.get(r.userId);
        if (existing) {
          existing.responseCount++;
          if (isPreferred) existing.isPreferred = true;
          if (isAlternative && !existing.isPreferred) existing.isAlternative = true;
          if (r.canSubstitute) existing.canSubstitute = true;
        } else {
          ministerSet.set(r.userId, {
            id: r.userId,
            name: r.userName || 'N/A',
            isPreferred,
            isAlternative: !isPreferred && isAlternative,
            canSubstitute: r.canSubstitute || false,
            responseCount: 1
          });
        }
      }
    });

    ministersForTime.push(...Array.from(ministerSet.values()));
    ministersForTime.sort((a, b) => {
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      return b.responseCount - a.responseCount;
    });

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    res.json({
      massTime: {
        id: massTime.id,
        dayOfWeek: massTime.dayOfWeek,
        dayName: dayNames[massTime.dayOfWeek] || 'N/A',
        time: massTime.time,
        minMinisters: massTime.minMinisters,
        maxMinisters: massTime.maxMinisters
      },
      ministers: ministersForTime,
      summary: {
        preferred: ministersForTime.filter(m => m.isPreferred).length,
        alternative: ministersForTime.filter(m => m.isAlternative).length,
        total: ministersForTime.length,
        substitutes: ministersForTime.filter(m => m.canSubstitute).length,
        coverage: massTime.minMinisters > 0
          ? Math.round((ministersForTime.length / massTime.minMinisters) * 100)
          : 100
      }
    });

  } catch (error) {
    console.error("Error fetching time availability:", error);
    res.status(500).json({ error: "Failed to fetch time availability" });
  }
});

// Export availability analysis
router.get("/export/availability-analysis", authenticateToken, requireRole(["gestor", "coordenador"]), async (req: AuthRequest, res: Response) => {
  const logActivity = createActivityLogger(req);
  await logActivity("export_report", { type: "availability_analysis" });

  try {
    const format = getQueryString(req.query.format) || 'xlsx';

    if (!['xlsx', 'pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: "Invalid format" });
    }

    const numMonths = Math.min(Math.max(getQueryNumber(req.query.months, 6), 3), 12);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);

    // Get responses
    const responses = await db
      .select({
        userId: questionnaireResponses.userId,
        userName: users.name,
        preferredMassTimes: questionnaireResponses.preferredMassTimes,
        alternativeTimes: questionnaireResponses.alternativeTimes,
        availableSundays: questionnaireResponses.availableSundays,
        canSubstitute: questionnaireResponses.canSubstitute,
        month: questionnaires.month,
        year: questionnaires.year
      })
      .from(questionnaireResponses)
      .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(
        and(
          gte(sql`MAKE_DATE(${questionnaires.year}, ${questionnaires.month}, 1)`, startDate),
          lte(sql`MAKE_DATE(${questionnaires.year}, ${questionnaires.month}, 1)`, endDate)
        )
      );

    // Aggregate by minister
    interface ExportResponseData {
      userId: string;
      userName: string | null;
      preferredMassTimes: string[] | null;
      alternativeTimes: string[] | null;
      availableSundays: string[] | null;
      canSubstitute: boolean | null;
      month: number;
      year: number;
    }

    interface MinisterAgg {
      name: string;
      responses: number;
      totalDays: number;
      canSubstitute: boolean;
      preferredTimes: Set<string>;
    }
    const ministerMap = new Map<string, MinisterAgg>();

    (responses as ExportResponseData[]).forEach((r: ExportResponseData) => {
      const existing = ministerMap.get(r.userId);
      const availableDays = r.availableSundays?.length || 0;
      const preferred = r.preferredMassTimes || [];

      if (existing) {
        existing.responses++;
        existing.totalDays += availableDays;
        if (r.canSubstitute) existing.canSubstitute = true;
        preferred.forEach((t: string) => existing.preferredTimes.add(t));
      } else {
        ministerMap.set(r.userId, {
          name: r.userName || 'N/A',
          responses: 1,
          totalDays: availableDays,
          canSubstitute: r.canSubstitute || false,
          preferredTimes: new Set(preferred)
        });
      }
    });

    const rows: (string | number)[][] = Array.from(ministerMap.entries()).map(([id, data]) => [
      data.name,
      data.responses,
      data.responses > 0 ? Math.round(data.totalDays / data.responses * 10) / 10 : 0,
      data.preferredTimes.size,
      data.canSubstitute ? 'Sim' : 'Não',
      Math.min(100, Math.round((data.responses / numMonths) * 100))
    ]).sort((a, b) => (b[2] as number) - (a[2] as number));

    const totalMinisters = ministerMap.size;
    const avgAvailability = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + (r[2] as number), 0) / rows.length * 10) / 10
      : 0;
    const substitutesAvailable = Array.from(ministerMap.values()).filter(m => m.canSubstitute).length;

    const reportData: ReportData = {
      title: 'Análise de Disponibilidade',
      subtitle: 'Padrões de disponibilidade dos ministros',
      generatedAt: formatDateBR(new Date()),
      period: `Últimos ${numMonths} meses`,
      headers: ['Nome', 'Respostas', 'Média Dias', 'Horários Preferidos', 'Suplente', 'Taxa Resposta (%)'],
      rows,
      summary: [
        { label: 'Total de Ministros', value: totalMinisters },
        { label: 'Média de Disponibilidade', value: `${avgAvailability} dias` },
        { label: 'Suplentes Disponíveis', value: substitutesAvailable }
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

    const filename = `analise_disponibilidade_${new Date().toISOString().split('T')[0]}.${getFileExtension(format as ExportFormat)}`;
    res.setHeader('Content-Type', getMimeType(format as ExportFormat));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error("Error exporting availability analysis:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

export default router;