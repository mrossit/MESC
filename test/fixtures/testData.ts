/**
 * Test Data Fixtures
 *
 * Mock data for testing purposes - used to populate the development database
 */

import { v4 as uuidv4 } from 'uuid';

// Generate consistent IDs for relationships
export const TEST_IDS = {
  // Users
  gestor1: 'test-gestor-001',
  coordenador1: 'test-coord-001',
  coordenador2: 'test-coord-002',
  ministro1: 'test-ministro-001',
  ministro2: 'test-ministro-002',
  ministro3: 'test-ministro-003',
  ministro4: 'test-ministro-004',
  ministro5: 'test-ministro-005',
  ministro6: 'test-ministro-006',
  ministro7: 'test-ministro-007',
  ministro8: 'test-ministro-008',
  pendingUser: 'test-pending-001',

  // Families
  family1: 'test-family-001',
  family2: 'test-family-002',

  // Schedules
  schedule1: 'test-schedule-001',
  schedule2: 'test-schedule-002',
  schedule3: 'test-schedule-003',
  schedule4: 'test-schedule-004',

  // Questionnaires
  questionnaire1: 'test-questionnaire-001',
  questionnaire2: 'test-questionnaire-002',

  // Substitutions
  substitution1: 'test-substitution-001',
  substitution2: 'test-substitution-002',

  // Badges
  badge1: 'test-badge-001',
  badge2: 'test-badge-002',
  badge3: 'test-badge-003',

  // Formation
  track1: 'test-track-001',
  module1: 'test-module-001',
  lesson1: 'test-lesson-001',
  material1: 'test-material-001',
};

// Test password hash for "test123"
// bcrypt hash - in real tests this would be generated
export const TEST_PASSWORD_HASH = '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4l5N5H5H5H5H5H5G';

/**
 * Test Users
 */
export const TEST_USERS = [
  {
    id: TEST_IDS.gestor1,
    email: 'gestor@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Carlos Gestor',
    firstName: 'Carlos',
    lastName: 'Gestor',
    role: 'gestor' as const,
    status: 'active' as const,
    phone: '(11) 99999-0001',
    whatsapp: '5511999990001',
    reliabilityScore: 100,
    totalServices: 50,
  },
  {
    id: TEST_IDS.coordenador1,
    email: 'coord1@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Maria Coordenadora',
    firstName: 'Maria',
    lastName: 'Coordenadora',
    role: 'coordenador' as const,
    status: 'active' as const,
    phone: '(11) 99999-0002',
    whatsapp: '5511999990002',
    reliabilityScore: 95,
    totalServices: 45,
  },
  {
    id: TEST_IDS.coordenador2,
    email: 'coord2@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Jose Coordenador',
    firstName: 'Jose',
    lastName: 'Coordenador',
    role: 'coordenador' as const,
    status: 'active' as const,
    phone: '(11) 99999-0003',
    reliabilityScore: 90,
    totalServices: 40,
  },
  {
    id: TEST_IDS.ministro1,
    email: 'ministro1@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Ana Silva',
    firstName: 'Ana',
    lastName: 'Silva',
    role: 'ministro' as const,
    status: 'active' as const,
    phone: '(11) 99999-0004',
    reliabilityScore: 85,
    totalServices: 30,
    familyId: TEST_IDS.family1,
  },
  {
    id: TEST_IDS.ministro2,
    email: 'ministro2@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Pedro Santos',
    firstName: 'Pedro',
    lastName: 'Santos',
    role: 'ministro' as const,
    status: 'active' as const,
    phone: '(11) 99999-0005',
    reliabilityScore: 90,
    totalServices: 35,
    familyId: TEST_IDS.family1,
    spouseMinisterId: TEST_IDS.ministro1,
  },
  {
    id: TEST_IDS.ministro3,
    email: 'ministro3@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Lucia Oliveira',
    firstName: 'Lucia',
    lastName: 'Oliveira',
    role: 'ministro' as const,
    status: 'active' as const,
    phone: '(11) 99999-0006',
    reliabilityScore: 80,
    totalServices: 20,
  },
  {
    id: TEST_IDS.ministro4,
    email: 'ministro4@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Paulo Costa',
    firstName: 'Paulo',
    lastName: 'Costa',
    role: 'ministro' as const,
    status: 'active' as const,
    phone: '(11) 99999-0007',
    reliabilityScore: 75,
    totalServices: 15,
  },
  {
    id: TEST_IDS.ministro5,
    email: 'ministro5@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Fernanda Lima',
    firstName: 'Fernanda',
    lastName: 'Lima',
    role: 'ministro' as const,
    status: 'active' as const,
    reliabilityScore: 95,
    totalServices: 40,
  },
  {
    id: TEST_IDS.ministro6,
    email: 'ministro6@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Roberto Alves',
    firstName: 'Roberto',
    lastName: 'Alves',
    role: 'ministro' as const,
    status: 'active' as const,
    reliabilityScore: 70,
    totalServices: 10,
  },
  {
    id: TEST_IDS.ministro7,
    email: 'ministro7@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Carla Mendes',
    firstName: 'Carla',
    lastName: 'Mendes',
    role: 'ministro' as const,
    status: 'active' as const,
    reliabilityScore: 88,
    totalServices: 25,
    familyId: TEST_IDS.family2,
  },
  {
    id: TEST_IDS.ministro8,
    email: 'ministro8@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Marcos Souza',
    firstName: 'Marcos',
    lastName: 'Souza',
    role: 'ministro' as const,
    status: 'active' as const,
    reliabilityScore: 92,
    totalServices: 28,
    familyId: TEST_IDS.family2,
    spouseMinisterId: TEST_IDS.ministro7,
  },
  {
    id: TEST_IDS.pendingUser,
    email: 'pending@test.com',
    passwordHash: TEST_PASSWORD_HASH,
    name: 'Usuario Pendente',
    firstName: 'Usuario',
    lastName: 'Pendente',
    role: 'ministro' as const,
    status: 'pending' as const,
    phone: '(11) 99999-0099',
  },
];

/**
 * Get upcoming Sundays for the next 2 months
 */
export function getUpcomingSundays(count: number = 8): string[] {
  const sundays: string[] = [];
  const date = new Date();

  // Find next Sunday
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }

  for (let i = 0; i < count; i++) {
    sundays.push(date.toISOString().split('T')[0]);
    date.setDate(date.getDate() + 7);
  }

  return sundays;
}

/**
 * Get current month/year for questionnaires
 */
export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

/**
 * Get next month/year
 */
export function getNextPeriod(): { month: number; year: number } {
  const now = new Date();
  const nextMonth = now.getMonth() + 2;
  return {
    month: nextMonth > 12 ? 1 : nextMonth,
    year: nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear(),
  };
}

/**
 * Test Schedules - Dynamic dates
 */
export function generateTestSchedules() {
  const sundays = getUpcomingSundays(4);
  const massTimes = ['08:00', '10:00', '19:00'];

  const schedules = [];
  let scheduleIndex = 0;

  for (const sunday of sundays.slice(0, 2)) {
    for (const time of massTimes) {
      // 4 positions per mass
      for (let position = 1; position <= 4; position++) {
        const ministerId = TEST_USERS[3 + (scheduleIndex % 8)].id; // Rotate through ministers
        schedules.push({
          id: `test-schedule-${String(scheduleIndex + 1).padStart(3, '0')}`,
          date: sunday,
          time: time,
          type: 'missa' as const,
          ministerId: ministerId,
          position: position,
          status: 'scheduled',
        });
        scheduleIndex++;
      }
    }
  }

  return schedules;
}

/**
 * Test Questionnaires
 */
export function generateTestQuestionnaires() {
  const { month, year } = getNextPeriod();
  const sundays = getUpcomingSundays(8).filter(d => {
    const date = new Date(d);
    return date.getMonth() + 1 === month;
  });

  return [
    {
      id: TEST_IDS.questionnaire1,
      title: `Disponibilidade ${month}/${year}`,
      description: 'Informe sua disponibilidade para o proximo mes',
      month: month,
      year: year,
      status: 'published',
      questions: JSON.stringify([
        {
          id: 'q1',
          type: 'checkbox',
          text: 'Quais domingos voce pode servir?',
          options: sundays,
        },
        {
          id: 'q2',
          type: 'checkbox',
          text: 'Quais horarios voce prefere?',
          options: ['08:00', '10:00', '17:00', '19:00'],
        },
        {
          id: 'q3',
          type: 'boolean',
          text: 'Voce pode substituir outros ministros se necessario?',
        },
      ]),
      createdById: TEST_IDS.gestor1,
    },
  ];
}

/**
 * Test Questionnaire Responses
 */
export function generateTestResponses() {
  const { month, year } = getNextPeriod();
  const sundays = getUpcomingSundays(8).filter(d => {
    const date = new Date(d);
    return date.getMonth() + 1 === month;
  });

  const activeMinistros = TEST_USERS.filter(
    u => u.role === 'ministro' && u.status === 'active'
  );

  return activeMinistros.map((ministro, index) => ({
    id: `test-response-${String(index + 1).padStart(3, '0')}`,
    questionnaireId: TEST_IDS.questionnaire1,
    userId: ministro.id,
    responses: JSON.stringify({
      q1: sundays.slice(0, 2 + (index % 3)), // Vary availability
      q2: ['08:00', '10:00'].slice(0, 1 + (index % 2)),
      q3: index % 2 === 0,
    }),
    availableSundays: sundays.slice(0, 2 + (index % 3)),
    preferredMassTimes: ['08:00', '10:00'].slice(0, 1 + (index % 2)),
    canSubstitute: index % 2 === 0,
  }));
}

/**
 * Test Substitution Requests
 */
export function generateTestSubstitutions() {
  const schedules = generateTestSchedules();
  const firstSchedule = schedules[0];
  const secondSchedule = schedules[4];

  return [
    {
      id: TEST_IDS.substitution1,
      scheduleId: firstSchedule.id,
      requesterId: firstSchedule.ministerId,
      substituteId: TEST_IDS.ministro5,
      status: 'pending' as const,
      urgency: 'medium' as const,
      reason: 'Viagem de trabalho',
    },
    {
      id: TEST_IDS.substitution2,
      scheduleId: secondSchedule.id,
      requesterId: secondSchedule.ministerId,
      substituteId: null,
      status: 'available' as const,
      urgency: 'low' as const,
      reason: 'Compromisso familiar',
    },
  ];
}

/**
 * Test Badges
 */
export const TEST_BADGES = [
  {
    id: TEST_IDS.badge1,
    code: 'test_first_mass',
    name: 'Primeira Missa (Test)',
    description: 'Badge de teste para primeira missa',
    category: 'participation' as const,
    rarity: 'common' as const,
    iconName: 'Church',
    iconColor: 'blue',
    pointsAwarded: 50,
    requirement: { type: 'masses_served', value: 1, description: 'Servir em 1 missa' },
    isActive: true,
  },
  {
    id: TEST_IDS.badge2,
    code: 'test_helper',
    name: 'Ajudante (Test)',
    description: 'Badge de teste para ajuda',
    category: 'community' as const,
    rarity: 'uncommon' as const,
    iconName: 'Heart',
    iconColor: 'red',
    pointsAwarded: 100,
    requirement: { type: 'substitutions_helped', value: 5, description: 'Aceitar 5 substituicoes' },
    isActive: true,
  },
  {
    id: TEST_IDS.badge3,
    code: 'test_student',
    name: 'Estudante (Test)',
    description: 'Badge de teste para formacao',
    category: 'formation' as const,
    rarity: 'common' as const,
    iconName: 'BookOpen',
    iconColor: 'green',
    pointsAwarded: 30,
    requirement: { type: 'materials_completed', value: 1, description: 'Completar 1 material' },
    isActive: true,
  },
];

/**
 * Test User Points
 */
export function generateTestUserPoints() {
  const activeMinistros = TEST_USERS.filter(
    u => u.role === 'ministro' && u.status === 'active'
  );

  return activeMinistros.map((ministro, index) => ({
    id: `test-points-${String(index + 1).padStart(3, '0')}`,
    userId: ministro.id,
    totalPoints: (ministro.totalServices || 0) * 50 + index * 100,
    level: Math.min(10, 1 + Math.floor((ministro.totalServices || 0) / 10)),
    levelProgress: ((ministro.totalServices || 0) % 10) * 10,
    currentStreak: index % 5,
    longestStreak: index % 8,
    massesServed: ministro.totalServices || 0,
    substitutionsHelped: Math.floor(index / 2),
    materialsCompleted: index % 3,
  }));
}

/**
 * Test Point Transactions
 */
export function generateTestTransactions() {
  const transactions = [];
  const activeMinistros = TEST_USERS.filter(
    u => u.role === 'ministro' && u.status === 'active'
  );

  let transactionIndex = 0;

  for (const ministro of activeMinistros.slice(0, 4)) {
    // Add some transactions for each minister
    transactions.push({
      id: `test-transaction-${String(++transactionIndex).padStart(3, '0')}`,
      userId: ministro.id,
      action: 'mass_served' as const,
      points: 50,
      description: 'Missa dominical',
    });

    if (transactionIndex % 2 === 0) {
      transactions.push({
        id: `test-transaction-${String(++transactionIndex).padStart(3, '0')}`,
        userId: ministro.id,
        action: 'login_bonus' as const,
        points: 5,
        description: 'Bonus de login diario',
      });
    }
  }

  return transactions;
}

/**
 * Test Formation Data
 */
export const TEST_FORMATION = {
  tracks: [
    {
      id: TEST_IDS.track1,
      name: 'Liturgia Basica (Test)',
      description: 'Trilha de teste sobre liturgia',
      category: 'liturgia' as const,
      totalModules: 1,
      estimatedHours: 2,
      isActive: true,
    },
  ],
  modules: [
    {
      id: TEST_IDS.module1,
      trackId: TEST_IDS.track1,
      name: 'Introducao a Liturgia (Test)',
      description: 'Modulo de teste',
      orderIndex: 1,
      totalLessons: 1,
      estimatedMinutes: 30,
      isActive: true,
    },
  ],
  lessons: [
    {
      id: TEST_IDS.lesson1,
      moduleId: TEST_IDS.module1,
      title: 'O que e Liturgia (Test)',
      description: 'Licao de teste',
      orderIndex: 1,
      contentType: 'text' as const,
      content: 'Conteudo de teste sobre liturgia...',
      estimatedMinutes: 15,
      isActive: true,
    },
  ],
  materials: [
    {
      id: TEST_IDS.material1,
      title: 'Manual do Ministro (Test)',
      description: 'Material de teste',
      type: 'document' as const,
      category: 'liturgia' as const,
      fileUrl: '/test/manual.pdf',
      trackId: TEST_IDS.track1,
      uploadedById: TEST_IDS.gestor1,
      isPublic: true,
    },
  ],
};

/**
 * Test Activity Logs
 */
export function generateTestActivityLogs() {
  return [
    {
      id: 'test-log-001',
      userId: TEST_IDS.gestor1,
      action: 'LOGIN',
      resourceType: 'session',
      details: { ip: '127.0.0.1' },
    },
    {
      id: 'test-log-002',
      userId: TEST_IDS.gestor1,
      action: 'CREATE',
      resourceType: 'questionnaire',
      resourceId: TEST_IDS.questionnaire1,
      details: { title: 'Questionario de teste' },
    },
    {
      id: 'test-log-003',
      userId: TEST_IDS.ministro1,
      action: 'CREATE',
      resourceType: 'substitution',
      resourceId: TEST_IDS.substitution1,
      details: { reason: 'Viagem' },
    },
  ];
}

/**
 * Summary of all test data
 */
export const TEST_DATA_SUMMARY = {
  users: TEST_USERS.length,
  families: 2,
  schedules: '~24 (dynamic)',
  questionnaires: 1,
  responses: '~8 (dynamic)',
  substitutions: 2,
  badges: TEST_BADGES.length,
  formations: {
    tracks: TEST_FORMATION.tracks.length,
    modules: TEST_FORMATION.modules.length,
    lessons: TEST_FORMATION.lessons.length,
    materials: TEST_FORMATION.materials.length,
  },
};
