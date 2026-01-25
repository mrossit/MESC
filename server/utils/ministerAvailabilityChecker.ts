/**
 * Minister Availability Checker
 *
 * Clean, simple utilities for checking minister availability using v2.0 format.
 * Handles both v2.0 and legacy formats during transition period.
 */

interface Mass {
  date: string;      // ISO format: '2025-10-28'
  time: string;      // 24h format: '07:00'
  type?: string;     // 'regular', 'feast', 'novena', 'special'
  eventId?: string;  // e.g., 'saint_judas_feast', 'healing_liberation'
}

interface Minister {
  id: string;
  name: string;
  questionnaireResponse?: {
    responses: unknown;
  };
}

// V2.0 format response structure
interface V2Response {
  format_version: '2.0';
  masses?: Record<string, Record<string, boolean>>;
  weekdays?: {
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
  };
  special_events?: {
    saint_judas_novena?: string[];
    saint_judas_feast?: Record<string, boolean>;
    healing_liberation?: boolean;
    first_friday?: boolean;
    first_saturday?: boolean;
    finados?: boolean;
    consciencia_negra?: boolean;
    puc_20_11?: boolean;
    saint_judas_monthly_7h?: boolean;
    saint_judas_monthly_15h?: boolean;
    saint_judas_monthly_19h30?: boolean;
    [key: string]: unknown;
  };
  can_substitute?: boolean;
  alternative_times?: string[];
}

// Legacy format response item
interface LegacyResponseItem {
  questionId: string;
  answer: unknown;
}

// Union type for parsed response
type ParsedResponse = V2Response | LegacyResponseItem[];

// Type guard for V2 response
function isV2Response(response: ParsedResponse): response is V2Response {
  return !Array.isArray(response) && (response as V2Response).format_version === '2.0';
}

/**
 * Safely parse minister response JSON
 */
function safeParseResponse(minister: Minister): ParsedResponse | null {
  if (!minister.questionnaireResponse?.responses) {
    return null;
  }

  try {
    const responses = minister.questionnaireResponse.responses;
    const parsed = typeof responses === 'string'
      ? JSON.parse(responses)
      : responses;
    return parsed as ParsedResponse;
  } catch {
    console.warn(`[AVAILABILITY] Failed to parse response for minister ${minister.id}`);
    return null;
  }
}

/**
 * Check if minister is available for a specific mass
 */
export function isAvailableForMass(minister: Minister, mass: Mass): boolean {
  const response = safeParseResponse(minister);
  if (!response) return false;

  // Handle v2.0 format (preferred)
  if (isV2Response(response)) {
    return checkV2Availability(response, mass);
  }

  // Handle legacy format (during transition)
  console.warn(`Minister ${minister.id} has legacy format response - consider running migration`);
  return checkLegacyAvailability(response, mass);
}

/**
 * Check availability using v2.0 format
 */
function checkV2Availability(response: V2Response, mass: Mass): boolean {
  const dateKey = mass.date; // '2025-10-28'
  const timeKey = mass.time; // '07:00'

  // Check special events first (higher priority)
  if (mass.type === 'novena' && response.special_events?.saint_judas_novena) {
    const novenaKey = `${dateKey}_${timeKey}`;
    return response.special_events.saint_judas_novena.includes(novenaKey);
  }

  if (mass.type === 'feast' && response.special_events?.saint_judas_feast) {
    const feastKey = `${dateKey}_${timeKey}`;
    return response.special_events.saint_judas_feast[feastKey] === true;
  }

  if (mass.eventId === 'healing_liberation') {
    return response.special_events?.healing_liberation === true;
  }

  if (mass.eventId === 'first_friday') {
    return response.special_events?.first_friday === true;
  }

  if (mass.eventId === 'first_saturday') {
    return response.special_events?.first_saturday === true;
  }

  // Check Finados (All Souls' Day) - type: 'missa_finados'
  if (mass.type === 'missa_finados' || mass.eventId === 'finados') {
    return response.special_events?.finados === true;
  }

  // Check PUC - Consciência Negra (20/11 às 10h)
  if (mass.eventId === 'puc_consciencia_negra' || mass.type === 'missa_puc') {
    return response.special_events?.consciencia_negra === true || 
           response.special_events?.puc_20_11 === true;
  }

  // Check São Judas Tadeu monthly masses (28th of every month, except October)
  if (mass.type === 'missa_sao_judas_mensal' || mass.eventId?.includes('saint_judas_monthly')) {
    if (timeKey === '07:00') {
      return response.special_events?.saint_judas_monthly_7h === true;
    }
    if (timeKey === '15:00') {
      return response.special_events?.saint_judas_monthly_15h === true;
    }
    if (timeKey === '19:30') {
      return response.special_events?.saint_judas_monthly_19h30 === true;
    }
  }

  // Check regular Sunday masses
  if (response.masses?.[dateKey]?.[timeKey] === true) {
    return true;
  }

  // Check weekday masses (for daily mass at 6:30)
  // Support both 'daily' and 'missa_diaria' types for compatibility
  if ((mass.type === 'daily' || mass.type === 'missa_diaria') && timeKey === '06:30') {
    const dayOfWeek = new Date(dateKey).getDay();
    type WeekdayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
    const weekdayMap: Record<number, WeekdayKey> = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday'
    };

    const weekday = weekdayMap[dayOfWeek];
    if (weekday && response.weekdays?.[weekday] === true) {
      console.log(`[AVAILABILITY] ✅ ${weekday} mass available for minister`);
      return true;
    }
  }

  return false;
}

/**
 * Check availability using legacy format (backward compatibility)
 */
function checkLegacyAvailability(response: LegacyResponseItem[], mass: Mass): boolean {
  // This is a simplified version - you may want to import the full logic
  // from the old extractQuestionnaireData function if needed during transition

  // Check available_sundays
  const sundaysAnswer = response.find((r) => r.questionId === 'available_sundays');
  if (sundaysAnswer && Array.isArray(sundaysAnswer.answer)) {
    // Parse legacy date format "Domingo 05/10"
    const massDate = new Date(mass.date);
    const dayStr = String(massDate.getDate()).padStart(2, '0');
    const monthStr = String(massDate.getMonth() + 1).padStart(2, '0');

    const isAvailable = sundaysAnswer.answer.some((dateStr: string) =>
      dateStr.includes(`${dayStr}/${monthStr}`)
    );

    if (isAvailable) {
      // Check if time matches preferred time
      const timeAnswer = response.find((r: LegacyResponseItem) =>
        r.questionId === 'main_service_time' || r.questionId === 'primary_mass_time'
      );

      if (timeAnswer) {
        const preferredTime = normalizeTime(timeAnswer.answer);
        return preferredTime === mass.time;
      }

      return true;
    }
  }

  // Check Saint Judas feast
  if (mass.type === 'feast' && mass.date === '2025-10-28') {
    const timeMapping: { [key: string]: string } = {
      '07:00': 'saint_judas_feast_7h',
      '10:00': 'saint_judas_feast_10h',
      '12:00': 'saint_judas_feast_12h',
      '15:00': 'saint_judas_feast_15h',
      '17:00': 'saint_judas_feast_17h',
      '19:30': 'saint_judas_feast_evening'
    };

    const questionId = timeMapping[mass.time];
    if (questionId) {
      const answer = response.find((r: LegacyResponseItem) => r.questionId === questionId);
      return answer?.answer === 'Sim';
    }
  }

  return false;
}

/**
 * Normalize time from legacy format to 24h
 */
function normalizeTime(time: unknown): string {
  if (typeof time !== 'string') return '10:00';

  const match = time.match(/(\d{1,2})(?:h|:)?(\d{2})?/);
  if (match) {
    const hour = match[1].padStart(2, '0');
    const minute = match[2] || '00';
    return `${hour}:${minute}`;
  }

  return time;
}

/**
 * Get all available dates for a minister
 */
export function getAvailableDates(minister: Minister): string[] {
  const response = safeParseResponse(minister);
  if (!response) return [];

  if (isV2Response(response)) {
    return Object.keys(response.masses || {});
  }

  // Legacy format
  if (Array.isArray(response)) {
    const sundaysAnswer = response.find((r: LegacyResponseItem) => r.questionId === 'available_sundays');
    if (sundaysAnswer && Array.isArray(sundaysAnswer.answer)) {
      return sundaysAnswer.answer
        .map((dateStr: string) => {
          const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
          if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            return `2025-${month}-${day}`;
          }
          return null;
        })
        .filter((date: string | null): date is string => date !== null);
    }
  }

  return [];
}

/**
 * Get all available times for a minister on a specific date
 */
export function getAvailableTimes(minister: Minister, date: string): string[] {
  const response = safeParseResponse(minister);
  if (!response) return [];

  if (isV2Response(response)) {
    const massesForDate = response.masses?.[date] || {};
    return Object.keys(massesForDate).filter(time => massesForDate[time] === true);
  }

  // Legacy format - return single preferred time if date is available
  if (Array.isArray(response)) {
    const timeAnswer = response.find((r: LegacyResponseItem) =>
      r.questionId === 'main_service_time' || r.questionId === 'primary_mass_time'
    );

    if (timeAnswer) {
      return [normalizeTime(timeAnswer.answer)];
    }
  }

  return [];
}

/**
 * Check if minister can substitute
 * 🔥 FIX: Now considers alternative_times as indicator of substitution availability
 */
export function canSubstitute(minister: Minister): boolean {
  const response = safeParseResponse(minister);
  if (!response) return false;

  if (isV2Response(response)) {
    // Check explicit can_substitute flag
    if (response.can_substitute === true) {
      return true;
    }

    // 🔥 FIX: If minister has alternative_times, they can substitute
    if (response.alternative_times &&
        Array.isArray(response.alternative_times) &&
        response.alternative_times.length > 0) {
      return true;
    }

    return false;
  }

  // Legacy format
  if (Array.isArray(response)) {
    const answer = response.find((r: LegacyResponseItem) => r.questionId === 'can_substitute');
    // 🔥 FIX: Handle 'sundays_only' as true for substitution purposes
    const answerValue = answer?.answer;
    const value = typeof answerValue === 'string' ? answerValue.toLowerCase() : answerValue;
    if (value === 'sim' || value === 'yes' || value === 'sundays_only' || value === true) {
      return true;
    }

    // Check for alternative times in legacy format
    const altTimes = response.find((r: LegacyResponseItem) => r.questionId === 'other_times_available');
    if (altTimes?.answer && altTimes.answer !== 'Não') {
      return true;
    }
  }

  return false;
}

/**
 * Get minister's alternative times (times they can serve besides their preferred time)
 */
export function getAlternativeTimes(minister: Minister): string[] {
  const response = safeParseResponse(minister);
  if (!response) return [];

  if (isV2Response(response)) {
    return response.alternative_times || [];
  }

  // Legacy format
  if (Array.isArray(response)) {
    const altTimes = response.find((r: LegacyResponseItem) => r.questionId === 'other_times_available');
    if (altTimes?.answer) {
      const answer = altTimes.answer;
      if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
        const answerObj = answer as Record<string, unknown>;
        if (Array.isArray(answerObj.selectedOptions)) {
          return answerObj.selectedOptions as string[];
        }
      }
      if (Array.isArray(answer)) {
        return answer as string[];
      }
      if (typeof answer === 'string' && answer !== 'Não' && answer !== 'Sim') {
        return [answer];
      }
    }
  }

  return [];
}

/**
 * Get minister's special event availability
 */
export function getSpecialEventAvailability(minister: Minister) {
  const response = safeParseResponse(minister);
  if (!response) return {};

  if (isV2Response(response)) {
    return response.special_events || {};
  }

  // Legacy format
  const specialEvents: Record<string, boolean> = {};

  if (Array.isArray(response)) {
    const mappings = [
      { questionId: 'healing_liberation_mass', key: 'healing_liberation' },
      { questionId: 'sacred_heart_mass', key: 'first_friday' },
      { questionId: 'immaculate_heart_mass', key: 'first_saturday' }
    ];

    for (const { questionId, key } of mappings) {
      const answer = response.find((r: LegacyResponseItem) => r.questionId === questionId);
      if (answer) {
        specialEvents[key] = answer.answer === 'Sim';
      }
    }
  }

  return specialEvents;
}
