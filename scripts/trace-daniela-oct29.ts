/**
 * Trace why Daniela isn't being assigned to Oct 29
 */
import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function traceDaniela() {
  console.log('🔍 Tracing Daniela for October 29, 2025\n');

  const schedules = await generateAutomaticSchedule(2025, 10, true);

  console.log(`\n📊 Total schedules generated: ${schedules.length}`);

  // Find Oct 29-31 masses
  const oct29to31 = schedules.filter(s =>
    s.massTime.date === '2025-10-29' ||
    s.massTime.date === '2025-10-30' ||
    s.massTime.date === '2025-10-31'
  );

  console.log(`\n📊 Oct 29-31 masses found: ${oct29to31.length}`);

  if (oct29to31.length === 0) {
    console.log('❌ No October 29-31 masses found');
    // Show what dates we DO have
    const dates = [...new Set(schedules.map(s => s.massTime.date))].sort();
    console.log('\nDates found:', dates.join(', '));
    return;
  }

  for (const mass of oct29to31) {
    console.log(`\n📅 ${mass.massTime.date}:`);
    console.log('   Time:', mass.massTime.time);
    console.log('   Type:', mass.massTime.type);
    console.log('   dayOfWeek:', mass.massTime.dayOfWeek);
    console.log('   Ministers assigned:', mass.ministers.length);
    console.log('   Ministers:', mass.ministers.map(m => m.name || 'VACANTE').join(', '));
    console.log('   Non-VACANTE:', mass.ministers.filter(m => m.id !== null).length);
  }

  console.log('\n✅ Complete');
}

traceDaniela()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
