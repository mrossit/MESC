import { logger } from './logger.js';
import { users, questionnaireResponses, questionnaires, schedules, massTimesConfig } from '@shared/schema';
import { eq, and, or, gte, lte, desc, sql, ne, count } from 'drizzle-orm';
import { format, addDays, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  /**
   * Gera escalas automaticamente para um mês específico
   */
  async generateScheduleForMonth(year: number, month: number, isPreview: boolean = false): Promise<GeneratedSchedule[]> {
    // Importar db dinamicamente para garantir que está inicializado
    const { db } = await import('../db.js');
    this.db = db;

    logger.info(`Iniciando geração ${isPreview ? 'de preview' : 'definitiva'} de escalas para ${month}/${year}`);
    console.log(`[SCHEDULE_GEN] Starting generation for ${month}/${year}, preview: ${isPreview}`);
    console.log(`[SCHEDULE_GEN] Database status:`, { hasDb: !!this.db, nodeEnv: process.env.NODE_ENV });

    try {
      // 1. Carregar dados necessários
      await this.loadMinistersData();
      console.log(`[SCHEDULE_GEN] Ministers loaded: ${this.ministers.length}`);

      await this.loadAvailabilityData(year, month, isPreview);
      console.log(`[SCHEDULE_GEN] Availability data loaded: ${this.availabilityData.size} entries`);

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

      logger.info(`Geradas ${generatedSchedules.length} escalas para ${month}/${year}`);
      return generatedSchedules;

    } catch (error) {
      logger.error('Erro ao gerar escalas automáticas:', error);
      throw new Error('Falha na geração automática de escalas');
    }
  }

  /**
   * Carrega dados dos ministros do banco
   */
  private async loadMinistersData(): Promise<void> {
    if (!this.db) {
      logger.warn('Database não disponível, criando dados mock para preview');
      console.log('[SCHEDULE_GEN] Creating mock ministers data for preview');

      // Dados mock para preview quando banco não estiver disponível
      this.ministers = [
        { id: '1', name: 'João Silva', role: 'ministro', totalServices: 5, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.8, preferenceScore: 0.7 },
        { id: '2', name: 'Maria Santos', role: 'ministro', totalServices: 3, lastService: null, preferredTimes: ['08:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.9, preferenceScore: 0.8 },
        { id: '3', name: 'Pedro Costa', role: 'ministro', totalServices: 4, lastService: null, preferredTimes: ['19:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.7, preferenceScore: 0.6 },
        { id: '4', name: 'Ana Lima', role: 'ministro', totalServices: 2, lastService: null, preferredTimes: ['10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.85, preferenceScore: 0.75 },
        { id: '5', name: 'Carlos Oliveira', role: 'coordenador', totalServices: 6, lastService: null, preferredTimes: ['08:00', '10:00'], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.95, preferenceScore: 0.9 }
      ];
      return;
    }

    const ministersData = await this.db.select({
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
        eq(users.status, 'active'),
        ne(users.role, 'gestor') // Excluir gestores das escalas
      )
    );

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
      console.log('[SCHEDULE_GEN] Creating mock availability data for preview');
      logger.warn('Database não disponível, criando dados de disponibilidade mock');

      // Dados mock de disponibilidade para preview
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
      ? ['open', 'sent', 'active'] // Preview: aceita questionários abertos
      : ['closed']; // Definitivo: apenas questionários fechados

    const responses = await this.db.select().from(questionnaireResponses)
      .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .where(
        and(
          eq(questionnaires.month, month),
          eq(questionnaires.year, year),
          or(
            ...allowedStatuses.map(status => eq(questionnaires.status, status))
          )
        )
      );

    responses.forEach((r: any) => {
      this.availabilityData.set(r.questionnaire_responses.userId, {
        ministerId: r.questionnaire_responses.userId,
        availableSundays: r.questionnaire_responses.availableSundays || [],
        preferredMassTimes: r.questionnaire_responses.preferredMassTimes || [],
        alternativeTimes: r.questionnaire_responses.alternativeTimes || [],
        canSubstitute: r.questionnaire_responses.canSubstitute || false,
        dailyMassAvailability: r.questionnaire_responses.dailyMassAvailability || []
      });
    });

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
   * Gera horários de missa para todas as datas do mês
   */
  private generateMonthlyMassTimes(year: number, month: number): MassTime[] {
    const monthlyTimes: MassTime[] = [];
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      
      // Encontrar missas configuradas para este dia da semana
      const dayMassTimes = this.massTimes.filter(mt => mt.dayOfWeek === dayOfWeek);
      
      dayMassTimes.forEach(massTime => {
        monthlyTimes.push({
          ...massTime,
          date: format(currentDate, 'yyyy-MM-dd')
        });
      });

      currentDate = addDays(currentDate, 1);
    }

    return monthlyTimes.sort((a, b) => 
      a.date!.localeCompare(b.date!) || a.time.localeCompare(b.time)
    );
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

    return {
      massTime,
      ministers: selectedMinisters,
      backupMinisters,
      confidence
    };
  }

  /**
   * Filtra ministros disponíveis para uma missa específica
   */
  private getAvailableMinistersForMass(massTime: MassTime): Minister[] {
    const dayName = this.getDayName(massTime.dayOfWeek);
    const dateStr = format(new Date(massTime.date!), 'dd/MM');

    return this.ministers.filter(minister => {
      const availability = this.availabilityData.get(minister.id);

      if (!availability) {
        // Se não há dados de disponibilidade, incluir o ministro apenas para preview
        // Isso permite gerar escalas mesmo sem questionários respondidos
        logger.debug(`Sem dados de disponibilidade para ministro ${minister.name} - incluindo no preview`);
        return true; // Retorna true para incluir no preview
      }

      // Verificar disponibilidade para domingo específico
      if (massTime.dayOfWeek === 0) {
        const sundayStr = `Domingo ${dateStr}`;

        // Se o ministro marcou "Nenhum domingo", ele não está disponível
        if (availability.availableSundays.includes('Nenhum domingo')) {
          return false;
        }

        // Se há domingos específicos marcados, verificar se inclui este
        if (availability.availableSundays.length > 0) {
          return availability.availableSundays.includes(sundayStr);
        }

        // Se não há dados específicos, considerar disponível para preview
        return true;
      }

      // Verificar disponibilidade para missas diárias
      if (availability.dailyMassAvailability.length > 0) {
        return availability.dailyMassAvailability.includes(dayName);
      }

      // Se não há dados específicos, considerar disponível para preview
      return true;
    });
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

    // 3. Aplicar lógica de casais se necessário
    const selected: Minister[] = [];
    const used = new Set<string>();

    for (const { minister } of scoredMinisters) {
      if (used.has(minister.id) || selected.length >= massTime.maxMinisters) {
        continue;
      }

      // Se pode servir como casal e cônjuge está disponível
      if (minister.canServeAsCouple && minister.spouseMinisterId) {
        const spouse = available.find(m => m.id === minister.spouseMinisterId);
        if (spouse && !used.has(spouse.id) && selected.length + 1 < massTime.maxMinisters) {
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

      // Parar se atingiu mínimo necessário
      if (selected.length >= massTime.minMinisters && selected.length >= 4) {
        break;
      }
    }

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

    // 3. Preferência de horário (20% do peso)
    if (massTime) {
      const availability = this.availabilityData.get(minister.id);
      if (availability?.preferredMassTimes.includes(`${massTime.time.substring(0, 2)}h`)) {
        score += 0.2;
      }
    }

    // 4. Disponibilidade para substituição (10% do peso)
    const availability = this.availabilityData.get(minister.id);
    if (availability?.canSubstitute) {
      score += 0.1;
    }

    return score;
  }

  /**
   * Calcula confiança na escala gerada
   */
  private calculateScheduleConfidence(ministers: Minister[], massTime: MassTime): number {
    let confidence = 0;

    // 1. Cobertura adequada (50% do peso)
    if (ministers.length >= massTime.minMinisters) {
      confidence += 0.5;
      if (ministers.length >= massTime.minMinisters + 1) {
        confidence += 0.1; // Bonus por cobertura extra
      }
    }

    // 2. Qualidade dos ministros escalados (30% do peso)
    const avgScore = ministers.reduce((sum, m) => sum + m.preferenceScore, 0) / ministers.length;
    confidence += Math.min(avgScore / 10, 0.3);

    // 3. Balanceamento (20% do peso)
    const serviceVariance = this.calculateServiceVariance(ministers);
    confidence += Math.max(0, 0.2 - serviceVariance / 100);

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