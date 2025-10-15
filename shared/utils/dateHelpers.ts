/**
 * DATE HELPER UTILITIES
 *
 * Handles timezone-safe date operations for Brazil (BRT/BRST)
 *
 * CRITICAL: JavaScript Date parsing behavior
 * - new Date('2025-10-12')           → Parses as UTC midnight → Oct 11 21:00 BRT ❌
 * - new Date('2025-10-12T00:00:00')  → Parses as LOCAL midnight → Oct 12 00:00 BRT ✅
 * - new Date(2025, 9, 12)            → Creates LOCAL date → Oct 12 00:00 BRT ✅
 */

export class DateHelper {
  /**
   * Create date in local timezone (Brazil)
   * Month is 1-based (1 = January, 12 = December)
   */
  static createLocalDate(year: number, month: number, day: number): Date {
    // Month parameter is 0-based in Date constructor
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Parse ISO date string as LOCAL date (not UTC)
   * Input: '2025-10-12'
   * Output: Date object at Oct 12 00:00 local time
   */
  static parseLocalDate(dateStr: string): Date {
    // If already has time component, parse as-is
    if (dateStr.includes('T')) {
      return new Date(dateStr);
    }

    // Add time component to force local timezone interpretation
    return new Date(dateStr + 'T00:00:00');
  }

  /**
   * Format date as ISO string without timezone (YYYY-MM-DD)
   * Preserves the local date without timezone conversion
   */
  static formatISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get day of week (0 = Sunday, 6 = Saturday)
   * Ensures correct day by using local timezone
   */
  static getDayOfWeek(dateStr: string): number {
    const date = this.parseLocalDate(dateStr);
    return date.getDay();
  }

  /**
   * Get day of month (1-31)
   */
  static getDayOfMonth(dateStr: string): number {
    const date = this.parseLocalDate(dateStr);
    return date.getDate();
  }

  /**
   * Get month (1-12)
   */
  static getMonth(dateStr: string): number {
    const date = this.parseLocalDate(dateStr);
    return date.getMonth() + 1;
  }

  /**
   * Get year
   */
  static getYear(dateStr: string): number {
    const date = this.parseLocalDate(dateStr);
    return date.getFullYear();
  }

  /**
   * Format date for display in Brazilian Portuguese
   */
  static formatDisplay(dateStr: string): {
    dayName: string;
    dayNameShort: string;
    dayNumber: number;
    month: number;
    monthName: string;
    year: number;
    formatted: string; // "12/10/2025"
    fullDisplay: string; // "sexta-feira, 12 de outubro de 2025"
  } {
    const date = this.parseLocalDate(dateStr);

    const dayNames = [
      'domingo',
      'segunda-feira',
      'terça-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sábado'
    ];

    const dayNamesShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    const dayOfWeek = date.getDay();
    const dayNumber = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    return {
      dayName: dayNames[dayOfWeek],
      dayNameShort: dayNamesShort[dayOfWeek],
      dayNumber,
      month: month + 1,
      monthName: monthNames[month],
      year,
      formatted: date.toLocaleDateString('pt-BR'),
      fullDisplay: `${dayNames[dayOfWeek]}, ${dayNumber} de ${monthNames[month]} de ${year}`
    };
  }

  /**
   * Check if two dates are the same day (ignoring time)
   */
  static isSameDay(date1: string | Date, date2: string | Date): boolean {
    const d1 = typeof date1 === 'string' ? this.parseLocalDate(date1) : date1;
    const d2 = typeof date2 === 'string' ? this.parseLocalDate(date2) : date2;

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Check if date is a Sunday
   */
  static isSunday(dateStr: string): boolean {
    return this.getDayOfWeek(dateStr) === 0;
  }

  /**
   * Check if date is a Saturday
   */
  static isSaturday(dateStr: string): boolean {
    return this.getDayOfWeek(dateStr) === 6;
  }

  /**
   * Check if date is a weekday (Monday-Friday)
   */
  static isWeekday(dateStr: string): boolean {
    const day = this.getDayOfWeek(dateStr);
    return day >= 1 && day <= 5;
  }

  /**
   * Add days to a date (timezone-safe)
   */
  static addDays(dateStr: string, days: number): string {
    const date = this.parseLocalDate(dateStr);
    date.setDate(date.getDate() + days);
    return this.formatISO(date);
  }

  /**
   * Get start of month (timezone-safe)
   */
  static startOfMonth(year: number, month: number): Date {
    return this.createLocalDate(year, month, 1);
  }

  /**
   * Get end of month (timezone-safe)
   */
  static endOfMonth(year: number, month: number): Date {
    // Month is 1-based, so add 1 and subtract 1 day
    const nextMonth = this.createLocalDate(year, month + 1, 1);
    nextMonth.setDate(nextMonth.getDate() - 1);
    return nextMonth;
  }

  /**
   * Get days in month
   */
  static getDaysInMonth(year: number, month: number): number {
    const endDate = this.endOfMonth(year, month);
    return endDate.getDate();
  }

  /**
   * Validate ISO date string format
   */
  static isValidISODate(dateStr: string): boolean {
    // Check format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return false;
    }

    const date = this.parseLocalDate(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Parse legacy date formats and convert to ISO
   * Handles: "Domingo 05/10", "05/10", "5/10"
   */
  static parseLegacyDate(legacyDate: string, year: number, month: number): string | null {
    // Extract day from patterns like "Domingo 05/10" or "05/10"
    const dayMatch = legacyDate.match(/(\d{1,2})\/(\d{1,2})/);

    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      const extractedMonth = parseInt(dayMatch[2]);

      // Validate month matches
      if (extractedMonth === month) {
        return this.formatISO(this.createLocalDate(year, month, day));
      }
    }

    return null;
  }

  /**
   * Get current date in Brazil timezone
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Get today's date as ISO string
   */
  static today(): string {
    return this.formatISO(this.now());
  }

  /**
   * Compare two dates
   * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
   */
  static compare(date1: string, date2: string): number {
    const d1 = this.parseLocalDate(date1).getTime();
    const d2 = this.parseLocalDate(date2).getTime();

    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
  }

  /**
   * Check if date is in the past
   */
  static isPast(dateStr: string): boolean {
    return this.compare(dateStr, this.today()) < 0;
  }

  /**
   * Check if date is in the future
   */
  static isFuture(dateStr: string): boolean {
    return this.compare(dateStr, this.today()) > 0;
  }

  /**
   * Check if date is today
   */
  static isToday(dateStr: string): boolean {
    return this.isSameDay(dateStr, this.today());
  }

  /**
   * Get week number in month (1-5)
   */
  static getWeekOfMonth(dateStr: string): number {
    const day = this.getDayOfMonth(dateStr);
    return Math.ceil(day / 7);
  }

  /**
   * Debug: Show how a date string is being parsed
   */
  static debugParse(dateStr: string): {
    input: string;
    parsedDate: Date;
    dayOfWeek: number;
    dayName: string;
    isoFormat: string;
    warning?: string;
  } {
    const date = this.parseLocalDate(dateStr);
    const display = this.formatDisplay(dateStr);

    return {
      input: dateStr,
      parsedDate: date,
      dayOfWeek: date.getDay(),
      dayName: display.dayName,
      isoFormat: this.formatISO(date),
      warning: dateStr.includes('T') ? undefined : 'Date string missing time component - added T00:00:00'
    };
  }
}

/**
 * USAGE EXAMPLES
 *
 * // Create local date
 * const date = DateHelper.createLocalDate(2025, 10, 12); // Oct 12, 2025
 *
 * // Parse ISO date safely
 * const parsed = DateHelper.parseLocalDate('2025-10-12'); // Local Oct 12
 *
 * // Format for storage
 * const iso = DateHelper.formatISO(new Date()); // '2025-10-12'
 *
 * // Get day of week
 * const dayOfWeek = DateHelper.getDayOfWeek('2025-10-12'); // 0-6
 *
 * // Format for display
 * const display = DateHelper.formatDisplay('2025-10-12');
 * // { dayName: 'domingo', formatted: '12/10/2025', ... }
 *
 * // Debug parsing
 * console.log(DateHelper.debugParse('2025-10-12'));
 */
