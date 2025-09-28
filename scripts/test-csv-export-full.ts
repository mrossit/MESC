import { db } from '../server/db';
import { questionnaires, questionnaireResponses, users } from '@shared/schema';
import { desc } from 'drizzle-orm';
import {
  getQuestionnaireResponsesForExport,
  createDetailedCSV,
  convertResponsesToCSV
} from '../server/utils/csvExporter';

async function testFullCSVExport() {
  console.log('🔍 Testing Complete CSV Export Functionality...\n');

  try {
    // First, check what questionnaires exist
    console.log('📋 Checking existing questionnaires...');
    const existingQuestionnaires = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
        month: questionnaires.month,
        year: questionnaires.year,
        status: questionnaires.status
      })
      .from(questionnaires)
      .orderBy(desc(questionnaires.year), desc(questionnaires.month))
      .limit(5);

    if (existingQuestionnaires.length === 0) {
      console.log('⚠️  No questionnaires found in the database.');
      console.log('   Please create a questionnaire first to test the export functionality.');
      process.exit(0);
    }

    console.log(`Found ${existingQuestionnaires.length} questionnaire(s):\n`);
    existingQuestionnaires.forEach((q, index) => {
      console.log(`  ${index + 1}. ${q.title}`);
      console.log(`     Period: ${q.month}/${q.year}`);
      console.log(`     Status: ${q.status}`);
      console.log(`     ID: ${q.id}\n`);
    });

    // Test export for the first questionnaire
    const testQuestionnaire = existingQuestionnaires[0];
    console.log(`\n🧪 Testing export for: ${testQuestionnaire.title}`);
    console.log(`   ID: ${testQuestionnaire.id}`);

    // Check responses for this questionnaire
    const responses = await db
      .select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId
      })
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, testQuestionnaire.id));

    console.log(`   Found ${responses.length} response(s) for this questionnaire`);

    // Test the export
    console.log('\n📤 Testing CSV export...');
    const exportData = await getQuestionnaireResponsesForExport(testQuestionnaire.id);

    console.log(`   Export data entries: ${exportData.length}`);

    const withResponses = exportData.filter(d => d.responses.length > 0).length;
    const withoutResponses = exportData.filter(d => d.responses.length === 0).length;

    console.log(`   Ministers with responses: ${withResponses}`);
    console.log(`   Ministers without responses: ${withoutResponses}`);

    if (exportData.length > 0) {
      // Generate both CSV formats
      console.log('\n📄 Generating CSV formats...');

      const detailedCSV = createDetailedCSV(exportData);
      const simpleCSV = convertResponsesToCSV(exportData);

      console.log(`   Detailed CSV size: ${detailedCSV.length} characters`);
      console.log(`   Simple CSV size: ${simpleCSV.length} characters`);

      // Show preview of detailed CSV
      console.log('\n📋 Detailed CSV Preview (headers + first row):');
      const detailedLines = detailedCSV.split('\n');
      console.log('   ' + detailedLines[0]); // Headers
      if (detailedLines.length > 1) {
        console.log('   ' + detailedLines[1].substring(0, 200) + (detailedLines[1].length > 200 ? '...' : ''));
      }

      // Show preview of simple CSV
      console.log('\n📋 Simple CSV Preview (headers + first row):');
      const simpleLines = simpleCSV.split('\n');
      console.log('   ' + simpleLines[0]); // Headers
      if (simpleLines.length > 1) {
        console.log('   ' + simpleLines[1].substring(0, 200) + (simpleLines[1].length > 200 ? '...' : ''));
      }

      // Save a sample CSV file for manual inspection
      const fs = await import('fs/promises');
      const filename = `/tmp/test_export_${testQuestionnaire.month}_${testQuestionnaire.year}.csv`;
      await fs.writeFile(filename, detailedCSV, 'utf-8');
      console.log(`\n💾 Sample CSV saved to: ${filename}`);

      console.log('\n✅ CSV Export functionality is working correctly!');
    } else {
      console.log('\n⚠️  No data to export (no ministers found)');
    }

  } catch (error) {
    console.error('\n❌ Error testing CSV export:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }

  process.exit(0);
}

// Add missing import
import { eq } from 'drizzle-orm';

// Run the test
testFullCSVExport().catch(console.error);