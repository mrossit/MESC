import { db } from '../server/db';
import { questionnaires, questionnaireResponses, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkResponseStructure() {
  console.log('🔍 Checking response data structure...\n');

  try {
    // Get the latest questionnaire
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .orderBy(questionnaires.createdAt)
      .limit(1);

    if (!questionnaire) {
      console.log('No questionnaires found');
      process.exit(0);
    }

    console.log(`📋 Questionnaire: ${questionnaire.title}`);
    console.log(`   ID: ${questionnaire.id}`);

    // Check questions structure
    console.log('\n📝 Questions structure:');
    console.log('   Type:', typeof questionnaire.questions);
    console.log('   Is Array:', Array.isArray(questionnaire.questions));
    console.log('   Sample:', JSON.stringify(questionnaire.questions, null, 2).substring(0, 500));

    // Get a response
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id))
      .limit(1);

    if (response) {
      console.log('\n📊 Response structure:');
      console.log('   Response ID:', response.id);
      console.log('   User ID:', response.userId);

      console.log('\n   responses field:');
      console.log('     Type:', typeof response.responses);
      console.log('     Is Array:', Array.isArray(response.responses));
      console.log('     Content:', JSON.stringify(response.responses, null, 2));

      // Check other availability fields
      console.log('\n   Availability fields:');
      console.log('     availableSundays:', response.availableSundays);
      console.log('     preferredMassTimes:', response.preferredMassTimes);
      console.log('     alternativeTimes:', response.alternativeTimes);
      console.log('     dailyMassAvailability:', response.dailyMassAvailability);
      console.log('     canSubstitute:', response.canSubstitute);
      console.log('     notes:', response.notes);
    } else {
      console.log('\nNo responses found for this questionnaire');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkResponseStructure().catch(console.error);