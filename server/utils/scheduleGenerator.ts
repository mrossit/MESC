import { logger } from './logger.js';
import { users, questionnaireResponses, questionnaires, schedules, massTimesConfig } from '@shared/schema';
import { eq, and, or, gte, lte, desc, sql, ne, count } from 'drizzle-orm';
import { format, addDays, startOfMonth, endOfMonth, getDay, getDate, isSaturday, isFriday, isThursday, isSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// 🚨 DEBUG: CONFIRMAR QUE O CÓDIGO ATUALIZADO ESTÁ SENDO EXECUTADO
console.log('🚀 [SCHEDULE_GENERATOR] MÓDULO CARREGADO - VERSÃO COM CORREÇÕES! Timestamp:', new Date().toISOString());

export interface Minister {
  id: string;
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

  /**
   * Gera escalas automaticamente para um mês específico
   */
  async generateScheduleForMonth(year: number, month: number, isPreview: boolean = false): Promise<GeneratedSchedule[]> {
    // Importar db dinamicamente para garantir que está inicializado
    const { db } = await import('../db.js');
    this.db = db;
    
    // 🔧 CORREÇÃO: Limpar assignments diários para nova geração
    this.dailyAssignments = new Map();

    logger.info(`Iniciando geração ${isPreview ? 'de preview' : 'definitiva'} de escalas para ${month}/${year}`);
    console.log(`[SCHEDULE_GEN] Starting generation for ${month}/${year}, preview: ${isPreview}`);
    console.log(`[SCHEDULE_GEN] Database status:`, { hasDb: !!this.db, nodeEnv: process.env.NODE_ENV });

    try {
      // 1. Carregar dados necessários
      console.log(`[SCHEDULE_GEN] Step 1: Loading ministers data...`);
      await this.loadMinistersData();
      console.log(`[SCHEDULE_GEN] Ministers loaded: ${this.ministers.length}`);

      console.log(`[SCHEDULE_GEN] Step 2: Loading availability data...`);
      await this.loadAvailabilityData(year, month, isPreview);
      console.log(`[SCHEDULE_GEN] Availability data loaded: ${this.availabilityData.size} entries`);

      console.log(`[SCHEDULE_GEN] Step 3: Loading mass times config...`);
      await this.loadMassTimesConfig();
      console.log(`[SCHEDULE_GEN] Mass times config loaded: ${this.massTimes.length} times`);

      // 2. Gerar horários de missa para o mês
      const monthlyMassTimes = this.generateMonthlyMassTimes(year, month);
      console.log(`[SCHEDULE_GEN] Generated ${monthlyMassTimes.length} mass times for the month`);

      // 3. Executar algoritmo de distribuição
      const generatedSchedules: GeneratedSchedule[] = [];

      for (const massTime of monthlyMassTimes) {
        const schedule = await this.generateScheduleForMass(massTime);
        generatedSchedules.push(schedule);
      }

      // 4. Analisar e reportar escalas incompletas
      const incompleteSchedules = generatedSchedules.filter(s =>
        s.ministers.length < s.massTime.minMinisters
      );

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

      logger.info(`Geradas ${generatedSchedules.length} escalas para ${month}/${year}`);
      return generatedSchedules;

    } catch (error) {
      console.error(`[SCHEDULE_GEN] ❌ ERRO DETALHADO NO MAIN FUNCTION:`, error);
      console.error(`[SCHEDULE_GEN] ❌ ERROR TYPE:`, typeof error);
      console.error(`[SCHEDULE_GEN] ❌ ERROR NAME:`, (error as any)?.name);
      console.error(`[SCHEDULE_GEN] ❌ ERROR MESSAGE:`, (error as any)?.message);
      console.error(`[SCHEDULE_GEN] ❌ ERROR STACK:`, (error as any)?.stack);
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
        { id: '1', name: 'João Silva', role: 'ministro', totalServices: 5, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.8, preferenceScore: 0.7 },
        { id: '2', name: 'Maria Santos', role: 'ministro', totalServices: 3, lastService: null, preferredTimes: ['08:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.9, preferenceScore: 0.8 },
        { id: '3', name: 'Pedro Costa', role: 'ministro', totalServices: 4, lastService: null, preferredTimes: ['19:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.7, preferenceScore: 0.6 },
        { id: '4', name: 'Ana Lima', role: 'ministro', totalServices: 2, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.85, preferenceScore: 0.75 },
        { id: '5', name: 'Carlos Oliveira', role: 'coordenador', totalServices: 6, lastService: null, preferredTimes: ['08:00', '10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.95, preferenceScore: 0.9 }
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
        preferenceScore: this.calculatePreferenceScore(m)
      }));

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
                    alternativeTimes = Array.isArray(item.answer) ? item.answer : [item.answer];
                  }
                  break;
                case 'can_substitute':
                  canSubstitute = item.answer === 'Sim' || item.answer === true;
                  break;
                case 'daily_mass_availability':
                  if (item.answer && item.answer !== 'Não') {
                    dailyMassAvailability = Array.isArray(item.answer) ? item.answer : [item.answer];
                  }
                  break;
                // Eventos especiais
                case 'healing_liberation_mass':
                case 'sacred_heart_mass':
                case 'immaculate_heart_mass':
                case 'saint_judas_feast_7h':
                case 'saint_judas_feast_10h':
                case 'saint_judas_feast_12h':
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

      const processedData = {
        ministerId: r.userId,
        availableSundays,
        preferredMassTimes,
        alternativeTimes,
        canSubstitute,
        dailyMassAvailability,
        specialEvents
      };

      console.log(`[SCHEDULE_GEN] 💾 DADOS PROCESSADOS para ${r.userId}:`, processedData);

      this.availabilityData.set(r.userId, processedData);
    });

    console.log(`[SCHEDULE_GEN] ✅ Carregadas respostas de ${responses.length} ministros no availabilityData`);
    console.log(`[SCHEDULE_GEN] 📊 AvailabilityData size: ${this.availabilityData.size}`);
    logger.info(`Carregadas respostas de ${responses.length} ministros`);
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
      
      // REGRA 1: Missas diárias (Segunda a Sábado, 6h30-7h)
      // ❌ EXCETO no dia 28 (São Judas)
      if (dayOfWeek >= 1 && dayOfWeek <= 6 && !isDayOfSaintJudas) { // Segunda (1) a Sábado (6)
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
        console.log(`[SCHEDULE_GEN] 🚫 DEBUG: dayOfWeek=${dayOfWeek}, isDayOfSaintJudas=${isDayOfSaintJudas}`);
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
      
      // REGRA 6: Missas São Judas (dia 28)
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

    // 5. Rastrear ministros escalados no dia DEPOIS da seleção
    const dateKey = massTime.date!;
    if (!this.dailyAssignments.has(dateKey)) {
      this.dailyAssignments.set(dateKey, new Set());
    }
    const dayAssignments = this.dailyAssignments.get(dateKey)!;
    selectedMinisters.forEach(minister => dayAssignments.add(minister.id));
    
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

    console.log(`[AVAILABILITY_CHECK] 🔍 Verificando disponibilidade para ${massTime.date} ${massTime.time} (${massTime.type})`);
    console.log(`[AVAILABILITY_CHECK] 📊 Total ministros: ${this.ministers.length}, AvailabilityData size: ${this.availabilityData.size}`);

    return this.ministers.filter(minister => {
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
      if (massTime.type && !this.isAvailableForSpecialMass(minister.id, massTime.type)) {
        console.log(`[SCHEDULE_GEN] ❌ ${minister.name} não disponível para ${massTime.type}`);
        return false;
      }

      // Verificar disponibilidade para missas diárias (segunda a sábado)
      if (massTime.dayOfWeek > 0 && massTime.type === 'missa_diaria') {
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const dayName = daysOfWeek[massTime.dayOfWeek];

        if (!availability.dailyMassAvailability || !availability.dailyMassAvailability.includes(dayName)) {
          console.log(`[AVAILABILITY_CHECK] ❌ ${minister.name} não disponível para ${dayName}`);
          return false;
        }
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
        // Se marcou "Não posso" para missas diárias, não está disponível
        if (availability.dailyMassAvailability?.includes('Não posso')) {
          return false;
        }

        // Se tem dados de missas diárias, verificar o dia específico
        if (availability.dailyMassAvailability && availability.dailyMassAvailability.length > 0) {
          return availability.dailyMassAvailability.includes(dayName);
        }

        // Se não respondeu sobre missas diárias, considerar não disponível
        return false;
      }

      // Para outros casos, considerar disponível se tem resposta
      return true;
    });
  }

  /**
   * Verifica se o ministro está disponível para um tipo específico de missa
   */
  private isAvailableForSpecialMass(ministerId: string, massType: string): boolean {
    const availability = this.availabilityData.get(ministerId);
    if (!availability) return false;

    // Para missas diárias regulares, verificar disponibilidade para dias de semana
    if (massType === 'missa_diaria') {
      // Se tem disponibilidade para missas diárias, está disponível
      return availability.dailyMassAvailability && availability.dailyMassAvailability.length > 0;
    }

    // Para missas especiais (primeira sexta, primeiro sábado, cura e libertação)
    // Como não temos dados específicos no questionário atual, vamos considerar:
    // - Primeira sexta/sábado: verificar se tem disponibilidade para missas diárias
    // - Cura e libertação (quinta): verificar se tem disponibilidade para quinta-feira
    if (massType === 'missa_sagrado_coracao' || massType === 'missa_imaculado_coracao') {
      // Missas especiais de primeira sexta/sábado - aceitar quem tem disponibilidade diária
      return availability.dailyMassAvailability && availability.dailyMassAvailability.length > 0;
    }

    if (massType === 'missa_cura_libertacao') {
      // Missa de cura e libertação (quinta-feira)
      return availability.dailyMassAvailability?.includes('Quinta-feira') || false;
    }

    // Mapear tipos de missa para campos do questionário (para futuro)
    const massTypeMapping: { [key: string]: string } = {
      'missa_cura_libertacao': 'healing_liberation_mass',
      'missa_sagrado_coracao': 'sacred_heart_mass',
      'missa_imaculado_coracao': 'immaculate_heart_mass',
      'missa_sao_judas': 'saint_judas_novena',
      'missa_sao_judas_festa': 'saint_judas_feast'
    };

    const questionKey = massTypeMapping[massType];
    if (!questionKey) {
      // Para outros tipos não mapeados, permitir
      return true;
    }

    // Se temos dados de eventos especiais, verificar
    const specialEvents = (availability as any).specialEvents;
    if (specialEvents && typeof specialEvents === 'object') {
      const response = specialEvents[questionKey];
      const isAvailable = response === 'Sim' || response === true;
      console.log(`[SCHEDULE_GEN] 🔍 ${ministerId} para ${massType} (${questionKey}): ${response} = ${isAvailable}`);
      return isAvailable;
    }

    // Se não há dados específicos, mas é uma missa especial conhecida
    // usar lógica padrão baseada em disponibilidade geral
    console.log(`[SCHEDULE_GEN] ℹ️ Usando disponibilidade geral para ${massType}`);
    return availability.canSubstitute || false;
  }

  /**
   * Seleciona ministros ideais usando algoritmo de pontuação
   */
  private selectOptimalMinisters(available: Minister[], massTime: MassTime): Minister[] {
    // 1. Calcular score para cada ministro
    const scoredMinisters = available.map(minister => ({
      minister,
      score: this.calculateMinisterScore(minister, massTime)
    }));

    // 2. Ordenar por score (maior primeiro)
    scoredMinisters.sort((a, b) => b.score - a.score);

    // 3. IMPORTANTE: Definir quantidade alvo (usar minMinisters que agora é igual a maxMinisters)
    const targetCount = massTime.minMinisters;
    const availableCount = available.length;

    // Log de aviso se não há ministros suficientes
    if (availableCount < targetCount) {
      logger.warn(`⚠️ ATENÇÃO: Apenas ${availableCount} ministros disponíveis para ${massTime.date} ${massTime.time} (${massTime.type}), mas são necessários ${targetCount}`);
      console.log(`[SCHEDULE_GEN] ⚠️ INSUFICIENTE: ${availableCount}/${targetCount} ministros para ${massTime.type} em ${massTime.date} ${massTime.time}`);
    } else {
      logger.info(`[SCHEDULE_GEN] ✅ Selecionando ${targetCount} de ${availableCount} ministros disponíveis para ${massTime.date} ${massTime.time}`);
    }

    // 4. Aplicar lógica de casais se necessário
    const selected: Minister[] = [];
    const used = new Set<string>();

    for (const { minister } of scoredMinisters) {
      if (used.has(minister.id) || selected.length >= targetCount) {
        break; // Parar quando atingir a quantidade exata
      }

      // Se pode servir como casal e cônjuge está disponível
      if (minister.canServeAsCouple && minister.spouseMinisterId) {
        const spouse = available.find(m => m.id === minister.spouseMinisterId);
        if (spouse && !used.has(spouse.id) && selected.length + 2 <= targetCount) {
          selected.push(minister, spouse);
          used.add(minister.id);
          used.add(spouse.id);
          logger.debug(`Escalado casal: ${minister.name} + ${spouse.name}`);
          continue;
        }
      }

      // Adicionar ministro individual
      selected.push(minister);
      used.add(minister.id);
    }

    // 5. Verificar se conseguiu a quantidade necessária
    if (selected.length < targetCount) {
      logger.warn(`⚠️ [SCHEDULE_GEN] ESCALA INCOMPLETA: Apenas ${selected.length}/${targetCount} ministros para ${massTime.type} em ${massTime.date} ${massTime.time}`);

      // Se não há ministros suficientes, continuar tentando adicionar os disponíveis restantes
      for (const { minister } of scoredMinisters) {
        if (!used.has(minister.id) && selected.length < targetCount) {
          selected.push(minister);
          used.add(minister.id);
        }
        if (selected.length >= targetCount) break;
      }

      // Adicionar metadado de escala incompleta
      console.log(`[SCHEDULE_GEN] 🚨 MARCANDO ESCALA COMO INCOMPLETA: ${selected.length}/${targetCount} ministros`);
      selected.forEach(m => {
        (m as any).scheduleIncomplete = true;
        (m as any).requiredCount = targetCount;
        (m as any).actualCount = selected.length;
      });
    }

    logger.info(`[SCHEDULE_GEN] Selecionados ${selected.length}/${targetCount} ministros para ${massTime.date} ${massTime.time}`);
    return selected;
  }

  /**
   * Seleciona ministros de backup
   */
  private selectBackupMinisters(available: Minister[], selected: Minister[], count: number): Minister[] {
    const selectedIds = new Set(selected.map(m => m.id));
    const backup = available
      .filter(m => !selectedIds.has(m.id))
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
    const avgServices = this.ministers.reduce((sum, m) => sum + m.totalServices, 0) / this.ministers.length;
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
    if (massTime) {
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
    const availability = this.availabilityData.get(minister.id);
    if (availability?.canSubstitute) {
      score += 0.1;
    }
    
    // 5. Penalidade para ministros já escalados no mesmo dia (40% do peso - FORTE penalidade)
    if (massTime && massTime.date) {
      const dayAssignments = this.dailyAssignments.get(massTime.date);
      if (dayAssignments && dayAssignments.has(minister.id)) {
        score -= 0.8; // Penalidade muito forte para evitar duplicações no mesmo domingo
        console.log(`[SCHEDULE_GEN] ⚠️ Penalidade aplicada a ${minister.name} - já escalado hoje (${massTime.date})`);
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
    const fillRate = ministers.length / massTime.minMinisters;

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