/**
 * Test availability check for October 28
 */
import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testAvailability() {
  console.log('🧪 Testing minister availability for October 28 masses\n');

  // Get all October responses
  const responses = await db.select({
    userId: questionnaireResponses.userId,
    responses: questionnaireResponses.responses,
    userName: users.name
  })
  .from(questionnaireResponses)
  .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
  .leftJoin(users, eq(questionnaireResponses.userId, users.id))
  .where(eq(questionnaires.month, 10))
  .where(eq(questionnaires.year, 2025));

  console.log(`📊 Total responses: ${responses.length}\n`);

  const times = ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'];
  const availability: { [time: string]: number } = {};

  for (const time of times) {
    availability[time] = 0;
  }

  for (const response of responses) {
    const data = response.responses;
    if (data && typeof data === 'object' && 'special_events' in data) {
      const specialEvents = (data as any).special_events;
      if (specialEvents?.saint_judas_feast && typeof specialEvents.saint_judas_feast === 'object') {
        const feast = specialEvents.saint_judas_feast;

        for (const time of times) {
          const key = `2025-10-28_${time}`;
          if (feast[key] === true) {
            availability[time]++;
          }
        }
      }
    }
  }

  console.log('✅ Ministers available for each October 28 mass:');
  console.log('═══════════════════════════════════════════════');
  for (const time of times) {
    const count = availability[time];
    const required = time === '10:00' || time === '19:30' ? 15 : 10;
    const status = count >= required ? '✅' : '⚠️';
    console.log(`  ${time}: ${count.toString().padStart(2)} ministers ${status} (need ${required})`);
  }
  console.log('═══════════════════════════════════════════════\n');

  console.log('✅ Test complete - restart server and regenerate schedule!');
}

testAvailability()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
