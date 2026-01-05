import { logger } from './logger.js';
import { users, schedules, massTimesConfig, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { format, addDays, startOfMonth, endOfMonth, getDay, isSunday } from 'date-fns';
import { ResponseCompiler } from '../services/responseCompiler';
import { AvailabilityService } from '../services/availabilityService';
import type { CompiledAvailability, ParsedCustomQuestion } from '../services/responseCompiler';

/**
 * SCHEDULE GENERATOR V2.0
 *
 * Refactored version using ResponseCompiler and AvailabilityService.
 * Cleaner separation of concerns and easier to maintain.
 *
 * 🔧 FIX 2026-01: Now supports custom questions (custom_*) by parsing date/time from questionnaire
 */

export interface Minister {
  id: string;
  name: string;
  role: string;
  totalServices: number;
  lastService: Date | null;
  preferredPosition?: number;
  familyId?: string | null;
  canSubstitute: boolean;
  // Runtime tracking
  monthlyAssignmentCount: number;
  lastAssignedDate?: string;
}

export interface MassTime {
  id: string;
  date: string;
  dayOfWeek: number;
  time: string;
  type?: string;
  minMinisters: number;
  maxMinisters: number;
}

export interface GeneratedSchedule {
  massTime: MassTime;
  ministers: Minister[];
  backupMinisters: Minister[];
  confidence: number;
}

export class ScheduleGeneratorV2 {
  private db: any;
  private availabilityService!: AvailabilityService;
  private ministers: Minister[] = [];
  private massTimes: MassTime[] = [];
  private compiledData!: Map<string, CompiledAvailability>;

  // 🔧 FIX: Custom questions from questionnaire (for special masses)
  private customQuestions: ParsedCustomQuestion[] = [];

  // Runtime tracking
  private monthlyAssignments: Map<string, number> = new Map(); // ministerId -> count
  private dailyAssignments: Map<string, Set<string>> = new Map(); // date -> Set<ministerId>

  constructor(
    private month: number,
    private year: number
  ) {}

  /**
   * Initialize services and load data
   */
  async initialize() {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== 🚀 SCHEDULE GENERATOR V2.0 ===`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Month: ${this.month}, Year: ${this.year}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // 1. Initialize database
    console.time('[PERF] Database initialization');
    const { db } = await import('../db.js');
    this.db = db;
    console.timeEnd('[PERF] Database initialization');

    // 2. Compile questionnaire responses
    console.log(`\n[STEP 1] 📚 Compiling questionnaire responses...`);
    console.time('[PERF] Compile responses');
    this.compiledData = await ResponseCompiler.compileMonthlyResponses(this.month, this.year);
    console.timeEnd('[PERF] Compile responses');

    if (this.compiledData.size === 0) {
      throw new Error(`❌ No questionnaire responses found for ${this.month}/${this.year}`);
    }

    // 3. Create availability service
    console.log(`\n[STEP 2] 📋 Creating availability service...`);
    this.availabilityService = new AvailabilityService(this.compiledData);

    console.log(`✅ Availability service ready with ${this.compiledData.size} responses`);

    // 4. Load ministers
    console.log(`\n[STEP 3] 👥 Loading ministers...`);
    console.time('[PERF] Load ministers');
    await this.loadMinisters();
    console.timeEnd('[PERF] Load ministers');

    // 5. Load mass times configuration
    console.log(`\n[STEP 4] ⛪ Loading mass times configuration...`);
    console.time('[PERF] Load mass config');
    await this.loadMassTimesConfig();
    console.timeEnd('[PERF] Load mass config');

    // 🔧 FIX: Load custom questions from questionnaire (for special masses)
    console.log(`\n[STEP 5] 📌 Loading custom questions from questionnaire...`);
    console.time('[PERF] Load custom questions');
    await this.loadCustomQuestions();
    console.timeEnd('[PERF] Load custom questions');

    console.log(`\n✅ Initialization complete in ${Date.now() - startTime}ms\n`);
  }

  /**
   * 🔧 FIX: Load ALL questions with date/time from questionnaire
   *
   * Parses ANY question that contains date and time in the text
   * Works with ANY category: custom, special_event, special, etc.
   * Works with ANY ID format: custom_*, special_event_*, etc.
   */
  private async loadCustomQuestions(): Promise<void> {
    try {
      const questionnaireResult = await this.db.select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.month, this.month),
            eq(questionnaires.year, this.year)
          )
        )
        .limit(1);

      if (questionnaireResult.length === 0) {
        console.log(`   ⚠️  No questionnaire found for ${this.month}/${this.year}`);
        return;
      }

      const questions = questionnaireResult[0].questions;
      if (!questions || !Array.isArray(questions)) {
        return;
      }

      // Categories that may contain specific date/time questions
      const relevantCategories = ['custom', 'special_event', 'special'];

      for (const q of questions) {
        const category = q.category || '';

        // Skip regular/daily categories - they don't have specific dates
        if (category === 'regular' || category === 'daily') {
          continue;
        }

        // Process if it's a relevant category OR if ID suggests it's special
        const isRelevantCategory = relevantCategories.includes(category);
        const isSpecialId = q.id?.startsWith('custom_') || q.id?.startsWith('special_event');

        if (!isRelevantCategory && !isSpecialId) {
          continue;
        }

        const questionText = q.question || '';

        // Extract date: "dia 28/01/2026" or "28/01/2026" or "28/01"
        const dateMatch = questionText.match(/(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i);

        // Extract time: "às 7h", "às 15h", "às 19h30", "ás 15h"
        const timeMatch = questionText.match(/(?:às|as|ás)\s*(\d{1,2})(?:h|:)(\d{0,2})?/i);

        if (dateMatch && timeMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const extractedYear = dateMatch[3] || this.year.toString();

          const hour = timeMatch[1].padStart(2, '0');
          const minute = (timeMatch[2] || '00').padStart(2, '0');

          this.customQuestions.push({
            id: q.id,
            question: questionText,
            date: `${extractedYear}-${month}-${day}`,
            time: `${hour}:${minute}`,
            category: category
          });
        }
      }

      if (this.customQuestions.length > 0) {
        console.log(`   ✅ Found ${this.customQuestions.length} questions with special masses:`);
        this.customQuestions.forEach(cq => {
          console.log(`      - ${cq.date} às ${cq.time} (${cq.category})`);
        });
      } else {
        console.log(`   ℹ️  No questions with date/time found`);
      }
    } catch (error) {
      console.error(`   ❌ Error loading custom questions:`, error);
    }
  }

  /**
   * Generate schedule for the month
   */
  async generateSchedule(): Promise<GeneratedSchedule[]> {
    console.log(`\n[GENERATION] 🎯 Starting schedule generation...`);

    // 1. Generate monthly mass times
    console.time('[PERF] Generate monthly masses');
    const masses = this.generateMonthlyMassTimes();
    console.timeEnd('[PERF] Generate monthly masses');

    console.log(`[GENERATION] Generated ${masses.length} masses for ${this.month}/${this.year}`);

    // 2. Generate schedule for each mass
    console.time('[PERF] Assign ministers');
    const generatedSchedules: GeneratedSchedule[] = [];

    for (const mass of masses) {
      const schedule = this.generateScheduleForMass(mass);
      generatedSchedules.push(schedule);
    }
    console.timeEnd('[PERF] Assign ministers');

    // 3. Report statistics
    this.reportStatistics(generatedSchedules);

    return generatedSchedules;
  }

  // ===== DATA LOADING =====

  /**
   * Load ministers from database
   */
  private async loadMinisters(): Promise<void> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.role, 'ministro'));

    this.ministers = result.map((user: any) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      totalServices: user.totalServices || 0,
      lastService: user.lastService,
      preferredPosition: user.preferredPosition,
      familyId: user.familyId,
      canSubstitute: this.compiledData.get(user.id)?.metadata.canSubstitute || false,
      monthlyAssignmentCount: 0,
      lastAssignedDate: undefined
    }));

    console.log(`✅ Loaded ${this.ministers.length} ministers`);
  }

  /**
   * Load mass times configuration
   */
  private async loadMassTimesConfig(): Promise<void> {
    const result = await this.db
      .select()
      .from(massTimesConfig)
      .where(eq(massTimesConfig.isActive, true));

    this.massTimes = result.map((config: any) => ({
      id: config.id,
      dayOfWeek: config.dayOfWeek,
      time: config.time,
      minMinisters: config.minMinisters || 3,
      maxMinisters: config.maxMinisters || 6,
      type: config.specialEvent ? config.eventName : 'regular',
      date: '' // Will be set when generating monthly masses
    }));

    console.log(`✅ Loaded ${this.massTimes.length} mass time configurations`);
  }

  // ===== MASS TIME GENERATION =====

  /**
   * Generate all masses for the month
   */
  private generateMonthlyMassTimes(): MassTime[] {
    const masses: MassTime[] = [];
    const start = startOfMonth(new Date(this.year, this.month - 1, 1));
    const end = endOfMonth(start);

    let currentDate = start;

    while (currentDate <= end) {
      const dayOfWeek = getDay(currentDate);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Find mass configs for this day of week
      const dayConfigs = this.massTimes.filter(mt => mt.dayOfWeek === dayOfWeek);

      for (const config of dayConfigs) {
        masses.push({
          ...config,
          date: dateStr,
          id: `${dateStr}_${config.time}`
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    // Add special masses for October (São Judas) - LEGACY SUPPORT
    if (this.month === 10 && this.year === 2025) {
      masses.push(...this.generateOctoberSpecialMasses());
    }

    // 🔧 FIX: Add special masses from custom questions (dynamic)
    masses.push(...this.generateCustomMasses());

    // Remove duplicates (same date + time)
    const uniqueMasses = this.deduplicateMasses(masses);

    return uniqueMasses.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }

  /**
   * 🔧 FIX: Generate special masses from custom questions
   *
   * Creates mass entries for each custom question with date/time
   */
  private generateCustomMasses(): MassTime[] {
    const masses: MassTime[] = [];

    for (const customQ of this.customQuestions) {
      const existingMass = masses.find(m => m.date === customQ.date && m.time === customQ.time);

      if (!existingMass) {
        const date = new Date(customQ.date + 'T12:00:00');
        const dayOfWeek = date.getDay();

        masses.push({
          id: `${customQ.date}_${customQ.time}`,
          date: customQ.date,
          dayOfWeek,
          time: customQ.time,
          type: 'custom_special',  // Mark as custom special mass
          minMinisters: 6,   // Default for special masses
          maxMinisters: 12   // Can adjust based on event type
        });

        console.log(`   📌 Added custom mass: ${customQ.date} às ${customQ.time}`);
      }
    }

    if (masses.length > 0) {
      console.log(`   ✅ Generated ${masses.length} custom special masses`);
    }

    return masses;
  }

  /**
   * 🔧 FIX: Remove duplicate masses (same date + time)
   */
  private deduplicateMasses(masses: MassTime[]): MassTime[] {
    const seen = new Map<string, MassTime>();

    for (const mass of masses) {
      const key = `${mass.date}_${mass.time}`;

      // If we already have this mass, prefer the custom one (more specific)
      if (!seen.has(key) || mass.type === 'custom_special') {
        seen.set(key, mass);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate special masses for October (São Judas)
   */
  private generateOctoberSpecialMasses(): MassTime[] {
    const masses: MassTime[] = [];

    // Novena (19-27/10)
    for (let day = 19; day <= 27; day++) {
      if (day === 25) continue; // Skip 25th (already has regular mass)

      masses.push({
        id: `2025-10-${day.toString().padStart(2, '0')}_19:30`,
        date: `${this.year}-10-${day.toString().padStart(2, '0')}`,
        dayOfWeek: getDay(new Date(this.year, 9, day)),
        time: '19:30',
        type: 'novena_sao_judas',
        minMinisters: 3,
        maxMinisters: 6
      });
    }

    // Feast day (28/10) - 🔥 CORRECTED: 26-30 ministers per mass
    const feastTimes = ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'];
    for (const time of feastTimes) {
      masses.push({
        id: `2025-10-28_${time}`,
        date: `${this.year}-10-28`,
        dayOfWeek: getDay(new Date(this.year, 9, 28)),
        time,
        type: 'festa_sao_judas',
        minMinisters: 26,  // ✅ CORRECTED
        maxMinisters: 30   // ✅ CORRECTED
      });
    }

    return masses;
  }

  // ===== MINISTER ASSIGNMENT =====

  /**
   * Generate schedule for a single mass
   *
   * NOTE: Removed daily assignment restriction - ministers can serve multiple times per day
   */
  private generateScheduleForMass(mass: MassTime): GeneratedSchedule {
    console.log(`\n[MASS] 📅 ${mass.date} ${mass.time} (${mass.type || 'regular'})`);

    // 1. Get available ministers using AvailabilityService
    const availableIds = this.availabilityService.getAvailableMinistersForMass(
      mass.date,
      mass.time
    );

    console.log(`  Available: ${availableIds.length} ministers`);

    // 2. Filter to get full minister objects
    const availableMinisters = this.ministers.filter(m => availableIds.includes(m.id));

    // 3. REMOVED: Daily assignment filter - allow multiple masses per day
    // const alreadyAssigned = this.dailyAssignments.get(mass.date) || new Set();
    // const candidates = availableMinisters.filter(m => !alreadyAssigned.has(m.id));
    const candidates = availableMinisters; // All available are candidates

    console.log(`  Candidates: ${candidates.length}`);

    // 4. Select optimal ministers
    const selected = this.selectOptimalMinisters(candidates, mass);

    // 5. Select backup ministers
    const backupCandidates = candidates.filter(m => !selected.find(s => s.id === m.id));
    const backup = this.selectBackupMinisters(backupCandidates, 2);

    // 6. Track assignments
    for (const minister of selected) {
      this.trackAssignment(minister.id, mass.date);
    }

    // 7. Calculate confidence
    const confidence = this.calculateConfidence(selected, mass);

    console.log(`  Selected: ${selected.length}/${mass.minMinisters} required`);
    console.log(`  Confidence: ${Math.round(confidence * 100)}%`);

    return {
      massTime: mass,
      ministers: selected,
      backupMinisters: backup,
      confidence
    };
  }

  /**
   * Select optimal ministers using scoring algorithm
   */
  private selectOptimalMinisters(candidates: Minister[], mass: MassTime): Minister[] {
    const required = mass.minMinisters;
    const max = mass.maxMinisters;

    // Score each candidate
    const scored = candidates.map(minister => ({
      minister,
      score: this.calculateMinisterScore(minister, mass)
    }));

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    // Select top N ministers
    const selected = scored.slice(0, Math.min(max, scored.length)).map(s => s.minister);

    return selected;
  }

  /**
   * Calculate minister score for assignment
   *
   * NOTE: Removed hard limits - coordinator validates manually:
   * - No max assignments per month (was 4)
   * - No consecutive day restrictions
   * - Ministers can serve as much as they indicate availability
   */
  private calculateMinisterScore(minister: Minister, mass: MassTime): number {
    let score = 100; // Base score

    // 1. Soft workload balancing (prefer even distribution, but don't block)
    const assignments = this.monthlyAssignments.get(minister.id) || 0;
    // Gentle penalty - prefers less assigned, but doesn't block heavily assigned
    score -= assignments * 5; // Changed from 20 to 5, removed hard limit

    // 2. Removed recency penalty - allow same-day assignments
    // Coordinator will validate if it's appropriate

    // 3. Position preference bonus
    if (minister.preferredPosition !== undefined) {
      score += 15;
    }

    // 4. Experience bonus
    score += Math.min(minister.totalServices * 0.5, 20);

    return score;
  }

  /**
   * Select backup ministers
   */
  private selectBackupMinisters(candidates: Minister[], count: number): Minister[] {
    // Prefer substitutes
    const substitutes = candidates.filter(m => m.canSubstitute);

    return substitutes.slice(0, count);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(selected: Minister[], mass: MassTime): number {
    if (selected.length === 0) return 0;

    let confidence = 0;

    // 1. Coverage (50% weight)
    const coverageRatio = selected.length / mass.minMinisters;
    confidence += Math.min(coverageRatio, 1.0) * 0.5;

    // 2. Experience (30% weight)
    const avgExperience = selected.reduce((sum, m) => sum + m.totalServices, 0) / selected.length;
    const experienceScore = Math.min(avgExperience / 50, 1.0);
    confidence += experienceScore * 0.3;

    // 3. Diversity (20% weight)
    const diversityScore = selected.length >= mass.minMinisters ? 1.0 : 0.5;
    confidence += diversityScore * 0.2;

    return confidence;
  }

  // ===== TRACKING =====

  /**
   * Track minister assignment
   */
  private trackAssignment(ministerId: string, date: string): void {
    // Track monthly count
    const currentCount = this.monthlyAssignments.get(ministerId) || 0;
    this.monthlyAssignments.set(ministerId, currentCount + 1);

    // Track daily assignments
    if (!this.dailyAssignments.has(date)) {
      this.dailyAssignments.set(date, new Set());
    }
    this.dailyAssignments.get(date)!.add(ministerId);

    // Update minister object
    const minister = this.ministers.find(m => m.id === ministerId);
    if (minister) {
      minister.monthlyAssignmentCount = currentCount + 1;
      minister.lastAssignedDate = date;
    }
  }

  // ===== UTILITIES =====

  /**
   * Get days between two dates
   */
  private getDaysDifference(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Report generation statistics
   */
  private reportStatistics(schedules: GeneratedSchedule[]): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== 📊 GENERATION STATISTICS ===`);
    console.log(`${'='.repeat(60)}`);

    const totalMasses = schedules.length;
    const complete = schedules.filter(s => s.ministers.length >= s.massTime.minMinisters).length;
    const incomplete = totalMasses - complete;
    const avgConfidence = schedules.reduce((sum, s) => sum + s.confidence, 0) / totalMasses;

    console.log(`Total masses: ${totalMasses}`);
    console.log(`Complete: ${complete} (${Math.round(complete / totalMasses * 100)}%)`);
    console.log(`Incomplete: ${incomplete}`);
    console.log(`Average confidence: ${Math.round(avgConfidence * 100)}%`);

    // Minister workload
    console.log(`\n=== 👥 MINISTER WORKLOAD ===`);
    const workload = Array.from(this.monthlyAssignments.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [ministerId, count] of workload) {
      const minister = this.ministers.find(m => m.id === ministerId);
      console.log(`${minister?.name}: ${count} assignments`);
    }

    // Incomplete masses
    if (incomplete > 0) {
      console.log(`\n=== ⚠️  INCOMPLETE MASSES ===`);
      schedules
        .filter(s => s.ministers.length < s.massTime.minMinisters)
        .forEach(s => {
          const shortage = s.massTime.minMinisters - s.ministers.length;
          console.log(`${s.massTime.date} ${s.massTime.time}: ${s.ministers.length}/${s.massTime.minMinisters} (${shortage} missing)`);
        });
    }

    console.log(`\n${'='.repeat(60)}\n`);
  }

  /**
   * Get monthly statistics
   */
  getMonthlyStats() {
    return this.availabilityService.getMonthlyStats();
  }
}
