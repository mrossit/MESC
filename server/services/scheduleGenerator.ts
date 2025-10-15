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

export class IntelligentScheduleGenerator {
  private ministers: MinisterWithAvailability[] = [];
  private maxAssignmentsPerMonth = 25;

  constructor(
    private month: number,
    private year: number,
    private ministersData: any[],
    private responsesData: any[]
  ) {
    this.loadMinisterAvailability();
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
      // First priority: ministers with preferred positions matching needed positions
      const aHasPreferred = requiredPositions.includes(a.preferredPosition || 0);
      const bHasPreferred = requiredPositions.includes(b.preferredPosition || 0);
      if (aHasPreferred && !bHasPreferred) return -1;
      if (!aHasPreferred && bHasPreferred) return 1;

      // Second priority: fewer assignments (fairness)
      if (a.assignmentCount !== b.assignmentCount) {
        return a.assignmentCount - b.assignmentCount;
      }

      // Third priority: by preferred position number
      return (a.preferredPosition || 999) - (b.preferredPosition || 999);
    });

    // Assign ministers to positions
    const assignedMinisters = new Set<string>();
    const familiesAssigned = new Set<string>();

    for (const position of requiredPositions) {
      // Find best minister for this position
      const minister = availableMinisters.find(m => {
        // Skip if already assigned
        if (assignedMinisters.has(m.id)) return false;

        // Skip if family already assigned (unless they prefer to serve together)
        if (m.familyId && familiesAssigned.has(m.familyId)) {
          const familyPreference = this.getFamilyPreference(m.familyId);
          if (!familyPreference.preferServeTogether) return false;
        }

        // Prefer ministers with matching preferred position
        if (m.preferredPosition === position) return true;

        // Otherwise, any available minister
        return true;
      });

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
    };

    // Determine key for position lookup
    let key = '';
    if (mass.date === '2025-10-28') {
      key = `feast_${mass.time}`;
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
    // For now, hardcode October 2025 schedule

    if (this.month === 10 && this.year === 2025) {
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
