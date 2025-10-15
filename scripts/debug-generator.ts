/**
 * Debug the schedule generator flow
 */
import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function debugGenerator() {
  console.log('🔍 Debugging schedule generator flow for October 28\n');

  // Get ministers with questionnaire responses
  const ministersData = await db.select({
    id: users.id,
    name: users.name,
    role: users.role,
    questionnaireResponse: {
      id: questionnaireResponses.id,
      responses: questionnaireResponses.responses
    }
  })
  .from(users)
  .leftJoin(questionnaireResponses, eq(users.id, questionnaireResponses.userId))
  .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
  .where(
    and(
      eq(users.role, 'ministro'),
      eq(users.status, 'active'),
      eq(questionnaires.month, 10),
      eq(questionnaires.year, 2025)
    )
  )
  .limit(5);

  console.log(`📊 Found ${ministersData.length} ministers with responses\n`);

  for (const minister of ministersData) {
    console.log(`\n👤 Minister: ${minister.name} (${minister.id})`);

    if (!minister.questionnaireResponse) {
      console.log('  ❌ No questionnaire response');
      continue;
    }

    const response = minister.questionnaireResponse.responses;
    console.log('  📦 Response type:', typeof response);

    if (response && typeof response === 'object') {
      // Check format version
      const formatVersion = (response as any).format_version;
      console.log('  📦 Format version:', formatVersion);

      // Check special events
      const specialEvents = (response as any).special_events;
      console.log('  📦 Has special_events:', !!specialEvents);

      if (specialEvents && specialEvents.saint_judas_feast) {
        console.log('  📦 Has saint_judas_feast:', true);

        // Check October 28 availability
        const feast = specialEvents.saint_judas_feast;
        const available10h = feast['2025-10-28_10:00'];
        const available19h30 = feast['2025-10-28_19:30'];

        console.log('  ✅ October 28 availability:');
        console.log(`     10:00 → ${available10h ? '✅ YES' : '❌ NO'}`);
        console.log(`     19:30 → ${available19h30 ? '✅ YES' : '❌ NO'}`);

        // Simulate the availability check that the generator does
        const massType = 'missa_sao_judas_festa';
        const massDate = '2025-10-28';
        const massTime = '10:00';

        console.log(`\n  🧪 Simulating generator check for ${massType} at ${massDate} ${massTime}:`);

        if (feast && typeof feast === 'object') {
          const datetimeKey = `${massDate}_${massTime}`;
          const isAvailable = feast[datetimeKey] === true;
          console.log(`     datetimeKey: ${datetimeKey}`);
          console.log(`     Response: ${feast[datetimeKey]}`);
          console.log(`     Is available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
        }
      } else {
        console.log('  ❌ No saint_judas_feast data');
      }
    } else {
      console.log('  ❌ Response is not an object');
    }
  }

  console.log('\n\n═══════════════════════════════════════════════');
  console.log('Now checking how adaptQuestionnaireResponse processes this...\n');

  // Import the ScheduleGenerator to test adaptQuestionnaireResponse
  const { ScheduleGenerator } = await import('../server/utils/scheduleGenerator');
  const generator = new ScheduleGenerator();

  // Get one response to test
  const [testResponse] = await db.select()
    .from(questionnaireResponses)
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
    .where(
      and(
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      )
    )
    .limit(1);

  if (testResponse) {
    console.log('Testing adaptQuestionnaireResponse with a sample response...');

    // Call the private method via reflection
    const adapted = (generator as any).adaptQuestionnaireResponse(
      testResponse.questionnaire_responses,
      2025,
      10
    );

    console.log('\n📋 Adapted response structure:');
    console.log('  - availableSundays:', adapted.availableSundays?.length || 0);
    console.log('  - specialEvents keys:', Object.keys(adapted.specialEvents || {}).join(', '));

    if (adapted.specialEvents) {
      console.log('\n  📦 Special events in adapted response:');
      for (const [key, value] of Object.entries(adapted.specialEvents)) {
        console.log(`     ${key}: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value}`);
      }
    }
  }

  console.log('\n✅ Debug complete');
}

debugGenerator()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    console.error(error.stack);
    process.exit(1);
  });
