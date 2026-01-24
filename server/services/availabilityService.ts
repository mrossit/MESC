import type { CompiledAvailability } from './responseCompiler';

/**
 * AVAILABILITY SERVICE
 *
 * Provides query methods for compiled minister availability data.
 * Works with data from ResponseCompiler to answer questions like:
 * - Who is available for a specific mass?
 * - What are the availability stats for a date/time?
 * - Can a minister serve on a particular day?
 */

interface WeekdayAvailability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
}

export class AvailabilityService {
  private compiledData: Map<string, CompiledAvailability>;

  constructor(compiledData: Map<string, CompiledAvailability>) {
    this.compiledData = compiledData;
  }

  /**
   * Obtém ministros disponíveis para uma missa específica
   */
  getAvailableMinistersForMass(
    date: string,
    time: string
  ): string[] {
    // Normalize time format (remove seconds if present)
    const normalizedTime = this.normalizeTime(time);

    const available: string[] = [];

    for (const [userId, data] of this.compiledData) {
      if (this.isMinisterAvailable(userId, date, normalizedTime)) {
        available.push(userId);
      }
    }

    console.log(`📅 ${date} ${normalizedTime}: ${available.length} ministros disponíveis`);
    return available;
  }

  /**
   * Verifica se um ministro específico está disponível
   */
  isMinisterAvailable(
    userId: string,
    date: string,
    time: string
  ): boolean {
    const data = this.compiledData.get(userId);
    if (!data) return false;

    // Normalize time format
    const normalizedTime = this.normalizeTime(time);

    // 1. Verificar disponibilidade específica para data/hora
    const dayData = data.availability.dates[date];
    if (dayData) {
      // Try exact match first
      if (dayData.times[normalizedTime] === true) {
        return true;
      }

      // Try matching any time format variation
      for (const [availTime, isAvailable] of Object.entries(dayData.times)) {
        if (isAvailable && this.normalizeTime(availTime) === normalizedTime) {
          return true;
        }
      }
    }

    // 2. Se não tem data específica, verificar dia da semana (para missas diárias)
    if (this.isWeekdayMass(date, normalizedTime)) {
      const dayOfWeek = this.getDateDayOfWeek(date);
      const weekdayName = this.getDayName(dayOfWeek);

      if (data.availability.weekdays[weekdayName]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Obtém dados completos de disponibilidade de um ministro
   */
  getMinisterAvailability(userId: string): CompiledAvailability | undefined {
    return this.compiledData.get(userId);
  }

  /**
   * Obtém nome do ministro
   */
  getMinisterName(userId: string): string | undefined {
    return this.compiledData.get(userId)?.userName;
  }

  /**
   * Estatísticas de disponibilidade para uma missa
   */
  getAvailabilityStats(date: string, time: string) {
    const available = this.getAvailableMinistersForMass(date, time);
    const total = this.compiledData.size;

    return {
      available: available.length,
      total,
      percentage: total > 0 ? Math.round((available.length / total) * 100) : 0,
      ministers: available.map(userId => ({
        id: userId,
        name: this.getMinisterName(userId)
      }))
    };
  }

  /**
   * Obtém todos os ministros disponíveis para substituições
   */
  getSubstituteEligibleMinisters(): string[] {
    const eligible: string[] = [];

    for (const [userId, data] of this.compiledData) {
      if (data.metadata.canSubstitute) {
        eligible.push(userId);
      }
    }

    return eligible;
  }

  /**
   * Obtém ministros disponíveis para substituição em data/hora específica
   */
  getAvailableSubstitutes(date: string, time: string): string[] {
    const available = this.getAvailableMinistersForMass(date, time);
    const eligibleForSubstitution = this.getSubstituteEligibleMinisters();

    // Interseção: disponíveis E elegíveis para substituição
    return available.filter(userId => eligibleForSubstitution.includes(userId));
  }

  /**
   * Obtém ministros da mesma família
   */
  getFamilyMembers(userId: string): string[] {
    const user = this.compiledData.get(userId);
    if (!user?.metadata.familyId) return [];

    const familyMembers: string[] = [];

    for (const [otherId, data] of this.compiledData) {
      if (otherId !== userId && data.metadata.familyId === user.metadata.familyId) {
        familyMembers.push(otherId);
      }
    }

    return familyMembers;
  }

  /**
   * Verifica se um ministro tem família que deve servir junto
   */
  shouldServeWithFamily(userId: string): boolean {
    const user = this.compiledData.get(userId);
    if (!user?.metadata.familyId) return false;

    // Check if family preference is set to 'together'
    return user.metadata.familyPreference === 'together';
  }

  /**
   * Obtém todas as datas em que um ministro está disponível
   */
  getMinisterAvailableDates(userId: string): string[] {
    const data = this.compiledData.get(userId);
    if (!data) return [];

    return Object.keys(data.availability.dates);
  }

  /**
   * Obtém todos os horários disponíveis de um ministro para uma data
   */
  getMinisterAvailableTimes(userId: string, date: string): string[] {
    const data = this.compiledData.get(userId);
    if (!data) return [];

    const dayAvailability = data.availability.dates[date];
    if (!dayAvailability) return [];

    // Retornar apenas os horários marcados como true
    return Object.entries(dayAvailability.times)
      .filter(([_, isAvailable]) => isAvailable)
      .map(([time, _]) => time);
  }

  /**
   * Estatísticas gerais de disponibilidade do mês
   */
  getMonthlyStats() {
    const totalMinisters = this.compiledData.size;
    let totalAvailabilities = 0;
    let ministersWithWeekdayAvailability = 0;
    let ministersCanSubstitute = 0;
    let ministersWithFamily = 0;

    for (const [_, data] of this.compiledData) {
      // Contar disponibilidades específicas
      for (const [_, dayData] of Object.entries(data.availability.dates)) {
        totalAvailabilities += Object.values(dayData.times).filter(Boolean).length;
      }

      // Contar disponibilidade de dias da semana
      if (Object.values(data.availability.weekdays).some(Boolean)) {
        ministersWithWeekdayAvailability++;
      }

      // Contar elegíveis para substituição
      if (data.metadata.canSubstitute) {
        ministersCanSubstitute++;
      }

      // Contar com família
      if (data.metadata.familyId) {
        ministersWithFamily++;
      }
    }

    return {
      totalMinisters,
      totalAvailabilities,
      avgAvailabilitiesPerMinister: totalMinisters > 0 ? Math.round(totalAvailabilities / totalMinisters) : 0,
      ministersWithWeekdayAvailability,
      ministersCanSubstitute,
      ministersWithFamily,
      percentageWeekdayAvailable: totalMinisters > 0 ? Math.round((ministersWithWeekdayAvailability / totalMinisters) * 100) : 0,
      percentageCanSubstitute: totalMinisters > 0 ? Math.round((ministersCanSubstitute / totalMinisters) * 100) : 0,
      percentageWithFamily: totalMinisters > 0 ? Math.round((ministersWithFamily / totalMinisters) * 100) : 0
    };
  }

  /**
   * Lista todos os ministros com suas informações básicas
   */
  getAllMinisters() {
    const ministers: Array<{
      id: string;
      name: string;
      canSubstitute: boolean;
      familyId?: string;
      totalAvailabilities: number;
    }> = [];

    for (const [userId, data] of this.compiledData) {
      let totalAvailabilities = 0;

      // Contar disponibilidades
      for (const [_, dayData] of Object.entries(data.availability.dates)) {
        totalAvailabilities += Object.values(dayData.times).filter(Boolean).length;
      }

      ministers.push({
        id: userId,
        name: data.userName,
        canSubstitute: data.metadata.canSubstitute,
        familyId: data.metadata.familyId,
        totalAvailabilities
      });
    }

    return ministers;
  }

  // ===== PRIVATE HELPERS =====

  /**
   * Verifica se é uma missa de dia da semana
   */
  private isWeekdayMass(date: string, time: string): boolean {
    const day = this.getDateDayOfWeek(date);
    // Segunda a Sexta (1-5) e horário típico de missa diária (06:30)
    return day >= 1 && day <= 5 && time === '06:30';
  }

  /**
   * Obtém o dia da semana de uma data (0=domingo, 6=sábado)
   */
  private getDateDayOfWeek(date: string): number {
    // Adicionar horário do meio-dia para evitar problemas de timezone
    return new Date(date + 'T12:00:00').getDay();
  }

  /**
   * Converte número do dia em nome do dia
   */
  private getDayName(dayNumber: number): keyof WeekdayAvailability {
    const days: Record<number, keyof WeekdayAvailability> = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday'
    };

    return days[dayNumber] || 'monday';
  }

  /**
   * Obtém total de ministros compilados
   */
  getTotalMinisters(): number {
    return this.compiledData.size;
  }

  /**
   * Verifica se o serviço tem dados
   */
  hasData(): boolean {
    return this.compiledData.size > 0;
  }

  /**
   * Normaliza formato de horário (remove segundos se presente)
   * "08:00:00" -> "08:00"
   * "08:00" -> "08:00"
   */
  private normalizeTime(time: string): string {
    // Remove seconds if present
    if (time.length > 5 && time.includes(':')) {
      return time.substring(0, 5);
    }
    return time;
  }
}
