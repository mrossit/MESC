/**
 * SYNC QUESTIONNAIRE RESPONSES WITH BACKUP
 *
 * This script:
 * 1. Creates a backup of DEV questionnaire_responses
 * 2. Copies production data to DEV
 * 3. Saves backup to restore if needed
 *
 * Safe sync: Your DEV data is backed up before being replaced!
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { questionnaireResponses } from '../shared/schema';
import * as fs from 'fs';
import * as path from 'path';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Ensure we're running in the correct environment
if (process.env.NODE_ENV !== 'development') {
  console.error('❌ This script must be run with NODE_ENV=development');
  process.exit(1);
}

async function syncWithBackup() {
  console.log('🔄 SYNC QUESTIONNAIRE RESPONSES (WITH BACKUP)\n');
  console.log('This will:');
  console.log('  1. ✅ Backup current DEV data');
  console.log('  2. ✅ Copy PRODUCTION data to DEV');
  console.log('  3. ✅ Save backup for restore if needed\n');

  // Get database URLs
  const prodDatabaseUrl = process.env.PRODUCTION_DATABASE_URL;
  const devDatabaseUrl = process.env.DATABASE_URL;

  if (!prodDatabaseUrl) {
    console.error('❌ PRODUCTION_DATABASE_URL not found');
    console.error('   Add it to Replit Secrets:');
    console.error('   Tools → Secrets → Add:');
    console.error('   Name: PRODUCTION_DATABASE_URL');
    console.error('   Value: postgresql://...');
    process.exit(1);
  }

  if (!devDatabaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  console.log('📊 Database connections:');
  console.log(`   🏭 Production: ${prodDatabaseUrl.substring(0, 40)}...`);
  console.log(`   🔧 Dev:        ${devDatabaseUrl.substring(0, 40)}...`);
  console.log();

  // Create database connections
  const prodPool = new Pool({ connectionString: prodDatabaseUrl });
  const devPool = new Pool({ connectionString: devDatabaseUrl });

  const prodDb = drizzle(prodPool);
  const devDb = drizzle(devPool);

  try {
    // STEP 1: Backup current DEV data
    console.log('💾 STEP 1: Backing up current DEV data...');
    const devBackup = await devDb
      .select()
      .from(questionnaireResponses);

    console.log(`   📦 Backed up ${devBackup.length} responses from DEV`);

    // Save backup to file
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFile = path.join(backupDir, `questionnaire_responses_dev_backup_${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(devBackup, null, 2));
    console.log(`   💾 Backup saved to: ${backupFile}`);
    console.log();

    // STEP 2: Fetch from PRODUCTION
    console.log('📥 STEP 2: Fetching data from PRODUCTION...');
    const prodData = await prodDb
      .select()
      .from(questionnaireResponses);

    console.log(`   ✅ Found ${prodData.length} responses in PRODUCTION`);

    if (prodData.length === 0) {
      console.log('   ⚠️  No data in production. Aborting sync.');
      return;
    }

    // Show comparison
    console.log();
    console.log('📊 Data comparison:');
    console.log(`   DEV (before):  ${devBackup.length} responses`);
    console.log(`   PRODUCTION:    ${prodData.length} responses`);
    console.log(`   Difference:    ${prodData.length - devBackup.length > 0 ? '+' : ''}${prodData.length - devBackup.length}`);
    console.log();

    // Show sample production data
    console.log('📋 Sample PRODUCTION data (first 5):');
    prodData.slice(0, 5).forEach((r, idx) => {
      let responses = r.responses;
      if (typeof responses === 'string') {
        try {
          responses = JSON.parse(responses);
        } catch (e) {
          responses = { raw: 'parse_error' };
        }
      }
      const version = responses?.format_version || 'legacy';
      const userId = r.userId?.substring(0, 8) || 'unknown';
      console.log(`   ${idx + 1}. User: ${userId}... | Version: ${version} | Submitted: ${r.submittedAt?.toISOString().split('T')[0]}`);
    });
    console.log();

    // STEP 3: Clear DEV table
    console.log('🗑️  STEP 3: Clearing DEV table...');
    await devDb.delete(questionnaireResponses);
    console.log('   ✅ DEV table cleared');
    console.log();

    // STEP 4: Insert PRODUCTION data to DEV
    console.log('📤 STEP 4: Inserting PRODUCTION data into DEV...');
    console.log(`   Inserting ${prodData.length} records in batches...`);

    let insertedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < prodData.length; i += batchSize) {
      const batch = prodData.slice(i, i + batchSize);

      for (const response of batch) {
        await devDb.insert(questionnaireResponses).values(response);
        insertedCount++;
      }

      const progress = Math.round((insertedCount / prodData.length) * 100);
      console.log(`   Progress: ${insertedCount}/${prodData.length} (${progress}%)`);
    }

    console.log(`   ✅ Inserted ${insertedCount} records`);
    console.log();

    // STEP 5: Verify sync
    console.log('✅ STEP 5: Verifying sync...');
    const verifyData = await devDb
      .select()
      .from(questionnaireResponses);

    const uniqueUsers = new Set(verifyData.map(r => r.userId)).size;

    console.log(`   Total responses in DEV: ${verifyData.length}`);
    console.log(`   Unique users:           ${uniqueUsers}`);
    console.log();

    if (verifyData.length === prodData.length) {
      console.log('✅ SYNC COMPLETE! DEV now has PRODUCTION data.');
      console.log();
      console.log('📝 Summary:');
      console.log(`   ✅ Backup saved to: ${backupFile}`);
      console.log(`   ✅ Synced ${prodData.length} responses from PRODUCTION to DEV`);
      console.log(`   ✅ DEV database is ready for testing with production data`);
      console.log();
      console.log('💡 To restore DEV backup if needed:');
      console.log(`   NODE_ENV=development npx tsx scripts/restore-backup.ts ${path.basename(backupFile)}`);
    } else {
      console.log(`⚠️  WARNING: Count mismatch!`);
      console.log(`   Expected: ${prodData.length}`);
      console.log(`   Got:      ${verifyData.length}`);
    }

  } catch (error) {
    console.error('❌ ERROR during sync:', error);
    console.error('\n💡 Your DEV data backup is safe in the backups/ folder');
    throw error;
  } finally {
    // Close connections
    await prodPool.end();
    await devPool.end();
    console.log('\n🔌 Database connections closed');
  }
}

// Run the sync
syncWithBackup()
  .then(() => {
    console.log('\n🎉 Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  });
