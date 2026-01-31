/**
 * Seed script for Mass Configurations
 *
 * Migrates the hardcoded mass rules from scheduleGenerator.ts to the database.
 * Run with: npx tsx scripts/seed-mass-config.ts
 */

import { db } from '../server/db';
import { massConfigurations, specialEvents } from '../shared/schema';
import type { InsertMassConfiguration, InsertSpecialEvent } from '../shared/schema';

async function seedMassConfigurations() {
  console.log('🌱 Seeding mass configurations...');

  const configs: InsertMassConfiguration[] = [
    // ============================================
    // WEEKLY MASSES
    // ============================================

    // Daily Mass (Monday to Friday at 6:30)
    {
      name: 'Missa Diária',
      description: 'Missa diária de segunda a sexta-feira às 6h30',
      recurrenceType: 'weekly',
      dayOfWeek: 1, // Monday
      time: '06:30',
      durationMinutes: 45,
      minMinisters: 5,
      maxMinisters: 5,
      massType: 'missa_diaria',
      priority: 0,
      isActive: true
    },
    {
      name: 'Missa Diária',
      description: 'Missa diária de segunda a sexta-feira às 6h30',
      recurrenceType: 'weekly',
      dayOfWeek: 2, // Tuesday
      time: '06:30',
      durationMinutes: 45,
      minMinisters: 5,
      maxMinisters: 5,
      massType: 'missa_diaria',
      priority: 0,
      isActive: true
    },
    {
      name: 'Missa Diária',
      description: 'Missa diária de segunda a sexta-feira às 6h30',
      recurrenceType: 'weekly',
      dayOfWeek: 3, // Wednesday
      time: '06:30',
      durationMinutes: 45,
      minMinisters: 5,
      maxMinisters: 5,
      massType: 'missa_diaria',
      priority: 0,
      isActive: true
    },
    {
      name: 'Missa Diária',
      description: 'Missa diária de segunda a sexta-feira às 6h30',
      recurrenceType: 'weekly',
      dayOfWeek: 4, // Thursday
      time: '06:30',
      durationMinutes: 45,
      minMinisters: 5,
      maxMinisters: 5,
      massType: 'missa_diaria',
      priority: 0,
      isActive: true
    },
    {
      name: 'Missa Diária',
      description: 'Missa diária de segunda a sexta-feira às 6h30',
      recurrenceType: 'weekly',
      dayOfWeek: 5, // Friday
      time: '06:30',
      durationMinutes: 45,
      minMinisters: 5,
      maxMinisters: 5,
      massType: 'missa_diaria',
      priority: 0,
      isActive: true
    },

    // Sunday Masses
    {
      name: 'Missa Dominical 8h',
      description: 'Missa dominical às 8h',
      recurrenceType: 'weekly',
      dayOfWeek: 0, // Sunday
      time: '08:00',
      durationMinutes: 90,
      minMinisters: 15,
      maxMinisters: 15,
      massType: 'missa_dominical',
      priority: 10,
      isActive: true
    },
    {
      name: 'Missa Dominical 10h',
      description: 'Missa dominical às 10h',
      recurrenceType: 'weekly',
      dayOfWeek: 0, // Sunday
      time: '10:00',
      durationMinutes: 90,
      minMinisters: 20,
      maxMinisters: 20,
      massType: 'missa_dominical',
      priority: 10,
      isActive: true
    },
    {
      name: 'Missa Dominical 19h',
      description: 'Missa dominical às 19h',
      recurrenceType: 'weekly',
      dayOfWeek: 0, // Sunday
      time: '19:00',
      durationMinutes: 90,
      minMinisters: 20,
      maxMinisters: 20,
      massType: 'missa_dominical',
      priority: 10,
      isActive: true
    },

    // ============================================
    // MONTHLY MASSES
    // ============================================

    // First Thursday - Healing Mass (Cura e Libertação)
    {
      name: 'Missa de Cura e Libertação',
      description: 'Missa de Cura e Libertação na primeira quinta-feira do mês às 19h30',
      recurrenceType: 'monthly',
      dayOfWeek: 4, // Thursday
      occurrenceInMonth: 1, // First occurrence
      time: '19:30',
      durationMinutes: 120,
      minMinisters: 26,
      maxMinisters: 26,
      massType: 'missa_cura_libertacao',
      priority: 50,
      isActive: true
    },

    // First Friday - Sacred Heart of Jesus
    {
      name: 'Missa Sagrado Coração de Jesus',
      description: 'Missa em honra ao Sagrado Coração de Jesus na primeira sexta-feira do mês às 6h30',
      recurrenceType: 'monthly',
      dayOfWeek: 5, // Friday
      occurrenceInMonth: 1, // First occurrence
      time: '06:30',
      durationMinutes: 60,
      minMinisters: 6,
      maxMinisters: 6,
      massType: 'missa_sagrado_coracao',
      priority: 50,
      isActive: true
    },

    // First Saturday - Immaculate Heart of Mary
    {
      name: 'Missa Imaculado Coração de Maria',
      description: 'Missa em honra ao Imaculado Coração de Maria no primeiro sábado do mês às 6h30',
      recurrenceType: 'monthly',
      dayOfWeek: 6, // Saturday
      occurrenceInMonth: 1, // First occurrence
      time: '06:30',
      durationMinutes: 60,
      minMinisters: 6,
      maxMinisters: 6,
      massType: 'missa_imaculado_coracao',
      priority: 50,
      isActive: true
    },

    // Monthly São Judas (28th of each month, except October)
    {
      name: 'São Judas Mensal 7h',
      description: 'Missa mensal de São Judas Tadeu no dia 28 às 7h',
      recurrenceType: 'monthly',
      dayOfMonth: 28,
      time: '07:00',
      durationMinutes: 60,
      minMinisters: 6,
      maxMinisters: 6,
      massType: 'missa_sao_judas',
      priority: 60,
      isActive: true,
      // October is excluded because it has the feast
      excludedDates: [] // Will be handled by special event suppression in October
    },
    {
      name: 'São Judas Mensal 15h',
      description: 'Missa mensal de São Judas Tadeu no dia 28 às 15h',
      recurrenceType: 'monthly',
      dayOfMonth: 28,
      time: '15:00',
      durationMinutes: 60,
      minMinisters: 4,
      maxMinisters: 4,
      massType: 'missa_sao_judas',
      priority: 60,
      isActive: true
    },
    {
      name: 'São Judas Mensal 19h30',
      description: 'Missa mensal de São Judas Tadeu no dia 28 às 19h30',
      recurrenceType: 'monthly',
      dayOfMonth: 28,
      time: '19:30',
      durationMinutes: 90,
      minMinisters: 7,
      maxMinisters: 7,
      massType: 'missa_sao_judas',
      priority: 60,
      isActive: true
    },

    // Monday Adoration (special handling needed for random selection)
    {
      name: 'Adoração ao Santíssimo',
      description: 'Adoração ao Santíssimo Sacramento às segundas-feiras às 22h',
      recurrenceType: 'weekly',
      dayOfWeek: 1, // Monday
      time: '22:00',
      durationMinutes: 60,
      minMinisters: 3, // Variable based on draw
      maxMinisters: 10,
      massType: 'adoracao',
      priority: 20,
      isActive: true
    }
  ];

  // Insert configurations
  for (const config of configs) {
    try {
      await db.insert(massConfigurations).values(config);
      console.log(`  ✅ Created: ${config.name} (${config.recurrenceType}, ${config.time})`);
    } catch (error) {
      console.error(`  ❌ Failed to create ${config.name}:`, error);
    }
  }

  console.log(`\n🎉 Seeded ${configs.length} mass configurations`);
}

async function seedSpecialEvents(year: number) {
  console.log(`\n🌱 Seeding special events for ${year}...`);

  const events: InsertSpecialEvent[] = [];

  // ============================================
  // OCTOBER - São Judas Novena and Feast
  // ============================================

  // Novena days (19-27 October)
  // Note: Oct 19 and 26 are Sundays - novena is unified with 19h mass
  for (let day = 19; day <= 27; day++) {
    const date = new Date(year, 9, day); // October is month 9 (0-indexed)
    const dayOfWeek = date.getDay();

    // Skip Sundays (novena is unified with regular Sunday mass)
    if (dayOfWeek === 0) continue;

    // Saturday (25) has novena at 19:00, others at 19:30
    const time = dayOfWeek === 6 ? '19:00' : '19:30';

    events.push({
      name: `Novena São Judas - ${day - 18}º dia`,
      description: `${day - 18}º dia da Novena de São Judas Tadeu`,
      eventDate: `${year}-10-${day.toString().padStart(2, '0')}`,
      eventTime: time,
      durationMinutes: 90,
      minMinisters: 26,
      maxMinisters: 26,
      massType: 'novena',
      location: 'Igreja São Judas Tadeu',
      priority: 100,
      suppressesMassTypes: ['missa_diaria'], // No daily mass during novena
      isActive: true
    });
  }

  // Feast of São Judas (October 28)
  const feastMasses = [
    { time: '05:00', ministers: 26 },
    { time: '07:00', ministers: 26 },
    { time: '09:00', ministers: 26 },
    { time: '12:00', ministers: 26 },
    { time: '17:00', ministers: 26 },
    { time: '19:30', ministers: 26 }
  ];

  for (const mass of feastMasses) {
    events.push({
      name: `Festa São Judas ${mass.time}`,
      description: `Missa da Festa de São Judas Tadeu às ${mass.time}`,
      eventDate: `${year}-10-28`,
      eventTime: mass.time,
      durationMinutes: 90,
      minMinisters: mass.ministers,
      maxMinisters: mass.ministers,
      massType: 'festa_padroeiro',
      location: 'Igreja São Judas Tadeu',
      priority: 200, // Highest priority
      suppressesMassTypes: ['missa_diaria', 'missa_sao_judas'], // Suppress regular masses
      isActive: true
    });
  }

  // ============================================
  // NOVEMBER - Finados and Other Events
  // ============================================

  // Finados (November 2)
  events.push({
    name: 'Missa de Finados',
    description: 'Missa do Dia de Finados no Cemitério Memorial',
    eventDate: `${year}-11-02`,
    eventTime: '15:30',
    durationMinutes: 60,
    minMinisters: 10,
    maxMinisters: 10,
    massType: 'finados',
    location: 'Cemitério Memorial',
    priority: 80,
    suppressesMassTypes: [],
    isActive: true
  });

  // PUC Consciência Negra (November 20)
  events.push({
    name: 'Missa PUC - Consciência Negra',
    description: 'Missa na PUC em celebração ao Dia da Consciência Negra',
    eventDate: `${year}-11-20`,
    eventTime: '10:00',
    durationMinutes: 90,
    minMinisters: 10,
    maxMinisters: 10,
    massType: 'evento_especial',
    location: 'PUC Sorocaba',
    priority: 70,
    suppressesMassTypes: [],
    isActive: true
  });

  // Insert events
  for (const event of events) {
    try {
      await db.insert(specialEvents).values(event);
      console.log(`  ✅ Created: ${event.name} (${event.eventDate} ${event.eventTime})`);
    } catch (error) {
      console.error(`  ❌ Failed to create ${event.name}:`, error);
    }
  }

  console.log(`\n🎉 Seeded ${events.length} special events for ${year}`);
}

async function main() {
  try {
    // Seed configurations (these are recurring, not year-specific)
    await seedMassConfigurations();

    // Seed special events for current and next year
    const currentYear = new Date().getFullYear();
    await seedSpecialEvents(currentYear);
    await seedSpecialEvents(currentYear + 1);

    console.log('\n✨ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
