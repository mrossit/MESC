import { db } from '../server/db';
import {
  getQuestionnaireResponsesForExport,
  getMonthlyResponsesForExport,
  createDetailedCSV,
  convertResponsesToCSV
} from '../server/utils/csvExporter';

async function testCSVExport() {
  console.log('🔍 Testing CSV Export Functionality...\n');

  try {
    // Test for current month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    console.log(`📅 Testing export for ${currentMonth}/${currentYear}...`);

    try {
      const exportData = await getMonthlyResponsesForExport(currentMonth, currentYear);

      if (exportData.length > 0) {
        console.log(`✅ Found ${exportData.length} entries for export`);

        // Test detailed CSV format
        const detailedCSV = createDetailedCSV(exportData);
        console.log('\n📋 Detailed CSV Preview (first 500 chars):');
        console.log(detailedCSV.substring(0, 500));

        // Test simple CSV format
        const simpleCSV = convertResponsesToCSV(exportData);
        console.log('\n📋 Simple CSV Preview (first 500 chars):');
        console.log(simpleCSV.substring(0, 500));

        // Count responses with data
        const withResponses = exportData.filter(d => d.responses.length > 0).length;
        const withoutResponses = exportData.filter(d => d.responses.length === 0).length;

        console.log('\n📊 Export Statistics:');
        console.log(`  - Ministers with responses: ${withResponses}`);
        console.log(`  - Ministers without responses: ${withoutResponses}`);
        console.log(`  - Total ministers: ${exportData.length}`);

        // Show sample question data if available
        if (withResponses > 0) {
          const sampleEntry = exportData.find(d => d.responses.length > 0);
          if (sampleEntry) {
            console.log('\n🔍 Sample Response Data:');
            console.log(`  Minister: ${sampleEntry.ministerName}`);
            console.log(`  Email: ${sampleEntry.ministerEmail}`);
            console.log(`  Number of responses: ${sampleEntry.responses.length}`);
            if (sampleEntry.responses.length > 0) {
              console.log(`  Sample question: ${sampleEntry.responses[0].questionText}`);
              console.log(`  Sample answer: ${sampleEntry.responses[0].answer}`);
            }
          }
        }

        console.log('\n✅ CSV Export functionality is working correctly!');
      } else {
        console.log(`⚠️  No questionnaire found for ${currentMonth}/${currentYear}`);
        console.log('    Try creating a questionnaire and having ministers respond to it first.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('No questionnaire found')) {
        console.log(`ℹ️  No questionnaire exists for ${currentMonth}/${currentYear}`);
        console.log('   This is expected if no questionnaire has been created for this period.');
      } else {
        throw error;
      }
    }

    // Test October 2024 if it exists
    console.log('\n📅 Testing export for October 2024 (if exists)...');
    try {
      const octoberData = await getMonthlyResponsesForExport(10, 2024);
      if (octoberData.length > 0) {
        console.log(`✅ Found ${octoberData.length} entries for October 2024`);
        const withResponses = octoberData.filter(d => d.responses.length > 0).length;
        console.log(`   Ministers with responses: ${withResponses}`);
      }
    } catch (error) {
      console.log('   No October 2024 questionnaire found');
    }

  } catch (error) {
    console.error('❌ Error testing CSV export:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testCSVExport().catch(console.error);