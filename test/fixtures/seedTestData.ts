/**
 * Seed Test Data
 *
 * Populates the development database with test data for comprehensive testing.
 * Run with: npx tsx test/fixtures/seedTestData.ts
 */

import { db } from '../../server/db';
import {
  users,
  families,
  schedules,
  questionnaires,
  questionnaireResponses,
  substitutionRequests,
  badges,
  userBadges,
  userPoints,
  pointTransactions,
  activityLogs,
  formationTracks,
  formationModules,
  formationLessons,
  formationMaterials,
} from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

import {
  TEST_IDS,
  TEST_USERS,
  TEST_BADGES,
  TEST_FORMATION,
  generateTestSchedules,
  generateTestQuestionnaires,
  generateTestResponses,
  generateTestSubstitutions,
  generateTestUserPoints,
  generateTestTransactions,
  generateTestActivityLogs,
} from './testData';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function clearTestData() {
  console.log('🗑️  Clearing existing test data...');

  try {
    // Delete in reverse order of dependencies
    await db.delete(pointTransactions).where(sql`user_id LIKE 'test-%'`);
    await db.delete(userPoints).where(sql`user_id LIKE 'test-%'`);
    await db.delete(userBadges).where(sql`user_id LIKE 'test-%'`);
    await db.delete(activityLogs).where(sql`user_id LIKE 'test-%'`);
    await db.delete(questionnaireResponses).where(sql`user_id LIKE 'test-%'`);
    await db.delete(substitutionRequests).where(sql`id LIKE 'test-%'`);
    await db.delete(schedules).where(sql`id LIKE 'test-%'`);
    await db.delete(questionnaires).where(sql`id LIKE 'test-%'`);
    await db.delete(formationMaterials).where(sql`id LIKE 'test-%'`);
    await db.delete(formationLessons).where(sql`id LIKE 'test-%'`);
    await db.delete(formationModules).where(sql`id LIKE 'test-%'`);
    await db.delete(formationTracks).where(sql`id LIKE 'test-%'`);
    await db.delete(badges).where(sql`id LIKE 'test-%'`);
    await db.delete(users).where(sql`id LIKE 'test-%'`);
    await db.delete(families).where(sql`id LIKE 'test-%'`);

    console.log('✅ Test data cleared');
  } catch (error) {
    console.error('⚠️  Error clearing test data (may not exist yet):', error);
  }
}

async function seedFamilies() {
  console.log('👨‍👩‍👧‍👦 Seeding families...');

  const testFamilies = [
    {
      id: TEST_IDS.family1,
      name: 'Familia Silva Santos',
    },
    {
      id: TEST_IDS.family2,
      name: 'Familia Mendes Souza',
    },
  ];

  for (const family of testFamilies) {
    await db.insert(families).values(family).onConflictDoNothing();
  }

  console.log(`✅ ${testFamilies.length} families seeded`);
}

async function seedUsers() {
  console.log('👤 Seeding users...');

  const passwordHash = await hashPassword('test123');

  for (const user of TEST_USERS) {
    await db.insert(users).values({
      ...user,
      passwordHash: passwordHash,
      requiresPasswordChange: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${TEST_USERS.length} users seeded`);
}

async function seedSchedules() {
  console.log('📅 Seeding schedules...');

  const testSchedules = generateTestSchedules();

  for (const schedule of testSchedules) {
    await db.insert(schedules).values({
      ...schedule,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testSchedules.length} schedules seeded`);
}

async function seedQuestionnaires() {
  console.log('📝 Seeding questionnaires...');

  const testQuestionnaires = generateTestQuestionnaires();

  for (const questionnaire of testQuestionnaires) {
    await db.insert(questionnaires).values({
      ...questionnaire,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testQuestionnaires.length} questionnaires seeded`);
}

async function seedResponses() {
  console.log('📋 Seeding questionnaire responses...');

  const testResponses = generateTestResponses();

  for (const response of testResponses) {
    await db.insert(questionnaireResponses).values({
      ...response,
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testResponses.length} responses seeded`);
}

async function seedSubstitutions() {
  console.log('🔄 Seeding substitution requests...');

  const testSubstitutions = generateTestSubstitutions();

  for (const substitution of testSubstitutions) {
    await db.insert(substitutionRequests).values({
      ...substitution,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testSubstitutions.length} substitutions seeded`);
}

async function seedBadges() {
  console.log('🏅 Seeding badges...');

  for (const badge of TEST_BADGES) {
    await db.insert(badges).values({
      ...badge,
      requirement: badge.requirement,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${TEST_BADGES.length} badges seeded`);
}

async function seedUserPoints() {
  console.log('⭐ Seeding user points...');

  const testPoints = generateTestUserPoints();

  for (const points of testPoints) {
    await db.insert(userPoints).values({
      ...points,
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testPoints.length} user points seeded`);
}

async function seedTransactions() {
  console.log('💰 Seeding point transactions...');

  const testTransactions = generateTestTransactions();

  for (const transaction of testTransactions) {
    await db.insert(pointTransactions).values({
      ...transaction,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testTransactions.length} transactions seeded`);
}

async function seedUserBadges() {
  console.log('🎖️ Seeding user badges...');

  // Give some badges to some users
  const userBadgesData = [
    { userId: TEST_IDS.ministro1, badgeId: TEST_IDS.badge1 },
    { userId: TEST_IDS.ministro2, badgeId: TEST_IDS.badge1 },
    { userId: TEST_IDS.ministro5, badgeId: TEST_IDS.badge1 },
    { userId: TEST_IDS.ministro5, badgeId: TEST_IDS.badge2 },
  ];

  for (const ub of userBadgesData) {
    await db.insert(userBadges).values({
      id: `test-ub-${ub.userId}-${ub.badgeId}`,
      ...ub,
      earnedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${userBadgesData.length} user badges seeded`);
}

async function seedFormation() {
  console.log('📚 Seeding formation data...');

  for (const track of TEST_FORMATION.tracks) {
    await db.insert(formationTracks).values({
      ...track,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  for (const module of TEST_FORMATION.modules) {
    await db.insert(formationModules).values({
      ...module,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  for (const lesson of TEST_FORMATION.lessons) {
    await db.insert(formationLessons).values({
      ...lesson,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  for (const material of TEST_FORMATION.materials) {
    await db.insert(formationMaterials).values({
      ...material,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ Formation data seeded`);
}

async function seedActivityLogs() {
  console.log('📝 Seeding activity logs...');

  const testLogs = generateTestActivityLogs();

  for (const log of testLogs) {
    await db.insert(activityLogs).values({
      ...log,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`✅ ${testLogs.length} activity logs seeded`);
}

async function main() {
  console.log('🚀 Starting test data seeding...\n');

  try {
    // Clear existing test data first
    await clearTestData();

    // Seed in order of dependencies
    await seedFamilies();
    await seedUsers();
    await seedBadges();
    await seedSchedules();
    await seedQuestionnaires();
    await seedResponses();
    await seedSubstitutions();
    await seedUserPoints();
    await seedTransactions();
    await seedUserBadges();
    await seedFormation();
    await seedActivityLogs();

    console.log('\n✅ All test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Users: 12 (1 gestor, 2 coordenadores, 8 ministros, 1 pending)');
    console.log('   - Families: 2');
    console.log('   - Schedules: ~24');
    console.log('   - Questionnaires: 1');
    console.log('   - Responses: ~8');
    console.log('   - Substitutions: 2');
    console.log('   - Badges: 3');
    console.log('   - Formation: 1 track, 1 module, 1 lesson, 1 material');
    console.log('\n🔑 Test credentials:');
    console.log('   - gestor@test.com / test123');
    console.log('   - coord1@test.com / test123');
    console.log('   - ministro1@test.com / test123');

  } catch (error) {
    console.error('\n❌ Error seeding test data:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
