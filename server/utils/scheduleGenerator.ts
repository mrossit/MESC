import { logger } from './logger.js';
import { users, questionnaireResponses, questionnaires, schedules, massTimesConfig, families, adorationDrawResults, adorationDraws } from '@shared/schema';
import { eq, and, or, gte, lte, desc, sql, ne, count, inArray } from 'drizzle-orm';
import { format, addDays, startOfMonth, endOfMonth, getDay, getDate, isSaturday, isFriday, isThursday, isSunday, isMonday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateSaintNameMatchBonus, loadAllSaintsData } from './saintNameMatching.js';
import { isAvailableForMass } from './ministerAvailabilityChecker.js';

// Question types from questionnaires
interface QuestionnaireQuestionItem {
  id: string;
  question: string;
  category?: string;
  type?: string;
  options?: unknown[];
}

export interface Minister {
  id: string | null; // null = VACANTE
  name: string;
  role: string;
  totalServices: number;
  lastService: Date | null;
  preferredTimes: string[];
  canServeAsCouple: boolean;
  spouseMinisterId: string | null;
  familyId: string | null; // Family group ID
  availabilityScore: number;
  preferenceScore: number;
  position?: number; // Posição litúrgica atribuída
  // Position preferences
  preferredPositions?: number[]; // Array de posições preferidas [1, 2, 3]
  avoidPositions?: number[]; // Array de posições a evitar [4, 5]
  // 🤖 ADAPTIVE LEARNING: Reliability metrics
  reliabilityScore?: number; // 0-100 based on behavior (substitutions, no-shows, etc)
  substitutionRequestCount?: number;
  substitutionFulfilledCount?: number;
  manualRemovalCount?: number;
  noShowCount?: number;
  // 🔥 FAIR ALGORITHM: Track monthly assignments
  monthlyAssignmentCount?: number; // Assignments in current month (max 4)
  lastAssignedDate?: string; // Last date this minister was assigned (YYYY-MM-DD)
  // V2.0 questionnaire response data
  questionnaireResponse?: {
    responses: unknown;
  };
  // Incomplete schedule tracking
  scheduleIncomplete?: boolean;
  requiredCount?: number;
  actualCount?: number;
}

export interface AvailabilityData {
  ministerId: string;
  availableSundays: string[];
  preferredMassTimes: string[];
  alternativeTimes: string[];
  canSubstitute: boolean;
  dailyMassAvailability: string[];
  weekdayMasses?: string[];
  specialEvents?: Record<string, string | boolean | number>;
}

export interface MassTime {
  id: string;
  dayOfWeek: number; // 0=domingo, 1=segunda, etc
  time: string;
  minMinisters: number;
  maxMinisters: number;
  date?: string; // Para missas específicas
  type?: string; // Tipo da missa (missa_diaria, missa_dominical, etc)
  location?: string; // Local da missa (para missas especiais)
  description?: string; // Descrição adicional
}

export interface GeneratedSchedule {
  massTime: MassTime;
  ministers: Minister[];
  backupMinisters: Minister[];
  confidence: number; // 0-1 score de confiança na escalação
}

// Type for saints data
interface SaintInfo {
  name: string;
  date: string;
  rank?: string;
}

// Type for v2.0 questionnaire responses
interface V2QuestionnaireData {
  format_version: '2.0';
  masses: Record<string, Record<string, boolean | string | number>>;
  weekdays?: unknown;
  special_events?: Record<string, boolean>;
  alternative_times?: string[];
  can_substitute?: boolean;
  availability?: Record<string, unknown>;
  [key: string]: unknown; // Allow dynamic legacy keys
}

// Type guard for v2.0 questionnaire data
function isV2QuestionnaireData(data: unknown): data is V2QuestionnaireData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'format_version' in data &&
    (data as V2QuestionnaireData).format_version === '2.0'
  );
}

export class ScheduleGenerator {
  private ministers: Minister[] = [];
  private availabilityData: Map<string, AvailabilityData> = new Map();
  private massTimes: MassTime[] = [];
  private db: typeof import('../db').db;
  private dailyAssignments: Map<string, Set<string>> = new Map(); // Rastrear ministros já escalados por dia
  private saintBonusCache: Map<string, number> = new Map(); // Cache de bônus de santo: "ministerId:date" -> score
  private saintsData: Map<string, SaintInfo[]> | null = null; // Cache de santos: "MM-DD" -> saints[]
  private familyGroups: Map<string, string[]> = new Map(); // Family ID -> list of minister IDs
  private familyPreferences: Map<string, boolean> = new Map(); // Family ID -> prefer_serve_together

  /**
   * Gera escalas automaticamente para um mês específico
   */
  async generateScheduleForMonth(year: number, month: number, isPreview: boolean = false): Promise<GeneratedSchedule[]> {
    // 🔥 EMERGENCY PERFORMANCE FIX: Track exact milliseconds
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== 🚀 GENERATION START ===`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Month: ${month}, Year: ${year}, IsPreview: ${isPreview}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
    console.log(`${'='.repeat(60)}\n`);

    // 🔥 PERFORMANCE: Start total timing
    console.time('[PERF] Total generation time');
    console.time('[PERF] Database initialization');

    // Importar db dinamicamente para garantir que está inicializado
    const { db } = await import('../db.js');
    this.db = db;
    console.timeEnd('[PERF] Database initialization');
    console.log(`✅ Database initialized in ${Date.now() - startTime}ms`);

    // 🔧 CORREÇÃO: Limpar assignments diários e cache de santos para nova geração
    this.dailyAssignments = new Map();
    this.saintBonusCache = new Map();

    logger.info(`Iniciando geração ${isPreview ? 'de preview' : 'definitiva'} de escalas para ${month}/${year}`);

    try {
      // 1. Carregar dados necessários
      console.time('[PERF] Step 1: Load ministers');
      console.log(`\n[STEP 1] 📋 Loading ministers data...`);
      await this.loadMinistersData();
      console.timeEnd('[PERF] Step 1: Load ministers');

      // 🔥 DATA VALIDATION: Check if ministers were loaded
      console.log(`\n[VALIDATION] Ministers loaded:`, {
        count: this.ministers.length,
        hasData: this.ministers.length > 0,
        sample: this.ministers.slice(0, 3).map(m => ({ id: m.id, name: m.name, role: m.role }))
      });

      if (!this.ministers || this.ministers.length === 0) {
        const error = new Error('❌ CRITICAL: No ministers found in database! Cannot generate schedules without ministers.');
        console.error(`\n${'!'.repeat(60)}`);
        console.error(error.message);
        console.error(`${'!'.repeat(60)}\n`);
        throw error;
      }

      console.time('[PERF] Step 2: Load availability');
      console.log(`\n[STEP 2] 📝 Loading availability/questionnaire data for ${month}/${year}...`);
      await this.loadAvailabilityData(year, month, isPreview);
      console.timeEnd('[PERF] Step 2: Load availability');

      // 🔥 DATA VALIDATION: Check if questionnaire responses were loaded
      console.log(`\n[VALIDATION] Questionnaire responses loaded:`, {
        count: this.availabilityData.size,
        hasData: this.availabilityData.size > 0,
        ministerIds: Array.from(this.availabilityData.keys()).slice(0, 5)
      });

      if (!this.availabilityData || this.availabilityData.size === 0) {
        const warning = `⚠️  WARNING: No questionnaire responses found for ${month}/${year}! Schedules will use default availability.`;
        console.warn(`\n${warning}`);
        if (!isPreview) {
          const error = new Error(`❌ CRITICAL: No questionnaire responses for ${month}/${year}. Cannot generate final schedules without responses!`);
          console.error(`\n${'!'.repeat(60)}`);
          console.error(error.message);
          console.error(`${'!'.repeat(60)}\n`);
          throw error;
        }
      }

      console.time('[PERF] Step 3: Load mass times config');
      console.log(`\n[STEP 3] ⛪ Loading mass times configuration...`);
      await this.loadMassTimesConfig();
      console.timeEnd('[PERF] Step 3: Load mass times config');

      // 🔥 DATA VALIDATION: Check if mass config was loaded
      console.log(`\n[VALIDATION] Mass times config:`, {
        count: this.massTimes.length,
        hasData: this.massTimes.length > 0,
        sample: this.massTimes.slice(0, 2)
      });

      if (!this.massTimes || this.massTimes.length === 0) {
        const error = new Error('❌ CRITICAL: No mass times configuration found! Cannot generate schedules without mass config.');
        console.error(`\n${'!'.repeat(60)}`);
        console.error(error.message);
        console.error(`${'!'.repeat(60)}\n`);
        throw error;
      }

      // 2. Gerar horários de missa para o mês
      console.time('[PERF] Generate monthly mass times');
      console.log(`\n[STEP 4] 📅 Generating monthly mass times for ${month}/${year}...`);
      const monthlyMassTimes = await this.generateMonthlyMassTimes(year, month);
      console.timeEnd('[PERF] Generate monthly mass times');

      // 🔥 DATA VALIDATION: Check if monthly masses were generated
      console.log(`\n[VALIDATION] Monthly masses generated:`, {
        count: monthlyMassTimes.length,
        types: [...new Set(monthlyMassTimes.map(m => m.type))],
        dateRange: monthlyMassTimes.length > 0 ? {
          first: monthlyMassTimes[0]?.date,
          last: monthlyMassTimes[monthlyMassTimes.length - 1]?.date
        } : null
      });

      if (!monthlyMassTimes || monthlyMassTimes.length === 0) {
        const error = new Error(`❌ CRITICAL: Failed to generate monthly mass times for ${month}/${year}!`);
        console.error(`\n${'!'.repeat(60)}`);
        console.error(error.message);
        console.error(`${'!'.repeat(60)}\n`);
        throw error;
      }

      // 2.5. Load ALL saints data ONCE (crucial performance optimization) - OPTIONAL
      console.time('[PERF] Load all saints data');
      try {
        this.saintsData = await loadAllSaintsData();
        console.log(`[SCHEDULE_GEN] ✅ Saints data loaded successfully`);
      } catch (error) {
        console.log(`[SCHEDULE_GEN] ⚠️ Saints table not found, skipping saint name bonuses`);
        this.saintsData = null;
      }
      console.timeEnd('[PERF] Load all saints data');

      // 2.6. Pré-calcular bônus de santos para todas as combinações ministro-data
      if (this.saintsData) {
        console.time('[PERF] Pre-calculate saint bonuses');
        console.log(`[SCHEDULE_GEN] Step 2.6: Pre-calculating saint name bonuses...`);
        await this.preCalculateSaintBonuses(monthlyMassTimes);
        console.timeEnd('[PERF] Pre-calculate saint bonuses');
        console.log(`[SCHEDULE_GEN] Saint bonuses calculated: ${this.saintBonusCache.size} entries`);
      } else {
        console.log(`[SCHEDULE_GEN] Skipping saint bonuses (saints table not available)`);
      }

      // 3. Executar algoritmo de distribuição
      console.time('[PERF] Algorithm distribution');
      const generatedSchedules: GeneratedSchedule[] = [];

      for (const massTime of monthlyMassTimes) {
        const schedule = await this.generateScheduleForMass(massTime);
        generatedSchedules.push(schedule);
      }
      console.timeEnd('[PERF] Algorithm distribution');

      // 4. Analisar e reportar escalas incompletas
      console.time('[PERF] Analyze incomplete schedules');
      const incompleteSchedules = generatedSchedules.filter(s =>
        s.ministers.length < s.massTime.minMinisters
      );
      console.timeEnd('[PERF] Analyze incomplete schedules');

      if (incompleteSchedules.length > 0) {
        console.log(`\n[SCHEDULE_GEN] ⚠️ ATENÇÃO: ${incompleteSchedules.length} escalas incompletas detectadas:`);
        console.log(`[SCHEDULE_GEN] =========================================================`);

        incompleteSchedules.forEach(s => {
          const shortage = s.massTime.minMinisters - s.ministers.length;
          console.log(`[SCHEDULE_GEN] 🚨 ${s.massTime.date} ${s.massTime.time} (${s.massTime.type})`);
          console.log(`[SCHEDULE_GEN]    Ministros: ${s.ministers.length}/${s.massTime.minMinisters} (faltam ${shortage})`);
          console.log(`[SCHEDULE_GEN]    Confiança: ${(s.confidence * 100).toFixed(0)}%`);
        });

        // Resumo por tipo de missa
        const byType = incompleteSchedules.reduce((acc, s) => {
          const type = s.massTime.type || 'outros';
          if (!acc[type]) acc[type] = { count: 0, totalShortage: 0 };
          acc[type].count++;
          acc[type].totalShortage += s.massTime.minMinisters - s.ministers.length;
          return acc;
        }, {} as Record<string, { count: number; totalShortage: number }>);

        console.log(`\n[SCHEDULE_GEN] 📊 RESUMO POR TIPO DE MISSA:`);
        Object.entries(byType).forEach(([type, data]) => {
          console.log(`[SCHEDULE_GEN]    ${type}: ${data.count} escalas incompletas, faltam ${data.totalShortage} ministros no total`);
        });

        console.log(`[SCHEDULE_GEN] =========================================================\n`);
        logger.warn(`${incompleteSchedules.length} escalas incompletas detectadas para ${month}/${year}`);
      } else {
        console.log(`[SCHEDULE_GEN] ✅ Todas as escalas atingiram o número mínimo de ministros!`);
      }

      console.timeEnd('[PERF] Total generation time');

      // 🔥 EMERGENCY PERFORMANCE FIX: Final timing report
      const totalTime = Date.now() - startTime;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`=== ✅ GENERATION SUCCESS ===`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Month/Year: ${month}/${year}`);
      console.log(`Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`Target: <5000ms | Status: ${totalTime < 5000 ? '✅ PASS' : '⚠️  SLOW'}`);
      console.log(`\n📊 DATA SUMMARY:`);
      console.log(`  Ministers loaded: ${this.ministers.length}`);
      console.log(`  Questionnaire responses: ${this.availabilityData.size}`);
      console.log(`  Mass times config: ${this.massTimes.length}`);
      console.log(`  Monthly masses generated: ${monthlyMassTimes?.length || 0}`);
      console.log(`  Schedules generated: ${generatedSchedules.length}`);
      console.log(`  Incomplete schedules: ${incompleteSchedules?.length || 0}`);
      console.log(`  Saint bonuses calculated: ${this.saintBonusCache.size}`);

      // 🔥 FAIR ALGORITHM: Final fairness report
      console.log(`\n🎯 FAIRNESS REPORT:`);
      const distributionMap = new Map<number, Minister[]>();
      this.ministers.forEach(m => {
        const count = m.monthlyAssignmentCount || 0;
        if (!distributionMap.has(count)) {
          distributionMap.set(count, []);
        }
        distributionMap.get(count)!.push(m);
      });

      console.log(`  Assignment Distribution:`);
      for (let i = 0; i <= 4; i++) {
        const ministersWithCount = distributionMap.get(i) || [];
        const percentage = ((ministersWithCount.length / this.ministers.length) * 100).toFixed(1);
        console.log(`    ${i} assignments: ${ministersWithCount.length} ministers (${percentage}%)`);
      }

      const unused = distributionMap.get(0) || [];
      const maxUsed = distributionMap.get(4) || [];
      const fairnessScore = ((this.ministers.length - unused.length) / this.ministers.length * 100).toFixed(1);

      console.log(`\n  Fairness Metrics:`);
      console.log(`    ✅ Unused ministers: ${unused.length}/${this.ministers.length} (${((unused.length / this.ministers.length) * 100).toFixed(1)}%)`);
      console.log(`    ✅ Ministers at max (4): ${maxUsed.length}/${this.ministers.length}`);
      console.log(`    ✅ Fairness score: ${fairnessScore}% (${100 - unused.length / this.ministers.length * 100 > 70 ? 'PASS' : 'FAIL'})`);

      // Check critical bugs
      const bugsFound: string[] = [];
      // 🔥 NOTA: Ministros PODEM servir mais de 4 vezes se forem para missas diárias!
      // Quando marcam disponibilidade para dias da semana, servem em TODOS aqueles dias.
      const ministersOver4 = this.ministers.filter(m => (m.monthlyAssignmentCount || 0) > 4);
      if (ministersOver4.length > 0) {
        console.log(`\n  📊 Ministers with 5+ assignments (mostly daily masses):`);
        console.log(`    ℹ️  ${ministersOver4.length} ministers served 5+ times (expected for daily mass volunteers)`);
      }

      if (unused.length > this.ministers.length * 0.5) {
        bugsFound.push(`❌ More than 50% unused (${unused.length}/${this.ministers.length})`);
      }

      if (bugsFound.length > 0) {
        console.log(`\n  🚨 POTENTIAL ISSUES:`);
        bugsFound.forEach(bug => console.log(`    ${bug}`));
      } else {
        console.log(`\n  ✅ NO CRITICAL ISSUES DETECTED!`);
      }

      console.log(`${'='.repeat(60)}\n`);

      logger.info(`Geradas ${generatedSchedules.length} escalas para ${month}/${year} em ${totalTime}ms`);
      return generatedSchedules;

    } catch (error) {
      const totalTime = Date.now() - startTime;

      console.log(`\n${'!'.repeat(60)}`);
      console.log(`=== ❌ GENERATION FAILED ===`);
      console.log(`${'!'.repeat(60)}`);
      console.log(`Month/Year: ${month}/${year}`);
      console.log(`Failed After: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`\n🔍 ERROR DETAILS:`);
      console.log(`  Type: ${typeof error}`);
      console.log(`  Name: ${error instanceof Error ? error.name : 'Unknown'}`);
      console.log(`  Message: ${error instanceof Error ? error.message : 'No message'}`);
      console.log(`\n📊 DATA STATE WHEN FAILED:`);
      console.log(`  Ministers loaded: ${this.ministers?.length || 0}`);
      console.log(`  Questionnaire responses: ${this.availabilityData?.size || 0}`);
      console.log(`  Mass times config: ${this.massTimes?.length || 0}`);
      console.log(`\n📚 STACK TRACE:`);
      console.log(error instanceof Error ? error.stack : 'No stack trace available');
      console.log(`${'!'.repeat(60)}\n`);

      console.timeEnd('[PERF] Total generation time');
      logger.error('Erro ao gerar escalas automáticas:', error);

      // Re-lançar o erro original sem modificar para preservar stack trace e mensagem
      throw error;
    }
  }

  /**
   * Carrega dados dos ministros do banco
   */
  private async loadMinistersData(): Promise<void> {
    if (!this.db) {
      const isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.REPLIT_DEPLOYMENT === '1' ||
                       (!!process.env.REPL_SLUG && !process.env.DATABASE_URL);
      
      if (isProduction) {
        throw new Error('Banco de dados indisponível. Não é possível gerar escalas sem dados reais dos ministros.');
      }
      
      logger.warn('Database não disponível, criando dados mock para preview em desenvolvimento');
      console.log('[SCHEDULE_GEN] Creating mock ministers data for development preview only');

      // Dados mock APENAS para desenvolvimento quando banco não estiver disponível
      this.ministers = [
        { id: '1', name: 'João Silva', role: 'ministro', totalServices: 5, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, familyId: null, availabilityScore: 0.8, preferenceScore: 0.7, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '2', name: 'Maria Santos', role: 'ministro', totalServices: 3, lastService: null, preferredTimes: ['08:00'], canServeAsCouple: false, spouseMinisterId: null, familyId: null, availabilityScore: 0.9, preferenceScore: 0.8, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '3', name: 'Pedro Costa', role: 'ministro', totalServices: 4, lastService: null, preferredTimes: ['19:00'], canServeAsCouple: false, spouseMinisterId: null, familyId: null, availabilityScore: 0.7, preferenceScore: 0.6, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '4', name: 'Ana Lima', role: 'ministro', totalServices: 2, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, familyId: null, availabilityScore: 0.85, preferenceScore: 0.75, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '5', name: 'Carlos Oliveira', role: 'coordenador', totalServices: 6, lastService: null, preferredTimes: ['08:00', '10:00'], canServeAsCouple: false, spouseMinisterId: null, familyId: null, availabilityScore: 0.95, preferenceScore: 0.9, monthlyAssignmentCount: 0, lastAssignedDate: undefined }
      ];
      return;
    }

    console.log(`[SCHEDULE_GEN] About to query ministers data...`);
    
    let ministersData;
    try {
      // Tentar primeira query mais simples para debug
      console.log(`[SCHEDULE_GEN] Tentando query simples first...`);
      const simpleQuery = await this.db.select({ id: users.id, name: users.name }).from(users).limit(1);
      console.log(`[SCHEDULE_GEN] Simple query OK, found ${simpleQuery.length} users`);
      
      // Agora a query completa
      ministersData = await this.db.select({
        id: users.id,
        name: users.name,
        role: users.role,
        totalServices: users.totalServices,
        lastService: users.lastService,
        preferredTimes: users.preferredTimes,
        canServeAsCouple: users.canServeAsCouple,
        spouseMinisterId: users.spouseMinisterId,
        familyId: users.familyId,
        preferredPositions: users.preferredPositions,
        avoidPositions: users.avoidPositions,
        reliabilityScore: users.reliabilityScore,
        substitutionRequestCount: users.substitutionRequestCount,
        substitutionFulfilledCount: users.substitutionFulfilledCount,
        manualRemovalCount: users.manualRemovalCount,
        noShowCount: users.noShowCount
      }).from(users).where(
        and(
          or(
            eq(users.status, 'active'),
            sql`${users.status} IS NULL` // Incluir usuários com status null
          ),
          ne(users.role, 'gestor') // Excluir gestores das escalas
        )
      );
      
      console.log(`[SCHEDULE_GEN] Query successful, found ${ministersData.length} ministers`);
      
    } catch (queryError: unknown) {
      console.error(`[SCHEDULE_GEN] ❌ QUERY ERROR:`, queryError);
      const errorStack = queryError instanceof Error ? queryError.stack : undefined;
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
      console.error(`[SCHEDULE_GEN] ❌ QUERY ERROR STACK:`, errorStack);
      throw new Error(`Erro na consulta de ministros: ${errorMessage}`);
    }

    type MinisterRow = typeof ministersData[number];
    this.ministers = ministersData.map((m: MinisterRow) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        totalServices: m.totalServices || 0,
        lastService: m.lastService,
        preferredTimes: (m.preferredTimes as string[]) || [],
        canServeAsCouple: m.canServeAsCouple || false,
        spouseMinisterId: m.spouseMinisterId,
        familyId: m.familyId || null,
        preferredPositions: (m.preferredPositions as number[]) || [],
        avoidPositions: (m.avoidPositions as number[]) || [],
        reliabilityScore: m.reliabilityScore ?? undefined,
        substitutionRequestCount: m.substitutionRequestCount ?? undefined,
        substitutionFulfilledCount: m.substitutionFulfilledCount ?? undefined,
        manualRemovalCount: m.manualRemovalCount ?? undefined,
        noShowCount: m.noShowCount ?? undefined,
        availabilityScore: this.calculateAvailabilityScore(m),
        preferenceScore: this.calculatePreferenceScore(m),
        // 🔥 FAIR ALGORITHM: Initialize monthly counters
        monthlyAssignmentCount: 0,
        lastAssignedDate: undefined
      }));

    // Load family groups
    await this.loadFamilyData();

    console.log(`[FAIR_ALGORITHM] ✅ Initialized ${this.ministers.length} ministers with monthlyAssignmentCount = 0`);
    logger.info(`Carregados ${this.ministers.length} ministros ativos`);
  }

  /**
   * 👨‍👩‍👧‍👦 FAMILY SYSTEM: Load family relationships and preferences
   *
   * Groups ministers by family and loads their preferences.
   * When preferServeTogether is true (default), families are assigned to serve together.
   * When preferServeTogether is false, family members can serve on different days.
   */
  private async loadFamilyData(): Promise<void> {
    this.familyGroups.clear();
    this.familyPreferences.clear();

    // Group ministers by family_id
    for (const minister of this.ministers) {
      if (minister.familyId) {
        if (!this.familyGroups.has(minister.familyId)) {
          this.familyGroups.set(minister.familyId, []);
        }
        this.familyGroups.get(minister.familyId)!.push(minister.id!);
      }
    }

    // Load family preferences from database
    const uniqueFamilyIds = Array.from(this.familyGroups.keys());
    if (uniqueFamilyIds.length > 0) {
      const familiesData = await this.db
        .select({
          id: families.id,
          name: families.name,
          preferServeTogether: families.preferServeTogether,
        })
        .from(families)
        .where(inArray(families.id, uniqueFamilyIds));

      for (const family of familiesData) {
        this.familyPreferences.set(family.id, family.preferServeTogether ?? true);
      }
    }

    const familyCount = this.familyGroups.size;
    const membersCount = Array.from(this.familyGroups.values()).reduce((sum, members) => sum + members.length, 0);

    console.log(`[FAMILY_SYSTEM] ✅ Loaded ${familyCount} families with ${membersCount} total members`);

    // Log family details
    for (const [familyId, memberIds] of this.familyGroups.entries()) {
      const memberNames = memberIds
        .map(id => this.ministers.find(m => m.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      const preferTogether = this.familyPreferences.get(familyId) ?? true;
      const preferenceText = preferTogether ? '(prefer together)' : '(prefer separate)';
      console.log(`[FAMILY_SYSTEM] Family ${familyId.substring(0, 8)}: ${memberNames} ${preferenceText}`);
    }
  }

  /**
   * 🔄 COMPATIBILITY LAYER: Adapter for October 2025 questionnaire format
   *
   * October 2025 uses array format: [{questionId: "...", answer: "..."}]
   * Future questionnaires will use different formats
   *
   * This adapter reads the existing October data WITHOUT modifying the database
   */
  private adaptQuestionnaireResponse(
    response: { userId: string; responses: unknown; availableSundays?: unknown; preferredMassTimes?: unknown },
    questionnaireYear: number,
    questionnaireMonth: number
  ): {
    availableSundays: string[];
    preferredMassTimes: string[];
    alternativeTimes: string[];
    dailyMassAvailability: string[];
    canSubstitute: boolean;
    specialEvents: Record<string, boolean | string | string[]>;
    weekdayMasses: string[];
  } {
    console.log(`[COMPATIBILITY_LAYER] Adapting response for ${questionnaireMonth}/${questionnaireYear}`);

    // Default empty structure
    let availableSundays: string[] = [];
    let preferredMassTimes: string[] = [];
    let alternativeTimes: string[] = [];
    let dailyMassAvailability: string[] = [];
    let canSubstitute = false;
    let specialEvents: Record<string, boolean | string | string[]> = {};
    const weekdayMasses: string[] = [];

    // 🎯 VERSION DETECTION: Check for v2.0 format FIRST (works for Oct 2025 onwards)
    let responsesData = response.responses;
    if (typeof responsesData === 'string') {
      try {
        responsesData = JSON.parse(responsesData);
      } catch (parseError) {
        console.error(`[COMPATIBILITY_LAYER] ❌ Failed to parse responses JSON for user ${response.userId}:`, parseError);
        responsesData = null;
      }
    }

    // Handle v2.0 format (available from Oct/2025 onwards, but may appear in later months/years)
    if (isV2QuestionnaireData(responsesData)) {
      console.log(`[COMPATIBILITY_LAYER] 🎯 Processing v2.0 STANDARDIZED format for ${questionnaireMonth}/${questionnaireYear}`);

      try {
        const data = responsesData;

        // Parse Sunday masses from masses object: { '2025-10-05': { '10:00': true } }
        const sundayDates: string[] = [];
        const masses = data.masses || {};
        const normalizeTimeValue = (time: string): string => {
          if (!time) return time;
          if (/^\d{1,2}:\d{2}$/.test(time)) {
            const [hours, minutes] = time.split(':');
            return `${hours.padStart(2, '0')}:${minutes}`;
          }
          if (/^\d{1,2}h/.test(time)) {
            const [hours, minutesPart] = time.split('h');
            const hoursPad = hours.padStart(2, '0');
            const minutes = minutesPart ? minutesPart.padStart(2, '0') : '00';
            return `${hoursPad}:${minutes}`;
          }
          return time;
        };

        Object.entries(masses).forEach(([date, times]) => {
          if (times && typeof times === 'object') {
            Object.entries(times as Record<string, unknown>).forEach(([time, available]) => {
              const isAvailable = available === true || available === 'Sim' || available === 'sim' || available === 'true' || available === 1;
              if (!isAvailable) return;

              const normalizedTime = normalizeTimeValue(time);
              const dateTimeKey = `${date} ${normalizedTime}`;
              const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

              if (dayOfWeek === 0) {
                sundayDates.push(dateTimeKey);
              } else {
                weekdayMasses.push(dateTimeKey);
              }
            });
          }
        });
        availableSundays = sundayDates;

        // Extract preferred times from masses (most common times)
        const timeCount: Record<string, number> = {};
        Object.values(masses).forEach((timesForDate) => {
          if (timesForDate && typeof timesForDate === 'object') {
            Object.entries(timesForDate as Record<string, unknown>).forEach(([time, available]) => {
              if (available === true || available === 'Sim' || available === 'sim' || available === 'true' || available === 1) {
                timeCount[time] = (timeCount[time] || 0) + 1;
              }
            });
          }
        });
        preferredMassTimes = Object.keys(timeCount).sort((a, b) => timeCount[b] - timeCount[a]);

        // Parse weekday availability
        const weekdayAvailabilitySet = new Set<string>();
        const addWeekdayAvailability = (identifier: string | null | undefined) => {
          if (!identifier) return;
          const normalized = identifier
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          const map: Record<string, string> = {
            'mon': 'Segunda',
            'monday': 'Segunda',
            'segunda': 'Segunda',
            'segunda-feira': 'Segunda',
            'seg': 'Segunda',
            'tue': 'Terça',
            'tuesday': 'Terça',
            'terca': 'Terça',
            'terça': 'Terça',
            'terca-feira': 'Terça',
            'terça-feira': 'Terça',
            'ter': 'Terça',
            'wed': 'Quarta',
            'wednesday': 'Quarta',
            'quarta': 'Quarta',
            'quarta-feira': 'Quarta',
            'qua': 'Quarta',
            'thu': 'Quinta',
            'thursday': 'Quinta',
            'quinta': 'Quinta',
            'quinta-feira': 'Quinta',
            'qui': 'Quinta',
            'fri': 'Sexta',
            'friday': 'Sexta',
            'sexta': 'Sexta',
            'sexta-feira': 'Sexta',
            'sex': 'Sexta',
            'sat': 'Sábado',
            'saturday': 'Sábado',
            'sabado': 'Sábado',
            'sábado': 'Sábado',
            'sab': 'Sábado'
          };

          if (map[normalized]) {
            weekdayAvailabilitySet.add(map[normalized]);
            return;
          }

          // Identificadores como "all", "todos", etc.
          if (['all', 'todos', 'todas', 'weekdays', 'all_weekdays', 'todos_os_dias'].includes(normalized)) {
            ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].forEach(label => weekdayAvailabilitySet.add(label));
          }
        };

        const processWeekdayStructure = (value: unknown, keyHint?: string): void => {
          if (Array.isArray(value)) {
            value.forEach(entry => addWeekdayAvailability(entry as string | null | undefined));
            return;
          }

          if (typeof value === 'boolean') {
            if (value === true && keyHint) addWeekdayAvailability(keyHint);
            return;
          }

          if (typeof value === 'string') {
            const normalizedValue = value.trim().toLowerCase();
            if (['true', 'sim', 'yes', '1'].includes(normalizedValue)) {
              if (keyHint) {
                addWeekdayAvailability(keyHint);
              }
            } else {
              addWeekdayAvailability(value);
            }
            return;
          }

          if (value && typeof value === 'object') {
            const valueObj = value as Record<string, unknown>;
            if (Array.isArray(valueObj.selectedOptions)) {
              valueObj.selectedOptions.forEach((entry) => addWeekdayAvailability(entry as string | null | undefined));
            }
            if (Array.isArray(valueObj.options)) {
              valueObj.options.forEach((entry) => addWeekdayAvailability(entry as string | null | undefined));
            }
            Object.entries(valueObj).forEach(([nestedKey, nestedValue]) => {
              processWeekdayStructure(nestedValue, nestedKey);
            });
          }
        };

        const weekdaysData = data.weekdays;
        if (weekdaysData !== undefined && weekdaysData !== null) {
          processWeekdayStructure(weekdaysData);
        }

        const legacyWeekdayKeys = [
          'weekday_06:30',
          'weekday_6:30',
          'weekday_0630',
          'weekday0630'
        ];
        legacyWeekdayKeys.forEach(key => {
          const value = data?.[key] ?? data?.availability?.[key];
          if (value !== undefined) {
            processWeekdayStructure(value);
          }
        });

        const orderedWeekdayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        dailyMassAvailability = orderedWeekdayLabels.filter(label => weekdayAvailabilitySet.has(label));

        // 🔥 CRITICAL: Parse special events (including saint_judas_feast!)
        const specialEventsData = data.special_events || {};

        // Copy all special events to the specialEvents object
        Object.assign(specialEvents, specialEventsData);

        // Parse alternative times from v2.0 format
        if (data.alternative_times && Array.isArray(data.alternative_times)) {
          alternativeTimes = data.alternative_times;
        }

        // 🔥 FIX: Parse substitution - also consider alternative_times
        // If can_substitute is true OR has alternative_times, minister can substitute
        canSubstitute = data.can_substitute === true ||
          Boolean(data.alternative_times && Array.isArray(data.alternative_times) && data.alternative_times.length > 0);

        console.log(`[COMPATIBILITY_LAYER] ✅ v2.0 parsed: ${availableSundays.length} sunday slots, ${weekdayMasses.length} weekday slots, ${Object.keys(specialEvents).length} special events, canSubstitute=${canSubstitute}, altTimes=${alternativeTimes.length}`);
      } catch (error) {
        console.error(`[COMPATIBILITY_LAYER] ❌ Error parsing v2.0:`, error);
      }
    }
    // Handle October 2025 LEGACY array format
    else if (questionnaireMonth === 10 && questionnaireYear === 2025 && Array.isArray(responsesData)) {
      try {
        console.log(`[COMPATIBILITY_LAYER] ✅ October 2025 using LEGACY array format`);

          // Process October 2025 array format: [{questionId: "...", answer: "..."}]
          type LegacyArrayItem = {
            questionId: string;
            answer: unknown;
          };
          type AnswerWithOptions = { selectedOptions?: string[] };
          const getSelectedOptions = (answer: unknown): string[] | null => {
            if (answer && typeof answer === 'object' && 'selectedOptions' in answer) {
              const opts = (answer as AnswerWithOptions).selectedOptions;
              return Array.isArray(opts) ? opts : null;
            }
            return null;
          };
          const responsesArray = responsesData as LegacyArrayItem[];
          responsesArray.forEach((item) => {
            const answer = item.answer;
            switch(item.questionId) {
              case 'available_sundays':
                availableSundays = Array.isArray(answer) ? answer as string[] : [];
                break;
              case 'main_service_time':
                preferredMassTimes = answer ? [String(answer)] : [];
                break;
              case 'other_times_available':
                if (answer && answer !== 'Não') {
                  const selectedOpts = getSelectedOptions(answer);
                  if (selectedOpts) {
                    alternativeTimes = selectedOpts;
                  } else if (Array.isArray(answer)) {
                    alternativeTimes = answer as string[];
                  } else if (typeof answer === 'string') {
                    alternativeTimes = [answer];
                  }
                }
                break;
              case 'can_substitute':
                canSubstitute = answer === 'Sim' || answer === true;
                break;
              case 'daily_mass_availability':
                if (answer && answer !== 'Não posso' && answer !== 'Não') {
                  const selectedOpts = getSelectedOptions(answer);
                  if (selectedOpts) {
                    dailyMassAvailability = selectedOpts;
                  } else if (answer === 'Sim') {
                    dailyMassAvailability = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                  } else if (Array.isArray(answer)) {
                    dailyMassAvailability = answer as string[];
                  } else if (typeof answer === 'string') {
                    dailyMassAvailability = [answer];
                  }
                }
                break;
              // Novena de São Judas
              case 'saint_judas_novena':
                if (Array.isArray(answer)) {
                  specialEvents[item.questionId] = answer as string[];
                } else if (answer === 'Nenhum dia') {
                  specialEvents[item.questionId] = [];
                } else {
                  specialEvents[item.questionId] = answer ? [String(answer)] : [];
                }
                break;
              // Special event masses
              case 'healing_liberation_mass':
              case 'sacred_heart_mass':
              case 'immaculate_heart_mass':
              case 'saint_judas_feast_7h':
              case 'saint_judas_feast_10h':
              case 'saint_judas_feast_12h':
              case 'saint_judas_feast_15h':
              case 'saint_judas_feast_17h':
              case 'saint_judas_feast_evening':
              case 'adoration_monday':
                specialEvents[item.questionId] = answer as boolean | string | string[];
                break;
            }
          });

        console.log(`[COMPATIBILITY_LAYER] ✅ October 2025 format parsed successfully`);
        console.log(`[COMPATIBILITY_LAYER]    - Sundays: ${availableSundays.length}`);
        console.log(`[COMPATIBILITY_LAYER]    - Preferred times: ${preferredMassTimes.length}`);
        console.log(`[COMPATIBILITY_LAYER]    - Can substitute: ${canSubstitute}`);
      } catch (error) {
        console.error(`[COMPATIBILITY_LAYER] ❌ Error parsing October 2025 format:`, error);
      }
    }
    // Fallback for unknown formats
    else {
      // Unknown format
      console.log(`[COMPATIBILITY_LAYER] ⚠️ Unknown format for ${questionnaireMonth}/${questionnaireYear}`);
      console.log(`[COMPATIBILITY_LAYER] ℹ️ Add new format parser here when questionnaire structure changes`);
    }

    // Fallback to separate JSONB fields (legacy support)
    if (!availableSundays.length && response.availableSundays) {
      availableSundays = typeof response.availableSundays === 'string'
        ? JSON.parse(response.availableSundays)
        : response.availableSundays;
      console.log(`[COMPATIBILITY_LAYER] ℹ️ Used fallback availableSundays field`);
    }
    if (!preferredMassTimes.length && response.preferredMassTimes) {
      preferredMassTimes = typeof response.preferredMassTimes === 'string'
        ? JSON.parse(response.preferredMassTimes)
        : response.preferredMassTimes;
      console.log(`[COMPATIBILITY_LAYER] ℹ️ Used fallback preferredMassTimes field`);
    }

    return {
      availableSundays,
      preferredMassTimes,
      alternativeTimes,
      dailyMassAvailability,
      canSubstitute,
      specialEvents,
      weekdayMasses
    };
  }

  /**
   * Carrega dados de disponibilidade dos questionários
   */
  private async loadAvailabilityData(year: number, month: number, isPreview: boolean = false): Promise<void> {
    if (!this.db) {
      const isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.REPLIT_DEPLOYMENT === '1' ||
                       (!!process.env.REPL_SLUG && !process.env.DATABASE_URL);
      
      if (isProduction) {
        throw new Error('Banco de dados indisponível. Não é possível gerar escalas sem dados reais de disponibilidade.');
      }
      
      console.log('[SCHEDULE_GEN] Creating mock availability data for development preview only');
      logger.warn('Database não disponível, criando dados de disponibilidade mock apenas para desenvolvimento');

      // Dados mock de disponibilidade APENAS para desenvolvimento
      this.availabilityData.set('1', {
        ministerId: '1',
        availableSundays: ['1', '2', '3', '4'],
        preferredMassTimes: ['10:00'],
        alternativeTimes: ['08:00', '19:00'],
        canSubstitute: true,
        dailyMassAvailability: [],
        weekdayMasses: []
      });

      this.availabilityData.set('2', {
        ministerId: '2',
        availableSundays: ['1', '2', '4'],
        preferredMassTimes: ['08:00'],
        alternativeTimes: ['10:00'],
        canSubstitute: true,
        dailyMassAvailability: [],
        weekdayMasses: []
      });

      this.availabilityData.set('3', {
        ministerId: '3',
        availableSundays: ['2', '3', '4'],
        preferredMassTimes: ['19:00'],
        alternativeTimes: ['10:00'],
        canSubstitute: false,
        dailyMassAvailability: [],
        weekdayMasses: []
      });

      this.availabilityData.set('4', {
        ministerId: '4',
        availableSundays: ['1', '3', '4'],
        preferredMassTimes: ['10:00'],
        alternativeTimes: ['08:00', '19:00'],
        canSubstitute: true,
        dailyMassAvailability: [],
        weekdayMasses: []
      });

      this.availabilityData.set('5', {
        ministerId: '5',
        availableSundays: ['1', '2', '3', '4'],
        preferredMassTimes: ['08:00', '10:00'],
        alternativeTimes: ['19:00'],
        canSubstitute: true,
        dailyMassAvailability: [],
        weekdayMasses: []
      });

      return;
    }

    // Definir status permitidos baseado no tipo de geração
    const allowedStatuses = isPreview
      ? ['open', 'sent', 'active', 'closed'] // Preview: aceita qualquer status
      : ['closed']; // Definitivo: apenas questionários fechados

    // Primeiro buscar o questionário do período
    const [targetQuestionnaire] = await this.db.select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.month, month),
          eq(questionnaires.year, year)
        )
      )
      .limit(1);

    if (!targetQuestionnaire) {
      console.log(`[SCHEDULE_GEN] Nenhum questionário encontrado para ${month}/${year}`);
      return;
    }

    console.log(`[SCHEDULE_GEN] Questionário encontrado: ${targetQuestionnaire.title} (Status: ${targetQuestionnaire.status})`);

    // Verificar se o status é permitido
    if (!allowedStatuses.includes(targetQuestionnaire.status)) {
      console.log(`[SCHEDULE_GEN] Questionário com status ${targetQuestionnaire.status} não permitido para ${isPreview ? 'preview' : 'geração definitiva'}`);
      if (!isPreview) {
        throw new Error(`O questionário precisa estar encerrado antes de gerar a escala definitiva. Status atual: "${targetQuestionnaire.status}". Para resolver: acesse "Questionários" no menu, selecione o mês e clique no botão "Encerrar" antes de gerar a escala.`);
      }
      return;
    }

    // Buscar as respostas deste questionário
    const responses = await this.db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, targetQuestionnaire.id));

    console.log(`[SCHEDULE_GEN] 🔍 DEBUGGING: Encontradas ${responses.length} respostas no banco`);
    console.log(`[SCHEDULE_GEN] 🔄 Using COMPATIBILITY LAYER for ${year}/${month}`);

    type ResponseRow = typeof responses[number];
    responses.forEach((r: ResponseRow) => {
      // 🔄 USE COMPATIBILITY LAYER: Adapter handles all format variations
      const adapted = this.adaptQuestionnaireResponse(r, year, month);

      let availableSundays = adapted.availableSundays;
      let preferredMassTimes = adapted.preferredMassTimes;
      let alternativeTimes = adapted.alternativeTimes;
      let dailyMassAvailability = adapted.dailyMassAvailability;
      let canSubstitute = adapted.canSubstitute;
      let specialEvents = adapted.specialEvents;

      // 🔧 NORMALIZAÇÃO: Converter domingos de texto para números (1-5)
      const normalizedSundays = this.normalizeSundayFormat(availableSundays, month, year);

      // 🔧 NORMALIZAÇÃO: Padronizar horários para formato "Xh" (8h, 10h, 19h)
      const normalizedPreferredTimes = this.normalizeTimeFormat(preferredMassTimes);
      const normalizedAlternativeTimes = this.normalizeTimeFormat(alternativeTimes);

      // 🔧 NORMALIZAÇÃO: Converter booleanos em strings para eventos especiais
      const normalizedSpecialEvents = this.normalizeSpecialEvents(specialEvents);

      const processedData = {
        ministerId: r.userId,
        availableSundays: normalizedSundays,
        preferredMassTimes: normalizedPreferredTimes,
        alternativeTimes: normalizedAlternativeTimes,
        canSubstitute,
        dailyMassAvailability,
        specialEvents: normalizedSpecialEvents,
        weekdayMasses: adapted.weekdayMasses
      };

      console.log(`[SCHEDULE_GEN] 💾 DADOS PROCESSADOS para ${r.userId}:`, processedData);

      this.availabilityData.set(r.userId, processedData);

      // 🆕 ADD RAW QUESTIONNAIRE RESPONSE to minister object for v2.0 availability checking
      // ⛪ CRITICAL FIX: Also populate preferredTimes from questionnaire for Sunday prioritization
      const minister = this.ministers.find(m => m.id === r.userId);
      if (minister) {
        minister.questionnaireResponse = {
          responses: r.responses
        };
        
        // ⛪ SUNDAY PRIORITIZATION: Convert normalized times to HH:MM format for algorithm matching
        // normalized format is "8h", "10h", "19h" -> convert to "08:00", "10:00", "19:00"
        // IMPORTANT: Must match massTime.time format which is "HH:MM" (without seconds)
        if (preferredMassTimes && preferredMassTimes.length > 0) {
          minister.preferredTimes = preferredMassTimes.map(time => {
            // Extract hour from formats like "08:00", "8:00", "08h", "8h"
            const hourMatch = time.match(/^(\d{1,2})/);
            if (hourMatch) {
              const hour = parseInt(hourMatch[1]);
              return `${hour.toString().padStart(2, '0')}:00`; // Format: "08:00" without seconds
            }
            return time;
          });
          console.log(`[SUNDAY_PRIORITY] ⛪ Populated preferredTimes for ${minister.name}: ${minister.preferredTimes.join(', ')}`);
        }
      }
    });

    console.log(`[SCHEDULE_GEN] ✅ Carregadas respostas de ${responses.length} ministros no availabilityData`);
    console.log(`[SCHEDULE_GEN] 📊 AvailabilityData size: ${this.availabilityData.size}`);
    logger.info(`Carregadas respostas de ${responses.length} ministros`);
  }

  /**
   * 🔧 NORMALIZAÇÃO: Converte domingos de formato texto para números (1-5)
   * Exemplos de entrada:
   *   - "Domingo 05/10" → "1" (se 05/10 for o primeiro domingo)
   *   - "Domingo (12/10) – Missa em honra à Nossa Senhora Aparecida" → "2"
   *
   * ⚠️ IMPORTANTE: Se os dados já estão no formato v2.0 (YYYY-MM-DD HH:MM),
   * devemos preservá-los para que a verificação de horário funcione corretamente!
   */
  private normalizeSundayFormat(sundays: string[], month: number, year: number): string[] {
    if (!sundays || sundays.length === 0) return [];

    // Se já está no formato de números, retornar como está
    if (sundays.every(s => /^[1-5]$/.test(s))) {
      return sundays;
    }

    // Se tem "Nenhum domingo", retornar como está
    if (sundays.includes('Nenhum domingo')) {
      return sundays;
    }

    // 🔥 V2.0 FIX: Se os dados estão no formato v2.0 (YYYY-MM-DD HH:MM), preservar!
    // Isso é CRÍTICO para que o backup respeite o horário de disponibilidade
    const isV2Format = sundays.some(s => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s));
    if (isV2Format) {
      console.log(`[NORMALIZE] ✅ Dados no formato v2.0 detectados - preservando data+hora`);
      console.log(`[NORMALIZE] Domingos: ${sundays.join(', ')}`);
      return sundays; // Retornar como está para preservar o horário
    }

    const normalized: string[] = [];

    for (const sunday of sundays) {
      // Extrair data no formato DD/MM ou DD/10
      const dateMatch = sunday.match(/(\d{1,2})\/(\d{1,2})/);

      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const monthFromText = parseInt(dateMatch[2]);

        // Verificar se o mês bate (segurança)
        if (monthFromText === month || monthFromText === 10) {
          // Calcular qual domingo do mês é esse
          const sundayOfMonth = Math.ceil(day / 7);
          normalized.push(sundayOfMonth.toString());
          console.log(`[NORMALIZE] "${sunday}" → domingo ${sundayOfMonth} do mês`);
        }
      } else {
        // Se não conseguiu parsear, manter original
        console.log(`[NORMALIZE] ⚠️ Não foi possível normalizar: "${sunday}"`);
        normalized.push(sunday);
      }
    }

    return normalized;
  }

  /**
   * 🔧 NORMALIZAÇÃO: Padroniza horários para formato "Xh" (8h, 10h, 19h)
   * Aceita: "8h", "08:00", "8:00", "08h00"
   */
  private normalizeTimeFormat(times: string[]): string[] {
    if (!times || times.length === 0) return [];

    return times.map(time => {
      // Garantir que é string
      if (typeof time !== 'string') {
        console.log(`[NORMALIZE] ⚠️ Horário não é string: ${time} (tipo: ${typeof time})`);
        return String(time);
      }

      // Se já está no formato "Xh", retornar como está
      if (/^\d{1,2}h$/.test(time)) {
        return time;
      }

      // Extrair hora de formatos como "08:00", "8:00"
      const hourMatch = time.match(/^(\d{1,2})/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1]);
        return `${hour}h`;
      }

      // Se não conseguiu parsear, retornar original
      return time;
    });
  }

  /**
   * 🔧 NORMALIZAÇÃO: Converte valores booleanos em strings para eventos especiais
   * false → "Não", true → "Sim"
   */
  private normalizeSpecialEvents(
    events: Record<string, boolean | string | string[]>
  ): Record<string, string | string[]> {
    if (!events || typeof events !== 'object') return {};

    const normalized: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(events)) {
      if (typeof value === 'boolean') {
        normalized[key] = value ? 'Sim' : 'Não';
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Pré-calcula bônus de santo para todas as combinações ministro-data
   * OPTIMIZED: Uses pre-loaded saints data to avoid database queries in loops
   */
  private async preCalculateSaintBonuses(massTimes: MassTime[]): Promise<void> {
    // Extrair datas únicas das missas
    const uniqueDates = new Set<string>();
    for (const massTime of massTimes) {
      if (massTime.date) {
        uniqueDates.add(massTime.date);
      }
    }

    console.log(`[SAINT_BONUS] Calculando bônus de santo para ${this.ministers.length} ministros × ${uniqueDates.size} datas...`);
    console.log(`[SAINT_BONUS] 🚀 OPTIMIZATION: Using pre-loaded saints data (no DB queries in loops)`);

    // Calcular bônus para cada ministro em cada data
    // OPTIMIZATION: Pass pre-loaded saints data to avoid 1000+ database queries
    for (const minister of this.ministers) {
      if (!minister.id || !minister.name) continue; // Pular VACANTE e ministros sem nome

      for (const date of uniqueDates) {
        try {
          // Pass saintsData to avoid database query
          const bonus = await calculateSaintNameMatchBonus(minister.name, date, this.saintsData!);
          if (bonus > 0) {
            const cacheKey = `${minister.id}:${date}`;
            this.saintBonusCache.set(cacheKey, bonus);
            console.log(`[SAINT_BONUS] ⭐ ${minister.name} em ${date}: bônus ${bonus.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`[SAINT_BONUS] Erro ao calcular bônus para ${minister.name} em ${date}:`, error);
        }
      }
    }

    console.log(`[SAINT_BONUS] ✅ ${this.saintBonusCache.size} bônus de santo calculados`);
  }

  /**
   * Carrega configuração dos horários de missa
   */
  private async loadMassTimesConfig(): Promise<void> {
    if (!this.db) {
      console.error('[SCHEDULE_GEN] Database is null/undefined in loadMassTimesConfig!');
      // Configuração padrão para fallback
      this.massTimes = [
        { id: '1', dayOfWeek: 0, time: '08:00', minMinisters: 3, maxMinisters: 6 },
        { id: '2', dayOfWeek: 0, time: '10:00', minMinisters: 4, maxMinisters: 8 },
        { id: '3', dayOfWeek: 0, time: '19:00', minMinisters: 3, maxMinisters: 6 }
      ];
      logger.warn('Using default mass times configuration due to missing database');
      return;
    }

    const config = await this.db.select().from(massTimesConfig)
      .where(eq(massTimesConfig.isActive, true));

    type ConfigRow = typeof config[number];
    this.massTimes = config.map((c: ConfigRow) => ({
      id: c.id,
      dayOfWeek: c.dayOfWeek,
      time: c.time,
      minMinisters: c.minMinisters,
      maxMinisters: c.maxMinisters
    }));
  }

  /**
   * Gera horários de missa para todas as datas do mês seguindo as regras estabelecidas
   */
  private async generateMonthlyMassTimes(year: number, month: number): Promise<MassTime[]> {
    const monthlyTimes: MassTime[] = [];
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    console.log(`[SCHEDULE_GEN] 🕐 Gerando horários para ${month}/${year} com REGRAS ANTI-CONFLITO!`);

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfMonth = getDate(currentDate);
      
      // 🚨 REGRA ESPECIAL: Dia 28 São Judas = SEM MISSA DIÁRIA
      const isDayOfSaintJudas = dayOfMonth === 28;
      
      console.log(`[SCHEDULE_GEN] 🔍 DEBUGGING ${dateStr}: dayOfMonth=${dayOfMonth}, isDayOfSaintJudas=${isDayOfSaintJudas}, dayOfWeek=${dayOfWeek}`);
      
      // REGRA 1: Missas diárias (Segunda a SEXTA-feira, 6h30)
      // ❌ EXCETO:
      //    - Dia 28 (São Judas - tem missas especiais)
      //    - Sábados regulares (apenas 1º sábado tem missa)
      //    - Dias de novena de outubro (20-27, têm apenas missa da noite, exceto domingos 19 e 26)
      const isRegularSaturday = dayOfWeek === 6; // Sábados não têm missa diária (exceto 1º sábado tratado separadamente)
      const isOctoberNovena = month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27 && dayOfWeek !== 0;

      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isDayOfSaintJudas && !isOctoberNovena) {
        // Segunda (1) a SEXTA (5) - EXCLUINDO SÁBADOS
        monthlyTimes.push({
          id: `daily-${dateStr}`,
          dayOfWeek,
          time: '06:30',
          date: dateStr,
          minMinisters: 5,  // AJUSTADO: 5 ministros para missas diárias
          maxMinisters: 5,  // AJUSTADO: Exatamente 5 ministros
          type: 'missa_diaria'
        });
        console.log(`[SCHEDULE_GEN] ✅ Missa diária adicionada: ${dateStr} 06:30 (5 ministros)`);
      } else if (isDayOfSaintJudas) {
        console.log(`[SCHEDULE_GEN] 🚫 Dia ${dateStr} é São Judas - SUPRIMINDO missa diária`);
      } else if (isRegularSaturday) {
        console.log(`[SCHEDULE_GEN] 🚫 Sábado regular ${dateStr} - SEM missa diária (apenas 1º sábado tem missa)`);
      } else if (isOctoberNovena) {
        console.log(`[SCHEDULE_GEN] 🚫 Dia de novena ${dateStr} - SEM missa da manhã (apenas novena à noite)`);
      }
      
      // REGRA 2: Missas dominicais (Domingos 8h, 10h, 19h)
      if (dayOfWeek === 0) { // Domingo
        // Configuração específica para cada horário de domingo
        const sundayConfigs = [
          { time: '08:00', minMinisters: 15, maxMinisters: 15 },  // 15 ministros às 8h
          { time: '10:00', minMinisters: 20, maxMinisters: 20 },  // 20 ministros às 10h
          { time: '19:00', minMinisters: 20, maxMinisters: 20 }   // 20 ministros às 19h
        ];

        sundayConfigs.forEach(config => {
          monthlyTimes.push({
            id: `sunday-${dateStr}-${config.time}`,
            dayOfWeek,
            time: config.time,
            date: dateStr,
            minMinisters: config.minMinisters,
            maxMinisters: config.maxMinisters,
            type: 'missa_dominical'
          });
          console.log(`[SCHEDULE_GEN] ✅ Missa dominical: ${dateStr} ${config.time} (${config.minMinisters} ministros)`);
        });
      }
      
      // REGRA 3: Missa Cura e Libertação (Primeira quinta-feira, 19h30)
      if (isThursday(currentDate) && this.isFirstOccurrenceInMonth(currentDate, 4)) { // 4 = quinta
        monthlyTimes.push({
          id: `healing-${dateStr}`,
          dayOfWeek,
          time: '19:30', // TODO: Verificar se é feriado para usar 19h
          date: dateStr,
          minMinisters: 26,  // AJUSTADO: 26 ministros para Cura e Libertação
          maxMinisters: 26,  // AJUSTADO: Exatamente 26 ministros
          type: 'missa_cura_libertacao'
        });
        console.log(`[SCHEDULE_GEN] ✅ Missa Cura e Libertação: ${dateStr} 19:30 (26 ministros)`);
      }
      
      // REGRA 4: Missa Sagrado Coração de Jesus (Primeira SEXTA-feira, 6h30)
      if (isFriday(currentDate) && this.isFirstOccurrenceInMonth(currentDate, 5)) { // 5 = sexta
        monthlyTimes.push({
          id: `sacred-heart-${dateStr}`,
          dayOfWeek,
          time: '06:30',
          date: dateStr,
          minMinisters: 6,  // AJUSTADO: 6 ministros para missas especiais às 6h30
          maxMinisters: 6,  // AJUSTADO: Exatamente 6 ministros
          type: 'missa_sagrado_coracao'
        });
        console.log(`[SCHEDULE_GEN] ✅ Missa Sagrado Coração de Jesus (1ª sexta): ${dateStr} 06:30 (6 ministros)`);
      }
      
      // REGRA 5: Missa Imaculado Coração de Maria (Primeiro SÁBADO, 6h30)
      if (isSaturday(currentDate) && this.isFirstOccurrenceInMonth(currentDate, 6)) { // 6 = sábado
        monthlyTimes.push({
          id: `immaculate-heart-${dateStr}`,
          dayOfWeek,
          time: '06:30',
          date: dateStr,
          minMinisters: 6,  // AJUSTADO: 6 ministros para missas especiais às 6h30
          maxMinisters: 6,  // AJUSTADO: Exatamente 6 ministros
          type: 'missa_imaculado_coracao'
        });
        console.log(`[SCHEDULE_GEN] ✅ Missa Imaculado Coração de Maria (1º sábado): ${dateStr} 06:30 (6 ministros)`);
      }
      
      // REGRA 6: Novena de São Judas (dias 19-27 de outubro às 19h30)
      // 🚨 IMPORTANTE: Durante a novena (19-27/10), APENAS a missa da noite!
      //    - Oct 19 (Dom): Domingos normais (8h, 10h, 19h) - novena unificada com 19h ✅
      //    - Oct 20 (Seg): 19:30
      //    - Oct 21 (Ter): 19:30
      //    - Oct 22 (Qua): 19:30
      //    - Oct 23 (Qui): 19:30
      //    - Oct 24 (Sex): 19:30
      //    - Oct 25 (Sáb): 19:00 (única missa do dia!)
      //    - Oct 26 (Dom): Domingos normais (8h, 10h, 19h) - novena unificada com 19h ✅
      //    - Oct 27 (Seg): 19:30
      if (month === 10 && dayOfMonth >= 19 && dayOfMonth <= 27) {
        // Determinar qual dia da novena é
        const novenaDayNumber = dayOfMonth - 18; // Dia 19 = 1ª novena, dia 27 = 9ª novena

        // 🔥 CORREÇÃO: Nos domingos (19 e 26), a novena é UNIFICADA com a missa dominical às 19h
        // Não adicionar missa extra às 19:30
        if (dayOfWeek === 0) {
          console.log(`[SCHEDULE_GEN] 🙏 Novena São Judas (${novenaDayNumber}º dia): ${dateStr} - UNIFICADA com missa dominical às 19:00`);
          // Não adiciona missa separada, a missa dominical às 19h já foi adicionada acima
        } else {
          // Para dias de semana e sábado, adicionar missa específica da novena
          // Horário depende do dia da semana
          let novenaTime = '19:30';
          if (dayOfWeek === 6) { // Sábado (dia 25)
            novenaTime = '19:00';
          }

          monthlyTimes.push({
            id: `novena-sao-judas-${dateStr}`,
            dayOfWeek,
            time: novenaTime,
            date: dateStr,
            minMinisters: 26,
            maxMinisters: 26,
            type: 'missa_sao_judas'
          });
          console.log(`[SCHEDULE_GEN] 🙏 Novena São Judas (${novenaDayNumber}º dia): ${dateStr} ${novenaTime} (26 ministros)`);

          // 🚨 REGRA CRÍTICA: Se for sábado durante novena (Oct 25), marcar para remover outras missas
          if (dayOfWeek === 6) {
            console.log(`[SCHEDULE_GEN] 🚫 Sábado ${dateStr} está na novena - apenas missa às ${novenaTime}!`);
          }
        }
      }

      // REGRA 7: Festa de São Judas (dia 28 de outubro)
      if (month === 10 && dayOfMonth === 28) {
        const stJudeMasses = this.generateStJudeMasses(currentDate);
        monthlyTimes.push(...stJudeMasses);
      }

      // REGRA 8: Missa de Finados (dia 2 de novembro às 15h30 no Cemitério Memorial)
      if (month === 11 && dayOfMonth === 2) {
        monthlyTimes.push({
          id: `finados-${dateStr}`,
          dayOfWeek,
          time: '15:30',
          date: dateStr,
          minMinisters: 10,  // 10 ministros para Finados
          maxMinisters: 10,
          type: 'missa_finados'
        });
        console.log(`[SCHEDULE_GEN] ✅ Missa de Finados (Cemitério Memorial): ${dateStr} 15:30 (10 ministros)`);
      }

      // REGRA 9: Missa PUC - Consciência Negra (20 de novembro às 10h)
      if (month === 11 && dayOfMonth === 20) {
        monthlyTimes.push({
          id: `puc-consciencia-negra-${dateStr}`,
          dayOfWeek,
          time: '10:00',
          date: dateStr,
          location: 'PUC Sorocaba',
          minMinisters: 10,  // Ajustar conforme necessário
          maxMinisters: 10,
          type: 'missa_puc'
        });
        console.log(`[SCHEDULE_GEN] ✅ Missa PUC - Consciência Negra: ${dateStr} 10:00 (10 ministros)`);
      }

      // REGRA 10: Missas mensais de São Judas Tadeu (dia 28 de cada mês, EXCETO outubro)
      // Todo dia 28 (exceto outubro que é a festa) tem 3 missas: 7h, 15h, 19h30
      if (dayOfMonth === 28 && month !== 10) {
        const saoJudasMonthlies = [
          { time: '07:00', ministers: 6 },
          { time: '15:00', ministers: 4 },
          { time: '19:30', ministers: 7 }
        ];

        saoJudasMonthlies.forEach(config => {
          monthlyTimes.push({
            id: `sao-judas-mensal-${dateStr}-${config.time}`,
            dayOfWeek,
            time: config.time,
            date: dateStr,
            minMinisters: config.ministers,
            maxMinisters: config.ministers,
            type: 'missa_sao_judas_mensal'
          });
          console.log(`[SCHEDULE_GEN] ✅ Missa São Judas Mensal: ${dateStr} ${config.time} (${config.ministers} ministros)`);
        });
      }

      // REGRA 11: Adoração ao Santíssimo (Segundas-feiras às 22h)
      // Buscar ministros sorteados para esta segunda-feira específica
      if (isMonday(currentDate)) {
        const mondayOfWeek = this.getMondayWeekNumber(currentDate);
        const adorationMinisters = await this.getAdorationMinistersForMonday(year, month, mondayOfWeek);
        
        if (adorationMinisters.length > 0) {
          monthlyTimes.push({
            id: `adoracao-${dateStr}`,
            dayOfWeek,
            time: '22:00',
            date: dateStr,
            minMinisters: adorationMinisters.length,
            maxMinisters: adorationMinisters.length,
            type: 'adoracao_santissimo'
          });
          console.log(`[SCHEDULE_GEN] 🙏 Adoração ao Santíssimo: ${dateStr} 22:00 (${adorationMinisters.length} ministros sorteados)`);
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    // REGRA 7: Carregar missas especiais do questionário
    const specialMasses = await this.loadSpecialMassesFromQuestionnaire(year, month);
    monthlyTimes.push(...specialMasses);

    // 🔧 APLICAR FILTRO DE CONFLITOS: Missa especial sobrepõe missa normal no mesmo horário
    const filteredTimes = this.resolveTimeConflicts(monthlyTimes);
    
    console.log(`[SCHEDULE_GEN] ✅ Total de ${monthlyTimes.length} horários → ${filteredTimes.length} após filtro de conflitos!`);
    return filteredTimes.sort((a, b) => 
      a.date!.localeCompare(b.date!) || a.time.localeCompare(b.time)
    );
  }

  /**
   * Carrega missas especiais customizadas do questionário
   */
  private async loadSpecialMassesFromQuestionnaire(year: number, month: number): Promise<MassTime[]> {
    const specialMasses: MassTime[] = [];

    if (!this.db) {
      console.log('[SCHEDULE_GEN] No database connection, skipping special masses from questionnaire');
      return specialMasses;
    }

    try {
      // Buscar o questionário do mês
      const [questionnaire] = await this.db.select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.month, month),
            eq(questionnaires.year, year)
          )
        )
        .limit(1);

      if (!questionnaire) {
        console.log(`[SCHEDULE_GEN] No questionnaire found for ${month}/${year}`);
        return specialMasses;
      }

      console.log(`[SCHEDULE_GEN] 🎯 Loading special masses from questionnaire: ${questionnaire.title}`);

      // Parse questions
      let questions = questionnaire.questions;
      if (typeof questions === 'string') {
        questions = JSON.parse(questions);
      }

      // Filtrar perguntas de categoria "custom" e "special_event"
      const customQuestions = (questions as QuestionnaireQuestionItem[]).filter(
        q => q.category === 'custom' || q.category === 'special_event'
      );

      console.log(`[SCHEDULE_GEN] Found ${customQuestions.length} custom/special event questions`);

      // Para cada pergunta customizada, extrair informações da missa
      for (const question of customQuestions) {
        // Extrair data e horário da pergunta
        // Formato esperado: "Você pode servir na missa ... - dia DD/MM/YYYY às HH:MM?"
        const massInfo = this.extractMassInfoFromQuestion(question.question, year, month);

        if (massInfo) {
          specialMasses.push({
            id: `custom-${question.id}`,
            dayOfWeek: massInfo.dayOfWeek,
            time: massInfo.time,
            date: massInfo.date,
            minMinisters: massInfo.minMinisters || 7,
            maxMinisters: massInfo.maxMinisters || 7,
            type: question.id, // Usar o ID da pergunta como tipo
            description: question.question
          });
          console.log(`[SCHEDULE_GEN] ✅ Special mass added: ${massInfo.date} ${massInfo.time} - ${question.question.substring(0, 60)}...`);
        } else {
          console.log(`[SCHEDULE_GEN] ⚠️ Could not extract mass info from: ${question.question}`);
        }
      }

      console.log(`[SCHEDULE_GEN] 📊 Total special masses from questionnaire: ${specialMasses.length}`);
    } catch (error) {
      console.error('[SCHEDULE_GEN] Error loading special masses from questionnaire:', error);
    }

    return specialMasses;
  }

  /**
   * Extrai informações de data e horário de uma pergunta de missa especial
   */
  private extractMassInfoFromQuestion(question: string, year: number, month: number): {
    date: string;
    time: string;
    dayOfWeek: number;
    minMinisters?: number;
    maxMinisters?: number;
  } | null {
    // Padrões de regex para extrair data e hora
    // Ex: "dia 08/12/2025 às 19h30" ou "quinta feira 01/01/2026 às 19h"

    // Extrair data DD/MM/YYYY
    const dateMatch = question.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) {
      return null;
    }

    const day = parseInt(dateMatch[1]);
    const monthFromQuestion = parseInt(dateMatch[2]);
    const yearFromQuestion = parseInt(dateMatch[3]);

    // Extrair horário (HH:MM ou HHh ou HHhMM)
    const timeMatch = question.match(/(?:às|as)\s+(\d{1,2})(?:h|:)(\d{2})?/i);
    if (!timeMatch) {
      return null;
    }

    const hour = parseInt(timeMatch[1]).toString().padStart(2, '0');
    const minute = timeMatch[2] ? timeMatch[2] : '00';
    const time = `${hour}:${minute}`;

    // Criar data no formato YYYY-MM-DD
    const date = `${yearFromQuestion}-${monthFromQuestion.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    // Calcular dia da semana
    const dateObj = new Date(yearFromQuestion, monthFromQuestion - 1, day);
    const dayOfWeek = dateObj.getDay();

    return {
      date,
      time,
      dayOfWeek
    };
  }

  /**
   * Resolve conflitos de horário: missa especial substitui missa normal
   */
  private resolveTimeConflicts(massTimes: MassTime[]): MassTime[] {
    console.log(`[SCHEDULE_GEN] 🔧 Resolvendo conflitos entre ${massTimes.length} missas...`);

    // 🚨 REGRA ESPECIAL 1: REMOVER TODAS as missas diárias do dia 28 (São Judas)
    // 🚨 REGRA ESPECIAL 2: REMOVER TODAS as missas de sábados regulares em OUTUBRO (exceto dia 4 e 25)
    // 🚨 REGRA ESPECIAL 3: REMOVER missas MATUTINAS durante novena (Oct 20-27, exceto domingo 26)
    const filteredMasses = massTimes.filter(mass => {
      // Extract date parts
      const dateParts = mass.date?.split('-');
      if (!dateParts || dateParts.length !== 3) return true;

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);

      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day)) return true;

      const massDate = new Date(year, month - 1, day);
      const dayOfWeek = massDate.getDay(); // 0=Sunday, 6=Saturday

      // REGRA 1: Remover missas diárias do dia 28
      if (mass.date && mass.date.endsWith('-28') && mass.type === 'missa_diaria') {
        console.log(`[SCHEDULE_GEN] 🚫 REMOVENDO missa diária do dia 28: ${mass.date} ${mass.time}`);
        return false;
      }

      // REGRA 2: Em OUTUBRO, remover TODAS as missas de sábados regulares (exceto dia 4 e 25)
      // Oct 4 = Primeiro Sábado (Imaculado Coração)
      // Oct 25 = Sábado da Novena (apenas 19:00)
      // Oct 11, 18 = Sábados regulares (SEM MISSAS!)
      if (month === 10 && dayOfWeek === 6 && day !== 4 && day !== 25) {
        console.log(`[SCHEDULE_GEN] 🚫 REMOVENDO missa de sábado regular em outubro: ${mass.date} ${mass.time} (${mass.type})`);
        return false;
      }

      // REGRA 3: Durante novena (Oct 19-27), APENAS missas noturnas (exceto domingos 19 e 26)
      // Oct 19 (Dom): Domingos normais (8h, 10h, 19h) + novena 19:30 ✅
      // Oct 20-24 (Seg-Sex): Apenas 19:30 novena
      // Oct 25 (Sáb): Apenas 19:00 novena
      // Oct 26 (Dom): Domingos normais (8h, 10h, 19h) + novena 19:30 ✅
      // Oct 27 (Seg): Apenas 19:30 novena
      if (month === 10 && day >= 19 && day <= 27 && dayOfWeek !== 0) {
        // Check if it's a morning mass (before 12:00)
        const hour = parseInt(mass.time.split(':')[0]);
        const isMorningMass = hour < 12;

        if (isMorningMass && mass.type !== 'missa_sao_judas' && mass.type !== 'missa_sao_judas_festa') {
          console.log(`[SCHEDULE_GEN] 🚫 REMOVENDO missa matutina durante novena: ${mass.date} ${mass.time} (${mass.type})`);
          return false;
        }
      }

      return true; // Manter todas as outras
    });

    console.log(`[SCHEDULE_GEN] 📊 Filtros aplicados: ${massTimes.length} → ${filteredMasses.length} missas`);
    
    // Agrupar por data e horário
    const timeSlots = new Map<string, MassTime[]>();
    
    for (const mass of filteredMasses) {
      const key = `${mass.date}-${mass.time}`;
      if (!timeSlots.has(key)) {
        timeSlots.set(key, []);
      }
      timeSlots.get(key)!.push(mass);
    }
    
    const resolvedTimes: MassTime[] = [];
    
    for (const [key, conflicts] of timeSlots) {
      if (conflicts.length === 1) {
        // Sem conflito
        resolvedTimes.push(conflicts[0]);
      } else {
        // Há conflito - aplicar prioridade
        console.log(`[SCHEDULE_GEN] ⚠️ CONFLITO em ${key}: ${conflicts.map(m => m.type).join(' vs ')}`);
        
        // Ordem de prioridade: especiais > dominicais > diárias  
        const priorityOrder = [
          'missa_sao_judas_festa', 'missa_sao_judas', 'missa_cura_libertacao',
          'missa_sagrado_coracao', 'missa_imaculado_coracao',
          'missa_dominical', 'missa_diaria'
        ];
        
        // Selecionar a missa com maior prioridade
        let selected = conflicts[0];
        for (const mass of conflicts) {
          const currentPriority = priorityOrder.indexOf(mass.type || 'missa_diaria');
          const selectedPriority = priorityOrder.indexOf(selected.type || 'missa_diaria');
          
          if (currentPriority < selectedPriority) { // Menor índice = maior prioridade
            selected = mass;
          }
        }
        
        console.log(`[SCHEDULE_GEN] ✅ RESOLVIDO: ${selected.type} prevaleceu em ${key}`);
        resolvedTimes.push(selected);
      }
    }
    
    return resolvedTimes;
  }

  /**
   * Verifica se é a primeira ocorrência do dia da semana no mês
   */
  private isFirstOccurrenceInMonth(date: Date, targetDayOfWeek: number): boolean {
    const startOfMonthDate = startOfMonth(date);
    let firstOccurrence = startOfMonthDate;
    
    // Avançar até encontrar o primeiro dia da semana alvo
    while (getDay(firstOccurrence) !== targetDayOfWeek) {
      firstOccurrence = addDays(firstOccurrence, 1);
    }
    
    return format(date, 'yyyy-MM-dd') === format(firstOccurrence, 'yyyy-MM-dd');
  }
  
  /**
   * Gera horários das missas de São Judas (dia 28) com regras complexas
   */
  private generateStJudeMasses(date: Date): MassTime[] {
    const masses: MassTime[] = [];
    const dayOfWeek = getDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const month = date.getMonth() + 1;
    
    console.log(`[SCHEDULE_GEN] 🙏 Gerando missas de São Judas para ${dateStr} (${dayOfWeek})`);
    
    // Outubro tem regras especiais (festa)
    if (month === 10) {
      // 28/10: 7h, 10h, 12h, 15h, 17h, 19h30 - Festa de São Judas
      const festConfigs = [
        { time: '07:00', minMinisters: 10, maxMinisters: 10 },
        { time: '10:00', minMinisters: 15, maxMinisters: 15 },
        { time: '12:00', minMinisters: 10, maxMinisters: 10 },
        { time: '15:00', minMinisters: 10, maxMinisters: 10 },
        { time: '17:00', minMinisters: 10, maxMinisters: 10 },
        { time: '19:30', minMinisters: 20, maxMinisters: 20 }
      ];

      festConfigs.forEach(config => {
        masses.push({
          id: `st-jude-feast-${dateStr}-${config.time}`,
          dayOfWeek,
          time: config.time,
          date: dateStr,
          minMinisters: config.minMinisters,
          maxMinisters: config.maxMinisters,
          type: 'missa_sao_judas_festa'
        });
        console.log(`[SCHEDULE_GEN] 🙏 Festa São Judas: ${dateStr} ${config.time} (${config.minMinisters} ministros)`);
      });
    } else {
      // Regras normais para dia 28
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Segunda a sexta
        const weekdayConfigs = [
          { time: '07:00', minMinisters: 8, maxMinisters: 8 },
          { time: '10:00', minMinisters: 10, maxMinisters: 10 },
          { time: '19:30', minMinisters: 15, maxMinisters: 15 }
        ];

        weekdayConfigs.forEach(config => {
          masses.push({
            id: `st-jude-weekday-${dateStr}-${config.time}`,
            dayOfWeek,
            time: config.time,
            date: dateStr,
            minMinisters: config.minMinisters,
            maxMinisters: config.maxMinisters,
            type: 'missa_sao_judas'
          });
        });
      } else if (dayOfWeek === 6) { // Sábado
        const saturdayConfigs = [
          { time: '07:00', minMinisters: 8, maxMinisters: 8 },
          { time: '10:00', minMinisters: 10, maxMinisters: 10 },
          { time: '19:00', minMinisters: 15, maxMinisters: 15 }
        ];

        saturdayConfigs.forEach(config => {
          masses.push({
            id: `st-jude-saturday-${dateStr}-${config.time}`,
            dayOfWeek,
            time: config.time,
            date: dateStr,
            minMinisters: config.minMinisters,
            maxMinisters: config.maxMinisters,
            type: 'missa_sao_judas'
          });
        });
      } else if (dayOfWeek === 0) { // Domingo
        const sundayConfigs = [
          { time: '08:00', minMinisters: 15, maxMinisters: 15 },
          { time: '10:00', minMinisters: 20, maxMinisters: 20 },
          { time: '15:00', minMinisters: 15, maxMinisters: 15 },
          { time: '17:00', minMinisters: 15, maxMinisters: 15 },
          { time: '19:00', minMinisters: 20, maxMinisters: 20 }
        ];

        sundayConfigs.forEach(config => {
          masses.push({
            id: `st-jude-sunday-${dateStr}-${config.time}`,
            dayOfWeek,
            time: config.time,
            date: dateStr,
            minMinisters: config.minMinisters,
            maxMinisters: config.maxMinisters,
            type: 'missa_sao_judas'
          });
        });
      }
    }
    
    console.log(`[SCHEDULE_GEN] 🙏 São Judas: ${masses.length} missas geradas`);
    return masses;
  }

  /**
   * Gera escala para uma missa específica
   */
  private async generateScheduleForMass(massTime: MassTime): Promise<GeneratedSchedule> {
    logger.debug(`Gerando escala para ${massTime.date} ${massTime.time}`);
    console.log(`[SCHEDULE_GEN] Generating for mass: ${massTime.date} at ${massTime.time}`);

    // 1. Filtrar ministros disponíveis
    const availableMinsters = this.getAvailableMinistersForMass(massTime);
    console.log(`[SCHEDULE_GEN] Available ministers for this mass: ${availableMinsters.length}`);

    // 2. Aplicar algoritmo de seleção inteligente
    const selectedMinisters = this.selectOptimalMinisters(availableMinsters, massTime);
    console.log(`[SCHEDULE_GEN] Selected ministers: ${selectedMinisters.length}`);

    // 3. Selecionar ministros de backup - TODOS os disponíveis que não foram escalados
    const backupMinisters = this.selectBackupMinisters(availableMinsters, selectedMinisters);

    // 4. Calcular score de confiança
    const confidence = this.calculateScheduleConfidence(selectedMinisters, massTime);

    // 5. ✅ Daily assignments are now tracked in minister.lastAssignedDate (done in selectOptimalMinisters)

    // 6. Atribuir posições litúrgicas aos ministros considerando preferências
    console.log('[SCHEDULE_GEN] ✅ DEBUGGING: Atribuindo posições aos ministros com base em preferências!');
    const ministersWithPositions = this.assignPositionsIntelligently(selectedMinisters);

    const backupWithPositions = backupMinisters.map((minister, index) => ({
      ...minister,
      position: selectedMinisters.length + index + 1
    }));

    // 🚨 DEBUG FINAL: VERIFICAR SE ESTA PARTE É EXECUTADA
    console.log('[SCHEDULE_GEN] 🚨 RETORNANDO RESULTADO COM POSIÇÕES! ministersWithPositions:', ministersWithPositions.length);
    console.log('[SCHEDULE_GEN] 🚨 Primeiro ministro com posição:', JSON.stringify(ministersWithPositions[0], null, 2));
    
    const result = {
      massTime,
      ministers: ministersWithPositions,
      backupMinisters: backupWithPositions,
      confidence
    };
    
    console.log('[SCHEDULE_GEN] 🚨 RESULTADO FINAL:', JSON.stringify(result, null, 2).substring(0, 500));
    return result;
  }

  /**
   * 🎯 INTELLIGENT POSITION ASSIGNMENT
   * Atribui posições aos ministros considerando suas preferências
   */
  private assignPositionsIntelligently(ministers: Minister[]): Minister[] {
    console.log('[POSITION_ASSIGN] 🎯 Starting intelligent position assignment for', ministers.length, 'ministers');

    // Se não há ministros, retornar array vazio
    if (ministers.length === 0) {
      return [];
    }

    // Array para rastrear posições já atribuídas
    const assignedPositions = new Set<number>();
    const ministersWithPositions: Minister[] = [];
    const unassignedMinisters: Minister[] = [];

    // PHASE 1: Tentar atribuir ministros às suas posições preferidas
    console.log('[POSITION_ASSIGN] 📋 PHASE 1: Assigning preferred positions');

    // Ordenar ministros por prioridade: quem tem menos preferências vai primeiro (mais específico)
    const ministersByPriority = [...ministers].sort((a, b) => {
      const aPrefs = a.preferredPositions?.length || 0;
      const bPrefs = b.preferredPositions?.length || 0;
      if (aPrefs === 0 && bPrefs === 0) return 0; // Ambos sem preferências
      if (aPrefs === 0) return 1; // a sem preferência vai para o final
      if (bPrefs === 0) return -1; // b sem preferência vai para o final
      return aPrefs - bPrefs; // Quem tem menos preferências tem prioridade (mais específico)
    });

    for (const minister of ministersByPriority) {
      const prefs = minister.preferredPositions || [];
      const avoid = minister.avoidPositions || [];

      // Se tem preferências, tentar atribuir uma delas
      if (prefs.length > 0) {
        let assigned = false;

        for (const preferredPos of prefs) {
          // Verificar se a posição está dentro do range válido
          if (preferredPos < 1 || preferredPos > ministers.length) {
            continue;
          }

          // Se a posição preferida está livre, atribuir
          if (!assignedPositions.has(preferredPos)) {
            ministersWithPositions.push({
              ...minister,
              position: preferredPos
            });
            assignedPositions.add(preferredPos);
            assigned = true;
            console.log(`[POSITION_ASSIGN] ✅ ${minister.name} → Posição ${preferredPos} (preferida)`);
            break;
          }
        }

        if (!assigned) {
          unassignedMinisters.push(minister);
          console.log(`[POSITION_ASSIGN] ⏳ ${minister.name} → Nenhuma posição preferida disponível (prefere: ${prefs.join(', ')})`);
        }
      } else {
        // Sem preferências, adicionar à lista de não atribuídos
        unassignedMinisters.push(minister);
      }
    }

    // PHASE 2: Atribuir posições restantes aos ministros não atribuídos
    console.log('[POSITION_ASSIGN] 📋 PHASE 2: Assigning remaining positions');

    for (const minister of unassignedMinisters) {
      const avoid = minister.avoidPositions || [];
      let assigned = false;

      // Procurar uma posição livre que não esteja na lista de "evitar"
      for (let pos = 1; pos <= ministers.length; pos++) {
        if (!assignedPositions.has(pos) && !avoid.includes(pos)) {
          ministersWithPositions.push({
            ...minister,
            position: pos
          });
          assignedPositions.add(pos);
          assigned = true;
          console.log(`[POSITION_ASSIGN] ✅ ${minister.name} → Posição ${pos} (disponível, não evitada)`);
          break;
        }
      }

      // Se não encontrou posição que não seja "evitada", atribuir qualquer posição livre
      if (!assigned) {
        for (let pos = 1; pos <= ministers.length; pos++) {
          if (!assignedPositions.has(pos)) {
            ministersWithPositions.push({
              ...minister,
              position: pos
            });
            assignedPositions.add(pos);
            console.log(`[POSITION_ASSIGN] ⚠️ ${minister.name} → Posição ${pos} (FORÇADA - estava na lista de evitar: ${avoid.join(', ')})`);
            break;
          }
        }
      }
    }

    // PHASE 3: Ordenar por posição antes de retornar
    const sorted = ministersWithPositions.sort((a, b) => (a.position || 0) - (b.position || 0));

    // Log final
    console.log('[POSITION_ASSIGN] ✅ Position assignment complete:');
    sorted.forEach(m => {
      const prefs = m.preferredPositions || [];
      const avoid = m.avoidPositions || [];
      const isPreferred = prefs.includes(m.position || 0);
      const isAvoided = avoid.includes(m.position || 0);
      const status = isPreferred ? '✅ PREFERIDA' : isAvoided ? '⚠️ EVITADA' : '➖ NEUTRA';
      console.log(`[POSITION_ASSIGN]   ${m.position}. ${m.name} - ${status}`);
    });

    return sorted;
  }

  /**
   * Filtra ministros disponíveis para uma missa específica
   */
  private getAvailableMinistersForMass(massTime: MassTime): Minister[] {
    const dayName = this.getDayName(massTime.dayOfWeek);
    const dateStr = format(new Date(massTime.date!), 'dd/MM');

    // Converter horário para formato usado nas respostas (8h, 10h, 19h)
    const hour = parseInt(massTime.time.substring(0, 2));
    const timeStr = hour + 'h'; // Converter "08:00" para "8h", "10:00" para "10h"

    console.log(`\n[AVAILABILITY_CHECK] 🔍 ========================================`);
    console.log(`[AVAILABILITY_CHECK] Verificando disponibilidade para:`);
    console.log(`[AVAILABILITY_CHECK]   Data: ${massTime.date}`);
    console.log(`[AVAILABILITY_CHECK]   Hora: ${massTime.time}`);
    console.log(`[AVAILABILITY_CHECK]   Tipo: ${massTime.type}`);
    console.log(`[AVAILABILITY_CHECK]   Dia da semana: ${dayName} (${massTime.dayOfWeek})`);
    console.log(`[AVAILABILITY_CHECK] 📊 Total ministros: ${this.ministers.length}, AvailabilityData size: ${this.availabilityData.size}`);

    const availableList = this.ministers.filter(minister => {
      // VACANTE (id null) não deve ser incluído na filtragem automática
      if (!minister.id) return false;
      
      const availability = this.availabilityData.get(minister.id);
      
      console.log(`[AVAILABILITY_CHECK] 👤 Verificando ${minister.name} (${minister.id})`);
      console.log(`[AVAILABILITY_CHECK] 📋 Dados de disponibilidade:`, availability);

      if (!availability) {
        // Se não há dados de disponibilidade, incluir em modo preview
        // mas excluir em produção
        if (this.availabilityData.size === 0) {
          // Se não há nenhuma resposta, estamos em modo preview
          console.log(`[AVAILABILITY_CHECK] ✅ Modo preview: incluindo ${minister.name} sem dados de disponibilidade`);
          logger.debug(`Modo preview: incluindo ${minister.name} sem dados de disponibilidade`);
          return true;
        }
        // Em produção com respostas, excluir quem não respondeu
        console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} não respondeu ao questionário - excluindo`);
        logger.debug(`${minister.name} não respondeu ao questionário - excluindo`);
        return false;
      }

      // VERIFICAÇÃO ESPECÍFICA POR TIPO DE MISSA
      const isAvailableForType = massTime.type ? this.isAvailableForSpecialMass(minister.id, massTime.type, massTime.time, massTime.date) : true;
      console.log(`[AVAILABILITY_CHECK] ${minister.name} disponível para tipo ${massTime.type}? ${isAvailableForType}`);
      
      if (massTime.type && !isAvailableForType) {
        console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} REJEITADO por tipo de missa`);
        return false;
      }

      // Verificar disponibilidade para domingo específico
      if (massTime.dayOfWeek === 0) {
        console.log(`[AVAILABILITY_CHECK] Verificando domingo ${massTime.date} ${massTime.time}`);

        // Definir chaves de busca no início
        const dateTimeKey = `${massTime.date} ${massTime.time}`;
        const dateOnlyKey = massTime.date;

        // Se o ministro marcou "Nenhum domingo", ele não está disponível
        if (availability.availableSundays?.includes('Nenhum domingo')) {
          logger.debug(`${minister.name} marcou "Nenhum domingo" - excluindo`);
          return false;
        }

        // 🔥 V2.0 FORMAT: availableSundays é um array de "YYYY-MM-DD HH:MM"
        // Exemplo: ["2025-10-05 10:00", "2025-10-12 08:00"]
        let availableForSunday = false;
        if (availability.availableSundays && availability.availableSundays.length > 0) {
          console.log(`[AVAILABILITY_CHECK] ${minister.name} disponível em: ${availability.availableSundays.join(', ')}`);

          // Verificar match exato (data + hora)
          availableForSunday = availability.availableSundays.some(entry => {
            // Format v2.0: pode ser "2025-10-05 10:00" (com hora)
            if (entry.includes(' ')) {
              return entry === dateTimeKey;
            }
            // Ou apenas data: "2025-10-05"
            if (entry === dateOnlyKey) {
              return true;
            }
            // Legacy formats
            if (entry.includes(dateStr)) {
              return true;
            }
            return false;
          });

          console.log(`[AVAILABILITY_CHECK] Verificando ${dateTimeKey}: ${availableForSunday ? '✅ SIM' : '❌ NÃO'}`);

          // Se não encontrou no formato v2.0, tentar formato legado
          // IMPORTANTE: Só aplicar fallback se os dados NÃO estão no formato v2.0
          if (!availableForSunday) {
            // Detectar se os dados estão no formato v2.0 (YYYY-MM-DD HH:MM)
            const isV2Format = availability.availableSundays.some(s => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s));

            if (isV2Format) {
              // Se é formato v2.0, NÃO aplicar fallback legado
              // O match exato já foi feito acima e falhou - ministro não está disponível
              console.log(`[AVAILABILITY_CHECK] Formato v2.0 detectado - sem fallback legado`);
            } else {
              // Apenas para dados legados (formato antigo)
              // Calcular qual domingo do mês é este (1º, 2º, 3º, 4º ou 5º)
              const date = new Date(massTime.date!);
              const dayOfMonth = date.getDate();
              const sundayOfMonth = Math.ceil(dayOfMonth / 7);

              // Formato legado: "1", "2", "3", "4", "5"
              availableForSunday = availability.availableSundays.includes(sundayOfMonth.toString());

              if (!availableForSunday) {
                // Outros formatos legados - usar match EXATO, não includes()
                // para evitar matches parciais incorretos (ex: "14" em "2025-12-14")
                const possibleFormats = [
                  `Domingo ${dateStr}`,  // "Domingo 05/10"
                  dateStr                 // "05/10"
                ];

                for (const format of possibleFormats) {
                  if (availability.availableSundays.some(sunday => sunday === format)) {
                    availableForSunday = true;
                    console.log(`[AVAILABILITY_CHECK] Match encontrado no formato legado: ${format}`);
                    break;
                  }
                }
              }
            }
          }
        }

        // 🔧 FIX: A resposta do questionário é o VEREDICTO
        // Se não marcou o domingo específico, NÃO está disponível - ponto final
        if (!availableForSunday) {
          console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} NÃO marcou ${dateTimeKey} no questionário`);
          return false;
        }

        // Se está disponível para o domingo, verificar compatibilidade de horário (opcional - afeta apenas pontuação)
        if (availability.preferredMassTimes && availability.preferredMassTimes.length > 0) {
          const hasPreferredTime = availability.preferredMassTimes.some(time => {
            const timeValue = String(time);
            return timeValue === massTime.time || timeValue === timeStr || timeValue.includes(hour.toString());
          });

          console.log(`[AVAILABILITY_CHECK] ${minister.name} - Horários preferidos: ${availability.preferredMassTimes.join(', ')}`);
          console.log(`[AVAILABILITY_CHECK] ${minister.name} - Verificando ${massTime.time}: preferido=${hasPreferredTime}`);

          if (!hasPreferredTime) {
            logger.debug(`${minister.name} disponível mas sem preferência forte para ${timeStr}`);
          }
        }

        console.log(`[AVAILABILITY_CHECK] ✅ ${minister.name} DISPONÍVEL para domingo ${massTime.date} ${massTime.time}`);
        return true; // Disponível para o domingo
      }

      // Verificar disponibilidade para missas diárias (segunda a sábado)
      if (massTime.dayOfWeek >= 1 && massTime.dayOfWeek <= 6) {
        // 🔥 CRITICAL FIX: Para missas ESPECIAIS em dias de semana (festa, novena, cura, etc.),
        // NÃO verificar dailyMassAvailability! A disponibilidade específica já foi checada acima.
        if (massTime.type && massTime.type !== 'missa_diaria') {
          console.log(`[AVAILABILITY_CHECK] ⏭️  ${minister.name}: Missa especial em dia de semana (${massTime.type}), pulando verificação de dailyMassAvailability`);
          // A disponibilidade específica para o evento já foi verificada em isAvailableForSpecialMass
          // Continuar para permitir que ministros participem de eventos especiais
          // mesmo que não estejam disponíveis para missas diárias regulares
          return true;
        }

        // Para MISSAS DIÁRIAS REGULARES (06:30), verificar disponibilidade do dia da semana
        console.log(`[AVAILABILITY_CHECK] Verificando disponibilidade diária para ${minister.name}`);

        const weekdayDateTimeKey = `${massTime.date} ${massTime.time}`;
        if (availability.weekdayMasses && availability.weekdayMasses.length > 0) {
          const hasSpecificAvailability = availability.weekdayMasses.includes(weekdayDateTimeKey);
          console.log(`[AVAILABILITY_CHECK] ${minister.name}: weekdayMasses entries = ${availability.weekdayMasses.length}, procurando ${weekdayDateTimeKey} -> ${hasSpecificAvailability}`);
          if (hasSpecificAvailability) {
            console.log(`[AVAILABILITY_CHECK] ✅ ${minister.name} possui disponibilidade específica para ${weekdayDateTimeKey}`);
            return true;
          }
        }

        // 🔧 FIX: Usar dados JÁ PROCESSADOS em availabilityData ao invés de reprocessar JSON
        // Os dados corretos já estão em availability.dailyMassAvailability
        if (!availability.dailyMassAvailability || availability.dailyMassAvailability.length === 0) {
          console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} não tem dailyMassAvailability`);
          return false;
        }

        // Mapear dayOfWeek (0-6) para nome do dia
        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const weekdayNamesAlt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const currentDayName = weekdayNames[massTime.dayOfWeek];
        const currentDayNameAlt = weekdayNamesAlt[massTime.dayOfWeek];

        // Verificar se o ministro marcou este dia como disponível
        const isAvailableForDay = availability.dailyMassAvailability.some(day => {
          const dayLower = day.toLowerCase();
          return dayLower === currentDayName.toLowerCase() ||
                 dayLower === currentDayNameAlt.toLowerCase() ||
                 dayLower.includes(currentDayName.toLowerCase());
        });

        console.log(`[AVAILABILITY_CHECK] ${minister.name}: dailyMassAvailability = ${availability.dailyMassAvailability.join(', ')}`);
        console.log(`[AVAILABILITY_CHECK] ${minister.name}: Procurando por "${currentDayName}" ou "${currentDayNameAlt}"`);
        console.log(`[AVAILABILITY_CHECK] ${minister.name} ${isAvailableForDay ? '✅ DISPONÍVEL' : '❌ NÃO disponível'} para ${dayName} (${massTime.date})`);

        return isAvailableForDay;
      }

      // Para outros casos, considerar disponível se tem resposta
      console.log(`[AVAILABILITY_CHECK] ✅ ${minister.name} disponível (outros casos)`);
      return true;
    });

    console.log(`\n[AVAILABILITY_CHECK] 📋 RESULTADO: ${availableList.length} ministros disponíveis de ${this.ministers.length} total`);
    if (availableList.length > 0) {
      console.log(`[AVAILABILITY_CHECK] Ministros disponíveis: ${availableList.map(m => m.name).join(', ')}`);
    }
    console.log(`[AVAILABILITY_CHECK] ========================================\n`);
    
    return availableList;
  }

  /**
   * Verifica se o ministro está disponível para um tipo específico de missa
   * Agora suporta verificação por horário específico para missas de São Judas
   */
  private isAvailableForSpecialMass(ministerId: string, massType: string, massTime?: string, massDate?: string): boolean {
    const availability = this.availabilityData.get(ministerId);
    if (!availability) {
      console.log(`[SPECIAL_MASS] ❌ ${ministerId}: No availability data for ${massType}`);
      return false;
    }

    // Log para debug
    if (massType === 'missa_sao_judas_festa') {
      console.log(`[SPECIAL_MASS] 🔍 Checking ${ministerId} for ${massType} at ${massDate} ${massTime}`);
    }

    // Para missas diárias regulares, verificar disponibilidade geral (não por dia específico)
    if (massType === 'missa_diaria') {
      // Se marcou explicitamente "Não posso", não está disponível
      if (availability.dailyMassAvailability?.includes('Não posso')) {
        console.log(`[SCHEDULE_GEN] ${ministerId} marcou "Não posso" para missas diárias`);
        return false;
      }
      // Se tem ALGUMA disponibilidade para missas diárias, considerar disponível
      // A verificação do dia específico será feita depois em getAvailableMinistersForMass
      const hasAnyDailyAvailability = availability.dailyMassAvailability && 
                                      availability.dailyMassAvailability.length > 0;
      console.log(`[SCHEDULE_GEN] ${ministerId} tem disponibilidade diária: ${hasAnyDailyAvailability}`);
      return hasAnyDailyAvailability;
    }

    // 🔥 CHECK FOR CUSTOM EVENTS: If massType starts with "custom_" or is a known special event ID, check directly
    const specialEvents = availability.specialEvents;

    // If this is a custom event, check directly in specialEvents
    if (massType.startsWith('custom_') || massType.startsWith('healing_liberation') ||
        massType.startsWith('sacred_heart') || massType.startsWith('immaculate_heart') ||
        massType === 'special_event_1' || massType.startsWith('adoration_')) {
      if (specialEvents && typeof specialEvents === 'object') {
        const response = specialEvents[massType];
        const isAvailable = response === 'Sim' || response === 'sim' || response === true || response === 'true' || response === 1;
        console.log(`[SPECIAL_MASS] 🎯 ${ministerId} for CUSTOM event ${massType}: ${response} = ${isAvailable}`);
        return isAvailable;
      }
      console.log(`[SPECIAL_MASS] ❌ ${ministerId}: No special events data for ${massType}`);
      return false;
    }

    // 🔥 CRITICAL FIX: Mapear tipos de missa para campos CORRETOS do questionário v2.0
    const massTypeMapping: { [key: string]: string } = {
      'missa_cura_libertacao': 'healing_liberation',     // v2.0: healing_liberation (não healing_liberation_mass!)
      'missa_sagrado_coracao': 'first_friday',           // v2.0: first_friday (não sacred_heart_mass!)
      'missa_imaculado_coracao': 'first_saturday',       // v2.0: first_saturday (não immaculate_heart_mass!)
      'missa_sao_judas': 'saint_judas_novena'
    };

    // Para missas de São Judas festa, mapear o horário específico
    if (massType === 'missa_sao_judas_festa' && massTime && massDate) {
      console.log(`[SPECIAL_MASS] 📦 Special events for ${ministerId}:`, typeof specialEvents, specialEvents ? Object.keys(specialEvents) : 'null');

      if (specialEvents && typeof specialEvents === 'object') {
        console.log(`[SPECIAL_MASS] 🔑 saint_judas_feast exists:`, !!specialEvents.saint_judas_feast, typeof specialEvents.saint_judas_feast);
        // 🔥 CRITICAL FIX: Para v2.0, procurar em saint_judas_feast com datetime key
        if (specialEvents.saint_judas_feast && typeof specialEvents.saint_judas_feast === 'object') {
          const datetimeKey = `${massDate}_${massTime}`; // e.g., "2025-10-28_10:00"
          console.log(`[SPECIAL_MASS] ✅ Checking key: ${datetimeKey}`);
          let response = specialEvents.saint_judas_feast[datetimeKey];

          // Também suportar estrutura aninhada { '2025-10-28': { '12:00': true } }
          if (response === undefined) {
            const nestedByDate = specialEvents.saint_judas_feast[massDate];
            if (nestedByDate && typeof nestedByDate === 'object') {
              const normalizedTime = massTime.padStart(5, '0');
              response = nestedByDate[massTime] ?? nestedByDate[normalizedTime];
            }
          }

          console.log(`[SPECIAL_MASS] 📍 Response value:`, response, typeof response);
          const isAvailable = response === true || response === 'Sim' || response === 'sim' || response === 'true' || response === 1;
          console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} para ${massType} (${datetimeKey}): ${response} = ${isAvailable}`);
          if (isAvailable) {
            return true;
          }
        }

        // 🔄 FALLBACK: Para formato legacy, procurar por questionKey
        const timeToQuestionKey: { [key: string]: string } = {
          '07:00': 'saint_judas_feast_7h',
          '10:00': 'saint_judas_feast_10h',
          '12:00': 'saint_judas_feast_12h',
          '15:00': 'saint_judas_feast_15h',
          '17:00': 'saint_judas_feast_17h',
          '19:30': 'saint_judas_feast_evening'
        };

        const questionKey = timeToQuestionKey[massTime];
        if (questionKey) {
          const response = specialEvents[questionKey];
          const isAvailable = response === 'Sim' || response === 'sim' || response === true || response === 'true' || response === 1;
          console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} para ${massType} (legacy ${questionKey}): ${response} = ${isAvailable}`);
          return isAvailable;
        }
      }
    }

    const questionKey = massTypeMapping[massType];
    if (!questionKey) {
      // 🔧 FIX: Tipos regulares (domingos, diárias) são verificados por dia/horário depois
      // Tipos de São Judas têm verificação própria
      // Qualquer outro tipo: verificar se há resposta específica em specialEvents
      const regularTypes = ['missa_dominical', 'missa_diaria', 'missa', 'missa_sao_judas', 'missa_sao_judas_festa', 
                           'missa_finados', 'missa_puc', 'missa_sao_judas_mensal', 'adoracao_santissimo'];
      if (regularTypes.includes(massType)) {
        console.log(`[SPECIAL_MASS] ℹ️ Tipo regular ${massType}, verificação por dia/horário`);
        return true;
      }
      
      // Para tipos desconhecidos, verificar se existe resposta direta em specialEvents
      if (specialEvents && typeof specialEvents === 'object' && specialEvents[massType] !== undefined) {
        const response = specialEvents[massType];
        const isAvailable = response === 'Sim' || response === 'sim' || response === true || response === 'true' || response === 1;
        console.log(`[SPECIAL_MASS] 🎯 ${ministerId} para tipo ${massType}: ${response} = ${isAvailable}`);
        return isAvailable;
      }
      
      // Tipo desconhecido sem resposta - não disponível
      console.log(`[SPECIAL_MASS] ❌ Tipo ${massType} sem resposta específica`);
      return false;
    }

    // Se temos dados de eventos especiais, verificar (specialEvents já declarado acima)
    if (specialEvents && typeof specialEvents === 'object') {
      const response = specialEvents[questionKey];

      // 🔧 CRITICAL FIX: Para novena de São Judas, suportar AMBOS formatos (v2.0 e legacy)
      if (questionKey === 'saint_judas_novena' && Array.isArray(response)) {
        console.log(`[NOVENA_CHECK] 🔍 Checking novena availability for minister ${ministerId}`);
        console.log(`[NOVENA_CHECK] 📅 Mass date: ${massDate}, time: ${massTime}`);
        console.log(`[NOVENA_CHECK] 📋 Novena responses: ${JSON.stringify(response)}`);

        if (massDate && massTime) {
          // Verificar se algum item do array corresponde à data/horário da missa
          const isAvailable = response.some((dateTimeStr: string) => {
            // 🔧 FORMAT 1: V2.0 exact match (ISO format: "2025-10-20_19:30")
            const massDateTime = `${massDate}_${massTime}`;
            if (dateTimeStr === massDateTime) {
              console.log(`[NOVENA_CHECK]    - "${dateTimeStr}" ✅ EXACT MATCH (v2.0 format)`);
              return true;
            }

            // 🔧 FORMAT 2: Legacy format - extract day from "Terça 20/10 às 19h30"
            const legacyMatch = dateTimeStr.match(/(\d{1,2})\/10/);
            if (legacyMatch) {
              const dayOfMonth = parseInt(massDate.split('-')[2]);
              const responseDay = parseInt(legacyMatch[1]);
              const matches = responseDay === dayOfMonth;
              console.log(`[NOVENA_CHECK]    - "${dateTimeStr}" → day ${responseDay} ${matches ? '✅ MATCH (legacy)' : '❌'}`);
              return matches;
            }

            console.log(`[NOVENA_CHECK]    - "${dateTimeStr}" ❌ no match`);
            return false;
          });

          console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} novena ${massDate} ${massTime}: ${isAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
          return isAvailable;
        }
        // Se não temos data, mas tem respostas, considerar disponível
        return response.length > 0 && !response.includes('Nenhum dia');
      }

      // 🔧 CORREÇÃO: Aceitar tanto strings quanto booleanos para outros eventos
      const isAvailable = response === 'Sim' || response === 'sim' || response === true || response === 'true' || response === 1;
      // "Não", false, null, undefined = não disponível
      console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} para ${massType} (${questionKey}): ${response} = ${isAvailable}`);
      return isAvailable;
    }

    // Se não há dados específicos, mas é uma missa especial conhecida
    // usar lógica padrão baseada em disponibilidade geral
    console.log(`[SCHEDULE_GEN] ℹ️ Usando disponibilidade geral para ${massType}`);
    return false; // Alterado: Se não tem resposta explícita, não está disponível
  }

  /**
   * 🔥 FAIR ALGORITHM: Seleciona ministros garantindo distribuição justa
   * - Hard limit: 4 assignments per month
   * - Prevents same minister serving twice on same day
   * - 👨‍👩‍👧‍👦 GROUPS families together when prefer_serve_together is true
   * - Sorts by assignment count (least assigned first)
   * - Ensures everyone gets at least 1 before anyone gets 3
   * - ⛪ SUNDAY PRIORITIZATION: For Sunday Masses, prioritizes ministers whose
   *   preferredTimes matches the Mass time (Tier A) before considering other
   *   available ministers (Tier B)
   */
  private selectOptimalMinisters(available: Minister[], massTime: MassTime): Minister[] {
    const targetCount = massTime.minMinisters;
    const MAX_MONTHLY_ASSIGNMENTS = 4;

    // 🔥 CORREÇÃO CRÍTICA: Missas diárias não contam para o limite de 4 atribuições!
    // Quando um ministro marca disponibilidade para dias da semana, ele está se disponibilizando
    // para TODOS aqueles dias no mês, não apenas para 4 vezes.
    const isDailyMass = massTime.type === 'missa_diaria';
    
    // ⛪ SUNDAY PRIORITIZATION: Separate ministers by preferred time match
    const isSunday = massTime.dayOfWeek === 0;

    console.log(`\n[FAIR_ALGORITHM] ========================================`);
    console.log(`[FAIR_ALGORITHM] Selecting for ${massTime.date} ${massTime.time} (${massTime.type})`);
    console.log(`[FAIR_ALGORITHM] Target: ${targetCount} ministers`);
    console.log(`[FAIR_ALGORITHM] Available pool: ${available.length} ministers`);
    console.log(`[FAIR_ALGORITHM] Is daily mass (no monthly limit): ${isDailyMass}`);
    console.log(`[FAIR_ALGORITHM] Is Sunday (prioritize preferredTimes): ${isSunday}`);

    // ⛪ SUNDAY PRIORITIZATION: Separate into Tier A (preferred time match) and Tier B (alternatives)
    let tierA: Minister[] = [];
    let tierB: Minister[] = [];
    
    if (isSunday) {
      // Helper function to check if mass time matches preferred times
      const matchesPreferredTime = (minister: Minister): boolean => {
        if (!minister.preferredTimes || minister.preferredTimes.length === 0) return false;
        
        // Check if any preferred time matches this mass time
        // preferredTimes can be in formats: "08:00", "8:00", "08:00:00"
        return minister.preferredTimes.some(prefTime => {
          const normalizedPref = prefTime.trim();
          const normalizedMass = massTime.time.trim();
          
          // Direct match
          if (normalizedPref === normalizedMass) return true;
          
          // Try matching without seconds
          const prefHM = normalizedPref.substring(0, 5);
          const massHM = normalizedMass.substring(0, 5);
          return prefHM === massHM;
        });
      };
      
      tierA = available.filter(m => matchesPreferredTime(m));
      tierB = available.filter(m => !matchesPreferredTime(m));
      
      console.log(`[SUNDAY_PRIORITY] ⛪ Tier A (preferred time ${massTime.time}): ${tierA.length} ministers`);
      console.log(`[SUNDAY_PRIORITY] Tier A ministers: ${tierA.map(m => m.name).join(', ')}`);
      console.log(`[SUNDAY_PRIORITY] ⛪ Tier B (alternatives): ${tierB.length} ministers`);
    }
    
    // For processing, we'll use tiered approach for Sundays, normal flow for other days
    const poolToProcess = isSunday ? tierA : available;

    // 1. Filter out ministers who:
    //    - Already reached monthly limit (4 assignments) - EXCETO para missas diárias
    //    - Already served on this date
    const eligible = poolToProcess.filter(minister => {
      if (!minister.id) return false; // Skip VACANTE

      const assignmentCount = minister.monthlyAssignmentCount || 0;
      const alreadyServedToday = minister.lastAssignedDate === massTime.date;

      // Hard limit check - MAS NÃO para missas diárias!
      if (!isDailyMass && assignmentCount >= MAX_MONTHLY_ASSIGNMENTS) {
        console.log(`[FAIR_ALGORITHM] ❌ ${minister.name}: LIMIT REACHED (${assignmentCount}/${MAX_MONTHLY_ASSIGNMENTS})`);
        return false;
      }

      // Same-day duplicate check
      if (alreadyServedToday) {
        console.log(`[FAIR_ALGORITHM] ❌ ${minister.name}: ALREADY SERVED TODAY (${massTime.date})`);
        return false;
      }

      if (isDailyMass) {
        console.log(`[FAIR_ALGORITHM] ✅ ${minister.name}: Eligible for DAILY MASS (${assignmentCount} total assignments)`);
      } else {
        console.log(`[FAIR_ALGORITHM] ✅ ${minister.name}: Eligible (${assignmentCount}/${MAX_MONTHLY_ASSIGNMENTS} assignments)`);
      }
      return true;
    });

    console.log(`[FAIR_ALGORITHM] Eligible after filters: ${eligible.length}/${available.length}`);

    if (eligible.length === 0) {
      logger.error(`[FAIR_ALGORITHM] ❌ NO ELIGIBLE MINISTERS for ${massTime.date} ${massTime.time}!`);
      return [];
    }

    // 2. 🤖 ADAPTIVE LEARNING: Sort by final score (reliability + availability + preference + fairness)
    const sorted = [...eligible].sort((a, b) => {
      const scoreA = this.calculateFinalMinisterScore(a, massTime);
      const scoreB = this.calculateFinalMinisterScore(b, massTime);

      // Higher score = better candidate (descending sort)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Tie-breaker 1: Monthly assignment count (fewer is better for fairness)
      const countA = a.monthlyAssignmentCount || 0;
      const countB = b.monthlyAssignmentCount || 0;
      if (countA !== countB) {
        return countA - countB;
      }

      // Tie-breaker 2: Last service date (older first)
      const lastServiceA = a.lastService ? a.lastService.getTime() : 0;
      const lastServiceB = b.lastService ? b.lastService.getTime() : 0;
      return lastServiceA - lastServiceB;
    });

    console.log(`[FAIR_ALGORITHM] 📊 Sorted by assignment count:`);
    sorted.slice(0, 10).forEach(m => {
      console.log(`  ${m.name}: ${m.monthlyAssignmentCount || 0} assignments this month`);
    });

    // 3. 👨‍👩‍👧‍👦 SELECT MINISTERS: Prioritize family groups first, then individuals
    const selected: Minister[] = [];
    const used = new Set<string>();
    const processedFamilies = new Set<string>();

    // PHASE 1: Process families that prefer to serve together
    console.log(`\n[FAMILY_SYSTEM] 👨‍👩‍👧‍👦 Phase 1: Processing families that prefer to serve together...`);
    for (const minister of sorted) {
      if (!minister.id || used.has(minister.id)) continue;
      if (selected.length >= targetCount) break;

      // Check if minister has a family and family wants to serve together
      if (minister.familyId && this.familyGroups.has(minister.familyId)) {
        const familyId = minister.familyId;

        // Skip if we already processed this family
        if (processedFamilies.has(familyId)) continue;

        // Check family preference
        const preferTogether = this.familyPreferences.get(familyId) ?? true;

        if (preferTogether) {
          // Get all family members who are in the eligible pool
          const familyMemberIds = this.familyGroups.get(familyId)!;
          const availableFamilyMembers = sorted.filter(m =>
            m.id && familyMemberIds.includes(m.id) && !used.has(m.id)
          );

          if (availableFamilyMembers.length > 0) {
            const familyNames = availableFamilyMembers.map(m => m.name).join(' & ');

            // Try to add all available family members together
            let addedCount = 0;
            for (const familyMember of availableFamilyMembers) {
              if (selected.length >= targetCount) break;

              selected.push(familyMember);
              used.add(familyMember.id!);

              // Update counters
              familyMember.monthlyAssignmentCount = (familyMember.monthlyAssignmentCount || 0) + 1;
              familyMember.lastAssignedDate = massTime.date;

              addedCount++;
            }

            console.log(`[FAMILY_SYSTEM] ✅ Assigned family together: ${familyNames} (${addedCount} members)`);
            processedFamilies.add(familyId);
          }
        }
      }
    }

    // PHASE 2: Fill remaining spots with individuals
    console.log(`\n[FAIR_ALGORITHM] Phase 2: Filling remaining spots with individual ministers...`);
    console.log(`[FAIR_ALGORITHM] Current: ${selected.length}/${targetCount} ministers selected`);

    for (const minister of sorted) {
      if (!minister.id) continue;
      if (selected.length >= targetCount) break;
      if (used.has(minister.id)) continue;

      // Skip if minister is in a family that prefers to serve together
      // but wasn't fully available (so we don't break up the family)
      if (minister.familyId && this.familyGroups.has(minister.familyId)) {
        const familyId = minister.familyId;
        const preferTogether = this.familyPreferences.get(familyId) ?? true;

        if (preferTogether && !processedFamilies.has(familyId)) {
          // Family wants to serve together but wasn't processed yet
          // This means not all members were available, so skip this member
          console.log(`[FAMILY_SYSTEM] ⏭️  Skipping ${minister.name}: Family prefers to serve together`);
          continue;
        }

        // If family prefers separate service, or was already processed, allow individual assignment
        if (!preferTogether) {
          console.log(`[FAMILY_SYSTEM] ✅ ${minister.name}: Family prefers separate service, can serve individually`);
        }
      }

      selected.push(minister);
      used.add(minister.id);

      // 🔥 UPDATE COUNTERS IMMEDIATELY
      minister.monthlyAssignmentCount = (minister.monthlyAssignmentCount || 0) + 1;
      minister.lastAssignedDate = massTime.date;

      console.log(`[FAIR_ALGORITHM] ✅ Selected ${minister.name} (now ${minister.monthlyAssignmentCount}/${MAX_MONTHLY_ASSIGNMENTS})`);
    }

    // 4. Check if target was met
    if (selected.length < targetCount) {
      const shortage = targetCount - selected.length;
      
      // ⛪ SUNDAY PRIORITIZATION: If we're on Sunday and didn't fill all spots with Tier A,
      // try to fill remaining spots with Tier B (alternative ministers)
      if (isSunday && tierB.length > 0) {
        console.log(`\n[SUNDAY_PRIORITY] ⛪ Tier A incomplete (${selected.length}/${targetCount})`);
        console.log(`[SUNDAY_PRIORITY] 🔄 Attempting to fill ${shortage} spots with Tier B (alternatives)...`);
        
        // Process Tier B using same logic (filter for eligibility, sort, select)
        const eligibleTierB = tierB.filter(minister => {
          if (!minister.id) return false;
          const assignmentCount = minister.monthlyAssignmentCount || 0;
          const alreadyServedToday = minister.lastAssignedDate === massTime.date;
          
          if (!isDailyMass && assignmentCount >= MAX_MONTHLY_ASSIGNMENTS) return false;
          if (alreadyServedToday) return false;
          if (used.has(minister.id)) return false;
          
          return true;
        });
        
        const sortedTierB = [...eligibleTierB].sort((a, b) => {
          const countA = a.monthlyAssignmentCount || 0;
          const countB = b.monthlyAssignmentCount || 0;
          if (countA !== countB) return countA - countB;
          
          const lastServiceA = a.lastService ? a.lastService.getTime() : 0;
          const lastServiceB = b.lastService ? b.lastService.getTime() : 0;
          if (lastServiceA !== lastServiceB) return lastServiceA - lastServiceB;
          
          return a.totalServices - b.totalServices;
        });
        
        console.log(`[SUNDAY_PRIORITY] Tier B eligible: ${eligibleTierB.length} ministers`);
        
        // Select from Tier B to fill remaining spots
        for (const minister of sortedTierB) {
          if (selected.length >= targetCount) break;
          if (!minister.id || used.has(minister.id)) continue;
          
          // Check family constraints
          if (minister.familyId && this.familyGroups.has(minister.familyId)) {
            const familyId = minister.familyId;
            const preferTogether = this.familyPreferences.get(familyId) ?? true;
            if (preferTogether && !processedFamilies.has(familyId)) {
              console.log(`[SUNDAY_PRIORITY] ⏭️  Skipping ${minister.name}: Family prefers to serve together`);
              continue;
            }
          }
          
          selected.push(minister);
          used.add(minister.id);
          minister.monthlyAssignmentCount = (minister.monthlyAssignmentCount || 0) + 1;
          minister.lastAssignedDate = massTime.date;
          
          console.log(`[SUNDAY_PRIORITY] ✅ Selected from Tier B: ${minister.name} (alternative time, now ${minister.monthlyAssignmentCount}/${MAX_MONTHLY_ASSIGNMENTS})`);
        }
        
        if (selected.length >= targetCount) {
          console.log(`[SUNDAY_PRIORITY] ✅ SUCCESS: Filled all ${targetCount} spots (Tier A + Tier B)`);
        } else {
          console.log(`[SUNDAY_PRIORITY] ⚠️ Still incomplete: ${selected.length}/${targetCount} after Tier B`);
        }
      }
      
      // Final check after potential Tier B fill
      if (selected.length < targetCount) {
        const finalShortage = targetCount - selected.length;
        logger.warn(`⚠️ [FAIR_ALGORITHM] INCOMPLETE: ${selected.length}/${targetCount} (short by ${finalShortage})`);
        console.log(`[FAIR_ALGORITHM] ⚠️ INCOMPLETE: ${selected.length}/${targetCount}`);
        console.log(`[FAIR_ALGORITHM] Reason: Only ${eligible.length} eligible ministers available`);

        // Mark as incomplete
        selected.forEach(m => {
          m.scheduleIncomplete = true;
          m.requiredCount = targetCount;
          m.actualCount = selected.length;
        });
      }
    } else {
      console.log(`[FAIR_ALGORITHM] ✅ SUCCESS: Selected ${selected.length}/${targetCount} ministers`);
    }

    // 5. Log final distribution stats
    const distributionMap = new Map<number, number>();
    this.ministers.forEach(m => {
      const count = m.monthlyAssignmentCount || 0;
      distributionMap.set(count, (distributionMap.get(count) || 0) + 1);
    });

    console.log(`[FAIR_ALGORITHM] 📊 Current monthly distribution:`);
    for (let i = 0; i <= MAX_MONTHLY_ASSIGNMENTS; i++) {
      const ministersWithCount = distributionMap.get(i) || 0;
      console.log(`  ${i} assignments: ${ministersWithCount} ministers`);
    }
    console.log(`[FAIR_ALGORITHM] ========================================\n`);

    return selected;
  }

  /**
   * Seleciona ministros de backup - TODOS os disponíveis que não foram escalados
   * 
   * CORREÇÃO: O backup deve listar TODOS os ministros que deram disponibilidade
   * para aquela missa mas não foram escalados porque a cota já estava preenchida.
   * Removido o limite de "count" para mostrar todos.
   */
  private selectBackupMinisters(available: Minister[], selected: Minister[]): Minister[] {
    const selectedIds = new Set(selected.map(m => m.id).filter(id => id !== null));
    
    // Retorna TODOS os ministros disponíveis que não foram selecionados
    // Ordenados por nome para facilitar a leitura (não por score)
    const backup = available
      .filter(m => m.id && !selectedIds.has(m.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    console.log(`[BACKUP] 📋 ${backup.length} ministros disponíveis não escalados (backup completo)`);
    
    return backup;
  }

  /**
   * Calcula pontuação de um ministro para uma missa específica
   */
  private calculateMinisterScore(minister: Minister, massTime: MassTime | null): number {
    let score = 0;

    // 1. Balanceamento por frequência de serviço (40% do peso)
    // 🔥 CRASH FIX: Guard against division by zero
    const avgServices = this.ministers.length > 0
      ? this.ministers.reduce((sum, m) => sum + m.totalServices, 0) / this.ministers.length
      : 0;
    const serviceBalance = Math.max(0, avgServices - minister.totalServices);
    score += serviceBalance * 0.4;

    // 2. Tempo desde último serviço (30% do peso)
    if (minister.lastService) {
      const daysSinceLastService = Math.floor(
        (Date.now() - minister.lastService.getTime()) / (1000 * 60 * 60 * 24)
      );
      score += Math.min(daysSinceLastService / 30, 2) * 0.3; // Máximo 2 pontos para 30+ dias
    } else {
      score += 0.3; // Bonus para quem nunca serviu
    }

    // 3. Preferência de horário (30% do peso - aumentado para forçar diversificação)
    // 🔥 FIX: Now considers alternativeTimes as a secondary preference
    if (massTime && minister.id) {
      const availability = this.availabilityData.get(minister.id);
      const timeHour = `${massTime.time.substring(0, 2)}h`;

      if (availability?.preferredMassTimes.includes(timeHour)) {
        // Bonus maior para preferência exata de horário
        score += 0.5;
      } else if (availability?.alternativeTimes?.includes(timeHour)) {
        // 🔥 FIX: Bonus for alternative time (smaller than preferred, but positive)
        // This means the minister indicated they CAN serve at this time
        score += 0.2;
      } else if (availability?.preferredMassTimes && availability.preferredMassTimes.length > 0) {
        // Penalidade apenas se NÃO está nos horários alternativos
        score -= 0.3;
      }
    }

    // 4. Disponibilidade para substituição (10% do peso)
    if (minister.id) {
      const availability = this.availabilityData.get(minister.id);
      if (availability?.canSubstitute) {
        score += 0.1;
      }
    }
    
    // 5. Penalidade para ministros já escalados no mesmo dia (40% do peso - FORTE penalidade)
    if (massTime && massTime.date && minister.id) {
      const dayAssignments = this.dailyAssignments.get(massTime.date);
      if (dayAssignments && dayAssignments.has(minister.id)) {
        score -= 0.8; // Penalidade muito forte para evitar duplicações no mesmo domingo
        console.log(`[SCHEDULE_GEN] ⚠️ Penalidade aplicada a ${minister.name} - já escalado hoje (${massTime.date})`);
      }
    }

    // 6. Bônus de santo (20% do peso) - Preferência para ministros com nome do santo do dia
    if (massTime && massTime.date && minister.id) {
      const cacheKey = `${minister.id}:${massTime.date}`;
      const saintBonus = this.saintBonusCache.get(cacheKey) || 0;
      if (saintBonus > 0) {
        const bonusPoints = saintBonus * 0.2; // 20% do peso total
        score += bonusPoints;
        console.log(`[SCHEDULE_GEN] ⭐ Bônus de santo para ${minister.name} em ${massTime.date}: +${bonusPoints.toFixed(2)} (score total: ${score.toFixed(2)})`);
      }
    }

    return score;
  }

  /**
   * Calcula confiança na escala gerada
   */
  private calculateScheduleConfidence(ministers: Minister[], massTime: MassTime): number {
    let confidence = 0;

    // 1. Cobertura adequada (60% do peso) - MAIS IMPORTANTE
    // 🔥 CRASH FIX: Guard against division by zero
    const fillRate = massTime.minMinisters > 0
      ? ministers.length / massTime.minMinisters
      : 0;

    if (fillRate >= 1.0) {
      // Atingiu o mínimo necessário
      confidence += 0.6;
      if (ministers.length > massTime.minMinisters) {
        confidence += 0.05; // Pequeno bônus por ministros extras
      }
    } else {
      // NÃO atingiu o mínimo - penalizar proporcionalmente
      confidence += fillRate * 0.3; // Máximo de 30% se não atingir mínimo
      console.log(`[CONFIDENCE] ⚠️ Escala incompleta: ${ministers.length}/${massTime.minMinisters} (${(fillRate * 100).toFixed(0)}%)`);
    }

    // 2. Qualidade dos ministros escalados (25% do peso)
    // 🔥 CRASH FIX: Already has length check, but add explicit guard
    if (ministers.length > 0) {
      const avgScore = ministers.reduce((sum, m) => sum + m.preferenceScore, 0) / ministers.length;
      confidence += Math.min(avgScore / 10, 0.25);
    }

    // 3. Balanceamento (15% do peso)
    const serviceVariance = this.calculateServiceVariance(ministers);
    confidence += Math.max(0, 0.15 - serviceVariance / 100);

    // Limitar confiança máxima para escalas incompletas
    if (fillRate < 1.0) {
      confidence = Math.min(confidence, 0.5); // Máximo 50% para escalas incompletas
    }

    return Math.min(confidence, 1);
  }

  /**
   * Funções auxiliares
   */
  private calculateAvailabilityScore(minister: { totalServices: number | null }): number {
    return minister.totalServices || 0;
  }

  private calculatePreferenceScore(minister: {
    preferredTimes?: string[] | unknown;
    canServeAsCouple?: boolean | null;
    reliabilityScore?: number | null
  }): number {
    const preferredTimes = Array.isArray(minister.preferredTimes) ? minister.preferredTimes : [];
    const basePreference = preferredTimes.length + (minister.canServeAsCouple ? 2 : 0);

    // 🤖 ADAPTIVE LEARNING: Include reliability score (normalized to 0-10 scale)
    const reliabilityBonus = Math.floor((minister.reliabilityScore || 100) / 10);

    return basePreference + reliabilityBonus;
  }

  /**
   * 🤖 ADAPTIVE LEARNING: Calculate final minister score for selection
   * Combines availability, preference, reliability, and fairness
   */
  private calculateFinalMinisterScore(minister: Minister, massTime?: MassTime): number {
    const availabilityScore = this.calculateAvailabilityScore(minister);
    const preferenceScore = this.calculatePreferenceScore(minister);
    const reliabilityScore = minister.reliabilityScore || 100;
    const monthlyCount = minister.monthlyAssignmentCount || 0;

    // Weighted formula:
    // 40% Reliability (adaptive learning - behavior pattern)
    // 30% Availability (historical service count)
    // 20% Preference (minister preferences)
    // 10% Fairness (avoid overloading same ministers)

    const fairnessScore = Math.max(0, 100 - (monthlyCount * 15)); // Reduce score for ministers with many assignments

    const finalScore =
      (reliabilityScore * 0.4) +
      (Math.min(availabilityScore, 100) * 0.3) +
      (Math.min(preferenceScore, 100) * 0.2) +
      (fairnessScore * 0.1);

    // 🚨 SEVERE PENALTY for low reliability (similar to shadowban)
    if (reliabilityScore < 50) {
      console.log(`[ADAPTIVE] ⚠️ ${minister.name} has LOW reliability (${reliabilityScore}) - marking as LAST RESORT`);
      return finalScore * 0.5; // 50% penalty - goes to end of line
    }

    // 🎯 BONUS for excellent reliability
    if (reliabilityScore >= 95) {
      console.log(`[ADAPTIVE] ✅ ${minister.name} has EXCELLENT reliability (${reliabilityScore}) - priority boost`);
      return finalScore * 1.1; // 10% bonus
    }

    return finalScore;
  }

  private calculateServiceVariance(ministers: Minister[]): number {
    const services = ministers.map(m => m.totalServices);
    // 🔥 CRASH FIX: Guard against division by zero
    if (services.length === 0) return 0;

    const avg = services.reduce((sum, s) => sum + s, 0) / services.length;
    const variance = services.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / services.length;
    return Math.sqrt(variance);
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayOfWeek];
  }

  /**
   * Get which Monday of the month this date is (1st, 2nd, 3rd, 4th, or 5th)
   */
  private getMondayWeekNumber(date: Date): number {
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Find first Monday
    let firstMonday = new Date(firstDayOfMonth);
    while (firstMonday.getDay() !== 1) {
      firstMonday = addDays(firstMonday, 1);
    }
    
    // Count how many weeks from first Monday
    const daysDiff = Math.floor((date.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    
    return weekNumber;
  }

  /**
   * Get ministers selected in the adoration draw for a specific Monday
   */
  private async getAdorationMinistersForMonday(year: number, month: number, mondayOfWeek: number): Promise<Minister[]> {
    if (!this.db) {
      console.log('[ADORATION] Database not available, skipping adoration ministers');
      return [];
    }

    try {
      // 1. Find the draw for this month
      const [draw] = await this.db
        .select()
        .from(adorationDraws)
        .where(
          and(
            eq(adorationDraws.year, year),
            eq(adorationDraws.month, month)
          )
        )
        .limit(1);

      if (!draw) {
        console.log(`[ADORATION] No draw found for ${month}/${year}`);
        return [];
      }

      // 2. Get ministers selected for this specific Monday
      const results = await this.db
        .select({
          ministerId: adorationDrawResults.ministerId,
          isVoluntary: adorationDrawResults.isVoluntary
        })
        .from(adorationDrawResults)
        .where(
          and(
            eq(adorationDrawResults.drawId, draw.id),
            eq(adorationDrawResults.mondayOfWeek, mondayOfWeek)
          )
        );

      if (results.length === 0) {
        console.log(`[ADORATION] No ministers assigned for week ${mondayOfWeek} of ${month}/${year}`);
        return [];
      }

      // 3. Get full minister data
      type DrawResult = typeof results[number];
      const ministerIds = results.map((r: DrawResult) => r.ministerId);
      const ministersData = await this.db
        .select()
        .from(users)
        .where(and(
          inArray(users.id, ministerIds),
          eq(users.status, 'active')
        ));

      // 4. Convert to Minister objects
      type MinisterRow = typeof ministersData[number];
      const ministers: Minister[] = ministersData.map((m: MinisterRow) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        totalServices: m.totalServices || 0,
        lastService: m.lastService,
        preferredTimes: (m.preferredTimes as string[]) || [],
        canServeAsCouple: m.canServeAsCouple || false,
        spouseMinisterId: m.spouseMinisterId,
        familyId: m.familyId,
        availabilityScore: 1.0, // Always available (drawn)
        preferenceScore: 1.0,
        monthlyAssignmentCount: 0
      }));

      const voluntaryCount = results.filter((r: DrawResult) => r.isVoluntary).length;
      const mandatoryCount = results.length - voluntaryCount;

      console.log(`[ADORATION] Found ${ministers.length} ministers for week ${mondayOfWeek}: ${voluntaryCount} voluntary, ${mandatoryCount} mandatory`);

      return ministers;

    } catch (error) {
      console.error('[ADORATION] Error loading ministers for adoration:', error);
      return [];
    }
  }
}

// Função de conveniência para uso direto
export async function generateAutomaticSchedule(year: number, month: number, isPreview: boolean = false): Promise<GeneratedSchedule[]> {
  const generator = new ScheduleGenerator();
  return await generator.generateScheduleForMonth(year, month, isPreview);
}
