/**
 * 🧪 Test script for questionnaire format comparison
 *
 * Runs safety tests to ensure no data loss when switching formats
 */

import { testOctoberDataParsing, debugSingleResponse, verifyProductionSafety } from './server/utils/questionnaireFormatTester.js';

async function runTests() {
  console.log('\n🚀 QUESTIONNAIRE FORMAT TESTER\n');

  try {
    // 1. Verify production safety measures
    verifyProductionSafety();

    // 2. Test October data parsing comparison
    await testOctoberDataParsing();

    // 3. If you want to debug a specific user, uncomment:
    // await debugSingleResponse('YOUR_USER_ID_HERE');

    console.log('\n✅ All tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

runTests();
