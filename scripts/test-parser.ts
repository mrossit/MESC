/**
 * Test parser for October 28 feast masses
 */
import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testParser() {
  console.log('🧪 Testing parser for October 28 feast masses\n');

  // Get one October response
  const [response] = await db.select({
    userId: questionnaireResponses.userId,
    responses: questionnaireResponses.responses,
    month: questionnaires.month,
    year: questionnaires.year,
    userName: users.name
  })
  .from(questionnaireResponses)
  .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
  .leftJoin(users, eq(questionnaireResponses.userId, users.id))
  .where(eq(questionnaires.month, 10))
  .where(eq(questionnaires.year, 2025))
  .limit(1);

  if (!response) {
    console.log('❌ No October responses found');
    return;
  }

  console.log(`👤 Testing with minister: ${response.userName} (${response.userId})`);
  console.log(`📅 Questionnaire: ${response.month}/${response.year}\n`);

  // Parse the response
  const data = response.responses;
  console.log('📦 Response type:', typeof data);
  console.log('📦 Is object:', typeof data === 'object');
  console.log('📦 Has format_version:', data && typeof data === 'object' && 'format_version' in data);

  if (data && typeof data === 'object') {
    console.log('📦 format_version value:', (data as any).format_version);
    console.log('📦 Has special_events:', 'special_events' in data);

    if ('special_events' in data) {
      const specialEvents = (data as any).special_events;
      console.log('📦 Has saint_judas_feast:', specialEvents && 'saint_judas_feast' in specialEvents);

      if (specialEvents && 'saint_judas_feast' in specialEvents) {
        const feast = specialEvents.saint_judas_feast;
        console.log('📦 Feast data type:', typeof feast);
        console.log('📦 Feast data:', JSON.stringify(feast, null, 2));

        // Check each time
        const times = ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'];
        console.log('\n✅ October 28 Availability:');
        for (const time of times) {
          const key = `2025-10-28_${time}`;
          const available = feast[key];
          console.log(`  ${time}: ${available ? '✅ YES' : '❌ NO'}`);
        }
      }
    }
  }

  console.log('\n✅ Test complete');
}

testParser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
