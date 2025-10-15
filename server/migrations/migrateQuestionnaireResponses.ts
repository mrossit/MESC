/**
 * MIGRATION SCRIPT: Legacy Questionnaire Responses → V2.0
 *
 * This script migrates existing questionnaire responses from legacy format
 * to the new V2.0 data contract format.
 *
 * Usage:
 *   npx tsx server/migrations/migrateQuestionnaireResponses.ts
 *
 * Options:
 *   --dry-run: Preview changes without saving
 *   --batch-size: Number of records to process at once (default: 100)
 *   --year: Target year for conversion (default: 2025)
 *   --month: Target month for conversion (default: 10)
 */

import { db } from '../db';
import { questionnaireResponses, questionnaires } from '../../shared/schema';
import { ResponseParser } from '../utils/responseParser';
import { validateQuestionnaireResponse } from '../../shared/validators/questionnaireValidator';
import { eq, isNull, or, ne } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  targetYear?: number;
  targetMonth?: number;
}

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

async function migrateQuestionnaireResponses(options: MigrationOptions): Promise<MigrationResult> {
  console.log('='.repeat(70));
  console.log('QUESTIONNAIRE RESPONSE MIGRATION TO V2.0');
  console.log('='.repeat(70));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE MIGRATION'}`);
  console.log(`Batch size: ${options.batchSize}`);
  if (options.targetYear && options.targetMonth) {
    console.log(`Target period: ${options.targetMonth}/${options.targetYear}`);
  }
  console.log('='.repeat(70));
  console.log('');

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Step 1: Find all legacy responses (no version or version != '2.0')
    console.log('[STEP 1] 🔍 Finding legacy responses...');

    const legacyResponses = await db.select()
      .from(questionnaireResponses)
      .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .where(
        or(
          isNull(questionnaireResponses.version),
          ne(questionnaireResponses.version as any, '2.0')
        )
      );

    result.total = legacyResponses.length;
    console.log(`✅ Found ${result.total} legacy responses to migrate\n`);

    if (result.total === 0) {
      console.log('🎉 No legacy responses found! All responses are already in V2.0 format.');
      return result;
    }

    // Step 2: Process each response
    console.log('[STEP 2] 🔄 Processing responses...\n');

    for (const record of legacyResponses) {
      const response = record.questionnaire_responses;
      const questionnaire = record.questionnaires;

      try {
        // Determine year/month for conversion
        const year = options.targetYear || questionnaire?.year || 2025;
        const month = options.targetMonth || questionnaire?.month || 10;

        console.log(`[${result.migrated + result.failed + result.skipped + 1}/${result.total}] Processing response ${response.id}...`);
        console.log(`  User: ${response.userId}`);
        console.log(`  Questionnaire: ${questionnaire?.title || 'Unknown'} (${month}/${year})`);

        // Convert to V2.0 format
        const converted = ResponseParser.convertLegacyToV2(
          response,
          year,
          month
        );

        if (!converted) {
          throw new Error('Conversion returned null');
        }

        // Validate the converted response
        validateQuestionnaireResponse(converted);

        console.log(`  ✅ Conversion successful`);

        // Save if not dry run
        if (!options.dryRun) {
          await db.update(questionnaireResponses)
            .set({
              version: '2.0' as any,
              responses: converted.responses as any,
              updatedAt: new Date()
            })
            .where(eq(questionnaireResponses.id, response.id));

          console.log(`  💾 Saved to database`);
        } else {
          console.log(`  🔍 DRY RUN - not saving`);
        }

        result.migrated++;

      } catch (error) {
        console.error(`  ❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        result.failed++;
        result.errors.push({
          id: response.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      console.log('');
    }

    // Step 3: Summary
    console.log('='.repeat(70));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total responses: ${result.total}`);
    console.log(`✅ Migrated: ${result.migrated}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⏭️  Skipped: ${result.skipped}`);
    console.log('='.repeat(70));

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      result.errors.forEach(err => {
        console.log(`  ${err.id}: ${err.error}`);
      });
    }

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes were saved to the database');
      console.log('   Run without --dry-run flag to perform actual migration\n');
    } else {
      console.log('\n✅ MIGRATION COMPLETE\n');
    }

  } catch (error) {
    logger.error('Fatal error during migration:', error);
    console.error('\n💥 FATAL ERROR:', error);
    throw error;
  }

  return result;
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
    targetYear: parseInt(args.find(arg => arg.startsWith('--year='))?.split('=')[1] || '0') || undefined,
    targetMonth: parseInt(args.find(arg => arg.startsWith('--month='))?.split('=')[1] || '0') || undefined
  };

  try {
    const result = await migrateQuestionnaireResponses(options);

    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateQuestionnaireResponses };
