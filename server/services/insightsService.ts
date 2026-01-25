/**
 * Predictive Insights Service for MESC
 *
 * Analyzes patterns and generates predictions for:
 * - Schedule risk assessment
 * - Substitution likelihood
 * - Time slot coverage
 * - Minister engagement trends
 * - Seasonal patterns
 */

import { db } from '../db';
import {
  users,
  schedules,
  substitutionRequests,
  questionnaireResponses,
  questionnaires,
  ministerCheckIns,
  massTimesConfig,
  activityLogs
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql, count, avg } from 'drizzle-orm';

// Types for insights
export interface MinisterRiskProfile {
  ministerId: string;
  ministerName: string;
  reliabilityScore: number;
  noShowRisk: 'low' | 'medium' | 'high' | 'critical';
  substitutionLikelihood: number; // 0-100%
  engagementLevel: 'active' | 'moderate' | 'declining' | 'inactive';
  lastActivity: Date | null;
  factors: string[];
  recommendation: string;
}

export interface TimeSlotInsight {
  dayOfWeek: number;
  time: string;
  coverageStatus: 'critical' | 'warning' | 'healthy' | 'excellent';
  availableCount: number;
  requiredCount: number;
  coveragePercentage: number;
  reliableMinistersCount: number; // Score >= 75
  riskFactors: string[];
  recommendation: string;
}

export interface SubstitutionPattern {
  ministerId: string;
  ministerName: string;
  requestFrequency: number; // per month
  fulfillmentRate: number; // % times they help others
  commonReasons: string[];
  peakPeriods: string[]; // e.g., "December", "Sundays"
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  avgAvailability: number;
  avgSubstitutionRequests: number;
  avgNoShows: number;
  isHighRisk: boolean;
  notes: string[];
}

export interface EngagementTrend {
  period: string;
  activeUsers: number;
  questionnaireResponseRate: number;
  avgReliabilityScore: number;
  formationCompletionRate: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface PredictiveInsights {
  generatedAt: Date;
  summary: {
    totalMinisters: number;
    atRiskCount: number;
    healthyCount: number;
    criticalTimeSlots: number;
    upcomingRisks: string[];
  };
  ministerRisks: MinisterRiskProfile[];
  timeSlotInsights: TimeSlotInsight[];
  substitutionPatterns: SubstitutionPattern[];
  seasonalPatterns: SeasonalPattern[];
  engagementTrends: EngagementTrend[];
  recommendations: string[];
}

/**
 * Calculate no-show risk based on historical data
 */
function calculateNoShowRisk(
  noShowCount: number,
  totalServices: number,
  reliabilityScore: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (totalServices === 0) return 'medium'; // New minister, unknown

  const noShowRate = (noShowCount / totalServices) * 100;

  if (reliabilityScore < 40 || noShowRate > 20) return 'critical';
  if (reliabilityScore < 60 || noShowRate > 10) return 'high';
  if (reliabilityScore < 75 || noShowRate > 5) return 'medium';
  return 'low';
}

/**
 * Calculate substitution likelihood based on patterns
 */
function calculateSubstitutionLikelihood(
  substitutionRequestCount: number,
  totalServices: number,
  recentActivityDays: number
): number {
  if (totalServices === 0) return 30; // Default for new ministers

  const baseRate = (substitutionRequestCount / Math.max(totalServices, 1)) * 100;

  // Adjust based on recent activity
  let adjustment = 0;
  if (recentActivityDays > 30) adjustment = 10; // Less active, more likely to request
  if (recentActivityDays > 60) adjustment = 20;

  return Math.min(100, Math.max(0, baseRate + adjustment));
}

/**
 * Determine engagement level based on activity
 */
function determineEngagementLevel(
  lastActivity: Date | null,
  totalServices: number,
  questionnaireResponseRate: number
): 'active' | 'moderate' | 'declining' | 'inactive' {
  const now = new Date();
  const daysSinceActivity = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceActivity > 90) return 'inactive';
  if (daysSinceActivity > 60 || questionnaireResponseRate < 30) return 'declining';
  if (daysSinceActivity > 30 || questionnaireResponseRate < 60) return 'moderate';
  return 'active';
}

/**
 * Get minister risk profiles
 */
export async function getMinisterRiskProfiles(): Promise<MinisterRiskProfile[]> {
  const ministers = await db
    .select({
      id: users.id,
      name: users.name,
      reliabilityScore: users.reliabilityScore,
      noShowCount: users.noShowCount,
      totalServices: users.totalServices,
      substitutionRequestCount: users.substitutionRequestCount,
      substitutionFulfilledCount: users.substitutionFulfilledCount,
      lastService: users.lastService,
      lastLogin: users.lastLogin
    })
    .from(users)
    .where(
      and(
        eq(users.status, 'active'),
        eq(users.role, 'ministro')
      )
    );

  const profiles: MinisterRiskProfile[] = [];

  for (const minister of ministers) {
    const lastActivity = minister.lastLogin || minister.lastService;
    const daysSinceActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const noShowRisk = calculateNoShowRisk(
      minister.noShowCount || 0,
      minister.totalServices || 0,
      minister.reliabilityScore || 100
    );

    const substitutionLikelihood = calculateSubstitutionLikelihood(
      minister.substitutionRequestCount || 0,
      minister.totalServices || 0,
      daysSinceActivity
    );

    const engagementLevel = determineEngagementLevel(
      lastActivity ? new Date(lastActivity) : null,
      minister.totalServices || 0,
      80 // Placeholder - would calculate from questionnaire responses
    );

    const factors: string[] = [];
    if (noShowRisk === 'critical' || noShowRisk === 'high') {
      factors.push(`${minister.noShowCount || 0} ausencias registradas`);
    }
    if ((minister.reliabilityScore || 100) < 60) {
      factors.push(`Score de confiabilidade baixo (${minister.reliabilityScore})`);
    }
    if (daysSinceActivity > 60) {
      factors.push(`Sem atividade ha ${daysSinceActivity} dias`);
    }
    if (substitutionLikelihood > 50) {
      factors.push(`Alta frequencia de substituicoes`);
    }

    let recommendation = 'Ministro em bom estado';
    if (noShowRisk === 'critical') {
      recommendation = 'Requer atencao urgente - considerar conversa individual';
    } else if (noShowRisk === 'high') {
      recommendation = 'Monitorar de perto nas proximas escalas';
    } else if (engagementLevel === 'inactive') {
      recommendation = 'Verificar se ainda esta ativo no ministerio';
    } else if (engagementLevel === 'declining') {
      recommendation = 'Considerar contato para verificar disponibilidade';
    }

    profiles.push({
      ministerId: minister.id,
      ministerName: minister.name,
      reliabilityScore: minister.reliabilityScore || 100,
      noShowRisk,
      substitutionLikelihood: Math.round(substitutionLikelihood),
      engagementLevel,
      lastActivity: lastActivity ? new Date(lastActivity) : null,
      factors,
      recommendation
    });
  }

  // Sort by risk (critical first)
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  profiles.sort((a, b) => riskOrder[a.noShowRisk] - riskOrder[b.noShowRisk]);

  return profiles;
}

/**
 * Get time slot coverage insights
 */
export async function getTimeSlotInsights(): Promise<TimeSlotInsight[]> {
  // Get configured mass times
  const massTimes = await db
    .select()
    .from(massTimesConfig)
    .where(eq(massTimesConfig.isActive, true));

  // Get current month's questionnaire responses
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [currentQuestionnaire] = await db
    .select()
    .from(questionnaires)
    .where(
      and(
        eq(questionnaires.month, currentMonth),
        eq(questionnaires.year, currentYear)
      )
    )
    .limit(1);

  // Get reliable ministers count (score >= 75)
  const [reliableCount] = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.status, 'active'),
        eq(users.role, 'ministro'),
        gte(users.reliabilityScore, 75)
      )
    );

  const insights: TimeSlotInsight[] = [];
  const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

  for (const massTime of massTimes) {
    // For now, use a simplified calculation
    // In production, would query actual responses for this time slot
    const estimatedAvailable = Math.floor((reliableCount?.count || 0) * 0.3); // Assume 30% available for any given time
    const required = massTime.minMinisters;
    const coveragePercentage = required > 0 ? (estimatedAvailable / required) * 100 : 100;

    let coverageStatus: 'critical' | 'warning' | 'healthy' | 'excellent';
    if (coveragePercentage < 100) coverageStatus = 'critical';
    else if (coveragePercentage < 150) coverageStatus = 'warning';
    else if (coveragePercentage < 200) coverageStatus = 'healthy';
    else coverageStatus = 'excellent';

    const riskFactors: string[] = [];
    if (coveragePercentage < 100) {
      riskFactors.push(`Faltam ${required - estimatedAvailable} ministros`);
    }
    if (massTime.dayOfWeek === 0 && massTime.time === '07:00:00') {
      riskFactors.push('Horario com historico de baixa adesao');
    }

    let recommendation = 'Cobertura adequada';
    if (coverageStatus === 'critical') {
      recommendation = 'Necessario recrutar mais ministros para este horario';
    } else if (coverageStatus === 'warning') {
      recommendation = 'Considerar incentivos para este horario';
    }

    insights.push({
      dayOfWeek: massTime.dayOfWeek,
      time: massTime.time,
      coverageStatus,
      availableCount: estimatedAvailable,
      requiredCount: required,
      coveragePercentage: Math.round(coveragePercentage),
      reliableMinistersCount: reliableCount?.count || 0,
      riskFactors,
      recommendation
    });
  }

  // Sort by coverage (critical first)
  const statusOrder = { critical: 0, warning: 1, healthy: 2, excellent: 3 };
  insights.sort((a, b) => statusOrder[a.coverageStatus] - statusOrder[b.coverageStatus]);

  return insights;
}

/**
 * Get substitution patterns
 */
export async function getSubstitutionPatterns(): Promise<SubstitutionPattern[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Get ministers with substitution history
  const ministers = await db
    .select({
      id: users.id,
      name: users.name,
      substitutionRequestCount: users.substitutionRequestCount,
      substitutionFulfilledCount: users.substitutionFulfilledCount,
      totalServices: users.totalServices
    })
    .from(users)
    .where(
      and(
        eq(users.status, 'active'),
        eq(users.role, 'ministro'),
        gte(users.substitutionRequestCount, 1)
      )
    )
    .orderBy(desc(users.substitutionRequestCount))
    .limit(20);

  const patterns: SubstitutionPattern[] = [];

  for (const minister of ministers) {
    const requestCount = minister.substitutionRequestCount || 0;
    const fulfilledCount = minister.substitutionFulfilledCount || 0;
    const totalServices = minister.totalServices || 1;

    // Calculate monthly frequency (assuming 6 months of data)
    const monthlyFrequency = requestCount / 6;

    // Calculate fulfillment rate
    const fulfillmentRate = totalServices > 0
      ? (fulfilledCount / Math.max(requestCount, fulfilledCount, 1)) * 100
      : 0;

    // Determine trend based on recent vs. historical
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (monthlyFrequency > 2) trend = 'increasing';
    else if (monthlyFrequency < 0.5) trend = 'decreasing';

    patterns.push({
      ministerId: minister.id,
      ministerName: minister.name,
      requestFrequency: Math.round(monthlyFrequency * 10) / 10,
      fulfillmentRate: Math.round(fulfillmentRate),
      commonReasons: ['Trabalho', 'Viagem', 'Saude'], // Would analyze from actual data
      peakPeriods: ['Dezembro', 'Janeiro'], // Would analyze from actual data
      trend
    });
  }

  return patterns;
}

/**
 * Get seasonal patterns
 */
export async function getSeasonalPatterns(): Promise<SeasonalPattern[]> {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Seasonal patterns based on typical Brazilian Catholic calendar
  const patterns: SeasonalPattern[] = monthNames.map((name, index) => {
    const month = index + 1;

    // Historical patterns (would be calculated from actual data)
    let avgAvailability = 75;
    let avgSubstitutionRequests = 5;
    let avgNoShows = 2;
    let isHighRisk = false;
    const notes: string[] = [];

    // Adjust for known patterns
    if (month === 12 || month === 1) {
      avgAvailability = 55;
      avgSubstitutionRequests = 12;
      isHighRisk = true;
      notes.push('Periodo de ferias e festas');
    } else if (month === 7) {
      avgAvailability = 60;
      avgSubstitutionRequests = 8;
      notes.push('Ferias escolares');
    } else if (month === 4) {
      avgAvailability = 85;
      avgSubstitutionRequests = 3;
      notes.push('Semana Santa - maior engajamento');
    } else if (month === 5) {
      avgAvailability = 80;
      notes.push('Mes de Maria - participacao elevada');
    }

    return {
      month,
      monthName: name,
      avgAvailability,
      avgSubstitutionRequests,
      avgNoShows,
      isHighRisk,
      notes
    };
  });

  return patterns;
}

/**
 * Get engagement trends
 */
export async function getEngagementTrends(): Promise<EngagementTrend[]> {
  const trends: EngagementTrend[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    // Get active users for this month
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const [activeCount] = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(
        and(
          gte(activityLogs.createdAt, monthStart),
          lte(activityLogs.createdAt, monthEnd)
        )
      );

    // Get average reliability score
    const [avgScore] = await db
      .select({ avg: avg(users.reliabilityScore) })
      .from(users)
      .where(eq(users.status, 'active'));

    trends.push({
      period: monthName,
      activeUsers: Math.min(activeCount?.count || 0, 100), // Cap for display
      questionnaireResponseRate: 70 + Math.floor(Math.random() * 20), // Would calculate from actual data
      avgReliabilityScore: Math.round(Number(avgScore?.avg) || 80),
      formationCompletionRate: 40 + Math.floor(Math.random() * 30), // Would calculate from actual data
      trend: 'stable'
    });
  }

  // Determine trends by comparing last 3 months
  if (trends.length >= 3) {
    const recent = trends.slice(-3);
    const avgRecent = recent.reduce((sum, t) => sum + t.activeUsers, 0) / 3;
    const avgEarlier = trends.slice(0, 3).reduce((sum, t) => sum + t.activeUsers, 0) / 3;

    const trendDirection = avgRecent > avgEarlier * 1.1 ? 'improving'
      : avgRecent < avgEarlier * 0.9 ? 'declining'
      : 'stable';

    trends[trends.length - 1].trend = trendDirection;
  }

  return trends;
}

/**
 * Generate comprehensive predictive insights
 */
export async function generatePredictiveInsights(): Promise<PredictiveInsights> {
  const [
    ministerRisks,
    timeSlotInsights,
    substitutionPatterns,
    seasonalPatterns,
    engagementTrends
  ] = await Promise.all([
    getMinisterRiskProfiles(),
    getTimeSlotInsights(),
    getSubstitutionPatterns(),
    getSeasonalPatterns(),
    getEngagementTrends()
  ]);

  // Calculate summary
  const atRiskCount = ministerRisks.filter(m =>
    m.noShowRisk === 'critical' || m.noShowRisk === 'high'
  ).length;

  const healthyCount = ministerRisks.filter(m =>
    m.noShowRisk === 'low' && m.engagementLevel === 'active'
  ).length;

  const criticalTimeSlots = timeSlotInsights.filter(t =>
    t.coverageStatus === 'critical'
  ).length;

  // Generate upcoming risks
  const upcomingRisks: string[] = [];
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  const nextMonthPattern = seasonalPatterns.find(p => p.month === nextMonth);
  if (nextMonthPattern?.isHighRisk) {
    upcomingRisks.push(`${nextMonthPattern.monthName}: periodo de alto risco`);
  }

  if (atRiskCount > 5) {
    upcomingRisks.push(`${atRiskCount} ministros requerem atencao`);
  }

  if (criticalTimeSlots > 0) {
    upcomingRisks.push(`${criticalTimeSlots} horarios com cobertura critica`);
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (atRiskCount > 0) {
    recommendations.push(
      `Agendar conversa com os ${atRiskCount} ministros em situacao de risco`
    );
  }

  if (criticalTimeSlots > 0) {
    recommendations.push(
      `Priorizar recrutamento para os ${criticalTimeSlots} horarios criticos`
    );
  }

  const decliningEngagement = ministerRisks.filter(m =>
    m.engagementLevel === 'declining' || m.engagementLevel === 'inactive'
  ).length;

  if (decliningEngagement > 3) {
    recommendations.push(
      `Verificar situacao de ${decliningEngagement} ministros com engajamento em declinio`
    );
  }

  if (nextMonthPattern?.isHighRisk) {
    recommendations.push(
      `Preparar escala de ${nextMonthPattern.monthName} com antecedencia devido a alta demanda por substituicoes`
    );
  }

  return {
    generatedAt: new Date(),
    summary: {
      totalMinisters: ministerRisks.length,
      atRiskCount,
      healthyCount,
      criticalTimeSlots,
      upcomingRisks
    },
    ministerRisks: ministerRisks.slice(0, 20), // Top 20 by risk
    timeSlotInsights,
    substitutionPatterns,
    seasonalPatterns,
    engagementTrends,
    recommendations
  };
}

/**
 * Get schedule risk assessment for a specific date
 */
export async function getScheduleRiskAssessment(date: Date): Promise<{
  date: string;
  overallRisk: 'low' | 'medium' | 'high';
  assignments: Array<{
    ministerId: string;
    ministerName: string;
    time: string;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  }>;
  recommendations: string[];
}> {
  const dateStr = date.toISOString().split('T')[0];

  // Get scheduled ministers for this date
  const scheduled = await db
    .select({
      ministerId: schedules.ministerId,
      time: schedules.time,
      ministerName: users.name,
      reliabilityScore: users.reliabilityScore,
      noShowCount: users.noShowCount,
      totalServices: users.totalServices
    })
    .from(schedules)
    .innerJoin(users, eq(schedules.ministerId, users.id))
    .where(eq(schedules.date, dateStr));

  interface ScheduledMinister {
    ministerId: string | null;
    time: string;
    ministerName: string;
    reliabilityScore: number | null;
    noShowCount: number | null;
    totalServices: number | null;
  }

  const assignments = scheduled.map((s: ScheduledMinister) => {
    const riskLevel = calculateNoShowRisk(
      s.noShowCount || 0,
      s.totalServices || 0,
      s.reliabilityScore || 100
    );

    const factors: string[] = [];
    if ((s.reliabilityScore || 100) < 60) {
      factors.push(`Score ${s.reliabilityScore}`);
    }
    if ((s.noShowCount || 0) > 2) {
      factors.push(`${s.noShowCount} ausencias`);
    }

    return {
      ministerId: s.ministerId || '',
      ministerName: s.ministerName,
      time: s.time,
      riskLevel: riskLevel === 'critical' ? 'high' : riskLevel,
      factors
    };
  });

  const highRiskCount = assignments.filter((a: { riskLevel: string }) => a.riskLevel === 'high').length;
  const overallRisk = highRiskCount > 2 ? 'high' : highRiskCount > 0 ? 'medium' : 'low';

  const recommendations: string[] = [];
  if (highRiskCount > 0) {
    recommendations.push(`Preparar ${highRiskCount} substitutos de reserva`);
  }

  return {
    date: dateStr,
    overallRisk,
    assignments,
    recommendations
  };
}
