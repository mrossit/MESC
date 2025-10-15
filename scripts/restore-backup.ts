/**
 * RESTORE QUESTIONNAIRE RESPONSES BACKUP
 *
 * Restores a previously saved backup of questionnaire_responses to DEV database
 *
 * Usage:
 *   NODE_ENV=development npx tsx scripts/restore-backup.ts questionnaire_responses_dev_backup_2025-01-13.json
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

async function restoreBackup() {
  console.log('♻️  RESTORE QUESTIONNAIRE RESPONSES BACKUP\n');

  // Get backup filename from command line
  const backupFilename = process.argv[2];

  if (!backupFilename) {
    console.error('❌ Please provide backup filename');
    console.error('\nUsage:');
    console.error('  NODE_ENV=development npx tsx scripts/restore-backup.ts <filename>');
    console.error('\nAvailable backups:');

    const backupDir = path.join(process.cwd(), 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('questionnaire_responses_dev_backup_'))
        .sort()
        .reverse();

      if (files.length === 0) {
        console.error('  (No backups found)');
      } else {
        files.forEach(f => console.error(`  - ${f}`));
      }
    } else {
      console.error('  (No backups directory found)');
    }

    process.exit(1);
  }

  // Load backup file
  const backupDir = path.join(process.cwd(), 'backups');
  const backupPath = path.join(backupDir, backupFilename);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`📂 Loading backup: ${backupFilename}`);

  let backupData: any[];
  try {
    const fileContent = fs.readFileSync(backupPath, 'utf-8');
    backupData = JSON.parse(fileContent);
    console.log(`   ✅ Loaded ${backupData.length} responses from backup`);
  } catch (error) {
    console.error('❌ Failed to read backup file:', error);
    process.exit(1);
  }

  if (!Array.isArray(backupData) || backupData.length === 0) {
    console.error('❌ Invalid backup data (empty or not an array)');
    process.exit(1);
  }

  console.log();

  // Connect to DEV database
  const devDatabaseUrl = process.env.DATABASE_URL;

  if (!devDatabaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  console.log('🔧 Connecting to DEV database...');
  const devPool = new Pool({ connectionString: devDatabaseUrl });
  const devDb = drizzle(devPool);

  try {
    // Show current DEV data
    console.log('📊 Checking current DEV data...');
    const currentData = await devDb
      .select()
      .from(questionnaireResponses);

    console.log(`   Current DEV has ${currentData.length} responses`);
    console.log(`   Backup has ${backupData.length} responses`);
    console.log();

    // Clear DEV table
    console.log('🗑️  Clearing current DEV data...');
    await devDb.delete(questionnaireResponses);
    console.log('   ✅ DEV table cleared');
    console.log();

    // Insert backup data
    console.log('📤 Restoring backup to DEV...');
    console.log(`   Inserting ${backupData.length} records...`);

    let insertedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < backupData.length; i += batchSize) {
      const batch = backupData.slice(i, i + batchSize);

      for (const response of batch) {
        // Convert date strings back to Date objects
        const responseToInsert = {
          ...response,
          submittedAt: response.submittedAt ? new Date(response.submittedAt) : null,
          updatedAt: response.updatedAt ? new Date(response.updatedAt) : null,
        };

        await devDb.insert(questionnaireResponses).values(responseToInsert);
        insertedCount++;
      }

      const progress = Math.round((insertedCount / backupData.length) * 100);
      console.log(`   Progress: ${insertedCount}/${backupData.length} (${progress}%)`);
    }

    console.log(`   ✅ Restored ${insertedCount} records`);
    console.log();

    // Verify
    console.log('✅ Verifying restore...');
    const verifyData = await devDb
      .select()
      .from(questionnaireResponses);

    console.log(`   Total responses in DEV: ${verifyData.length}`);
    console.log();

    if (verifyData.length === backupData.length) {
      console.log('✅ RESTORE COMPLETE!');
      console.log(`   DEV database restored from backup: ${backupFilename}`);
    } else {
      console.log(`⚠️  WARNING: Count mismatch!`);
      console.log(`   Expected: ${backupData.length}`);
      console.log(`   Got:      ${verifyData.length}`);
    }

  } catch (error) {
    console.error('❌ ERROR during restore:', error);
    throw error;
  } finally {
    await devPool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the restore
restoreBackup()
  .then(() => {
    console.log('\n🎉 Restore completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Restore failed:', error);
    process.exit(1);
  });
