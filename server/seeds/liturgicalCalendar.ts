/**
 * Liturgical Calendar Seeding Script
 * Populates database with liturgical years, seasons, and celebrations for 2024-2026
 */

import { db } from '../db';
import {
  liturgicalYears,
  liturgicalSeasons,
  liturgicalCelebrations,
} from '../../shared/schema';
import {
  calculateEaster,
  getLiturgicalCycle,
  getAdventStart,
  getMovableFeasts,
} from '../utils/liturgicalCalculations';

interface FixedCelebration {
  month: number; // 0-11 (JavaScript Date format)
  day: number;
  name: string;
  rank: 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'OPTIONAL_MEMORIAL';
  color: 'white' | 'red' | 'green' | 'purple' | 'rose' | 'black';
  specialMassConfig?: {
    times?: string[];
    minMinisters?: { [time: string]: number };
    maxMinisters?: { [time: string]: number };
    requiresProcession?: boolean;
    requiresIncense?: boolean;
  };
}

/**
 * Fixed date celebrations (same date every year)
 */
const FIXED_CELEBRATIONS: FixedCelebration[] = [
  // January
  {
    month: 0,
    day: 1,
    name: 'Santa Maria, Mãe de Deus',
    rank: 'SOLEMNITY',
    color: 'white',
    specialMassConfig: {
      requiresIncense: true,
    },
  },
  {
    month: 0,
    day: 6,
    name: 'Epifania do Senhor',
    rank: 'SOLEMNITY',
    color: 'white',
    specialMassConfig: {
      requiresIncense: true,
    },
  },

  // March
  {
    month: 2,
    day: 19,
    name: 'São José, Esposo da Virgem Maria',
    rank: 'SOLEMNITY',
    color: 'white',
  },
  {
    month: 2,
    day: 25,
    name: 'Anunciação do Senhor',
    rank: 'SOLEMNITY',
    color: 'white',
  },

  // June
  {
    month: 5,
    day: 24,
    name: 'Nascimento de São João Batista',
    rank: 'SOLEMNITY',
    color: 'white',
  },
  {
    month: 5,
    day: 29,
    name: 'São Pedro e São Paulo',
    rank: 'SOLEMNITY',
    color: 'red',
  },

  // August
  {
    month: 7,
    day: 6,
    name: 'Transfiguração do Senhor',
    rank: 'FEAST',
    color: 'white',
  },
  {
    month: 7,
    day: 15,
    name: 'Assunção de Nossa Senhora',
    rank: 'SOLEMNITY',
    color: 'white',
    specialMassConfig: {
      requiresIncense: true,
    },
  },

  // September
  {
    month: 8,
    day: 8,
    name: 'Natividade de Nossa Senhora',
    rank: 'FEAST',
    color: 'white',
  },
  {
    month: 8,
    day: 14,
    name: 'Exaltação da Santa Cruz',
    rank: 'FEAST',
    color: 'red',
  },
  {
    month: 8,
    day: 29,
    name: 'São Miguel, São Gabriel e São Rafael, Arcanjos',
    rank: 'FEAST',
    color: 'white',
  },

  // October
  {
    month: 9,
    day: 28,
    name: 'São Judas Tadeu, Apóstolo',
    rank: 'FEAST',
    color: 'red',
    specialMassConfig: {
      times: ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'],
      minMinisters: {
        '07:00': 12,
        '10:00': 12,
        '12:00': 12,
        '15:00': 12,
        '17:00': 15,
        '19:30': 20,
      },
      maxMinisters: {
        '07:00': 12,
        '10:00': 12,
        '12:00': 12,
        '15:00': 12,
        '17:00': 15,
        '19:30': 25,
      },
    },
  },

  // November
  {
    month: 10,
    day: 1,
    name: 'Todos os Santos',
    rank: 'SOLEMNITY',
    color: 'white',
    specialMassConfig: {
      requiresIncense: true,
    },
  },
  {
    month: 10,
    day: 2,
    name: 'Comemoração de Todos os Fiéis Defuntos',
    rank: 'MEMORIAL',
    color: 'purple',
  },

  // December
  {
    month: 11,
    day: 8,
    name: 'Imaculada Conceição',
    rank: 'SOLEMNITY',
    color: 'white',
    specialMassConfig: {
      requiresIncense: true,
    },
  },
  {
    month: 11,
    day: 25,
    name: 'Natal do Senhor',
    rank: 'SOLEMNITY',
    color: 'white',
    specialMassConfig: {
      times: ['00:00', '08:00', '10:00'],
      minMinisters: {
        '00:00': 25,
        '08:00': 18,
        '10:00': 25,
      },
      maxMinisters: {
        '00:00': 28,
        '08:00': 20,
        '10:00': 28,
      },
      requiresIncense: true,
    },
  },
];

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date as YYYY-MM-DD for database
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get next Sunday after a given date
 */
function getNextSunday(date: Date): Date {
  const result = new Date(date);
  const daysUntilSunday = (7 - result.getDay()) % 7;
  result.setDate(result.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return result;
}

/**
 * Seed liturgical year data
 */
async function seedLiturgicalYear(year: number) {
  console.log(`Seeding liturgical year ${year}...`);

  // Calculate key dates
  const cycle = getLiturgicalCycle(year);
  const adventStart = getAdventStart(year);
  const adventEnd = new Date(year, 11, 24); // Dec 24
  const easter = calculateEaster(year);
  const movableFeasts = getMovableFeasts(year);

  // Insert liturgical year
  const [liturgicalYear] = await db
    .insert(liturgicalYears)
    .values({
      year,
      cycle,
      startDate: formatDate(adventStart),
      endDate: formatDate(getAdventStart(year + 1)),
      easterDate: formatDate(easter),
    })
    .returning();

  console.log(`  Created liturgical year ${year} (Cycle ${cycle})`);

  // Seed seasons
  await seedSeasons(year, liturgicalYear.id, movableFeasts);

  // Seed celebrations
  await seedCelebrations(year, liturgicalYear.id, movableFeasts);

  console.log(`  Completed liturgical year ${year}`);
}

/**
 * Seed liturgical seasons for a year
 */
async function seedSeasons(
  year: number,
  yearId: string,
  movableFeasts: ReturnType<typeof getMovableFeasts>
) {
  const adventStart = getAdventStart(year);
  const christmas = new Date(year, 11, 25);
  const epiphany = new Date(year + 1, 0, 6);
  const baptismOfTheLord = getNextSunday(epiphany);

  const ashWednesday = movableFeasts.ashWednesday;
  const easterSunday = movableFeasts.easterSunday;
  const pentecost = movableFeasts.pentecost;

  const nextAdventStart = getAdventStart(year + 1);

  const seasons = [
    {
      yearId,
      name: 'Advento',
      color: 'purple' as const,
      startDate: formatDate(adventStart),
      endDate: formatDate(addDays(christmas, -1)),
      description: 'Tempo de preparação para o Natal',
    },
    {
      yearId,
      name: 'Natal',
      color: 'white' as const,
      startDate: formatDate(christmas),
      endDate: formatDate(baptismOfTheLord),
      description: 'Celebração do nascimento de Jesus',
    },
    {
      yearId,
      name: 'Tempo Comum I',
      color: 'green' as const,
      startDate: formatDate(addDays(baptismOfTheLord, 1)),
      endDate: formatDate(addDays(ashWednesday, -1)),
      description: 'Primeiro período do Tempo Comum',
    },
    {
      yearId,
      name: 'Quaresma',
      color: 'purple' as const,
      startDate: formatDate(ashWednesday),
      endDate: formatDate(addDays(easterSunday, -1)),
      description: 'Tempo de penitência e preparação para a Páscoa',
    },
    {
      yearId,
      name: 'Páscoa',
      color: 'white' as const,
      startDate: formatDate(easterSunday),
      endDate: formatDate(pentecost),
      description: 'Celebração da Ressurreição de Jesus',
    },
    {
      yearId,
      name: 'Tempo Comum II',
      color: 'green' as const,
      startDate: formatDate(addDays(pentecost, 1)),
      endDate: formatDate(addDays(nextAdventStart, -1)),
      description: 'Segundo período do Tempo Comum',
    },
  ];

  await db.insert(liturgicalSeasons).values(seasons);
  console.log(`  Created ${seasons.length} liturgical seasons`);
}

/**
 * Seed liturgical celebrations for a year
 */
async function seedCelebrations(
  year: number,
  yearId: string,
  movableFeasts: ReturnType<typeof getMovableFeasts>
) {
  const celebrations = [];

  // Add movable feasts (Easter-dependent)
  celebrations.push(
    {
      yearId,
      date: formatDate(movableFeasts.ashWednesday),
      name: 'Quarta-feira de Cinzas',
      rank: 'MEMORIAL' as const,
      color: 'purple' as const,
      isMovable: true,
    },
    {
      yearId,
      date: formatDate(movableFeasts.palmSunday),
      name: 'Domingo de Ramos',
      rank: 'SOLEMNITY' as const,
      color: 'red' as const,
      isMovable: true,
      specialMassConfig: {
        requiresProcession: true,
      },
    },
    {
      yearId,
      date: formatDate(movableFeasts.holyThursday),
      name: 'Quinta-feira Santa',
      rank: 'SOLEMNITY' as const,
      color: 'white' as const,
      isMovable: true,
      specialMassConfig: {
        times: ['19:00'],
        minMinisters: { '19:00': 25 },
        maxMinisters: { '19:00': 28 },
        requiresIncense: true,
        requiresProcession: true,
      },
    },
    {
      yearId,
      date: formatDate(movableFeasts.goodFriday),
      name: 'Sexta-feira Santa',
      rank: 'SOLEMNITY' as const,
      color: 'red' as const,
      isMovable: true,
      specialMassConfig: {
        times: ['15:00'],
        minMinisters: { '15:00': 25 },
        maxMinisters: { '15:00': 28 },
        requiresIncense: true,
      },
    },
    {
      yearId,
      date: formatDate(movableFeasts.easterSunday),
      name: 'Domingo de Páscoa',
      rank: 'SOLEMNITY' as const,
      color: 'white' as const,
      isMovable: true,
      specialMassConfig: {
        times: ['20:00', '10:00'],
        minMinisters: { '20:00': 25, '10:00': 25 },
        maxMinisters: { '20:00': 28, '10:00': 28 },
        requiresIncense: true,
        requiresProcession: true,
      },
    },
    {
      yearId,
      date: formatDate(movableFeasts.divineMercySunday),
      name: 'Domingo da Divina Misericórdia',
      rank: 'FEAST' as const,
      color: 'white' as const,
      isMovable: true,
    },
    {
      yearId,
      date: formatDate(movableFeasts.ascension),
      name: 'Ascensão do Senhor',
      rank: 'SOLEMNITY' as const,
      color: 'white' as const,
      isMovable: true,
      specialMassConfig: {
        requiresIncense: true,
      },
    },
    {
      yearId,
      date: formatDate(movableFeasts.pentecost),
      name: 'Pentecostes',
      rank: 'SOLEMNITY' as const,
      color: 'red' as const,
      isMovable: true,
      specialMassConfig: {
        requiresIncense: true,
      },
    },
    {
      yearId,
      date: formatDate(movableFeasts.trinitySunday),
      name: 'Santíssima Trindade',
      rank: 'SOLEMNITY' as const,
      color: 'white' as const,
      isMovable: true,
    },
    {
      yearId,
      date: formatDate(movableFeasts.corpusChristi),
      name: 'Corpus Christi',
      rank: 'SOLEMNITY' as const,
      color: 'white' as const,
      isMovable: true,
      specialMassConfig: {
        times: ['10:00'],
        minMinisters: { '10:00': 28 },
        maxMinisters: { '10:00': 28 },
        requiresIncense: true,
        requiresProcession: true,
      },
    }
  );

  // Add fixed date celebrations
  for (const fixedCelebration of FIXED_CELEBRATIONS) {
    celebrations.push({
      yearId,
      date: formatDate(new Date(year, fixedCelebration.month, fixedCelebration.day)),
      name: fixedCelebration.name,
      rank: fixedCelebration.rank,
      color: fixedCelebration.color,
      isMovable: false,
      specialMassConfig: fixedCelebration.specialMassConfig,
    });
  }

  await db.insert(liturgicalCelebrations).values(celebrations);
  console.log(`  Created ${celebrations.length} liturgical celebrations`);
}

/**
 * Main seeding function
 */
export async function seedLiturgicalCalendar() {
  console.log('Starting liturgical calendar seeding...\n');

  try {
    // Seed years 2024-2026
    for (const year of [2024, 2025, 2026]) {
      await seedLiturgicalYear(year);
    }

    console.log('\n✅ Liturgical calendar seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding liturgical calendar:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedLiturgicalCalendar()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
