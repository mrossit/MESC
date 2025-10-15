/**
 * Test the full schedule generation flow for October
 */
import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function testFullGeneration() {
  console.log('🧪 Testing FULL schedule generation for October 2025\n');
  console.log('This simulates exactly what the server does...\n');

  try {
    console.log('⏳ Calling generateAutomaticSchedule(2025, 10, true)...\n');

    const schedules = await generateAutomaticSchedule(2025, 10, true);

    console.log(`\n✅ Generation completed! Total schedules: ${schedules.length}\n`);

    // Filter for October 28 masses
    const oct28Masses = schedules.filter(s => s.massTime.date === '2025-10-28');

    console.log('═══════════════════════════════════════════════');
    console.log(`📊 October 28 masses: ${oct28Masses.length}`);
    console.log('═══════════════════════════════════════════════\n');

    if (oct28Masses.length === 0) {
      console.log('❌ NO OCTOBER 28 MASSES FOUND!\n');

      // Check what dates we DO have
      const uniqueDates = [...new Set(schedules.map(s => s.massTime.date))].sort();
      console.log('Dates in schedule:', uniqueDates.join(', '));
      return;
    }

    // Sort by time
    oct28Masses.sort((a, b) => a.massTime.time.localeCompare(b.massTime.time));

    for (const mass of oct28Masses) {
      const ministersCount = mass.ministers.filter(m => m.id !== null).length;
      const hasVacancies = mass.ministers.some(m => m.id === null);

      console.log(`\n⛪ ${mass.massTime.time} - ${mass.massTime.type}`);
      console.log(`   Ministers: ${ministersCount}/${mass.massTime.maxMinisters}`);
      console.log(`   Confidence: ${(mass.confidence * 100).toFixed(0)}%`);
      console.log(`   Has VACANTE: ${hasVacancies ? '⚠️ YES' : '✅ NO'}`);

      if (ministersCount > 0) {
        const names = mass.ministers
          .filter(m => m.id !== null)
          .slice(0, 3)
          .map(m => m.name)
          .join(', ');
        console.log(`   Sample: ${names}...`);
      } else {
        console.log(`   ❌ NO MINISTERS ASSIGNED!`);
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('Summary by time:');
    console.log('═══════════════════════════════════════════════');

    const times = ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'];
    for (const time of times) {
      const mass = oct28Masses.find(m => m.massTime.time === time);
      if (mass) {
        const ministersCount = mass.ministers.filter(m => m.id !== null).length;
        const status = ministersCount >= mass.massTime.minMinisters ? '✅' : '⚠️';
        console.log(`  ${time}: ${ministersCount.toString().padStart(2)} ministers ${status} (need ${mass.massTime.minMinisters})`);
      } else {
        console.log(`  ${time}: ❌ MASS NOT GENERATED`);
      }
    }

    console.log('\n✅ Test complete');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFullGeneration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
