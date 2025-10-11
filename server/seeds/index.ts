/**
 * Database Seeding Entry Point
 * Run all seeding scripts to populate the database
 */

import { seedLiturgicalCalendar } from './liturgicalCalendar';
import { seedSaintsCalendar } from './saintsCalendar';
import { seedTestAccounts } from './testAccounts';

async function runAllSeeds() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed liturgical calendar
    await seedLiturgicalCalendar();

    // Seed saints calendar
    await seedSaintsCalendar();

    // Seed test accounts (dev mode only)
    await seedTestAccounts();

    console.log('\n✅ All seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runAllSeeds };
