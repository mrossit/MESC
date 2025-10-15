/**
 * Test if algorithm correctly finds ministers for October 28 masses
 */
import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function testOctober28Algorithm() {
  console.log('🧪 Testing October 28 algorithm - can it find available ministers?\n');

  // Import the generator
  const { ScheduleGenerator } = await import('../server/utils/scheduleGenerator');
  const generator = new ScheduleGenerator();

  console.log(`🔍 Generator availabilityData size: ${(generator as any).availabilityData?.size || 0}\n`);

  // Get all active ministers
  const ministers = await db.select({
    id: users.id,
    name: users.name,
    role: users.role,
    status: users.status
  })
  .from(users)
  .where(
    and(
      eq(users.role, 'ministro'),
      eq(users.status, 'active')
    )
  );

  console.log(`📊 Total active ministers: ${ministers.length}\n`);

  // Get October questionnaire responses
  const responses = await db.select()
    .from(questionnaireResponses)
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
    .where(
      and(
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      )
    );

  console.log(`📊 Total October responses: ${responses.length}\n`);

  // Build availability map
  const availabilityData = new Map();
  for (const response of responses) {
    const qr = response.questionnaire_responses;
    const q = response.questionnaires;

    const adapted = (generator as any).adaptQuestionnaireResponse(qr, q.year, q.month);
    availabilityData.set(qr.userId, adapted);
  }

  console.log(`📊 Built availability map for ${availabilityData.size} ministers\n`);

  // Populate the generator's internal availabilityData
  (generator as any).availabilityData = availabilityData;
  console.log(`📊 Set generator availabilityData size: ${(generator as any).availabilityData.size}\n`);

  // Test October 28 masses - create proper MassTime objects
  const octoberMasses = [
    { id: 'test-1', dayOfWeek: 2, time: '07:00', minMinisters: 10, maxMinisters: 10, type: 'missa_sao_judas_festa', date: '2025-10-28' },
    { id: 'test-2', dayOfWeek: 2, time: '10:00', minMinisters: 15, maxMinisters: 15, type: 'missa_sao_judas_festa', date: '2025-10-28' },
    { id: 'test-3', dayOfWeek: 2, time: '12:00', minMinisters: 10, maxMinisters: 10, type: 'missa_sao_judas_festa', date: '2025-10-28' },
    { id: 'test-4', dayOfWeek: 2, time: '15:00', minMinisters: 10, maxMinisters: 10, type: 'missa_sao_judas_festa', date: '2025-10-28' },
    { id: 'test-5', dayOfWeek: 2, time: '17:00', minMinisters: 10, maxMinisters: 10, type: 'missa_sao_judas_festa', date: '2025-10-28' },
    { id: 'test-6', dayOfWeek: 2, time: '19:30', minMinisters: 20, maxMinisters: 20, type: 'missa_sao_judas_festa', date: '2025-10-28' }
  ];

  console.log('═══════════════════════════════════════════════');
  console.log('Testing isAvailableForSpecialMass for each mass:\n');

  for (const mass of octoberMasses) {
    console.log(`\n🔍 Mass: ${mass.date} at ${mass.time} (${mass.type})`);

    // Test the isAvailableForSpecialMass method directly
    let availableCount = 0;
    const availableMinisterNames: string[] = [];

    for (const minister of ministers) {
      if (!minister.id) continue;

      // Check what data the generator has
      const availability = availabilityData.get(minister.id);
      if (availability) {
        const specialEvents = (availability as any).specialEvents;
        if (specialEvents && specialEvents.saint_judas_feast) {
          const datetimeKey = `${mass.date}_${mass.time}`;
          const response = specialEvents.saint_judas_feast[datetimeKey];

          if (response === true && availableCount === 0) {
            console.log(`   🔍 DEBUG: ${minister.name} has ${datetimeKey}: ${response}`);
            console.log(`      availabilityData has data: ${!!availability}`);
            console.log(`      specialEvents exists: ${!!specialEvents}`);
            console.log(`      saint_judas_feast exists: ${!!specialEvents.saint_judas_feast}`);
            console.log(`      saint_judas_feast type: ${typeof specialEvents.saint_judas_feast}`);
          }
        }
      }

      const isAvailable = (generator as any).isAvailableForSpecialMass(
        minister.id,
        mass.type,
        mass.time,
        mass.date
      );

      if (isAvailable) {
        availableCount++;
        if (availableMinisterNames.length < 5) {
          availableMinisterNames.push(minister.name);
        }
      }
    }

    console.log(`   ✅ Found ${availableCount} available ministers`);
    if (availableMinisterNames.length > 0) {
      console.log(`   👥 First 5: ${availableMinisterNames.join(', ')}`);
    }
  }

  console.log('\n\n═══════════════════════════════════════════════');
  console.log('Manual check - ministers with saint_judas_feast data:\n');

  let ministersWithFeastData = 0;
  let totalAvailableByTime: { [time: string]: number } = {
    '07:00': 0,
    '10:00': 0,
    '12:00': 0,
    '15:00': 0,
    '17:00': 0,
    '19:30': 0
  };

  for (const [ministerId, availability] of availabilityData.entries()) {
    const specialEvents = (availability as any).specialEvents;

    if (specialEvents && specialEvents.saint_judas_feast) {
      ministersWithFeastData++;

      const feast = specialEvents.saint_judas_feast;
      if (typeof feast === 'object') {
        for (const time of ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30']) {
          const key = `2025-10-28_${time}`;
          if (feast[key] === true) {
            totalAvailableByTime[time]++;
          }
        }
      }
    }
  }

  console.log(`📊 Ministers with saint_judas_feast data: ${ministersWithFeastData}`);
  console.log('\n📊 Manual availability count per time:');
  for (const [time, count] of Object.entries(totalAvailableByTime)) {
    console.log(`   ${time}: ${count} ministers`);
  }

  console.log('\n✅ Test complete');
}

testOctober28Algorithm()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  });
