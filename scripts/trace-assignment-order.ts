/**
 * Trace the order of assignments and Daniela's count progression
 */
import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function traceOrder() {
  console.log('🔍 Tracing assignment order\n');

  const schedules = await generateAutomaticSchedule(2025, 10, true);

  // Check both ministers with weekday availability
  const ministersToCheck = [
    { name: 'Daniela Pereira', id: '4a1c378d-2ac1-46a7-9fbf-597f7748dac7' },
    { name: 'Eliane Machado', id: '266cb5ba-30d2-49b7-95c0-3c4882b5190e' }
  ];

  for (const minister of ministersToCheck) {
    console.log(`\n📊 ${minister.name.toUpperCase()} ASSIGNMENTS:`);
    console.log('======================================\n');

    const assignments: any[] = [];

    for (const schedule of schedules) {
      const hasMinister = schedule.ministers.some(m =>
        m.name && m.name.includes(minister.name)
      );

      if (hasMinister) {
        assignments.push({
          date: schedule.massTime.date,
          time: schedule.massTime.time,
          type: schedule.massTime.type,
          totalMinisters: schedule.ministers.filter(m => m.id !== null).length
        });
      }
    }

    console.log(`Total assignments: ${assignments.length}\n`);

    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.date} ${assignment.time} (${assignment.type})`);
      console.log(`   Total ministers: ${assignment.totalMinisters}`);
    });
  }

  // Check Oct 29-31
  console.log('\n\n📊 OCT 29-31 STATUS:');
  console.log('======================================\n');

  for (const date of ['2025-10-29', '2025-10-30', '2025-10-31']) {
    const mass = schedules.find(s => s.massTime.date === date);
    if (mass) {
      const nonVacante = mass.ministers.filter(m => m.id !== null).length;
      const hasDaniela = mass.ministers.some(m => m.name && m.name.includes('Daniela'));
      console.log(`${date}: ${nonVacante} ministers${hasDaniela ? ' (includes Daniela)' : ''}`);
      console.log(`   All: ${mass.ministers.map(m => m.name || 'VACANTE').join(', ')}`);
    } else {
      console.log(`${date}: NO MASS FOUND`);
    }
  }

  console.log('\n✅ Complete');
}

traceOrder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
