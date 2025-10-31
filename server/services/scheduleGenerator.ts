/**
 * Intelligent Schedule Generator
 *
 * Clean, maintainable schedule generation using parsed questionnaire data.
 * Replaces the complex legacy ScheduleGenerator with simpler, more reliable logic.
 */

import { QuestionnaireParser } from './questionnaireParser';

interface ParsedAvailability {
  masses: Record<string, Record<string, boolean>>;
  weekdays: Record<string, boolean>;
  specialEvents: Record<string, boolean>;
  canSubstitute: boolean;
  notes?: string;
}

interface MinisterWithAvailability {
  id: string;
  name: string;
  preferredPosition?: number;
  preferredPositions?: number[];
  avoidPositions?: number[];
  availability: ParsedAvailability;
  assignmentCount: number;
  familyId?: string;
}

interface MassInfo {
  date: string;
  time: string;
  dayOfWeek: number;
  isSpecial: boolean;
  type?: string;
}

interface Assignment {
  ministerId: string;
  ministerName: string;
  position: number;
  confirmed: boolean;
}

interface HistoricalAssignmentSnapshot {
  date: string;
  time: string;
  position: number;
  ministerId?: string | null;
}

interface HistoricalScheduleSnapshot {
  reference?: string;
  publishedAt?: string;
  assignments: HistoricalAssignmentSnapshot[];
}

interface MinisterLearningProfile {
  weightedAssignments: number;
  totalAssignments: number;
  positionWeights: Map<number, number>;
  massWeights: Map<string, number>;
  recencyBoost: number;
  lastDates: string[];
}

export class IntelligentScheduleGenerator {
  private ministers: MinisterWithAvailability[] = [];
  private maxAssignmentsPerMonth = 25;
  private historicalSchedules: HistoricalScheduleSnapshot[] = [];
  private ministerLearningProfiles: Map<string, MinisterLearningProfile> = new Map();
  private historicalAssignmentLookup: Map<string, string> = new Map();
  private lastHistoricalAlignment?: { total: number; matches: number; matchRate: number };
  private month: number;
  private year: number;

  constructor(
    month: number | string,
    year: number | string,
    private ministersData: any[],
    private responsesData: any[],
    historicalSchedules: HistoricalScheduleSnapshot[] = []
  ) {
    // Normalize month and year to numbers (handles both string and number inputs)
    this.month = typeof month === 'string' ? parseInt(month, 10) : month;
    this.year = typeof year === 'string' ? parseInt(year, 10) : year;
    this.historicalSchedules = (historicalSchedules || []).filter(Boolean);
    this.loadMinisterAvailability();
    this.analyzeHistoricalSchedules();
  }

  private loadMinisterAvailability() {
    console.log(`\n[INTELLIGENT_GENERATOR] 📊 Loading ${this.ministersData.length} ministers...`);

    this.ministers = this.ministersData
      .filter(m => m.status === 'active')
      .map(minister => {
        // 🔧 FIX: Corrigir mapeamento de campos (suportar snake_case e camelCase)
        const response = this.responsesData.find(r =>
          r.userId === minister.id || r.user_id === minister.id
        );

        let availability: ParsedAvailability;

        if (response) {
          // 🔧 PRIORITY FIX: Use processed fields from table FIRST, then parse JSON if needed
          //    The table already has dailyMassAvailability, preferredMassTimes processed correctly

          // Start with parsed data from JSON
          const responsesData = typeof response.responses === 'string'
            ? JSON.parse(response.responses)
            : response.responses;

          availability = QuestionnaireParser.parseMinisterAvailability(
            responsesData,
            this.month,
            this.year
          );

          // 🔥 OVERRIDE with processed weekday data from table if available
          if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
            // Map Portuguese day names to English keys
            response.dailyMassAvailability.forEach((day: string) => {
              const dayLower = day.toLowerCase();
              if (dayLower.includes('segunda')) availability.weekdays.monday = true;
              if (dayLower.includes('terça') || dayLower.includes('terca')) availability.weekdays.tuesday = true;
              if (dayLower.includes('quarta')) availability.weekdays.wednesday = true;
              if (dayLower.includes('quinta')) availability.weekdays.thursday = true;
              if (dayLower.includes('sexta')) availability.weekdays.friday = true;
            });
          }

          // 🔥 Use canSubstitute from table if available
          if (response.canSubstitute !== undefined && response.canSubstitute !== null) {
            availability.canSubstitute = response.canSubstitute;
          }

          console.log(`[AVAILABILITY] ✅ ${minister.name}:`, {
            sundays: Object.keys(availability.masses).length,
            weekdays: Object.values(availability.weekdays).filter(v => v).length,
            canSubstitute: availability.canSubstitute
          });
        } else {
          console.log(`[AVAILABILITY] ⚠️  ${minister.name} - Sem resposta`);
          availability = {
            masses: {},
            weekdays: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false },
            specialEvents: {},
            canSubstitute: false
          };
        }

        return {
          id: minister.id,
          name: minister.name,
          preferredPosition: minister.preferredPosition || minister.preferred_position,
          preferredPositions: Array.isArray(minister.preferredPositions || minister.preferred_positions)
            ? (minister.preferredPositions || minister.preferred_positions)
            : [],
          avoidPositions: Array.isArray(minister.avoidPositions || minister.avoid_positions)
            ? (minister.avoidPositions || minister.avoid_positions)
            : [],
          availability,
          assignmentCount: 0,
          familyId: minister.familyId || minister.family_id
        };
      });

    const withAvailability = this.ministers.filter(m =>
      Object.keys(m.availability.masses).length > 0 ||
      Object.values(m.availability.weekdays).some(v => v)
    );

    console.log(`[INTELLIGENT_GENERATOR] 📋 Summary:`);
    console.log(`  - Total active ministers: ${this.ministers.length}`);
    console.log(`  - With availability data: ${withAvailability.length}`);
    console.log(`  - With weekday availability: ${this.ministers.filter(m => Object.values(m.availability.weekdays).some(v => v)).length}`);
  }

  private analyzeHistoricalSchedules() {
    if (this.historicalSchedules.length === 0) {
      console.log('[INTELLIGENT_GENERATOR] ℹ️  No historical schedules provided. Skipping generative learning phase.');
      return;
    }

    const sorted = [...this.historicalSchedules].sort((a, b) => {
      const getComparableDate = (snapshot: HistoricalScheduleSnapshot) => {
        if (snapshot.publishedAt) return new Date(snapshot.publishedAt).getTime();
        if (snapshot.assignments.length > 0) {
          const dates = snapshot.assignments
            .map(assignment => new Date(`${assignment.date}T00:00:00Z`).getTime())
            .filter(time => !Number.isNaN(time));
          return dates.length > 0 ? Math.max(...dates) : 0;
        }
        return 0;
      };
      return getComparableDate(b) - getComparableDate(a);
    }).slice(0, 3);

    const recencyWeights = [1, 0.6, 0.3];
    const recencyBoosts = [0.12, 0.08, 0.04];

    sorted.forEach((snapshot, index) => {
      const weight = recencyWeights[index] ?? 0.2;
      const recencyBoost = recencyBoosts[index] ?? 0.02;

      snapshot.assignments.forEach(assignment => {
        if (!assignment.ministerId || assignment.ministerId === 'VACANT') {
          return;
        }

        const ministerId = assignment.ministerId;
        const profile = this.getOrCreateLearningProfile(ministerId);

        profile.weightedAssignments += weight;
        profile.totalAssignments += 1;
        profile.recencyBoost = Math.max(profile.recencyBoost, recencyBoost);

        const massKey = this.getMassKey({
          date: assignment.date,
          time: assignment.time
        });

        const currentPositionWeight = profile.positionWeights.get(assignment.position) ?? 0;
        profile.positionWeights.set(assignment.position, currentPositionWeight + weight);

        const currentMassWeight = profile.massWeights.get(massKey) ?? 0;
        profile.massWeights.set(massKey, currentMassWeight + weight);

        if (!profile.lastDates.includes(assignment.date)) {
          profile.lastDates.push(assignment.date);
        }

        const lookupKey = `${massKey}|${assignment.position}`;
        if (!this.historicalAssignmentLookup.has(lookupKey)) {
          this.historicalAssignmentLookup.set(lookupKey, ministerId);
        }
      });
    });

    console.log(`[INTELLIGENT_GENERATOR] 🧠 Learned historical preferences for ${this.ministerLearningProfiles.size} ministers`);
  }

  private getOrCreateLearningProfile(ministerId: string): MinisterLearningProfile {
    if (!this.ministerLearningProfiles.has(ministerId)) {
      this.ministerLearningProfiles.set(ministerId, {
        weightedAssignments: 0,
        totalAssignments: 0,
        positionWeights: new Map(),
        massWeights: new Map(),
        recencyBoost: 0,
        lastDates: []
      });
    }

    return this.ministerLearningProfiles.get(ministerId)!;
  }

  getLastHistoricalAlignment() {
    return this.lastHistoricalAlignment;
  }

  private getMassKey(mass: Pick<MassInfo, 'date' | 'time'>): string {
    return `${mass.date}_${mass.time}`;
  }

  private getHistoricalAlignmentScore(minister: MinisterWithAvailability, positions: number[], mass: MassInfo): number {
    if (!minister.id) {
      return 0;
    }

    const profile = this.ministerLearningProfiles.get(minister.id);
    if (!profile || profile.weightedAssignments === 0) {
      return 0;
    }

    const massKey = this.getMassKey(mass);
    const massWeight = profile.massWeights.get(massKey) ?? 0;
    let bestPositionWeight = 0;

    positions.forEach(position => {
      const positionWeight = profile.positionWeights.get(position) ?? 0;
      if (positionWeight > bestPositionWeight) {
        bestPositionWeight = positionWeight;
      }
    });

    const normalizedPositionScore = bestPositionWeight / profile.weightedAssignments;
    const normalizedMassScore = massWeight / profile.weightedAssignments;

    const score = (normalizedPositionScore * 0.65) + (normalizedMassScore * 0.25) + profile.recencyBoost;
    return Number.isFinite(score) ? score : 0;
  }

  generateSchedule(): Map<string, Assignment[]> {
    console.log(`\n[INTELLIGENT_GENERATOR] 🚀 Starting schedule generation for ${this.month}/${this.year}...`);

    const schedule = new Map<string, Assignment[]>();
    const masses = this.getMassesForMonth();

    console.log(`[INTELLIGENT_GENERATOR] 📅 Total masses to schedule: ${masses.length}`);

    // Sort masses by priority (special events first)
    masses.sort((a, b) => {
      if (a.date === '2025-10-28') return -1; // St. Jude feast highest priority
      if (b.date === '2025-10-28') return 1;
      if (a.isSpecial && !b.isSpecial) return -1;
      if (!a.isSpecial && b.isSpecial) return 1;
      return 0;
    });

    for (const mass of masses) {
      const assignments = this.assignMinistersToMass(mass);
      const key = `${mass.date}_${mass.time}`;
      schedule.set(key, assignments);

      const assignedCount = assignments.filter(a => a.ministerId !== 'VACANT').length;
      console.log(`[SCHEDULE] ${key}: ${assignedCount}/${assignments.length} positions filled`);
    }

    this.evaluateScheduleAgainstHistory(schedule);

    console.log(`\n[INTELLIGENT_GENERATOR] ✅ Schedule generation complete!`);
    return schedule;
  }

  private assignMinistersToMass(mass: MassInfo): Assignment[] {
    const assignments: Assignment[] = [];
    const requiredPositions = this.getRequiredPositions(mass);

    console.log(`\n[ASSIGN] 📍 ${mass.date} ${mass.time} - Need ${requiredPositions.length} ministers`);

    // Get available ministers for this mass
    let availableMinisters = this.getAvailableMinisters(mass);

    console.log(`[ASSIGN] 👥 Available: ${availableMinisters.length} ministers`);

    // CRITICAL: Special handling for October 28
    if (mass.date === '2025-10-28' && availableMinisters.length < requiredPositions.length) {
      console.warn(`[ASSIGN] ⚠️  Low availability for St. Jude feast ${mass.time}`);
      // Include ministers who can substitute
      const substitutes = this.ministers.filter(m =>
        m.availability.canSubstitute &&
        m.assignmentCount < this.maxAssignmentsPerMonth &&
        !availableMinisters.find(am => am.id === m.id)
      );
      console.log(`[ASSIGN] 🆘 Adding ${substitutes.length} substitute ministers`);
      availableMinisters.push(...substitutes);
    }

    // Sort by preferred position and assignment count
    availableMinisters.sort((a, b) => {
      // First priority: ministers with preferred positions array matching needed positions
      const aHasNewPreferred = requiredPositions.some(pos =>
        Array.isArray(a.preferredPositions) && a.preferredPositions.includes(pos)
      );
      const bHasNewPreferred = requiredPositions.some(pos =>
        Array.isArray(b.preferredPositions) && b.preferredPositions.includes(pos)
      );
      if (aHasNewPreferred && !bHasNewPreferred) return -1;
      if (!aHasNewPreferred && bHasNewPreferred) return 1;

      // Second priority (generative): historical alignment score
      const aHistoricalScore = this.getHistoricalAlignmentScore(a, requiredPositions, mass);
      const bHistoricalScore = this.getHistoricalAlignmentScore(b, requiredPositions, mass);
      if (aHistoricalScore !== bHistoricalScore) {
        return bHistoricalScore - aHistoricalScore;
      }

      // Second priority: ministers with preferred positions matching needed positions (legacy field)
      const aHasPreferred = requiredPositions.includes(a.preferredPosition || 0);
      const bHasPreferred = requiredPositions.includes(b.preferredPosition || 0);
      if (aHasPreferred && !bHasPreferred) return -1;
      if (!aHasPreferred && bHasPreferred) return 1;

      // Third priority: fewer assignments (fairness)
      if (a.assignmentCount !== b.assignmentCount) {
        return a.assignmentCount - b.assignmentCount;
      }

      // Fourth priority: by preferred position number
      return (a.preferredPosition || 999) - (b.preferredPosition || 999);
    });

    // Assign ministers to positions
    const assignedMinisters = new Set<string>();
    const familiesAssigned = new Set<string>();

    for (const position of requiredPositions) {
      // Find best minister for this position
      // Try 1: Find minister with this position in preferredPositions (highest priority)
      let minister = availableMinisters.find(m => {
        if (assignedMinisters.has(m.id)) return false;
        if (m.familyId && familiesAssigned.has(m.familyId)) {
          const familyPreference = this.getFamilyPreference(m.familyId);
          if (!familyPreference.preferServeTogether) return false;
        }
        return Array.isArray(m.preferredPositions) && m.preferredPositions.includes(position);
      });

      // Try 2: Find minister with matching preferred position (legacy field)
      if (!minister) {
        minister = availableMinisters.find(m => {
          if (assignedMinisters.has(m.id)) return false;
          if (m.familyId && familiesAssigned.has(m.familyId)) {
            const familyPreference = this.getFamilyPreference(m.familyId);
            if (!familyPreference.preferServeTogether) return false;
          }
          return m.preferredPosition === position;
        });
      }

      // Try 3: Find any available minister WITHOUT this position in avoidPositions
      if (!minister) {
        minister = availableMinisters.find(m => {
          if (assignedMinisters.has(m.id)) return false;
          if (m.familyId && familiesAssigned.has(m.familyId)) {
            const familyPreference = this.getFamilyPreference(m.familyId);
            if (!familyPreference.preferServeTogether) return false;
          }
          // Skip if minister has this position in avoidPositions
          if (Array.isArray(m.avoidPositions) && m.avoidPositions.includes(position)) {
            return false;
          }
          return true;
        });
      }

      // Try 4: Last resort - even if position is in avoidPositions
      if (!minister) {
        minister = availableMinisters.find(m => {
          if (assignedMinisters.has(m.id)) return false;
          if (m.familyId && familiesAssigned.has(m.familyId)) {
            const familyPreference = this.getFamilyPreference(m.familyId);
            if (!familyPreference.preferServeTogether) return false;
          }
          return true;
        });
      }

      if (minister) {
        assignments.push({
          ministerId: minister.id,
          ministerName: minister.name,
          position,
          confirmed: true
        });

        assignedMinisters.add(minister.id);
        if (minister.familyId) {
          familiesAssigned.add(minister.familyId);
        }
        minister.assignmentCount++;
      } else {
        // No minister available for this position
        assignments.push({
          ministerId: 'VACANT',
          ministerName: 'VACANT',
          position,
          confirmed: false
        });
      }
    }

    console.log(`[ASSIGN] ✅ Assigned ${assignedMinisters.size} ministers, ${requiredPositions.length - assignedMinisters.size} vacant`);

    return assignments;
  }

  private getAvailableMinisters(mass: MassInfo): MinisterWithAvailability[] {
    const available = this.ministers.filter(minister => {
      // Check assignment limit
      if (minister.assignmentCount >= this.maxAssignmentsPerMonth) {
        return false;
      }

      // Check availability for specific date and time
      if (mass.date && mass.time) {
        const dayAvailability = minister.availability.masses[mass.date];
        if (dayAvailability && dayAvailability[mass.time] === true) {
          console.log(`[CHECK] ✅ ${minister.name} available for ${mass.date} ${mass.time} (Sunday)`);
          return true;
        }
      }

      // Check weekday availability
      if (mass.dayOfWeek && mass.time === '06:30') {
        const weekdayMap: Record<number, keyof typeof minister.availability.weekdays> = {
          1: 'monday',
          2: 'tuesday',
          3: 'wednesday',
          4: 'thursday',
          5: 'friday'
        };
        const weekday = weekdayMap[mass.dayOfWeek];
        if (weekday && minister.availability.weekdays[weekday]) {
          console.log(`[CHECK] ✅ ${minister.name} available for ${weekday} 06:30 (Weekday)`);
          return true;
        }
      }

      // Check special events
      if (mass.isSpecial) {
        if (mass.type === 'finados' && minister.availability.specialEvents.finados) {
          console.log(`[CHECK] ✅ ${minister.name} available for finados`);
          return true;
        }
        if (mass.type === 'first_thursday' && minister.availability.specialEvents.first_thursday) {
          console.log(`[CHECK] ✅ ${minister.name} available for first_thursday`);
          return true;
        }
        if (mass.type === 'first_friday' && minister.availability.specialEvents.first_friday) {
          console.log(`[CHECK] ✅ ${minister.name} available for first_friday`);
          return true;
        }
        if (mass.type === 'first_saturday' && minister.availability.specialEvents.first_saturday) {
          console.log(`[CHECK] ✅ ${minister.name} available for first_saturday`);
          return true;
        }
      }

      return false;
    });

    return available;
  }

  private evaluateScheduleAgainstHistory(schedule: Map<string, Assignment[]>) {
    if (this.historicalAssignmentLookup.size === 0) {
      this.lastHistoricalAlignment = undefined;
      console.log('[INTELLIGENT_GENERATOR] ℹ️  No overlapping historical data to compare against.');
      return;
    }

    let totalComparable = 0;
    let matches = 0;

    schedule.forEach((assignments, massKey) => {
      assignments.forEach(assignment => {
        const lookupKey = `${massKey}|${assignment.position}`;
        if (this.historicalAssignmentLookup.has(lookupKey)) {
          totalComparable++;
          if (this.historicalAssignmentLookup.get(lookupKey) === assignment.ministerId) {
            matches++;
          }
        }
      });
    });

    const matchRate = totalComparable > 0 ? matches / totalComparable : 0;
    this.lastHistoricalAlignment = {
      total: totalComparable,
      matches,
      matchRate
    };

    if (totalComparable > 0) {
      console.log(`[INTELLIGENT_GENERATOR] 🤖 Historical alignment rate: ${(matchRate * 100).toFixed(1)}% (${matches}/${totalComparable})`);
    } else {
      console.log('[INTELLIGENT_GENERATOR] ℹ️  Historical data provided but none matched current mass/time combinations.');
    }
  }

  private getRequiredPositions(mass: MassInfo): number[] {
    // Position requirements based on mass type and time
    const positionMap: Record<string, number[]> = {
      // Sunday masses
      'sunday_08:00': Array.from({length: 15}, (_, i) => i + 1),
      'sunday_10:00': Array.from({length: 20}, (_, i) => i + 1),
      'sunday_19:00': Array.from({length: 20}, (_, i) => i + 1),

      // Daily masses
      'weekday_06:30': [1, 2, 3, 4, 5],

      // Special masses
      'first_thursday': Array.from({length: 28}, (_, i) => i + 1),
      'first_friday': Array.from({length: 10}, (_, i) => i + 1),
      'first_saturday': Array.from({length: 10}, (_, i) => i + 1),

      // St. Jude feast
      'feast_07:00': Array.from({length: 8}, (_, i) => i + 1),
      'feast_10:00': Array.from({length: 10}, (_, i) => i + 1),
      'feast_12:00': Array.from({length: 10}, (_, i) => i + 1),
      'feast_15:00': Array.from({length: 8}, (_, i) => i + 1),
      'feast_17:00': Array.from({length: 8}, (_, i) => i + 1),
      'feast_19:30': Array.from({length: 15}, (_, i) => i + 1),

      // Finados (All Souls' Day)
      'finados_15:30': Array.from({length: 10}, (_, i) => i + 1),
    };

    // Determine key for position lookup
    let key = '';
    if (mass.date === '2025-10-28') {
      key = `feast_${mass.time}`;
    } else if (mass.date === '2025-11-02' && mass.time === '15:30') {
      key = 'finados_15:30';
    } else if (mass.dayOfWeek === 0) {
      key = `sunday_${mass.time}`;
    } else if (mass.isSpecial) {
      key = mass.type || 'weekday_06:30';
    } else {
      key = 'weekday_06:30';
    }

    return positionMap[key] || [1, 2, 3, 4, 5];
  }

  private getFamilyPreference(familyId: string): any {
    // Query family_relationships table for preference
    // Default to serving together
    return { preferServeTogether: true };
  }

  private getMassesForMonth(): MassInfo[] {
    // Generate all masses for the month
    const masses: MassInfo[] = [];

    // TODO: Query from massTimesConfig table
    // For now, hardcode October 2025 and November 2025 schedules

    if (this.month === 11 && this.year === 2025) {
      // Finados (All Souls' Day) - November 2, 2025 at 15:30 (Cemetery)
      masses.push({
        date: '2025-11-02',
        time: '15:30',
        dayOfWeek: 0, // Sunday
        isSpecial: true,
        type: 'finados'
      });

      // Sundays
      const sundays = [
        { date: '2025-11-02', dayOfWeek: 0 },
        { date: '2025-11-09', dayOfWeek: 0 },
        { date: '2025-11-16', dayOfWeek: 0 },
        { date: '2025-11-23', dayOfWeek: 0 },
        { date: '2025-11-30', dayOfWeek: 0 }
      ];

      sundays.forEach(sunday => {
        // Skip regular masses on Nov 2 at 15:30 since we have Finados
        if (sunday.date !== '2025-11-02') {
          masses.push(
            { ...sunday, time: '08:00', isSpecial: false },
            { ...sunday, time: '10:00', isSpecial: false },
            { ...sunday, time: '19:00', isSpecial: false }
          );
        } else {
          // Nov 2 has only morning masses (Finados is at 15:30)
          masses.push(
            { ...sunday, time: '08:00', isSpecial: false },
            { ...sunday, time: '10:00', isSpecial: false }
          );
        }
      });

      // Weekday masses (Monday-Friday at 06:30)
      for (let day = 1; day <= 30; day++) {
        const date = new Date(2025, 10, day); // November = month 10
        const dayOfWeek = date.getDay();

        // Skip Sundays
        if (dayOfWeek === 0) continue;

        // Monday-Friday
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = `2025-11-${day.toString().padStart(2, '0')}`;
          masses.push({
            date: dateStr,
            time: '06:30',
            dayOfWeek,
            isSpecial: false
          });
        }
      }
    } else if (this.month === 10 && this.year === 2025) {
      // St. Jude feast day (October 28)
      masses.push(
        { date: '2025-10-28', time: '07:00', dayOfWeek: 2, isSpecial: true, type: 'feast' },
        { date: '2025-10-28', time: '10:00', dayOfWeek: 2, isSpecial: true, type: 'feast' },
        { date: '2025-10-28', time: '12:00', dayOfWeek: 2, isSpecial: true, type: 'feast' },
        { date: '2025-10-28', time: '15:00', dayOfWeek: 2, isSpecial: true, type: 'feast' },
        { date: '2025-10-28', time: '17:00', dayOfWeek: 2, isSpecial: true, type: 'feast' },
        { date: '2025-10-28', time: '19:30', dayOfWeek: 2, isSpecial: true, type: 'feast' }
      );

      // Sundays
      const sundays = [
        { date: '2025-10-05', dayOfWeek: 0 },
        { date: '2025-10-12', dayOfWeek: 0 },
        { date: '2025-10-19', dayOfWeek: 0 },
        { date: '2025-10-26', dayOfWeek: 0 }
      ];

      sundays.forEach(sunday => {
        masses.push(
          { ...sunday, time: '08:00', isSpecial: false },
          { ...sunday, time: '10:00', isSpecial: false },
          { ...sunday, time: '19:00', isSpecial: false }
        );
      });

      // Weekday masses (Monday-Friday at 06:30)
      for (let day = 1; day <= 31; day++) {
        const date = new Date(2025, 9, day); // October = month 9
        const dayOfWeek = date.getDay();

        // Skip Sundays and October 28 (special day)
        if (dayOfWeek === 0 || day === 28) continue;

        // Monday-Friday
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = `2025-10-${day.toString().padStart(2, '0')}`;
          masses.push({
            date: dateStr,
            time: '06:30',
            dayOfWeek,
            isSpecial: false
          });
        }
      }
    }

    return masses;
  }
}
