import { db } from '../server/db';
import { questionnaires, questionnaireResponses } from '../shared/schema';
import { getQuestionnaireResponsesForExport, createDetailedCSV } from '../server/utils/csvExporter';
import { desc } from 'drizzle-orm';

async function testCSVExport() {
  console.log('🔍 Testing CSV Export Functionality...\n');

  try {
    // List available questionnaires
    const allQuestionnaires = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
        month: questionnaires.month,
        year: questionnaires.year,
        status: questionnaires.status
      })
      .from(questionnaires)
      .orderBy(desc(questionnaires.createdAt))
      .limit(5);

    if (allQuestionnaires.length === 0) {
      console.log('❌ No questionnaires found in the database');
      return;
    }

    console.log('📋 Found questionnaires:');
    allQuestionnaires.forEach(q => {
      console.log(`- ${q.title} (${q.month}/${q.year}) - Status: ${q.status}`);
    });

    // Test with the first questionnaire
    const testQuestionnaire = allQuestionnaires[0];
    console.log(`\n📊 Testing export for: ${testQuestionnaire.title}`);

    // Count responses
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, testQuestionnaire.id));

    console.log(`   Found ${responses.length} responses`);

    if (responses.length > 0) {
      // Get export data
      const exportData = await getQuestionnaireResponsesForExport(testQuestionnaire.id);
      console.log(`   Export data prepared for ${exportData.length} ministers`);

      // Generate CSV
      const csvContent = createDetailedCSV(exportData);

      // Show first few lines of CSV
      const csvLines = csvContent.split('\n');
      console.log('\n📄 CSV Preview (first 5 lines):');
      csvLines.slice(0, 5).forEach(line => {
        console.log('   ' + line.substring(0, 100) + (line.length > 100 ? '...' : ''));
      });

      // Analyze CSV structure
      const headers = csvLines[0].split(',');
      console.log(`\n✅ CSV generated successfully!`);
      console.log(`   - Total columns: ${headers.length}`);
      console.log(`   - Total rows: ${csvLines.length - 1}`);

      // Show sample of questions found
      console.log('\n📝 Questions/Columns found:');
      headers.slice(3, Math.min(headers.length, 10)).forEach(header => {
        console.log(`   - ${header.replace(/"/g, '')}`);
      });
      if (headers.length > 10) {
        console.log(`   ... and ${headers.length - 10} more columns`);
      }

      // Check if responses were properly extracted
      const dataRows = csvLines.slice(1).filter(line => line.trim());
      if (dataRows.length > 0) {
        const firstDataRow = dataRows[0].split(',');
        const hasData = firstDataRow.slice(3).some(cell => cell && cell !== '""' && cell !== 'Não respondido');

        if (hasData) {
          console.log('\n✅ Data is being properly extracted and formatted!');
        } else {
          console.log('\n⚠️  Warning: Responses seem empty. Checking raw data...');

          // Check raw response structure
          const sampleResponse = responses[0];
          console.log('\nRaw response structure:');
          console.log('- ID:', sampleResponse.id);
          console.log('- Has responses field:', !!sampleResponse.responses);
          console.log('- Has availableSundays:', !!sampleResponse.availableSundays);
          console.log('- Has preferredMassTimes:', !!sampleResponse.preferredMassTimes);

          if (sampleResponse.responses) {
            const responsesData = typeof sampleResponse.responses === 'string'
              ? JSON.parse(sampleResponse.responses)
              : sampleResponse.responses;

            if (Array.isArray(responsesData)) {
              console.log(`- Responses is an array with ${responsesData.length} items`);
              if (responsesData.length > 0) {
                console.log('- First response item:', JSON.stringify(responsesData[0], null, 2));
              }
            } else {
              console.log('- Responses is an object');
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during CSV export test:', error);
  } finally {
    process.exit(0);
  }
}

// Add missing import
import { eq } from 'drizzle-orm';

testCSVExport();