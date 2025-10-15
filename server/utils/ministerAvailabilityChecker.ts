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
    responses: any;
  };
}

/**
 * Check if minister is available for a specific mass
 */
export function isAvailableForMass(minister: Minister, mass: Mass): boolean {
  if (!minister.questionnaireResponse?.responses) {
    return false;
  }

  const response = typeof minister.questionnaireResponse.responses === 'string'
    ? JSON.parse(minister.questionnaireResponse.responses)
    : minister.questionnaireResponse.responses;

  // Handle v2.0 format (preferred)
  if (response.format_version === '2.0') {
    return checkV2Availability(response, mass);
  }

  // Handle legacy format (during transition)
  console.warn(`Minister ${minister.id} has legacy format response - consider running migration`);
  return checkLegacyAvailability(response, mass);
}

/**
 * Check availability using v2.0 format
 */
function checkV2Availability(response: any, mass: Mass): boolean {
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

  // Check regular Sunday masses
  if (response.masses?.[dateKey]?.[timeKey] === true) {
    return true;
  }

  // Check weekday masses (for daily mass at 6:30)
  // Support both 'daily' and 'missa_diaria' types for compatibility
  if ((mass.type === 'daily' || mass.type === 'missa_diaria') && timeKey === '06:30') {
    const dayOfWeek = new Date(dateKey).getDay();
    const weekdayMap: { [key: number]: keyof typeof response.weekdays } = {
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
function checkLegacyAvailability(response: any, mass: Mass): boolean {
  // This is a simplified version - you may want to import the full logic
  // from the old extractQuestionnaireData function if needed during transition

  if (!Array.isArray(response)) {
    return false;
  }

  // Check available_sundays
  const sundaysAnswer = response.find((r: any) => r.questionId === 'available_sundays');
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
      const timeAnswer = response.find((r: any) =>
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
      const answer = response.find((r: any) => r.questionId === questionId);
      return answer?.answer === 'Sim';
    }
  }

  return false;
}

/**
 * Normalize time from legacy format to 24h
 */
function normalizeTime(time: any): string {
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
  if (!minister.questionnaireResponse?.responses) {
    return [];
  }

  const response = typeof minister.questionnaireResponse.responses === 'string'
    ? JSON.parse(minister.questionnaireResponse.responses)
    : minister.questionnaireResponse.responses;

  if (response.format_version === '2.0') {
    return Object.keys(response.masses || {});
  }

  // Legacy format
  if (Array.isArray(response)) {
    const sundaysAnswer = response.find((r: any) => r.questionId === 'available_sundays');
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
  if (!minister.questionnaireResponse?.responses) {
    return [];
  }

  const response = typeof minister.questionnaireResponse.responses === 'string'
    ? JSON.parse(minister.questionnaireResponse.responses)
    : minister.questionnaireResponse.responses;

  if (response.format_version === '2.0') {
    const massesForDate = response.masses?.[date] || {};
    return Object.keys(massesForDate).filter(time => massesForDate[time] === true);
  }

  // Legacy format - return single preferred time if date is available
  if (Array.isArray(response)) {
    const timeAnswer = response.find((r: any) =>
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
 */
export function canSubstitute(minister: Minister): boolean {
  if (!minister.questionnaireResponse?.responses) {
    return false;
  }

  const response = typeof minister.questionnaireResponse.responses === 'string'
    ? JSON.parse(minister.questionnaireResponse.responses)
    : minister.questionnaireResponse.responses;

  if (response.format_version === '2.0') {
    return response.can_substitute === true;
  }

  // Legacy format
  if (Array.isArray(response)) {
    const answer = response.find((r: any) => r.questionId === 'can_substitute');
    return answer?.answer === 'Sim';
  }

  return false;
}

/**
 * Get minister's special event availability
 */
export function getSpecialEventAvailability(minister: Minister) {
  if (!minister.questionnaireResponse?.responses) {
    return {};
  }

  const response = typeof minister.questionnaireResponse.responses === 'string'
    ? JSON.parse(minister.questionnaireResponse.responses)
    : minister.questionnaireResponse.responses;

  if (response.format_version === '2.0') {
    return response.special_events || {};
  }

  // Legacy format
  const specialEvents: any = {};

  if (Array.isArray(response)) {
    const mappings = [
      { questionId: 'healing_liberation_mass', key: 'healing_liberation' },
      { questionId: 'sacred_heart_mass', key: 'first_friday' },
      { questionId: 'immaculate_heart_mass', key: 'first_saturday' }
    ];

    for (const { questionId, key } of mappings) {
      const answer = response.find((r: any) => r.questionId === questionId);
      if (answer) {
        specialEvents[key] = answer.answer === 'Sim';
      }
    }
  }

  return specialEvents;
}
