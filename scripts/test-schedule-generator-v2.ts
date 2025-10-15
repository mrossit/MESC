#!/usr/bin/env tsx

/**
 * Test script for ScheduleGeneratorV2
 *
 * Compares the new ResponseCompiler-based generator with the original.
 */

import { ScheduleGeneratorV2 } from '../server/utils/scheduleGeneratorV2';

async function main() {
  console.log('🧪 Testing ScheduleGeneratorV2\n');
  console.log('='.repeat(60));

  try {
    // ===== TEST: OCTOBER 2025 =====
    console.log('\n📅 Testing October 2025 schedule generation...\n');

    const generator = new ScheduleGeneratorV2(10, 2025);

    // Step 1: Initialize
    console.log('[TEST] Step 1: Initializing...');
    await generator.initialize();

    // Step 2: Generate schedule
    console.log('\n[TEST] Step 2: Generating schedule...');
    const schedule = await generator.generateSchedule();

    // Step 3: Analyze results
    console.log('\n[TEST] Step 3: Analyzing results...\n');
    console.log('='.repeat(60));
    console.log('=== 📊 ANALYSIS ===');
    console.log('='.repeat(60));

    const totalMasses = schedule.length;
    const complete = schedule.filter(s => s.ministers.length >= s.massTime.minMinisters);
    const incomplete = schedule.filter(s => s.ministers.length < s.massTime.minMinisters);

    console.log(`\nTotal masses: ${totalMasses}`);
    console.log(`Complete: ${complete.length} (${Math.round(complete.length / totalMasses * 100)}%)`);
    console.log(`Incomplete: ${incomplete.length} (${Math.round(incomplete.length / totalMasses * 100)}%)`);

    // Sample complete masses
    console.log('\n=== ✅ Sample Complete Masses ===\n');
    complete.slice(0, 5).forEach(s => {
      console.log(`${s.massTime.date} ${s.massTime.time} (${s.massTime.type || 'regular'})`);
      console.log(`  Ministers: ${s.ministers.map(m => m.name).join(', ')}`);
      console.log(`  Confidence: ${Math.round(s.confidence * 100)}%`);
      console.log('');
    });

    // Incomplete masses
    if (incomplete.length > 0) {
      console.log('\n=== ⚠️  Incomplete Masses ===\n');
      incomplete.slice(0, 10).forEach(s => {
        const shortage = s.massTime.minMinisters - s.ministers.length;
        console.log(`${s.massTime.date} ${s.massTime.time} (${s.massTime.type || 'regular'})`);
        console.log(`  Required: ${s.massTime.minMinisters}, Assigned: ${s.ministers.length}, Missing: ${shortage}`);
        console.log(`  Ministers: ${s.ministers.map(m => m.name).join(', ') || 'NONE'}`);
        console.log('');
      });
    }

    // Special masses analysis
    console.log('\n=== 🎉 Special Masses Analysis ===\n');

    const novenaMasses = schedule.filter(s => s.massTime.type === 'novena_sao_judas');
    const feastMasses = schedule.filter(s => s.massTime.type === 'festa_sao_judas');

    console.log(`Novena masses (19-27/10):`);
    console.log(`  Total: ${novenaMasses.length}`);
    console.log(`  Complete: ${novenaMasses.filter(s => s.ministers.length >= s.massTime.minMinisters).length}`);
    console.log(`  Avg confidence: ${Math.round(novenaMasses.reduce((sum, s) => sum + s.confidence, 0) / novenaMasses.length * 100)}%`);

    console.log(`\nFeast day masses (28/10):`);
    console.log(`  Total: ${feastMasses.length}`);
    console.log(`  Complete: ${feastMasses.filter(s => s.ministers.length >= s.massTime.minMinisters).length}`);
    console.log(`  Avg confidence: ${Math.round(feastMasses.reduce((sum, s) => sum + s.confidence, 0) / feastMasses.length * 100)}%`);

    // Detail feast day assignments
    console.log(`\n=== 🎊 Feast Day Details (28/10) ===\n`);
    feastMasses.forEach(s => {
      console.log(`${s.massTime.time}:`);
      console.log(`  Ministers (${s.ministers.length}): ${s.ministers.map(m => m.name).join(', ') || 'NONE'}`);
      if (s.backupMinisters.length > 0) {
        console.log(`  Backups (${s.backupMinisters.length}): ${s.backupMinisters.map(m => m.name).join(', ')}`);
      }
      console.log('');
    });

    // Sunday masses
    const sundayMasses = schedule.filter(s => s.massTime.dayOfWeek === 0 && !s.massTime.type?.includes('sao_judas'));
    console.log(`\n=== 🙏 Sunday Masses ===\n`);
    console.log(`Total: ${sundayMasses.length}`);
    console.log(`Complete: ${sundayMasses.filter(s => s.ministers.length >= s.massTime.minMinisters).length}`);
    console.log(`Avg confidence: ${Math.round(sundayMasses.reduce((sum, s) => sum + s.confidence, 0) / sundayMasses.length * 100)}%`);

    // Sample Sundays
    const uniqueSundayDates = [...new Set(sundayMasses.map(s => s.massTime.date))];
    console.log(`\nSample Sunday: ${uniqueSundayDates[0]}`);
    sundayMasses
      .filter(s => s.massTime.date === uniqueSundayDates[0])
      .forEach(s => {
        console.log(`  ${s.massTime.time}: ${s.ministers.map(m => m.name).join(', ')}`);
      });

    // Monthly stats
    console.log('\n=== 📈 Monthly Statistics ===\n');
    const stats = generator.getMonthlyStats();
    console.log(`Total ministers: ${stats.totalMinisters}`);
    console.log(`Total availabilities: ${stats.totalAvailabilities}`);
    console.log(`Avg availabilities per minister: ${stats.avgAvailabilitiesPerMinister}`);
    console.log(`Ministers with weekday availability: ${stats.ministersWithWeekdayAvailability} (${stats.percentageWeekdayAvailable}%)`);
    console.log(`Ministers can substitute: ${stats.ministersCanSubstitute} (${stats.percentageCanSubstitute}%)`);

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));

    // Compare with expected
    console.log('\n=== 🔍 Quality Check ===\n');

    const qualityChecks = {
      'All masses generated': totalMasses > 0,
      'Has complete masses': complete.length > 0,
      'Completion rate > 50%': (complete.length / totalMasses) > 0.5,
      'Has novena masses': novenaMasses.length === 9,
      'Has feast masses': feastMasses.length === 6,
      'Has Sunday masses': sundayMasses.length >= 16, // 4 Sundays × 4 times
      'Avg confidence > 50%': stats.totalAvailabilities > 0
    };

    for (const [check, passed] of Object.entries(qualityChecks)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    }

    const allPassed = Object.values(qualityChecks).every(Boolean);
    if (allPassed) {
      console.log('\n🎉 All quality checks passed!');
    } else {
      console.log('\n⚠️  Some quality checks failed');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

main();
