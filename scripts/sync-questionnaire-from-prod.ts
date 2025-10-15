/**
 * SYNC QUESTIONNAIRE RESPONSES FROM PRODUCTION TO DEV
 *
 * This script copies questionnaire_responses data from production to dev
 * to replace incorrect test data with real production data.
 *
 * ⚠️  WARNING: This will TRUNCATE the dev questionnaire_responses table!
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { questionnaireResponses } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Ensure we're running in the correct environment
if (process.env.NODE_ENV !== 'development') {
  console.error('❌ This script must be run with NODE_ENV=development');
  process.exit(1);
}

async function syncQuestionnaireResponses() {
  console.log('🔄 SYNCING QUESTIONNAIRE RESPONSES FROM PRODUCTION TO DEV\n');
  console.log('⚠️  WARNING: This will delete all dev questionnaire_responses data!\n');

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
    // Step 1: Fetch from production
    console.log('📥 Step 1: Fetching data from PRODUCTION...');
    const prodData = await prodDb
      .select()
      .from(questionnaireResponses);

    console.log(`   ✅ Found ${prodData.length} responses in production\n`);

    if (prodData.length === 0) {
      console.log('⚠️  No data found in production. Aborting sync.');
      return;
    }

    // Step 2: Show sample data
    console.log('📋 Sample data from production (first 3):');
    prodData.slice(0, 3).forEach((r, idx) => {
      let responses = r.responses;
      if (typeof responses === 'string') {
        responses = JSON.parse(responses);
      }
      const version = responses?.format_version || 'legacy';
      console.log(`   ${idx + 1}. User: ${r.userId?.substring(0, 8)}... | Version: ${version}`);
    });
    console.log();

    // Step 3: Backup current dev data (count only)
    console.log('📊 Step 2: Checking current DEV data...');
    const currentDevData = await devDb
      .select()
      .from(questionnaireResponses);

    console.log(`   Current DEV has ${currentDevData.length} responses\n`);

    // Step 4: Clear dev table
    console.log('🗑️  Step 3: Clearing DEV table...');
    await devDb.delete(questionnaireResponses);
    console.log('   ✅ DEV table cleared\n');

    // Step 5: Insert production data
    console.log('📤 Step 4: Inserting production data into DEV...');
    console.log(`   Inserting ${prodData.length} records...`);

    let insertedCount = 0;
    const batchSize = 50; // Insert in batches to avoid timeouts

    for (let i = 0; i < prodData.length; i += batchSize) {
      const batch = prodData.slice(i, i + batchSize);

      for (const response of batch) {
        await devDb.insert(questionnaireResponses).values(response);
        insertedCount++;
      }

      console.log(`   Progress: ${insertedCount}/${prodData.length} (${Math.round(insertedCount / prodData.length * 100)}%)`);
    }

    console.log(`   ✅ Inserted ${insertedCount} records\n`);

    // Step 6: Verify
    console.log('✅ Step 5: Verifying sync...');
    const verifyData = await devDb
      .select()
      .from(questionnaireResponses);

    const uniqueUsers = new Set(verifyData.map(r => r.userId)).size;

    console.log(`   Total responses: ${verifyData.length}`);
    console.log(`   Unique users:    ${uniqueUsers}`);
    console.log();

    if (verifyData.length === prodData.length) {
      console.log('✅ SYNC COMPLETE! Dev database now matches production.');
    } else {
      console.log(`⚠️  WARNING: Count mismatch!`);
      console.log(`   Expected: ${prodData.length}`);
      console.log(`   Got:      ${verifyData.length}`);
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
syncQuestionnaireResponses()
  .then(() => {
    console.log('\n🎉 Sync script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync script failed:', error);
    process.exit(1);
  });
