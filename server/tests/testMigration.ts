/**
 * Test script to verify existing questionnaire data can be migrated
 */

import { QuestionnaireService } from '../services/questionnaireService';

// Sample real data from the database
const sampleDatabaseResponses = [
  {
    id: '0497245c-b7c9-4750-8b1a-d3aee9017520',
    responses: [
      {"answer": "Não", "questionId": "monthly_availability"},
      {"answer": "8h", "questionId": "main_service_time"},
      {"answer": "Não", "questionId": "can_substitute"},
      {"answer": ["Domingo 05/10"], "questionId": "available_sundays"},
      {"answer": "Não", "questionId": "other_times_available"},
      {"answer": "Não", "questionId": "daily_mass_availability"},
      {"answer": "Não", "questionId": "healing_liberation_mass"},
      {"answer": "Não", "questionId": "sacred_heart_mass"},
      {"answer": "Não", "questionId": "immaculate_heart_mass"},
      {"answer": "Sim", "questionId": "custom_1758189732294"},
      {"answer": "Não posso conduzir", "questionId": "adoration_monday"},
      {"answer": "Não", "questionId": "saint_judas_feast_7h"},
      {"answer": "Não", "questionId": "saint_judas_feast_10h"},
      {"answer": "Não", "questionId": "saint_judas_feast_12h"},
      {"answer": "Não", "questionId": "saint_judas_feast_15h"},
      {"answer": "Não", "questionId": "saint_judas_feast_17h"},
      {"answer": "Sim", "questionId": "saint_judas_feast_evening"},
      {"answer": ["Terça 27/10 às 19h30"], "questionId": "saint_judas_novena"}
    ]
  },
  {
    id: '071750a6-2a4a-4e10-a6db-cf855821003a',
    responses: [
      {"answer": "Sim", "questionId": "monthly_availability"},
      {"answer": "10h", "questionId": "main_service_time"},
      {"answer": ["Domingo 05/10", "Domingo (12/10) – Missa em honra à Nossa Senhora Aparecida", "Domingo 19/10", "Domingo 26/10"], "questionId": "available_sundays"},
      {"answer": "Não", "questionId": "other_times_available"},
      {"answer": "Não", "questionId": "daily_mass_availability"},
      {"answer": "Não", "questionId": "healing_liberation_mass"},
      {"answer": "Não", "questionId": "sacred_heart_mass"},
      {"answer": "Não", "questionId": "immaculate_heart_mass"},
      {"answer": "Não", "questionId": "custom_1758189732294"},
      {"answer": "Não posso conduzir", "questionId": "adoration_monday"},
      {"answer": "Não", "questionId": "saint_judas_feast_7h"},
      {"answer": "Não", "questionId": "saint_judas_feast_10h"},
      {"answer": "Não", "questionId": "saint_judas_feast_12h"},
      {"answer": "Não", "questionId": "saint_judas_feast_15h"},
      {"answer": "Não", "questionId": "saint_judas_feast_17h"},
      {"answer": "Não", "questionId": "saint_judas_feast_evening"},
      {"answer": ["Nenhum dia"], "questionId": "saint_judas_novena"},
      {"answer": "Não", "questionId": "can_substitute"}
    ]
  },
  {
    id: '03f4278c-3677-4910-8b06-72a96cd406a1',
    responses: [
      {"answer": "Não", "questionId": "monthly_availability"},
      {"answer": "19h", "questionId": "main_service_time"},
      {"answer": "Sim", "questionId": "can_substitute"},
      {"answer": ["Domingo 05/10", "Domingo 26/10", "Domingo 19/10"], "questionId": "available_sundays"},
      {"answer": "Não", "questionId": "other_times_available"},
      {"answer": "Não", "questionId": "daily_mass_availability"},
      {"answer": "Não", "questionId": "healing_liberation_mass"},
      {"answer": "Não", "questionId": "sacred_heart_mass"},
      {"answer": "Não", "questionId": "immaculate_heart_mass"},
      {"answer": "Não", "questionId": "custom_1758189732294"},
      {"answer": "Não posso conduzir", "questionId": "adoration_monday"},
      {"answer": "Não", "questionId": "saint_judas_feast_7h"},
      {"answer": "Não", "questionId": "saint_judas_feast_10h"},
      {"answer": "Não", "questionId": "saint_judas_feast_12h"},
      {"answer": "Não", "questionId": "saint_judas_feast_15h"},
      {"answer": "Não", "questionId": "saint_judas_feast_17h"},
      {"answer": "Sim", "questionId": "saint_judas_feast_evening"},
      {"answer": ["Terça 20/10 às 19h30", "Quinta 22/10 às 19h30", "Terça 27/10 às 19h30"], "questionId": "saint_judas_novena"}
    ]
  }
];

console.log('🔄 Testing Migration of Real Database Responses\n');
console.log('=' .repeat(80));

let successCount = 0;
let errorCount = 0;

for (const dbResponse of sampleDatabaseResponses) {
  console.log(`\n📝 Processing response ${dbResponse.id.substring(0, 8)}...`);

  try {
    // Standardize response
    const standardized = QuestionnaireService.standardizeResponse(
      dbResponse.responses,
      10, // October
      2025
    );

    console.log('✅ Successfully standardized to v2.0 format');
    console.log('   Format version:', standardized.format_version);
    console.log('   Available Sundays:', Object.keys(standardized.masses).length);
    console.log('   Saint Judas Novena days:', standardized.special_events.saint_judas_novena?.length || 0);
    console.log('   Can substitute:', standardized.can_substitute);

    // Extract structured data
    const extracted = QuestionnaireService.extractStructuredData(standardized);
    console.log('   Extracted availableSundays:', extracted.availableSundays?.length || 0);
    console.log('   Extracted preferredMassTimes:', extracted.preferredMassTimes?.length || 0);

    // Validate v2.0 structure
    if (standardized.format_version !== '2.0') {
      throw new Error('Invalid format version');
    }
    if (!standardized.masses || typeof standardized.masses !== 'object') {
      throw new Error('Invalid masses structure');
    }
    if (!standardized.special_events || typeof standardized.special_events !== 'object') {
      throw new Error('Invalid special_events structure');
    }
    if (typeof standardized.can_substitute !== 'boolean') {
      throw new Error('Invalid can_substitute type');
    }

    successCount++;
    console.log('   ✔ All validations passed');
  } catch (error) {
    errorCount++;
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n📊 Migration Test Summary:');
console.log(`   Total responses tested: ${sampleDatabaseResponses.length}`);
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ❌ Errors: ${errorCount}`);
console.log(`   Success rate: ${((successCount / sampleDatabaseResponses.length) * 100).toFixed(1)}%`);

if (errorCount === 0) {
  console.log('\n✅ ALL TESTS PASSED! Migration is ready for production.');
} else {
  console.log('\n⚠️  SOME TESTS FAILED. Review errors before deploying.');
  process.exit(1);
}
