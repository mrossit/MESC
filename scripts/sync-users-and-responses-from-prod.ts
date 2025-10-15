/**
 * SYNC USERS AND QUESTIONNAIRE RESPONSES FROM PRODUCTION TO DEV
 *
 * This script copies both users and questionnaire_responses data from production to dev
 * to ensure referential integrity.
 *
 * ⚠️  WARNING: This will TRUNCATE the dev users and questionnaire_responses tables!
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { users, questionnaires, questionnaireResponses } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Ensure we're running in the correct environment
if (process.env.NODE_ENV !== 'development') {
  console.error('❌ This script must be run with NODE_ENV=development');
  process.exit(1);
}

async function syncUsersAndResponses() {
  console.log('🔄 SYNCING USERS AND QUESTIONNAIRE RESPONSES FROM PRODUCTION TO DEV\n');
  console.log('⚠️  WARNING: This will delete all dev users and questionnaire_responses data!\n');

  // Get database URLs from environment
  const prodDatabaseUrl = process.env.PRODUCTION_DATABASE_URL;
  const devDatabaseUrl = process.env.DATABASE_URL;

  if (!prodDatabaseUrl) {
    console.error('❌ PRODUCTION_DATABASE_URL not found in environment');
    console.error('   Add it to your .env file or Replit Secrets');
    process.exit(1);
  }

  if (!devDatabaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('📊 Connecting to databases...');
  console.log(`   Production: ${prodDatabaseUrl.substring(0, 30)}...`);
  console.log(`   Dev:        ${devDatabaseUrl.substring(0, 30)}...\n`);

  // Create database connections
  const prodPool = new Pool({ connectionString: prodDatabaseUrl });
  const devPool = new Pool({ connectionString: devDatabaseUrl });

  const prodDb = drizzle(prodPool);
  const devDb = drizzle(devPool);

  try {
    // ============================================
    // PART 1: SYNC USERS TABLE
    // ============================================
    console.log('👥 PART 1: SYNCING USERS TABLE\n');

    // Step 1: Fetch users from production
    console.log('📥 Step 1.1: Fetching users from PRODUCTION...');
    const prodUsers = await prodDb.select().from(users);
    console.log(`   ✅ Found ${prodUsers.length} users in production\n`);

    if (prodUsers.length === 0) {
      console.log('⚠️  No users found in production. Aborting sync.');
      return;
    }

    // Step 2: Show sample users
    console.log('📋 Sample users from production (first 3):');
    prodUsers.slice(0, 3).forEach((u, idx) => {
      console.log(`   ${idx + 1}. ID: ${u.id?.substring(0, 8)}... | Username: ${u.username || 'N/A'} | Name: ${u.name}`);
    });
    console.log();

    // Step 3: Check current dev users
    console.log('📊 Step 1.2: Checking current DEV users...');
    const currentDevUsers = await devDb.select().from(users);
    console.log(`   Current DEV has ${currentDevUsers.length} users\n`);

    // Step 4: Clear users and all dependent tables using TRUNCATE CASCADE
    console.log('🗑️  Step 1.3: Clearing users and all dependent tables in DEV...');
    console.log('   Using TRUNCATE CASCADE to clear all foreign key dependencies automatically\n');

    // TRUNCATE CASCADE will delete from users and all tables that reference it
    await devDb.execute(sql`TRUNCATE TABLE users CASCADE`);

    console.log('   ✅ Users table and all dependent tables cleared\n');

    // Step 6: Insert production users
    console.log('📤 Step 1.5: Inserting production users into DEV...');
    console.log(`   Inserting ${prodUsers.length} users...`);

    let insertedUsersCount = 0;
    const batchSize = 50;

    for (let i = 0; i < prodUsers.length; i += batchSize) {
      const batch = prodUsers.slice(i, i + batchSize);

      for (const user of batch) {
        await devDb.insert(users).values(user);
        insertedUsersCount++;
      }

      console.log(`   Progress: ${insertedUsersCount}/${prodUsers.length} (${Math.round(insertedUsersCount / prodUsers.length * 100)}%)`);
    }

    console.log(`   ✅ Inserted ${insertedUsersCount} users\n`);

    // Step 7: Verify users
    console.log('✅ Step 1.6: Verifying users sync...');
    const verifyUsers = await devDb.select().from(users);
    console.log(`   Total users in DEV: ${verifyUsers.length}`);

    if (verifyUsers.length === prodUsers.length) {
      console.log('   ✅ Users sync successful!\n');
    } else {
      console.log(`   ⚠️  WARNING: User count mismatch!`);
      console.log(`   Expected: ${prodUsers.length}`);
      console.log(`   Got:      ${verifyUsers.length}\n`);
    }

    // ============================================
    // PART 2: SYNC QUESTIONNAIRES
    // ============================================
    console.log('📋 PART 2: SYNCING QUESTIONNAIRES\n');

    // Step 1: Fetch questionnaires from production
    console.log('📥 Step 2.1: Fetching questionnaires from PRODUCTION...');
    const prodQuestionnaires = await prodDb.select().from(questionnaires);
    console.log(`   ✅ Found ${prodQuestionnaires.length} questionnaires in production\n`);

    if (prodQuestionnaires.length === 0) {
      console.log('⚠️  No questionnaires found in production. Skipping sync.');
      return;
    }

    // Step 2: Insert production questionnaires
    console.log('📤 Step 2.2: Inserting production questionnaires into DEV...');
    console.log(`   Inserting ${prodQuestionnaires.length} questionnaires...`);

    let insertedQuestionnairesCount = 0;

    for (const q of prodQuestionnaires) {
      await devDb.insert(questionnaires).values(q);
      insertedQuestionnairesCount++;
    }

    console.log(`   ✅ Inserted ${insertedQuestionnairesCount} questionnaires\n`);

    // ============================================
    // PART 3: SYNC QUESTIONNAIRE RESPONSES
    // ============================================
    console.log('📋 PART 3: SYNCING QUESTIONNAIRE RESPONSES\n');

    // Step 1: Fetch responses from production
    console.log('📥 Step 3.1: Fetching questionnaire responses from PRODUCTION...');
    const prodResponses = await prodDb.select().from(questionnaireResponses);
    console.log(`   ✅ Found ${prodResponses.length} responses in production\n`);

    if (prodResponses.length === 0) {
      console.log('⚠️  No responses found in production. Skipping responses sync.');
      return;
    }

    // Step 2: Show sample responses
    console.log('📋 Sample responses from production (first 3):');
    prodResponses.slice(0, 3).forEach((r, idx) => {
      let responses = r.responses;
      if (typeof responses === 'string') {
        responses = JSON.parse(responses);
      }
      const version = responses?.format_version || 'legacy';
      console.log(`   ${idx + 1}. User: ${r.userId?.substring(0, 8)}... | Version: ${version}`);
    });
    console.log();

    // Step 3: Insert production responses
    console.log('📤 Step 3.2: Inserting production responses into DEV...');
    console.log(`   Inserting ${prodResponses.length} responses...`);

    let insertedResponsesCount = 0;

    for (let i = 0; i < prodResponses.length; i += batchSize) {
      const batch = prodResponses.slice(i, i + batchSize);

      for (const response of batch) {
        await devDb.insert(questionnaireResponses).values(response);
        insertedResponsesCount++;
      }

      console.log(`   Progress: ${insertedResponsesCount}/${prodResponses.length} (${Math.round(insertedResponsesCount / prodResponses.length * 100)}%)`);
    }

    console.log(`   ✅ Inserted ${insertedResponsesCount} responses\n`);

    // Step 4: Verify responses
    console.log('✅ Step 3.3: Verifying responses sync...');
    const verifyResponses = await devDb.select().from(questionnaireResponses);
    const uniqueUsers = new Set(verifyResponses.map(r => r.userId)).size;

    console.log(`   Total responses: ${verifyResponses.length}`);
    console.log(`   Unique users:    ${uniqueUsers}`);
    console.log();

    if (verifyResponses.length === prodResponses.length) {
      console.log('✅ SYNC COMPLETE! Dev database now matches production.');
      console.log(`\n📊 Summary:`);
      console.log(`   Users synced:          ${insertedUsersCount}`);
      console.log(`   Questionnaires synced: ${insertedQuestionnairesCount}`);
      console.log(`   Responses synced:      ${insertedResponsesCount}`);
    } else {
      console.log(`⚠️  WARNING: Response count mismatch!`);
      console.log(`   Expected: ${prodResponses.length}`);
      console.log(`   Got:      ${verifyResponses.length}`);
    }

  } catch (error) {
    console.error('❌ ERROR during sync:', error);
    throw error;
  } finally {
    // Close connections
    await prodPool.end();
    await devPool.end();
    console.log('\n🔌 Database connections closed');
  }
}

// Run the sync
syncUsersAndResponses()
  .then(() => {
    console.log('\n🎉 Sync script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync script failed:', error);
    process.exit(1);
  });
