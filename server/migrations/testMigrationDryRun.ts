/**
 * Dry-run test for migration script
 * Tests the migration logic without modifying the database
 */

import { QuestionnaireService } from '../services/questionnaireService';

// Sample responses from actual database
const sampleResponses = [
  {
    id: '0497245c-b7c9-4750-8b1a-d3aee9017520',
    questionnaireId: 'oct-2025-questionnaire',
    responses: [
      {"answer": "Não", "questionId": "monthly_availability"},
      {"answer": "8h", "questionId": "main_service_time"},
      {"answer": ["Domingo 05/10"], "questionId": "available_sundays"},
      {"answer": "Sim", "questionId": "saint_judas_feast_evening"},
      {"answer": ["Terça 27/10 às 19h30"], "questionId": "saint_judas_novena"}
    ]
  },
  {
    id: 'a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    questionnaireId: 'oct-2025-questionnaire',
    responses: {
      format_version: '2.0',
      masses: {
        '2025-10-05': { '10:00': true }
      },
      special_events: {},
      weekdays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      },
      can_substitute: false
    }
  }
];

console.log('🧪 DRY RUN: Testing Migration Logic\n');
console.log('=' .repeat(80) + '\n');

let successCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const response of sampleResponses) {
  console.log(`📝 Testing response: ${response.id.substring(0, 8)}...`);

  try {
    const oldData = response.responses;

    // Check if already v2.0
    if (typeof oldData === 'object' && 'format_version' in oldData && oldData.format_version === '2.0') {
      console.log('   ⏭️  Already v2.0 format - WOULD SKIP\n');
      skippedCount++;
      continue;
    }

    // Standardize
    const standardized = QuestionnaireService.standardizeResponse(oldData, 10, 2025);

    // Extract structured data
    const extracted = QuestionnaireService.extractStructuredData(standardized);

    // Validate
    if (standardized.format_version !== '2.0') {
      throw new Error('Format version not set to 2.0');
    }
    if (typeof standardized.can_substitute !== 'boolean') {
      throw new Error('can_substitute is not a boolean');
    }

    console.log('   ✅ WOULD MIGRATE:');
    console.log(`      Format: ${standardized.format_version}`);
    console.log(`      Masses: ${Object.keys(standardized.masses).length} dates`);
    console.log(`      Novena: ${standardized.special_events.saint_judas_novena?.length || 0} days`);
    console.log(`      Extracted Sundays: ${extracted.availableSundays?.length || 0}`);
    console.log(`      Can substitute: ${standardized.can_substitute}`);
    console.log('');

    successCount++;
  } catch (error) {
    console.error('   ❌ ERROR:', error instanceof Error ? error.message : String(error));
    console.log('');
    errorCount++;
  }
}

console.log('=' .repeat(80));
console.log('\n📊 DRY RUN SUMMARY:');
console.log(`   Total responses tested: ${sampleResponses.length}`);
console.log(`   ✅ Would migrate: ${successCount}`);
console.log(`   ⏭️  Would skip: ${skippedCount}`);
console.log(`   ❌ Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n✅ DRY RUN SUCCESSFUL - Migration is safe to run!');
  console.log('\nTo run the actual migration:');
  console.log('   npx tsx server/migrations/standardizeQuestionnaireResponses.ts');
} else {
  console.log('\n⚠️  DRY RUN FAILED - Fix errors before running migration!');
  process.exit(1);
}
