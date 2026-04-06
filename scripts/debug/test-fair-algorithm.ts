/**
 * Test script to generate October 2025 schedule with fair algorithm
 * This bypasses authentication and directly tests the schedule generator
 */

import { generateAutomaticSchedule } from './server/utils/scheduleGenerator.js';

async function testFairAlgorithm() {
  console.log('\n🧪 TESTING FAIR ALGORITHM WITH REAL DATA\n');
  console.log('='.repeat(60));
  console.log('Generating October 2025 schedule...');
  console.log('='.repeat(60));

  try {
    const startTime = Date.now();

    // Generate October 2025 preview (isPreview = true)
    const schedules = await generateAutomaticSchedule(2025, 10, true);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 GENERATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`Total schedules generated: ${schedules.length}`);
    console.log(`Time taken: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log('='.repeat(60));

    // Analyze some schedules
    console.log('\n📊 Sample Schedules:');
    schedules.slice(0, 5).forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.massTime.date} ${s.massTime.time} (${s.massTime.type})`);
      console.log(`   Ministers: ${s.ministers.length}/${s.massTime.minMinisters}`);
      console.log(`   Confidence: ${(s.confidence * 100).toFixed(0)}%`);
      if (s.ministers.length > 0) {
        console.log(`   Sample: ${s.ministers.slice(0, 3).map(m => m.name).join(', ')}`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ GENERATION FAILED:', error);
    console.error((error as any).stack);
    process.exit(1);
  }
}

testFairAlgorithm();
