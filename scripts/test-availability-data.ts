/**
 * Test what data is in availabilityData
 */
import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function testAvailabilityData() {
  console.log('🔍 Testing what availabilityData contains\n');

  // Import the generator
  const { ScheduleGenerator } = await import('../server/utils/scheduleGenerator');
  const generator = new ScheduleGenerator();

  // Simulate loading ministers and responses
  const ministers = await db.select({
    id: users.id,
    name: users.name,
    role: users.role,
    status: users.status,
    totalServices: users.totalServices
  })
  .from(users)
  .where(
    and(
      eq(users.role, 'ministro'),
      eq(users.status, 'active')
    )
  )
  .limit(3);

  console.log(`📊 Found ${ministers.length} ministers\n`);

  // Get questionnaire responses for October
  const responses = await db.select()
    .from(questionnaireResponses)
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
    .where(
      and(
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      )
    )
    .limit(3);

  console.log(`📊 Found ${responses.length} responses\n`);

  // Test adaptQuestionnaireResponse
  for (const response of responses) {
    const qr = response.questionnaire_responses;
    const q = response.questionnaires;

    console.log(`\n👤 Testing response for user ${qr.userId}`);

    const adapted = (generator as any).adaptQuestionnaireResponse(
      qr,
      q.year,
      q.month
    );

    console.log('📋 Adapted response:');
    console.log('  - availableSundays:', JSON.stringify(adapted.availableSundays?.slice(0, 3)));
    console.log('  - preferredMassTimes:', JSON.stringify(adapted.preferredMassTimes));
    console.log('  - dailyMassAvailability:', JSON.stringify(adapted.dailyMassAvailability));
    console.log('  - canSubstitute:', adapted.canSubstitute);
    console.log('  - specialEvents keys:', Object.keys(adapted.specialEvents || {}).join(', '));

    if (adapted.specialEvents?.saint_judas_feast) {
      console.log('\n  🔥 saint_judas_feast data:');
      const feast = adapted.specialEvents.saint_judas_feast;
      console.log('    Type:', typeof feast);
      if (typeof feast === 'object') {
        const keys = Object.keys(feast).slice(0, 3);
        console.log('    Keys (first 3):', keys);
        for (const key of keys) {
          console.log(`      ${key}: ${feast[key]}`);
        }
      }
    }

    if (adapted.specialEvents?.saint_judas_novena) {
      console.log('\n  🔥 saint_judas_novena data:');
      const novena = adapted.specialEvents.saint_judas_novena;
      console.log('    Type:', typeof novena, Array.isArray(novena) ? '(array)' : '');
      if (Array.isArray(novena)) {
        console.log('    Values:', novena.slice(0, 3));
      }
    }
  }

  console.log('\n✅ Test complete');
}

testAvailabilityData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  });
