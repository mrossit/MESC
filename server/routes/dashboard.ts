/**
 * Dashboard API Routes
 * Provides real-time operational data for coordinators
 */

import { Router } from 'express';
import { db } from '../db';
import {
  schedules,
  users,
  substitutionRequests,
  questionnaires,
  questionnaireResponses
} from '../../shared/schema';
import { eq, and, gte, lte, sql, or, isNull, count, desc } from 'drizzle-orm';
import { format, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

/**
 * GET /api/dashboard/urgent-alerts
 * Returns urgent issues requiring immediate coordinator attention
 */
router.get('/urgent-alerts', async (req, res) => {
  try {
    const now = new Date();
    const next48Hours = addDays(now, 2);
    const next7Days = addDays(now, 7);

    // 1. Find incomplete masses (where there are VACANTE slots)
    // IMPORTANT: Only show published schedules
    const incompleteMasses = await db
      .select({
        date: schedules.date,
        time: schedules.time,
        totalSlots: sql<number>`COUNT(*)`,
        filledSlots: sql<number>`COUNT(CASE WHEN ${schedules.ministerId} IS NOT NULL THEN 1 END)`,
        vacancies: sql<number>`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'published'),
          gte(schedules.date, format(now, 'yyyy-MM-dd')),
          lte(schedules.date, format(next7Days, 'yyyy-MM-dd'))
        )
      )
      .groupBy(schedules.date, schedules.time)
      .having(sql`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END) > 0`);

    // Separate critical (within 48h) from regular incomplete
    const criticalMasses = incompleteMasses
      .filter(mass => {
        const massDate = new Date(mass.date + 'T12:00:00');
        return massDate <= next48Hours;
      })
      .map(m => ({
        ...m,
        hoursUntil: Math.round((new Date(m.date + 'T12:00:00').getTime() - now.getTime()) / (1000 * 60 * 60)),
        massTime: m.time,
      }));

    const regularIncomplete = incompleteMasses
      .filter(mass => {
        const massDate = new Date(mass.date + 'T12:00:00');
        return massDate > next48Hours;
      })
      .map(m => ({
        ...m,
        massTime: m.time,
      }));

    // 2. Pending substitutions
    // IMPORTANT: Only show substitutions for published schedules
    const pendingSubstitutions = await db
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
          eq(schedules.status, 'published'),
          or(
            eq(substitutionRequests.status, 'pending'),
            eq(substitutionRequests.status, 'available')
          ),
          gte(schedules.date, format(now, 'yyyy-MM-dd'))
        )
      )
      .orderBy(schedules.date);

    // Separate urgent (within 48h) from regular
    const urgentSubstitutions = pendingSubstitutions
      .filter(sub => {
        const subDate = new Date(sub.massDate + 'T12:00:00');
        return subDate <= next48Hours;
      })
      .map(s => ({
        ...s,
        hoursUntil: Math.round((new Date(s.massDate + 'T12:00:00').getTime() - now.getTime()) / (1000 * 60 * 60)),
      }));

    const regularSubstitutions = pendingSubstitutions.filter(sub => {
      const subDate = new Date(sub.massDate + 'T12:00:00');
      return subDate > next48Hours;
    });

    res.json({
      success: true,
      data: {
        criticalMasses,
        incompleteMasses: regularIncomplete,
        urgentSubstitutions,
        pendingSubstitutions: regularSubstitutions,
        totalAlerts: criticalMasses.length + urgentSubstitutions.length,
      },
    });
  } catch (error) {
    console.error('[DASHBOARD_ALERTS] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch urgent alerts' });
  }
});

/**
 * GET /api/dashboard/next-week-masses
 * Returns all masses for the next 7 days with staffing status
 */
router.get('/next-week-masses', async (req, res) => {
  try {
    const now = new Date();
    const next7Days = addDays(now, 7);

    // IMPORTANT: Only show published schedules
    const masses = await db
      .select({
        date: schedules.date,
        massTime: schedules.time,
        totalSlots: sql<number>`COUNT(*)`,
        totalAssigned: sql<number>`COUNT(CASE WHEN ${schedules.ministerId} IS NOT NULL THEN 1 END)`,
        totalVacancies: sql<number>`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`,
        requiredMinisters: sql<number>`COUNT(*)`, // All slots are required
        hasPendingSubstitutions: sql<boolean>`EXISTS(
          SELECT 1 FROM ${substitutionRequests}
          WHERE ${substitutionRequests.scheduleId} IN (
            SELECT id FROM ${schedules} AS s2
            WHERE s2.date = ${schedules.date} AND s2.time = ${schedules.time}
          )
          AND ${substitutionRequests.status} IN ('pending', 'available')
        )`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'published'),
          gte(schedules.date, format(now, 'yyyy-MM-dd')),
          lte(schedules.date, format(next7Days, 'yyyy-MM-dd'))
        )
      )
      .groupBy(schedules.date, schedules.time)
      .orderBy(schedules.date, schedules.time);

    const massesWithStatus = masses.map(mass => {
      const staffingRate = mass.requiredMinisters > 0
        ? (mass.totalAssigned / mass.requiredMinisters) * 100
        : 0;

      let status: 'full' | 'warning' | 'critical' = 'full';
      if (staffingRate < 80) status = 'critical';
      else if (staffingRate < 100) status = 'warning';

      // Generate a unique ID for this mass
      const id = `${mass.date}-${mass.massTime}`;

      return {
        id,
        date: mass.date,
        massTime: mass.massTime,
        totalAssigned: mass.totalAssigned,
        totalVacancies: mass.totalVacancies,
        requiredMinisters: mass.requiredMinisters,
        staffingRate: Math.round(staffingRate),
        status,
        hasPendingSubstitutions: mass.hasPendingSubstitutions,
      };
    });

    res.json({
      success: true,
      data: massesWithStatus,
    });
  } catch (error) {
    console.error('[DASHBOARD_NEXT_WEEK] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch next week masses' });
  }
});

/**
 * GET /api/dashboard/ministry-stats
 * Returns ministry health indicators and statistics
 */
router.get('/ministry-stats', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    // Active ministers count
    const [activeMinistersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          or(
            eq(users.role, 'ministro'),
            eq(users.role, 'coordenador')
          )
        )
      );

    // Ministers who haven't served in 30+ days
    const inactiveMinisters = await db
      .select({
        id: users.id,
        name: users.name,
        lastService: users.lastService,
        daysSinceService: sql<number>`EXTRACT(DAY FROM NOW() - ${users.lastService})`,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          or(
            eq(users.role, 'ministro'),
            eq(users.role, 'coordenador')
          ),
          or(
            lte(users.lastService, thirtyDaysAgo),
            isNull(users.lastService)
          )
        )
      )
      .orderBy(desc(sql`EXTRACT(DAY FROM NOW() - ${users.lastService})`));

    // Current month coverage
    // IMPORTANT: Only count published schedules
    const [monthStats] = await db
      .select({
        totalMasses: sql<number>`COUNT(DISTINCT (${schedules.date}, ${schedules.time}))`,
        fullyStaffedMasses: sql<number>`COUNT(DISTINCT CASE
          WHEN NOT EXISTS(
            SELECT 1 FROM schedules AS s2
            WHERE s2.date = ${schedules.date}
            AND s2.time = ${schedules.time}
            AND s2.minister_id IS NULL
            AND s2.status = 'published'
          ) THEN (${schedules.date}, ${schedules.time})
        END)`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'published'),
          gte(schedules.date, format(thisMonthStart, 'yyyy-MM-dd')),
          lte(schedules.date, format(thisMonthEnd, 'yyyy-MM-dd'))
        )
      );

    // Current questionnaire response rate
    const [currentQuestionnaire] = await db
      .select({
        id: questionnaires.id,
        status: questionnaires.status,
      })
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.month, now.getMonth() + 1),
          eq(questionnaires.year, now.getFullYear())
        )
      )
      .limit(1);

    let responseRate = 0;
    if (currentQuestionnaire) {
      const [responseStats] = await db
        .select({
          totalResponses: count(questionnaireResponses.id),
        })
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, currentQuestionnaire.id));

      responseRate = Math.round(
        (responseStats.totalResponses / (activeMinistersResult.count || 1)) * 100
      );
    }

    // Pending actions count
    const [pendingSubsCount] = await db
      .select({ count: count() })
      .from(substitutionRequests)
      .where(
        and(
          or(
            eq(substitutionRequests.status, 'pending'),
            eq(substitutionRequests.status, 'available')
          )
        )
      );

    // IMPORTANT: Only count incomplete masses for published schedules
    const [incompleteMassesCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT (${schedules.date}, ${schedules.time}))`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'published'),
          gte(schedules.date, format(now, 'yyyy-MM-dd')),
          isNull(schedules.ministerId)
        )
      );

    res.json({
      success: true,
      data: {
        activeMinisters: activeMinistersResult.count,
        responseRate,
        monthCoverage: {
          total: monthStats?.totalMasses || 0,
          fullyStaffed: monthStats?.fullyStaffedMasses || 0,
          percentage: monthStats?.totalMasses > 0
            ? Math.round(((monthStats.fullyStaffedMasses || 0) / monthStats.totalMasses) * 100)
            : 0,
        },
        pendingActions: (pendingSubsCount.count || 0) + (incompleteMassesCount.count || 0),
        inactiveMinisters: inactiveMinisters.slice(0, 10), // Top 10
        questionnaireStatus: currentQuestionnaire?.status || 'closed',
      },
    });
  } catch (error) {
    console.error('[DASHBOARD_STATS] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ministry stats' });
  }
});

/**
 * GET /api/schedules/incomplete
 * Returns incomplete schedules for the specified number of days
 */
router.get('/incomplete', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const now = new Date();
    const futureDate = addDays(now, days);

    // IMPORTANT: Only show incomplete masses for published schedules
    const incomplete = await db
      .select({
        date: schedules.date,
        massTime: schedules.time,
        vacancies: sql<number>`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`,
        totalSlots: sql<number>`COUNT(*)`,
        positions: sql<number[]>`ARRAY_AGG(
          CASE WHEN ${schedules.ministerId} IS NULL
          THEN ${schedules.position}
          END
        ) FILTER (WHERE ${schedules.ministerId} IS NULL)`,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'published'),
          gte(schedules.date, format(now, 'yyyy-MM-dd')),
          lte(schedules.date, format(futureDate, 'yyyy-MM-dd'))
        )
      )
      .groupBy(schedules.date, schedules.time)
      .having(sql`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END) > 0`)
      .orderBy(schedules.date, schedules.time);

    res.json({
      success: true,
      data: incomplete.map(item => ({
        ...item,
        id: `${item.date}-${item.massTime}`,
        title: `Missa ${item.massTime}`,
        requiredMinisters: item.totalSlots,
        totalAssigned: item.totalSlots - item.vacancies,
      })),
    });
  } catch (error) {
    console.error('[SCHEDULES_INCOMPLETE] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch incomplete schedules' });
  }
});

export default router;
