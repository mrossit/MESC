import { logger } from './logger.js';
import { users, questionnaireResponses, questionnaires, schedules, massTimesConfig } from '@shared/schema';
import { eq, and, or, gte, lte, desc, sql, ne, count } from 'drizzle-orm';
import { format, addDays, startOfMonth, endOfMonth, getDay, getDate, isSaturday, isFriday, isThursday, isSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateSaintNameMatchBonus, loadAllSaintsData } from './saintNameMatching.js';
import { validateAndLogOctoberMasses, printOctoberScheduleComparison } from './octoberMassValidator.js';

// 🚨 DEBUG: CONFIRMAR QUE O CÓDIGO ATUALIZADO ESTÁ SENDO EXECUTADO
console.log('🚀 [SCHEDULE_GENERATOR] MÓDULO CARREGADO - VERSÃO COM FAIR ALGORITHM! Timestamp:', new Date().toISOString());

export interface Minister {
  id: string | null; // null = VACANTE
  name: string;
  role: string;
  totalServices: number;
  lastService: Date | null;
  preferredTimes: string[];
  canServeAsCouple: boolean;
  spouseMinisterId: string | null;
  availabilityScore: number;
  preferenceScore: number;
  position?: number; // Posição litúrgica atribuída
  // 🔥 FAIR ALGORITHM: Track monthly assignments
  monthlyAssignmentCount?: number; // Assignments in current month (max 4)
  lastAssignedDate?: string; // Last date this minister was assigned (YYYY-MM-DD)
}

export interface AvailabilityData {
  ministerId: string;
  availableSundays: string[];
  preferredMassTimes: string[];
  alternativeTimes: string[];
  canSubstitute: boolean;
  dailyMassAvailability: string[];
}

export interface MassTime {
  id: string;
  dayOfWeek: number; // 0=domingo, 1=segunda, etc
  time: string;
  minMinisters: number;
  maxMinisters: number;
  date?: string; // Para missas específicas
  type?: string; // Tipo da missa (missa_diaria, missa_dominical, etc)
}

export interface GeneratedSchedule {
  massTime: MassTime;
  ministers: Minister[];
  backupMinisters: Minister[];
  confidence: number; // 0-1 score de confiança na escalação
}

export class ScheduleGenerator {
  private ministers: Minister[] = [];
  private availabilityData: Map<string, AvailabilityData> = new Map();
  private massTimes: MassTime[] = [];
  private db: any;
  private dailyAssignments: Map<string, Set<string>> = new Map(); // Rastrear ministros já escalados por dia
  private saintBonusCache: Map<string, number> = new Map(); // Cache de bônus de santo: "ministerId:date" -> score
  private saintsData: Map<string, any[]> | null = null; // Cache de santos: "MM-DD" -> saints[]

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
      const monthlyMassTimes = this.generateMonthlyMassTimes(year, month);
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

      // 2.1. VALIDATE October masses if applicable
      if (month === 10) {
        console.log(`\n[SCHEDULE_GEN] 🔍 Validating October mass schedule...`);
        printOctoberScheduleComparison(monthlyMassTimes, year);
        const isValid = validateAndLogOctoberMasses(monthlyMassTimes, year);

        if (!isValid) {
          console.log(`[SCHEDULE_GEN] ⚠️ October validation found errors, but continuing with generation...`);
        }
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
      const ministersOver4 = this.ministers.filter(m => (m.monthlyAssignmentCount || 0) > 4);
      if (ministersOver4.length > 0) {
        bugsFound.push(`❌ ${ministersOver4.length} ministers served MORE than 4 times!`);
      }
      if (unused.length > this.ministers.length * 0.5) {
        bugsFound.push(`❌ More than 50% unused (${unused.length}/${this.ministers.length})`);
      }

      if (bugsFound.length > 0) {
        console.log(`\n  🚨 BUGS DETECTED:`);
        bugsFound.forEach(bug => console.log(`    ${bug}`));
      } else {
        console.log(`\n  ✅ NO CRITICAL BUGS DETECTED!`);
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
      console.log(`  Name: ${(error as any)?.name || 'Unknown'}`);
      console.log(`  Message: ${(error as any)?.message || 'No message'}`);
      console.log(`\n📊 DATA STATE WHEN FAILED:`);
      console.log(`  Ministers loaded: ${this.ministers?.length || 0}`);
      console.log(`  Questionnaire responses: ${this.availabilityData?.size || 0}`);
      console.log(`  Mass times config: ${this.massTimes?.length || 0}`);
      console.log(`\n📚 STACK TRACE:`);
      console.log((error as any)?.stack || 'No stack trace available');
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
        { id: '1', name: 'João Silva', role: 'ministro', totalServices: 5, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.8, preferenceScore: 0.7, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '2', name: 'Maria Santos', role: 'ministro', totalServices: 3, lastService: null, preferredTimes: ['08:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.9, preferenceScore: 0.8, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '3', name: 'Pedro Costa', role: 'ministro', totalServices: 4, lastService: null, preferredTimes: ['19:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.7, preferenceScore: 0.6, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '4', name: 'Ana Lima', role: 'ministro', totalServices: 2, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.85, preferenceScore: 0.75, monthlyAssignmentCount: 0, lastAssignedDate: undefined },
        { id: '5', name: 'Carlos Oliveira', role: 'coordenador', totalServices: 6, lastService: null, preferredTimes: ['08:00', '10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.95, preferenceScore: 0.9, monthlyAssignmentCount: 0, lastAssignedDate: undefined }
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
        spouseMinisterId: users.spouseMinisterId
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
      
    } catch (queryError) {
      console.error(`[SCHEDULE_GEN] ❌ QUERY ERROR:`, queryError);
      console.error(`[SCHEDULE_GEN] ❌ QUERY ERROR STACK:`, queryError.stack);
      throw new Error(`Erro na consulta de ministros: ${queryError.message || queryError}`);
    }

    this.ministers = ministersData.map((m: any) => ({
        ...m,
        totalServices: m.totalServices || 0,
        preferredTimes: m.preferredTimes || [],
        canServeAsCouple: m.canServeAsCouple || false,
        availabilityScore: this.calculateAvailabilityScore(m),
        preferenceScore: this.calculatePreferenceScore(m),
        // 🔥 FAIR ALGORITHM: Initialize monthly counters
        monthlyAssignmentCount: 0,
        lastAssignedDate: undefined
      }));

    console.log(`[FAIR_ALGORITHM] ✅ Initialized ${this.ministers.length} ministers with monthlyAssignmentCount = 0`);
    logger.info(`Carregados ${this.ministers.length} ministros ativos`);
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
        dailyMassAvailability: []
      });

      this.availabilityData.set('2', {
        ministerId: '2',
        availableSundays: ['1', '2', '4'],
        preferredMassTimes: ['08:00'],
        alternativeTimes: ['10:00'],
        canSubstitute: true,
        dailyMassAvailability: []
      });

      this.availabilityData.set('3', {
        ministerId: '3',
        availableSundays: ['2', '3', '4'],
        preferredMassTimes: ['19:00'],
        alternativeTimes: ['10:00'],
        canSubstitute: false,
        dailyMassAvailability: []
      });

      this.availabilityData.set('4', {
        ministerId: '4',
        availableSundays: ['1', '3', '4'],
        preferredMassTimes: ['10:00'],
        alternativeTimes: ['08:00', '19:00'],
        canSubstitute: true,
        dailyMassAvailability: []
      });

      this.availabilityData.set('5', {
        ministerId: '5',
        availableSundays: ['1', '2', '3', '4'],
        preferredMassTimes: ['08:00', '10:00'],
        alternativeTimes: ['19:00'],
        canSubstitute: true,
        dailyMassAvailability: []
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
        throw new Error(`Questionário precisa estar fechado para geração definitiva. Status atual: ${targetQuestionnaire.status}`);
      }
      return;
    }

    // Buscar as respostas deste questionário
    const responses = await this.db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, targetQuestionnaire.id));

    console.log(`[SCHEDULE_GEN] 🔍 DEBUGGING: Encontradas ${responses.length} respostas no banco`);

    responses.forEach((r: any, index: number) => {
      // CORREÇÃO: Os dados estão no campo JSONB "responses", não nos campos específicos
      let availableSundays = [];
      let preferredMassTimes = [];
      let alternativeTimes = [];
      let dailyMassAvailability = [];
      let canSubstitute = false;
      let specialEvents = {};

      // Processar o campo JSONB responses que contém um array de respostas
      if (r.responses) {
        try {
          let responsesArray = r.responses;

          // Se for string, fazer parse
          if (typeof responsesArray === 'string') {
            responsesArray = JSON.parse(responsesArray);
          }

          // Processar cada resposta do array
          if (Array.isArray(responsesArray)) {
            responsesArray.forEach((item: any) => {
              switch(item.questionId) {
                case 'available_sundays':
                  availableSundays = Array.isArray(item.answer) ? item.answer : [];
                  break;
                case 'main_service_time':
                  // Converter horário principal em array
                  preferredMassTimes = item.answer ? [item.answer] : [];
                  break;
                case 'other_times_available':
                  // Processar horários alternativos
                  if (item.answer && item.answer !== 'Não') {
                    // 🔧 CORREÇÃO: answer pode ser um objeto com { answer: "Sim", selectedOptions: [...] }
                    if (typeof item.answer === 'object' && item.answer.selectedOptions) {
                      alternativeTimes = item.answer.selectedOptions;
                    } else if (Array.isArray(item.answer)) {
                      alternativeTimes = item.answer;
                    } else if (typeof item.answer === 'string') {
                      alternativeTimes = [item.answer];
                    }
                  }
                  break;
                case 'can_substitute':
                  canSubstitute = item.answer === 'Sim' || item.answer === true;
                  break;
                case 'daily_mass_availability':
                  if (item.answer && item.answer !== 'Não posso' && item.answer !== 'Não') {
                    // 🔧 CORREÇÃO: answer pode ser um objeto com { answer: "Apenas em alguns dias", selectedOptions: [...] }
                    if (typeof item.answer === 'object' && item.answer.selectedOptions) {
                      dailyMassAvailability = item.answer.selectedOptions;
                    } else if (item.answer === 'Sim') {
                      // "Sim" significa disponível todos os dias da semana
                      dailyMassAvailability = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                    } else if (Array.isArray(item.answer)) {
                      dailyMassAvailability = item.answer;
                    } else if (typeof item.answer === 'string') {
                      dailyMassAvailability = [item.answer];
                    }
                  }
                  break;
                // Novena de São Judas (array de dias)
                case 'saint_judas_novena':
                  // Array com strings como ["Sexta 23/10 às 19h30", "Terça 20/10 às 19h30"]
                  if (Array.isArray(item.answer)) {
                    specialEvents[item.questionId] = item.answer;
                  } else if (item.answer === 'Nenhum dia') {
                    specialEvents[item.questionId] = [];
                  } else {
                    specialEvents[item.questionId] = item.answer ? [item.answer] : [];
                  }
                  break;
                // Eventos especiais (respostas Sim/Não)
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
                  specialEvents[item.questionId] = item.answer;
                  break;
              }
            });
          }
        } catch (e) {
          console.log(`[SCHEDULE_GEN] ⚠️ Erro ao processar responses para usuário ${r.userId}:`, e);
        }
      }

      // Fallback para campos específicos se existirem (backward compatibility)
      if (!availableSundays.length && r.availableSundays) {
        availableSundays = typeof r.availableSundays === 'string'
          ? JSON.parse(r.availableSundays)
          : r.availableSundays;
      }
      if (!preferredMassTimes.length && r.preferredMassTimes) {
        preferredMassTimes = typeof r.preferredMassTimes === 'string'
          ? JSON.parse(r.preferredMassTimes)
          : r.preferredMassTimes;
      }

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
        specialEvents: normalizedSpecialEvents
      };

      console.log(`[SCHEDULE_GEN] 💾 DADOS PROCESSADOS para ${r.userId}:`, processedData);

      this.availabilityData.set(r.userId, processedData);
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
  private normalizeSpecialEvents(events: any): any {
    if (!events || typeof events !== 'object') return events;

    const normalized: any = {};

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

    this.massTimes = config.map((c: any) => ({
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
  private generateMonthlyMassTimes(year: number, month: number): MassTime[] {
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
      //    - Dias de novena de outubro (20-27, têm apenas missa da noite)
      const isRegularSaturday = dayOfWeek === 6; // Sábados não têm missa diária (exceto 1º sábado tratado separadamente)
      const isOctoberNovena = month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27;

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
      
      // REGRA 6: Novena de São Judas (dias 20-27 de outubro às 19h30)
      if (month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27) {
        // Determinar qual dia da novena é
        const novenaDayNumber = dayOfMonth - 19; // Dia 20 = 1ª novena, dia 27 = 8ª novena

        // Horário depende do dia da semana
        let novenaTime = '19:30';
        if (dayOfWeek === 6) { // Sábado (dia 24)
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
      }

      // REGRA 7: Festa de São Judas (dia 28)
      if (dayOfMonth === 28) {
        const stJudeMasses = this.generateStJudeMasses(currentDate);
        monthlyTimes.push(...stJudeMasses);
      }

      currentDate = addDays(currentDate, 1);
    }

    // TODO: REGRA 7: Carregar missas especiais do questionário
    // const specialMasses = await this.loadSpecialMassesFromQuestionnaire(year, month);
    // monthlyTimes.push(...specialMasses);

    // 🔧 APLICAR FILTRO DE CONFLITOS: Missa especial sobrepõe missa normal no mesmo horário
    const filteredTimes = this.resolveTimeConflicts(monthlyTimes);
    
    console.log(`[SCHEDULE_GEN] ✅ Total de ${monthlyTimes.length} horários → ${filteredTimes.length} após filtro de conflitos!`);
    return filteredTimes.sort((a, b) => 
      a.date!.localeCompare(b.date!) || a.time.localeCompare(b.time)
    );
  }
  
  /**
   * Resolve conflitos de horário: missa especial substitui missa normal
   */
  private resolveTimeConflicts(massTimes: MassTime[]): MassTime[] {
    console.log(`[SCHEDULE_GEN] 🔧 Resolvendo conflitos entre ${massTimes.length} missas...`);
    
    // 🚨 REGRA ESPECIAL: REMOVER TODAS as missas diárias do dia 28 (São Judas)
    const filteredMasses = massTimes.filter(mass => {
      if (mass.date && mass.date.endsWith('-28') && mass.type === 'missa_diaria') {
        console.log(`[SCHEDULE_GEN] 🚫 REMOVENDO missa diária do dia 28: ${mass.date} ${mass.time}`);
        return false; // Remover missa diária do dia 28
      }
      return true; // Manter todas as outras
    });
    
    console.log(`[SCHEDULE_GEN] 📊 Filtro dia 28: ${massTimes.length} → ${filteredMasses.length} missas`);
    
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

    // 3. Selecionar ministros de backup
    const backupMinisters = this.selectBackupMinisters(availableMinsters, selectedMinisters, 2);

    // 4. Calcular score de confiança
    const confidence = this.calculateScheduleConfidence(selectedMinisters, massTime);

    // 5. ✅ Daily assignments are now tracked in minister.lastAssignedDate (done in selectOptimalMinisters)

    // 6. Atribuir posições litúrgicas aos ministros
    console.log('[SCHEDULE_GEN] ✅ DEBUGGING: Atribuindo posições aos ministros!');
    const ministersWithPositions = selectedMinisters.map((minister, index) => {
      const ministerWithPosition = {
        ...minister,
        position: index + 1 // Atribuir posições sequenciais
      };
      console.log(`[SCHEDULE_GEN] ✅ Ministro ${minister.name} recebeu posição ${index + 1}`);
      return ministerWithPosition;
    });

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
        // Calcular qual domingo do mês é este (1º, 2º, 3º, 4º ou 5º)
        const date = new Date(massTime.date!);
        const dayOfMonth = date.getDate();
        const sundayOfMonth = Math.ceil(dayOfMonth / 7); // 1-7 = 1º domingo, 8-14 = 2º domingo, etc.

        console.log(`[AVAILABILITY_CHECK] Domingo ${sundayOfMonth} do mês (${massTime.date})`);

        // Se o ministro marcou "Nenhum domingo", ele não está disponível
        if (availability.availableSundays?.includes('Nenhum domingo')) {
          logger.debug(`${minister.name} marcou "Nenhum domingo" - excluindo`);
          return false;
        }

        // Verificar se está disponível para este domingo específico
        // Os domingos são armazenados como "1", "2", "3", "4", "5"
        let availableForSunday = false;
        if (availability.availableSundays && availability.availableSundays.length > 0) {
          // Verificar se o domingo atual está na lista
          availableForSunday = availability.availableSundays.includes(sundayOfMonth.toString());
          console.log(`[AVAILABILITY_CHECK] ${minister.name} disponível nos domingos: ${availability.availableSundays.join(', ')}`);
          console.log(`[AVAILABILITY_CHECK] Verificando domingo ${sundayOfMonth}: ${availableForSunday ? '✅ SIM' : '❌ NÃO'}`);

          if (!availableForSunday) {
            // Tentar também com múltiplos formatos legados
            const possibleFormats = [
              `Domingo ${dateStr}`,  // "Domingo 05/10"
              dateStr,                // "05/10"
              `${dateStr.split('/')[0]}/10`, // "05/10" para outubro
              parseInt(dateStr.split('/')[0]).toString() // "5" ao invés de "05"
            ];

            for (const format of possibleFormats) {
              if (availability.availableSundays.some(sunday =>
                sunday.includes(format) || sunday === format
              )) {
                availableForSunday = true;
                break;
              }
            }
          }
        }

        // Se não está disponível para o domingo, verificar se pelo menos tem o horário preferido
        if (!availableForSunday) {
          // Se não marcou domingos mas marcou horário preferido, pode estar disponível
          if (availability.preferredMassTimes?.includes(timeStr)) {
            logger.debug(`${minister.name} tem preferência pelo horário ${timeStr}, considerando disponível`);
            return true;
          }
          return false;
        }

        // Se está disponível para o domingo, verificar compatibilidade de horário
        if (availability.preferredMassTimes && availability.preferredMassTimes.length > 0) {
          // Verificar se o horário atual está nas preferências ou alternativas
          const hasPreferredTime = availability.preferredMassTimes.some(time => {
            const timeValue = String(time);
            return timeValue === massTime.time || timeValue === timeStr || timeValue.includes(hour.toString());
          });
          const hasAlternativeTime = availability.alternativeTimes?.some(time => {
            const timeValue = String(time);
            return timeValue === massTime.time || timeValue === timeStr || timeValue.includes(hour.toString());
          });

          console.log(`[AVAILABILITY_CHECK] ${minister.name} - Horários preferidos: ${availability.preferredMassTimes.join(', ')}`);
          console.log(`[AVAILABILITY_CHECK] ${minister.name} - Horários alternativos: ${availability.alternativeTimes?.join(', ') || 'nenhum'}`);
          console.log(`[AVAILABILITY_CHECK] ${minister.name} - Verificando ${massTime.time} (${timeStr}): preferido=${hasPreferredTime}, alternativo=${hasAlternativeTime}`);

          // Se não tem nem preferência nem alternativa para este horário, dar prioridade menor mas não excluir
          // Excluir apenas se explicitamente não pode neste horário
          if (!hasPreferredTime && !hasAlternativeTime) {
            // Ainda assim está disponível, mas com prioridade menor
            logger.debug(`${minister.name} disponível mas sem preferência para ${timeStr}`);
          }
        }

        console.log(`[AVAILABILITY_CHECK] ✅ ${minister.name} DISPONÍVEL para domingo ${massTime.date} ${massTime.time}`);
        return true; // Disponível para o domingo
      }

      // Verificar disponibilidade para missas diárias (segunda a sábado)
      if (massTime.dayOfWeek >= 1 && massTime.dayOfWeek <= 6) {
        console.log(`[AVAILABILITY_CHECK] Verificando dia específico para ${minister.name}`);
        console.log(`[AVAILABILITY_CHECK]   dailyMassAvailability: ${JSON.stringify(availability.dailyMassAvailability)}`);
        console.log(`[AVAILABILITY_CHECK]   Procurando por: "${dayName}"`);
        
        // Se marcou "Não posso" para missas diárias, não está disponível
        if (availability.dailyMassAvailability?.includes('Não posso')) {
          console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} marcou "Não posso"`);
          return false;
        }

        // Se tem dados de missas diárias, verificar o dia específico
        if (availability.dailyMassAvailability && availability.dailyMassAvailability.length > 0) {
          const isAvailable = availability.dailyMassAvailability.includes(dayName);
          console.log(`[AVAILABILITY_CHECK] ${minister.name} ${isAvailable ? '✅ DISPONÍVEL' : '❌ NÃO disponível'} para ${dayName}`);
          return isAvailable;
        }

        // Se não respondeu sobre missas diárias, considerar não disponível
        console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} sem dados de disponibilidade diária`);
        return false;
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
    if (!availability) return false;

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

    // Mapear tipos de missa para campos do questionário
    const massTypeMapping: { [key: string]: string } = {
      'missa_cura_libertacao': 'healing_liberation_mass',
      'missa_sagrado_coracao': 'sacred_heart_mass',
      'missa_imaculado_coracao': 'immaculate_heart_mass',
      'missa_sao_judas': 'saint_judas_novena'
    };

    // Para missas de São Judas festa, mapear o horário específico
    if (massType === 'missa_sao_judas_festa' && massTime) {
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
        const specialEvents = (availability as any).specialEvents;
        if (specialEvents && typeof specialEvents === 'object') {
          const response = specialEvents[questionKey];
          // 🔧 CORREÇÃO: Aceitar tanto strings quanto booleanos
          const isAvailable = response === 'Sim' || response === true;
          console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} para ${massType} (${questionKey}): ${response} = ${isAvailable}`);
          return isAvailable;
        }
      }
    }

    const questionKey = massTypeMapping[massType];
    if (!questionKey) {
      // Para outros tipos não mapeados, permitir
      return true;
    }

    // Se temos dados de eventos especiais, verificar
    const specialEvents = (availability as any).specialEvents;
    if (specialEvents && typeof specialEvents === 'object') {
      const response = specialEvents[questionKey];

      // 🔧 CORREÇÃO ESPECIAL: Para novena de São Judas, verificar se a data/dia específico está no array
      if (questionKey === 'saint_judas_novena' && Array.isArray(response)) {
        // Resposta é array como ["Sexta 23/10 às 19h30", "Terça 20/10 às 19h30"]
        // Precisamos verificar se a data da missa está nesse array
        if (massDate) {
          // Extrair dia do mês da data (ex: "2025-10-23" -> "23")
          const dayOfMonth = parseInt(massDate.split('-')[2]);

          // Verificar se algum item do array contém esse dia
          const isAvailable = response.some((day: string) => {
            // Procurar padrões como "23/10" ou "23"
            // Usar regex para extrair o dia: \d{1,2}/10
            const match = day.match(/(\d{1,2})\/10/);
            if (match) {
              const responseDay = parseInt(match[1]);
              return responseDay === dayOfMonth;
            }
            return false;
          });

          console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} para novena dia ${dayOfMonth}/10: ${isAvailable} (tem: ${response.join(', ')})`);
          return isAvailable;
        }
        // Se não temos data, mas tem respostas, considerar disponível
        return response.length > 0 && !response.includes('Nenhum dia');
      }

      // 🔧 CORREÇÃO: Aceitar tanto strings quanto booleanos para outros eventos
      const isAvailable = response === 'Sim' || response === true;
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
   * - Sorts by assignment count (least assigned first)
   * - Ensures everyone gets at least 1 before anyone gets 3
   */
  private selectOptimalMinisters(available: Minister[], massTime: MassTime): Minister[] {
    const targetCount = massTime.minMinisters;
    const MAX_MONTHLY_ASSIGNMENTS = 4;

    console.log(`\n[FAIR_ALGORITHM] ========================================`);
    console.log(`[FAIR_ALGORITHM] Selecting for ${massTime.date} ${massTime.time} (${massTime.type})`);
    console.log(`[FAIR_ALGORITHM] Target: ${targetCount} ministers`);
    console.log(`[FAIR_ALGORITHM] Available pool: ${available.length} ministers`);

    // 1. Filter out ministers who:
    //    - Already reached monthly limit (4 assignments)
    //    - Already served on this date
    const eligible = available.filter(minister => {
      if (!minister.id) return false; // Skip VACANTE

      const assignmentCount = minister.monthlyAssignmentCount || 0;
      const alreadyServedToday = minister.lastAssignedDate === massTime.date;

      // Hard limit check
      if (assignmentCount >= MAX_MONTHLY_ASSIGNMENTS) {
        console.log(`[FAIR_ALGORITHM] ❌ ${minister.name}: LIMIT REACHED (${assignmentCount}/${MAX_MONTHLY_ASSIGNMENTS})`);
        return false;
      }

      // Same-day duplicate check
      if (alreadyServedToday) {
        console.log(`[FAIR_ALGORITHM] ❌ ${minister.name}: ALREADY SERVED TODAY (${massTime.date})`);
        return false;
      }

      console.log(`[FAIR_ALGORITHM] ✅ ${minister.name}: Eligible (${assignmentCount}/${MAX_MONTHLY_ASSIGNMENTS} assignments)`);
      return true;
    });

    console.log(`[FAIR_ALGORITHM] Eligible after filters: ${eligible.length}/${available.length}`);

    if (eligible.length === 0) {
      logger.error(`[FAIR_ALGORITHM] ❌ NO ELIGIBLE MINISTERS for ${massTime.date} ${massTime.time}!`);
      return [];
    }

    // 2. Sort by assignment count (ascending) - LEAST ASSIGNED FIRST
    const sorted = [...eligible].sort((a, b) => {
      const countA = a.monthlyAssignmentCount || 0;
      const countB = b.monthlyAssignmentCount || 0;

      if (countA !== countB) {
        return countA - countB; // Ascending: least assigned first
      }

      // Tie-breaker 1: Prefer those who haven't served recently
      const lastServiceA = a.lastService ? a.lastService.getTime() : 0;
      const lastServiceB = b.lastService ? b.lastService.getTime() : 0;
      if (lastServiceA !== lastServiceB) {
        return lastServiceA - lastServiceB; // Older service first
      }

      // Tie-breaker 2: Total services (lifetime balance)
      return a.totalServices - b.totalServices;
    });

    console.log(`[FAIR_ALGORITHM] 📊 Sorted by assignment count:`);
    sorted.slice(0, 10).forEach(m => {
      console.log(`  ${m.name}: ${m.monthlyAssignmentCount || 0} assignments this month`);
    });

    // 3. Select ministers from least-assigned first
    const selected: Minister[] = [];
    const used = new Set<string>();

    for (const minister of sorted) {
      if (!minister.id) continue;

      if (selected.length >= targetCount) {
        break; // Reached target
      }

      if (used.has(minister.id)) {
        continue; // Already selected
      }

      // TODO: Handle couples logic if needed
      // For now, select individually

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
      logger.warn(`⚠️ [FAIR_ALGORITHM] INCOMPLETE: ${selected.length}/${targetCount} (short by ${shortage})`);
      console.log(`[FAIR_ALGORITHM] ⚠️ INCOMPLETE: ${selected.length}/${targetCount}`);
      console.log(`[FAIR_ALGORITHM] Reason: Only ${eligible.length} eligible ministers available`);

      // Mark as incomplete
      selected.forEach(m => {
        (m as any).scheduleIncomplete = true;
        (m as any).requiredCount = targetCount;
        (m as any).actualCount = selected.length;
      });
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
   * Seleciona ministros de backup
   */
  private selectBackupMinisters(available: Minister[], selected: Minister[], count: number): Minister[] {
    const selectedIds = new Set(selected.map(m => m.id).filter(id => id !== null));
    const backup = available
      .filter(m => m.id && !selectedIds.has(m.id))
      .sort((a, b) => this.calculateMinisterScore(b, null) - this.calculateMinisterScore(a, null))
      .slice(0, count);

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
    if (massTime && minister.id) {
      const availability = this.availabilityData.get(minister.id);
      const timeHour = `${massTime.time.substring(0, 2)}h`;
      
      if (availability?.preferredMassTimes.includes(timeHour)) {
        // Bonus maior para preferência exata de horário
        score += 0.5;
      } else if (availability?.preferredMassTimes && availability.preferredMassTimes.length > 0) {
        // Penalidade para ministros que preferem outros horários
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
  private calculateAvailabilityScore(minister: any): number {
    return minister.totalServices || 0;
  }

  private calculatePreferenceScore(minister: any): number {
    return (minister.preferredTimes?.length || 0) + (minister.canServeAsCouple ? 2 : 0);
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
}

// Função de conveniência para uso direto
export async function generateAutomaticSchedule(year: number, month: number, isPreview: boolean = false): Promise<GeneratedSchedule[]> {
  const generator = new ScheduleGenerator();
  return await generator.generateScheduleForMonth(year, month, isPreview);
}