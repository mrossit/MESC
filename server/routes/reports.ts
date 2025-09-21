import { Router } from "express";
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
          startDate ? gte(questionnaireResponses.submittedAt, new Date(startDate as string)) : sql`true`,
          endDate ? lte(questionnaireResponses.submittedAt, new Date(endDate as string)) : sql`true`
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
          startDate ? gte(substitutionRequests.createdAt, new Date(startDate as string)) : sql`true`,
          endDate ? lte(substitutionRequests.createdAt, new Date(endDate as string)) : sql`true`
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
           ${startDate ? sql`AND ${substitutionRequests.createdAt} >= ${new Date(startDate as string)}` : sql``}
           ${endDate ? sql`AND ${substitutionRequests.createdAt} <= ${new Date(endDate as string)}` : sql``})
        `.as('substitution_requests')
      })
      .from(schedules)
      .leftJoin(users, eq(users.id, schedules.ministerId))
      .where(
        and(
          schedules.status ? eq(schedules.status, "published") : sql`true`,
          startDate ? gte(schedules.createdAt, new Date(startDate as string)) : sql`true`,
          endDate ? lte(schedules.createdAt, new Date(endDate as string)) : sql`true`
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
          startDate ? gte(activityLogs.createdAt, new Date(startDate as string)) : sql`true`,
          endDate ? lte(activityLogs.createdAt, new Date(endDate as string)) : sql`true`
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
          startDate ? gte(questionnaireResponses.submittedAt, new Date(startDate as string)) : sql`true`,
          endDate ? lte(questionnaireResponses.submittedAt, new Date(endDate as string)) : sql`true`
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

export default router;