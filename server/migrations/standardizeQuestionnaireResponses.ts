/**
 * Migration: Standardize All Questionnaire Responses to v2.0 Format
 *
 * This migration converts all existing questionnaire responses from legacy format
 * to the standardized v2.0 format using the QuestionnaireService.
 *
 * Run with: npx tsx server/migrations/standardizeQuestionnaireResponses.ts
 */

import { db } from '../db';
import { questionnaireResponses, questionnaires } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { QuestionnaireService } from '../services/questionnaireService';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationStats {
  total: number;
  success: number;
  errors: number;
  skipped: number;
  errorDetails: Array<{ id: string; error: string }>;
}

async function createBackup() {
  console.log('📦 Creating backup of questionnaire_responses...');

  try {
    const allResponses = await db.select().from(questionnaireResponses);

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `questionnaire_responses_backup_${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(allResponses, null, 2));

    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`   Total responses backed up: ${allResponses.length}\n`);

    return backupFile;
  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    throw new Error('Backup failed - aborting migration');
  }
}

async function standardizeExistingResponses(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    success: 0,
    errors: 0,
    skipped: 0,
    errorDetails: []
  };

  console.log('🔄 Starting migration of questionnaire responses...\n');
  console.log('=' .repeat(80));

  try {
    // Fetch all responses
    const allResponses = await db.select().from(questionnaireResponses);
    stats.total = allResponses.length;

    console.log(`\n📊 Found ${stats.total} responses to process\n`);

    let processedCount = 0;

    for (const response of allResponses) {
      processedCount++;
      const progressPercent = ((processedCount / stats.total) * 100).toFixed(1);

      try {
        // Parse current responses
        const oldData = typeof response.responses === 'string'
          ? JSON.parse(response.responses)
          : response.responses;

        // Check if already v2.0 format
        if (oldData.format_version === '2.0') {
          console.log(`⏭️  [${processedCount}/${stats.total}] ${response.id.substring(0, 8)}... - Already v2.0, skipping`);
          stats.skipped++;
          continue;
        }

        // Get questionnaire to extract month/year
        const [questionnaire] = await db.select()
          .from(questionnaires)
          .where(eq(questionnaires.id, response.questionnaireId))
          .limit(1);

        if (!questionnaire) {
          console.warn(`⚠️  [${processedCount}/${stats.total}] ${response.id.substring(0, 8)}... - Questionnaire not found, using defaults`);
        }

        // Standardize to v2.0 format
        const standardized = QuestionnaireService.standardizeResponse(
          oldData,
          questionnaire?.month || 10,
          questionnaire?.year || 2025
        );

        // Extract structured data for legacy fields
        const extractedData = QuestionnaireService.extractStructuredData(standardized);

        // Update response in database
        await db.update(questionnaireResponses)
          .set({
            responses: JSON.stringify(standardized),
            availableSundays: extractedData.availableSundays,
            preferredMassTimes: extractedData.preferredMassTimes,
            alternativeTimes: extractedData.alternativeTimes,
            dailyMassAvailability: extractedData.dailyMassAvailability,
            specialEvents: extractedData.specialEvents,
            canSubstitute: extractedData.canSubstitute,
            notes: extractedData.notes,
            updatedAt: new Date()
          })
          .where(eq(questionnaireResponses.id, response.id));

        stats.success++;
        console.log(`✅ [${processedCount}/${stats.total}] (${progressPercent}%) ${response.id.substring(0, 8)}... - Standardized successfully`);

        // Log details every 10 responses
        if (processedCount % 10 === 0) {
          console.log(`\n   Progress: ${stats.success} success, ${stats.errors} errors, ${stats.skipped} skipped\n`);
        }

      } catch (error) {
        stats.errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        stats.errorDetails.push({
          id: response.id,
          error: errorMessage
        });

        console.error(`❌ [${processedCount}/${stats.total}] ${response.id.substring(0, 8)}... - Error: ${errorMessage}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed with critical error:', error);
    throw error;
  }

  return stats;
}

async function runMigration() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(10) + 'QUESTIONNAIRE RESPONSE STANDARDIZATION MIGRATION' + ' '.repeat(18) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  const startTime = Date.now();

  try {
    // Check database connection
    if (!db) {
      throw new Error('Database connection not available');
    }

    console.log('✅ Database connection verified\n');

    // Create backup
    const backupFile = await createBackup();

    // Prompt for confirmation
    console.log('⚠️  WARNING: This will modify all questionnaire responses in the database.');
    console.log(`   Backup created at: ${backupFile}`);
    console.log('\n   Press Ctrl+C to cancel or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run migration
    const stats = await standardizeExistingResponses();

    // Report results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 MIGRATION COMPLETE\n');
    console.log(`   Total responses:     ${stats.total}`);
    console.log(`   ✅ Successfully migrated: ${stats.success}`);
    console.log(`   ⏭️  Already v2.0 (skipped): ${stats.skipped}`);
    console.log(`   ❌ Errors:            ${stats.errors}`);
    console.log(`   ⏱️  Duration:          ${duration}s`);
    console.log(`   📦 Backup file:       ${backupFile}`);

    if (stats.errors > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:\n');
      stats.errorDetails.forEach(({ id, error }) => {
        console.log(`   - ${id.substring(0, 8)}...: ${error}`);
      });
      console.log('\n   Please review errors and consider re-running migration.');
      process.exit(1);
    } else {
      console.log('\n✅ ALL RESPONSES SUCCESSFULLY MIGRATED TO v2.0 FORMAT!');
      console.log('\n   Next steps:');
      console.log('   1. Verify responses in the database');
      console.log('   2. Test schedule generation with new format');
      console.log('   3. Delete backup file once confirmed working');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    console.error('\n   Database has been left unchanged (if backup succeeded).');
    console.error('   Please check the error and try again.');
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

export { standardizeExistingResponses, createBackup };
