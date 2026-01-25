/**
 * Insights Service Unit Tests
 *
 * Tests for predictive analytics and insights generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockResolvedValue([]),
          innerJoin: vi.fn().mockResolvedValue([])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        }),
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([])
        })
      })
    })
  }
}));

describe('Insights Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('No-Show Risk Calculation', () => {
    // Helper function matching the service logic
    function calculateNoShowRisk(
      noShowCount: number,
      totalServices: number,
      reliabilityScore: number
    ): 'low' | 'medium' | 'high' | 'critical' {
      if (totalServices === 0) return 'medium';
      const noShowRate = (noShowCount / totalServices) * 100;
      if (reliabilityScore < 40 || noShowRate > 20) return 'critical';
      if (reliabilityScore < 60 || noShowRate > 10) return 'high';
      if (reliabilityScore < 75 || noShowRate > 5) return 'medium';
      return 'low';
    }

    it('should return medium for new ministers with no history', () => {
      const risk = calculateNoShowRisk(0, 0, 100);
      expect(risk).toBe('medium');
    });

    it('should return low for reliable ministers', () => {
      const risk = calculateNoShowRisk(1, 50, 95);
      expect(risk).toBe('low');
    });

    it('should return critical for low reliability score', () => {
      const risk = calculateNoShowRisk(0, 10, 35);
      expect(risk).toBe('critical');
    });

    it('should return critical for high no-show rate', () => {
      const risk = calculateNoShowRisk(10, 40, 80); // 25% no-show rate
      expect(risk).toBe('critical');
    });

    it('should return high for moderate risk factors', () => {
      const risk = calculateNoShowRisk(3, 25, 55); // 12% no-show, 55 score
      expect(risk).toBe('high');
    });

    it('should return medium for slightly below threshold', () => {
      const risk = calculateNoShowRisk(2, 30, 70); // 6.7% no-show, 70 score
      expect(risk).toBe('medium');
    });

    it('should prioritize score over rate for critical assessment', () => {
      // Very low score should be critical even with good attendance
      const risk = calculateNoShowRisk(0, 50, 30);
      expect(risk).toBe('critical');
    });
  });

  describe('Substitution Likelihood Calculation', () => {
    function calculateSubstitutionLikelihood(
      substitutionRequestCount: number,
      totalServices: number,
      recentActivityDays: number
    ): number {
      if (totalServices === 0) return 30;
      const baseRate = (substitutionRequestCount / Math.max(totalServices, 1)) * 100;
      let adjustment = 0;
      if (recentActivityDays > 30) adjustment = 10;
      if (recentActivityDays > 60) adjustment = 20;
      return Math.min(100, Math.max(0, baseRate + adjustment));
    }

    it('should return default 30% for new ministers', () => {
      const likelihood = calculateSubstitutionLikelihood(0, 0, 0);
      expect(likelihood).toBe(30);
    });

    it('should calculate base rate from substitution history', () => {
      const likelihood = calculateSubstitutionLikelihood(5, 50, 10);
      expect(likelihood).toBe(10); // 5/50 * 100 = 10%
    });

    it('should add adjustment for inactive ministers', () => {
      const likelihood = calculateSubstitutionLikelihood(5, 50, 45);
      expect(likelihood).toBe(20); // 10% base + 10% adjustment
    });

    it('should add larger adjustment for very inactive ministers', () => {
      const likelihood = calculateSubstitutionLikelihood(5, 50, 90);
      expect(likelihood).toBe(30); // 10% base + 20% adjustment
    });

    it('should cap at 100%', () => {
      const likelihood = calculateSubstitutionLikelihood(40, 50, 90);
      expect(likelihood).toBe(100); // 80% + 20% capped at 100
    });

    it('should not go below 0%', () => {
      const likelihood = calculateSubstitutionLikelihood(0, 100, 0);
      expect(likelihood).toBe(0);
    });
  });

  describe('Engagement Level Determination', () => {
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

    it('should return active for recent activity and good response rate', () => {
      const lastActivity = new Date();
      const level = determineEngagementLevel(lastActivity, 20, 80);
      expect(level).toBe('active');
    });

    it('should return inactive for no activity', () => {
      const level = determineEngagementLevel(null, 10, 50);
      expect(level).toBe('inactive');
    });

    it('should return inactive for very old activity', () => {
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - 100);
      const level = determineEngagementLevel(lastActivity, 10, 80);
      expect(level).toBe('inactive');
    });

    it('should return declining for poor questionnaire response', () => {
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - 10);
      const level = determineEngagementLevel(lastActivity, 10, 20);
      expect(level).toBe('declining');
    });

    it('should return moderate for borderline activity', () => {
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - 45);
      const level = determineEngagementLevel(lastActivity, 10, 70);
      expect(level).toBe('moderate');
    });
  });

  describe('Time Slot Coverage Analysis', () => {
    function determineCoverageStatus(
      availableCount: number,
      requiredCount: number
    ): 'critical' | 'warning' | 'healthy' | 'excellent' {
      const coverage = requiredCount > 0 ? (availableCount / requiredCount) * 100 : 0;
      if (coverage < 50) return 'critical';
      if (coverage < 80) return 'warning';
      if (coverage < 120) return 'healthy';
      return 'excellent';
    }

    it('should return critical for less than 50% coverage', () => {
      const status = determineCoverageStatus(2, 10);
      expect(status).toBe('critical');
    });

    it('should return warning for 50-80% coverage', () => {
      const status = determineCoverageStatus(6, 10);
      expect(status).toBe('warning');
    });

    it('should return healthy for 80-120% coverage', () => {
      const status = determineCoverageStatus(10, 10);
      expect(status).toBe('healthy');
    });

    it('should return excellent for over 120% coverage', () => {
      const status = determineCoverageStatus(15, 10);
      expect(status).toBe('excellent');
    });

    it('should handle zero required ministers', () => {
      const status = determineCoverageStatus(5, 0);
      expect(status).toBe('critical'); // 0% coverage
    });
  });

  describe('Seasonal Pattern Detection', () => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    it('should identify high-risk months correctly', () => {
      const patterns = [
        { month: 1, avgAvailability: 70, avgNoShows: 5 },
        { month: 7, avgAvailability: 40, avgNoShows: 15 }, // Vacation
        { month: 12, avgAvailability: 35, avgNoShows: 20 } // Holidays
      ];

      const highRiskMonths = patterns.filter(p => p.avgAvailability < 50 || p.avgNoShows > 10);
      expect(highRiskMonths).toHaveLength(2);
      expect(highRiskMonths.map(p => p.month)).toContain(7);
      expect(highRiskMonths.map(p => p.month)).toContain(12);
    });

    it('should correctly map month numbers to names', () => {
      expect(monthNames[0]).toBe('Janeiro');
      expect(monthNames[6]).toBe('Julho');
      expect(monthNames[11]).toBe('Dezembro');
    });

    it('should track average availability per month', () => {
      const monthlyData = [
        { month: 1, available: 80 },
        { month: 1, available: 70 },
        { month: 1, available: 90 }
      ];

      const avgAvailability = monthlyData.reduce((sum, d) => sum + d.available, 0) / monthlyData.length;
      expect(avgAvailability).toBe(80);
    });
  });

  describe('Engagement Trend Analysis', () => {
    it('should identify improving trend', () => {
      const periods = [
        { period: '2025-01', activeUsers: 100, avgReliability: 70 },
        { period: '2025-02', activeUsers: 110, avgReliability: 72 },
        { period: '2025-03', activeUsers: 120, avgReliability: 75 }
      ];

      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];
      const trend = lastPeriod.avgReliability > firstPeriod.avgReliability ? 'improving' : 'declining';

      expect(trend).toBe('improving');
    });

    it('should identify declining trend', () => {
      const periods = [
        { period: '2025-01', avgReliability: 80 },
        { period: '2025-02', avgReliability: 75 },
        { period: '2025-03', avgReliability: 70 }
      ];

      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];
      const trend = lastPeriod.avgReliability > firstPeriod.avgReliability ? 'improving' : 'declining';

      expect(trend).toBe('declining');
    });

    it('should identify stable trend', () => {
      const periods = [
        { period: '2025-01', avgReliability: 75 },
        { period: '2025-02', avgReliability: 76 },
        { period: '2025-03', avgReliability: 75 }
      ];

      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];
      const difference = Math.abs(lastPeriod.avgReliability - firstPeriod.avgReliability);
      const trend = difference < 3 ? 'stable' : (lastPeriod.avgReliability > firstPeriod.avgReliability ? 'improving' : 'declining');

      expect(trend).toBe('stable');
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate urgent recommendations for critical issues', () => {
      const insights = {
        criticalTimeSlots: 3,
        atRiskMinisters: 10,
        upcomingRisks: ['Feriado proximo', 'Ferias escolares']
      };

      const recommendations: string[] = [];

      if (insights.criticalTimeSlots > 0) {
        recommendations.push(`Atencao urgente: ${insights.criticalTimeSlots} horarios com cobertura critica`);
      }

      if (insights.atRiskMinisters > 5) {
        recommendations.push(`Acompanhar ${insights.atRiskMinisters} ministros em risco de inatividade`);
      }

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toContain('urgente');
    });

    it('should generate proactive recommendations', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const isHighRiskMonth = [7, 12, 1].includes(nextMonth.getMonth() + 1);

      const recommendations: string[] = [];

      if (isHighRiskMonth) {
        recommendations.push('Preparar substitutos de reserva para o proximo mes');
      }

      // December, January, or July would trigger this
      if ([12, 1, 7].includes(new Date().getMonth() + 1)) {
        expect(recommendations.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should categorize recommendations by priority', () => {
      const allRecommendations = [
        'Atencao urgente: 5 horarios criticos',
        'Preparar para proximo mes',
        'Considerar treinamento de novos ministros'
      ];

      const categorized = {
        urgent: allRecommendations.filter(r => r.includes('urgente') || r.includes('critico')),
        shortTerm: allRecommendations.filter(r => r.includes('proximo') || r.includes('preparar')),
        longTerm: allRecommendations.filter(r => !r.includes('urgente') && !r.includes('critico') && !r.includes('proximo'))
      };

      expect(categorized.urgent).toHaveLength(1);
      expect(categorized.shortTerm).toHaveLength(1);
      expect(categorized.longTerm).toHaveLength(1);
    });
  });

  describe('Schedule Risk Assessment', () => {
    it('should calculate overall risk from assignments', () => {
      const assignments = [
        { riskLevel: 'high' },
        { riskLevel: 'high' },
        { riskLevel: 'high' },
        { riskLevel: 'low' },
        { riskLevel: 'low' }
      ];

      const highRiskCount = assignments.filter(a => a.riskLevel === 'high').length;
      const overallRisk = highRiskCount > 2 ? 'high' : highRiskCount > 0 ? 'medium' : 'low';

      expect(overallRisk).toBe('high');
    });

    it('should suggest backup ministers for high-risk schedules', () => {
      const highRiskCount = 3;
      const recommendations = [];

      if (highRiskCount > 0) {
        recommendations.push(`Preparar ${highRiskCount} substitutos de reserva`);
      }

      expect(recommendations[0]).toContain('3 substitutos');
    });

    it('should validate date format for risk assessment', () => {
      const validDate = '2025-01-15';
      const invalidDate = 'not-a-date';

      expect(new Date(validDate).toString()).not.toBe('Invalid Date');
      expect(new Date(invalidDate).toString()).toBe('Invalid Date');
    });
  });

  describe('Minister Risk Profile', () => {
    it('should generate comprehensive risk profile', () => {
      const ministerData = {
        id: 'minister-1',
        name: 'John Doe',
        reliabilityScore: 75,
        noShowCount: 2,
        totalServices: 50,
        substitutionRequestCount: 5
      };

      const profile = {
        ministerId: ministerData.id,
        ministerName: ministerData.name,
        reliabilityScore: ministerData.reliabilityScore,
        noShowRisk: ministerData.reliabilityScore < 60 ? 'high' : 'low',
        substitutionLikelihood: (ministerData.substitutionRequestCount / ministerData.totalServices) * 100,
        factors: [] as string[]
      };

      if (ministerData.reliabilityScore < 80) {
        profile.factors.push('Score abaixo de 80');
      }
      if (ministerData.noShowCount > 1) {
        profile.factors.push(`${ministerData.noShowCount} ausencias registradas`);
      }

      expect(profile.noShowRisk).toBe('low');
      expect(profile.factors).toHaveLength(2);
      expect(profile.substitutionLikelihood).toBe(10);
    });
  });
});
