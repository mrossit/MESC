/**
 * Test generation specifically for October 29
 */
import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testOct29Generation() {
  console.log('🧪 Testing October 29 (Quarta) mass generation\n');

  // Import generator
  const { ScheduleGenerator } = await import('../server/utils/scheduleGenerator');
  const generator = new ScheduleGenerator();

  // Manually initialize
  const { db: dbInstance } = await import('../db.js');
  (generator as any).db = dbInstance;

  // Load ministers
  await (generator as any).loadMinistersData();
  console.log(`📊 Ministers loaded: ${(generator as any).ministers.length}`);

  // Load availability
  await (generator as any).loadAvailabilityData(2025, 10, true);
  console.log(`📊 Availability loaded: ${(generator as any).availabilityData.size}`);

  // Create a MassTime for October 29
  const oct29Mass = {
    id: 'test-oct-29',
    dayOfWeek: 3, // Quarta-feira
    time: '06:30',
    date: '2025-10-29',
    minMinisters: 5,
    maxMinisters: 5,
    type: 'missa_diaria'
  };

  console.log('\n🔍 Testing getAvailableMinistersForMass for Oct 29:');
  console.log('   Mass:', oct29Mass);

  // Get available ministers
  const available = (generator as any).getAvailableMinistersForMass(oct29Mass);

  console.log(`\n✅ Found ${available.length} available ministers`);

  if (available.length > 0) {
    console.log('\n👥 Available ministers:');
    available.forEach((m: any) => {
      console.log(`   - ${m.name}`);
    });
  } else {
    console.log('\n❌ No ministers found!');
    console.log('\n🔍 Checking Daniela specifically:');

    const daniela = (generator as any).ministers.find((m: any) => m.name === 'Daniela Pereira ');
    if (daniela) {
      console.log(`   Daniela ID: ${daniela.id}`);
      const danielaAvail = (generator as any).availabilityData.get(daniela.id);
      console.log(`   Daniela availability:`, danielaAvail);
    }
  }

  console.log('\n✅ Test complete');
}

testOct29Generation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  });
