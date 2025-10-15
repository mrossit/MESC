/**
 * Inspect what masses are being generated for October
 */
import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function inspectOctoberMasses() {
  console.log('🔍 Inspecting October 2025 mass generation\n');

  const schedules = await generateAutomaticSchedule(2025, 10, true);

  // Group by date
  const massesByDate: { [date: string]: any[] } = {};

  for (const schedule of schedules) {
    const date = schedule.massTime.date;
    if (!date) continue;

    if (!massesByDate[date]) {
      massesByDate[date] = [];
    }

    massesByDate[date].push({
      time: schedule.massTime.time,
      type: schedule.massTime.type,
      ministers: schedule.ministers.length
    });
  }

  // Sort dates
  const sortedDates = Object.keys(massesByDate).sort();

  console.log('═══════════════════════════════════════════════');
  console.log('OCTOBER 2025 - MASSES BY DATE');
  console.log('═══════════════════════════════════════════════\n');

  for (const date of sortedDates) {
    const dayNum = parseInt(date.split('-')[2]);
    const dateObj = new Date(date);
    const dayOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()];

    console.log(`\n📅 ${date} (${dayOfWeek}) - Day ${dayNum}`);

    const masses = massesByDate[date].sort((a, b) => a.time.localeCompare(b.time));
    for (const mass of masses) {
      console.log(`   ${mass.time} - ${mass.type} (${mass.ministers} ministers)`);
    }
  }

  // Check specific problematic dates
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('SPECIFIC CHECKS:');
  console.log('═══════════════════════════════════════════════\n');

  // Check October 26 (should be Saturday novena)
  if (massesByDate['2025-10-26']) {
    console.log('✅ October 26 (Sábado): HAS MASSES');
    console.log('   Expected: Novena at 19:00');
    massesByDate['2025-10-26'].forEach(m => {
      const emoji = m.time === '19:00' ? '✅' : '⚠️';
      console.log(`   ${emoji} ${m.time} - ${m.type}`);
    });
  } else {
    console.log('❌ October 26: NO MASSES GENERATED');
  }

  // Check October 29, 30, 31
  console.log('\n📊 Last 3 days of October:');
  for (const day of [29, 30, 31]) {
    const date = `2025-10-${day}`;
    const dateObj = new Date(date);
    const dayOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()];

    if (massesByDate[date]) {
      console.log(`   ✅ ${date} (${dayOfWeek}): ${massesByDate[date].length} masses`);
      massesByDate[date].forEach(m => console.log(`      - ${m.time} ${m.type}`));
    } else {
      console.log(`   ❌ ${date} (${dayOfWeek}): NO MASSES`);
    }
  }

  console.log('\n✅ Inspection complete');
}

inspectOctoberMasses()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
