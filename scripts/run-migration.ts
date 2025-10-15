/**
 * Simple migration runner
 */
import { QuestionnaireService } from '../server/services/questionnaireService';
import { db } from '../server/db';
import { questionnaireResponses, questionnaires } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Starting questionnaire response standardization...\n');

  // Get all questionnaire responses
  const responses = await db.select()
    .from(questionnaireResponses)
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id));

  console.log(`Found ${responses.length} questionnaire responses to process\n`);

  let processed = 0;
  let alreadyStandardized = 0;
  let errors = 0;

  for (const row of responses) {
    const response = row.questionnaire_responses;
    const questionnaire = row.questionnaires;

    try {
      // Parse current responses
      let currentData = typeof response.responses === 'string'
        ? JSON.parse(response.responses)
        : response.responses;

      // Check if it's a string (needs reconversion)
      const needsReconversion = typeof currentData === 'string';

      // Skip if already properly converted (object with format_version)
      if (!needsReconversion && currentData && typeof currentData === 'object' && currentData.format_version === '2.0') {
        alreadyStandardized++;
        continue;
      }

      // If it's a string, parse it first
      if (needsReconversion) {
        currentData = JSON.parse(currentData);
      }

      // Standardize to v2.0
      const standardized = QuestionnaireService.standardizeResponse(
        currentData,
        questionnaire.month,
        questionnaire.year
      );

      // Extract structured data for legacy fields
      const extracted = QuestionnaireService.extractStructuredData(standardized);

      // Update in database
      await db.update(questionnaireResponses)
        .set({
          responses: standardized as any, // Save as JSON object, not string
          availableSundays: extracted.availableSundays,
          preferredMassTimes: extracted.preferredMassTimes,
          alternativeTimes: extracted.alternativeTimes,
          dailyMassAvailability: extracted.dailyMassAvailability,
          specialEvents: extracted.specialEvents,
          canSubstitute: extracted.canSubstitute,
          notes: extracted.notes
        })
        .where(eq(questionnaireResponses.id, response.id));

      processed++;
      if (processed % 10 === 0) {
        console.log(`✅ Processed ${processed}/${responses.length}...`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing response ${response.id}:`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Migration Complete:');
  console.log(`  - Total responses: ${responses.length}`);
  console.log(`  - Processed: ${processed}`);
  console.log(`  - Already v2.0: ${alreadyStandardized}`);
  console.log(`  - Errors: ${errors}`);
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
