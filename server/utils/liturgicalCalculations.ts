/**
 * Liturgical Calendar Calculations
 * Implements Computus algorithm for Easter and other movable feast calculations
 */

/**
 * Calculate Easter Sunday for a given year using the Meeus/Jones/Butcher algorithm
 * This is the most accurate algorithm for Gregorian calendar (1583 onwards)
 */
export function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Determine the liturgical cycle (A, B, or C) for a given year
 * Cycle starts on First Sunday of Advent
 */
export function getLiturgicalCycle(year: number): 'A' | 'B' | 'C' {
  // The cycle is determined by the year in which Advent begins
  // Cycle A: years divisible by 3
  // Cycle B: years with remainder 1 when divided by 3
  // Cycle C: years with remainder 2 when divided by 3
  const remainder = year % 3;
  if (remainder === 0) return 'A';
  if (remainder === 1) return 'B';
  return 'C';
}

/**
 * Calculate First Sunday of Advent for a given year
 * Always 4 Sundays before Christmas (Dec 25)
 */
export function getAdventStart(year: number): Date {
  const christmas = new Date(year, 11, 25); // December 25
  const dayOfWeek = christmas.getDay(); // 0 = Sunday, 6 = Saturday

  // Calculate days until previous Sunday
  const daysToSunday = dayOfWeek === 0 ? 7 : dayOfWeek;

  // Go back 4 Sundays (28 days) plus adjustment to previous Sunday
  const daysBack = 28 + daysToSunday;

  const adventStart = new Date(year, 11, 25 - daysBack);
  return adventStart;
}

/**
 * Calculate movable feasts based on Easter
 */
export function getMovableFeasts(year: number): {
  ashWednesday: Date;
  palmSunday: Date;
  holyThursday: Date;
  goodFriday: Date;
  holySaturday: Date;
  easterSunday: Date;
  divineMercySunday: Date;
  ascension: Date;
  pentecost: Date;
  trinitySunday: Date;
  corpusChristi: Date;
} {
  const easter = calculateEaster(year);

  return {
    ashWednesday: addDays(easter, -46),
    palmSunday: addDays(easter, -7),
    holyThursday: addDays(easter, -3),
    goodFriday: addDays(easter, -2),
    holySaturday: addDays(easter, -1),
    easterSunday: easter,
    divineMercySunday: addDays(easter, 7),
    ascension: addDays(easter, 39), // or 43 in some regions
    pentecost: addDays(easter, 49),
    trinitySunday: addDays(easter, 56),
    corpusChristi: addDays(easter, 60), // or next Sunday in some regions
  };
}

/**
 * Get liturgical seasons for a year
 */
export function getLiturgicalSeasons(year: number): {
  name: string;
  color: string;
  startDate: Date;
  endDate: Date;
}[] {
  const adventStart = getAdventStart(year);
  const christmas = new Date(year, 11, 25);
  const epiphany = new Date(year + 1, 0, 6); // Jan 6
  const baptismOfTheLord = getNextSunday(epiphany);

  const movableFeasts = getMovableFeasts(year + 1);
  const ashWednesday = movableFeasts.ashWednesday;
  const easterSunday = movableFeasts.easterSunday;
  const pentecost = movableFeasts.pentecost;

  const nextAdventStart = getAdventStart(year + 1);

  return [
    {
      name: 'Advent',
      color: 'purple',
      startDate: adventStart,
      endDate: addDays(christmas, -1)
    },
    {
      name: 'Christmas',
      color: 'white',
      startDate: christmas,
      endDate: baptismOfTheLord
    },
    {
      name: 'Ordinary Time I',
      color: 'green',
      startDate: addDays(baptismOfTheLord, 1),
      endDate: addDays(ashWednesday, -1)
    },
    {
      name: 'Lent',
      color: 'purple',
      startDate: ashWednesday,
      endDate: addDays(easterSunday, -1)
    },
    {
      name: 'Easter',
      color: 'white',
      startDate: easterSunday,
      endDate: pentecost
    },
    {
      name: 'Ordinary Time II',
      color: 'green',
      startDate: addDays(pentecost, 1),
      endDate: addDays(nextAdventStart, -1)
    }
  ];
}

/**
 * Helper: Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Helper: Get next Sunday after a given date
 */
function getNextSunday(date: Date): Date {
  const result = new Date(date);
  const daysUntilSunday = (7 - result.getDay()) % 7;
  result.setDate(result.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return result;
}

/**
 * Get current liturgical season for a given date
 */
export function getCurrentLiturgicalSeason(date: Date = new Date()): {
  name: string;
  color: string;
  cycle: 'A' | 'B' | 'C';
} {
  const year = date.getFullYear();
  const seasons = getLiturgicalSeasons(year - 1); // Check previous year too for Advent
  seasons.push(...getLiturgicalSeasons(year));

  const currentSeason = seasons.find(season =>
    date >= season.startDate && date <= season.endDate
  );

  if (!currentSeason) {
    return { name: 'Ordinary Time', color: 'green', cycle: getLiturgicalCycle(year) };
  }

  return {
    ...currentSeason,
    cycle: getLiturgicalCycle(year)
  };
}

/**
 * Check if a date is Day 28 (St. Jude Thaddeus)
 */
export function isStJudeDay(date: Date): boolean {
  return date.getDate() === 28;
}

/**
 * Check if date is in St. Jude Novena period (Oct 20-27)
 */
export function isStJudeNovena(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  return month === 9 && day >= 20 && day <= 27; // October (month 9)
}

/**
 * Check if date is St. Jude Feast Day (October 28)
 */
export function isStJudeFeast(date: Date): boolean {
  return date.getMonth() === 9 && date.getDate() === 28;
}

/**
 * Get special monthly observances
 */
export function getSpecialMonthlyObservances(date: Date): {
  isFirstThursday: boolean;
  isFirstFriday: boolean;
  isFirstSaturday: boolean;
} {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  return {
    isFirstThursday: dayOfWeek === 4 && dayOfMonth >= 1 && dayOfMonth <= 7,
    isFirstFriday: dayOfWeek === 5 && dayOfMonth >= 1 && dayOfMonth <= 7,
    isFirstSaturday: dayOfWeek === 6 && dayOfMonth >= 1 && dayOfMonth <= 7,
  };
}
