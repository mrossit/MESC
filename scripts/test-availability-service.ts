#!/usr/bin/env tsx

/**
 * Test script for ResponseCompiler and AvailabilityService
 *
 * Tests the complete flow:
 * 1. Compile responses from database
 * 2. Query availability for specific masses
 * 3. Generate statistics
 */

import { ResponseCompiler } from '../server/services/responseCompiler';
import { AvailabilityService } from '../server/services/availabilityService';

async function main() {
  console.log('🧪 Testing ResponseCompiler and AvailabilityService\n');
  console.log('='.repeat(60));

  // ===== STEP 1: COMPILE RESPONSES =====
  console.log('\n📚 STEP 1: Compiling October 2025 responses...\n');

  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);

  console.log(`\n✅ Compiled ${compiled.size} minister responses`);

  // ===== STEP 2: CREATE AVAILABILITY SERVICE =====
  console.log('\n📋 STEP 2: Creating AvailabilityService...\n');

  const availabilityService = new AvailabilityService(compiled);

  // ===== STEP 3: QUERY SPECIFIC MASSES =====
  console.log('\n🔍 STEP 3: Querying availability for specific masses...\n');

  const testMasses = [
    { date: '2025-10-05', time: '08:00', description: 'Domingo 05/10 às 8h' },
    { date: '2025-10-05', time: '10:00', description: 'Domingo 05/10 às 10h' },
    { date: '2025-10-12', time: '10:00', description: 'Domingo 12/10 às 10h' },
    { date: '2025-10-28', time: '07:00', description: 'São Judas - 7h' },
    { date: '2025-10-28', time: '10:00', description: 'São Judas - 10h' },
    { date: '2025-10-28', time: '19:30', description: 'São Judas - 19h30' },
    { date: '2025-10-20', time: '19:30', description: 'Novena - Segunda 20/10' },
    { date: '2025-10-21', time: '19:30', description: 'Novena - Terça 21/10' }
  ];

  for (const mass of testMasses) {
    const stats = availabilityService.getAvailabilityStats(mass.date, mass.time);

    console.log(`\n${mass.description}`);
    console.log(`  Disponíveis: ${stats.available}/${stats.total} (${stats.percentage}%)`);

    if (stats.ministers.length > 0 && stats.ministers.length <= 10) {
      console.log(`  Ministros: ${stats.ministers.map(m => m.name).join(', ')}`);
    }
  }

  // ===== STEP 4: MONTHLY STATISTICS =====
  console.log('\n\n📊 STEP 4: Monthly Statistics...\n');

  const monthlyStats = availabilityService.getMonthlyStats();

  console.log(`Total de Ministros: ${monthlyStats.totalMinisters}`);
  console.log(`Total de Disponibilidades: ${monthlyStats.totalAvailabilities}`);
  console.log(`Média por Ministro: ${monthlyStats.avgAvailabilitiesPerMinister}`);
  console.log(`\nMinistros com disponibilidade de dias da semana: ${monthlyStats.ministersWithWeekdayAvailability} (${monthlyStats.percentageWeekdayAvailable}%)`);
  console.log(`Ministros que podem substituir: ${monthlyStats.ministersCanSubstitute} (${monthlyStats.percentageCanSubstitute}%)`);
  console.log(`Ministros com família: ${monthlyStats.ministersWithFamily} (${monthlyStats.percentageWithFamily}%)`);

  // ===== STEP 5: SUBSTITUTION QUERIES =====
  console.log('\n\n🔄 STEP 5: Substitution availability...\n');

  const eligibleSubstitutes = availabilityService.getSubstituteEligibleMinisters();
  console.log(`Total de ministros elegíveis para substituição: ${eligibleSubstitutes.length}`);

  // Test substitutes for a specific mass
  const substitutesForSunday = availabilityService.getAvailableSubstitutes('2025-10-05', '10:00');
  console.log(`Substitutos disponíveis para Domingo 05/10 às 10h: ${substitutesForSunday.length}`);

  // ===== STEP 6: INDIVIDUAL MINISTER QUERIES =====
  console.log('\n\n👤 STEP 6: Individual minister queries...\n');

  // Get first 3 ministers
  const allMinisters = availabilityService.getAllMinisters();
  const sampleMinisters = allMinisters.slice(0, 3);

  for (const minister of sampleMinisters) {
    console.log(`\n${minister.name} (${minister.id})`);
    console.log(`  Total de disponibilidades: ${minister.totalAvailabilities}`);
    console.log(`  Pode substituir: ${minister.canSubstitute ? 'Sim' : 'Não'}`);

    // Get available dates
    const availableDates = availabilityService.getMinisterAvailableDates(minister.id);
    console.log(`  Datas disponíveis: ${availableDates.length}`);

    if (availableDates.length > 0) {
      const firstDate = availableDates[0];
      const availableTimes = availabilityService.getMinisterAvailableTimes(minister.id, firstDate);
      console.log(`  Horários disponíveis em ${firstDate}: ${availableTimes.join(', ')}`);
    }

    // Check family
    const familyMembers = availabilityService.getFamilyMembers(minister.id);
    if (familyMembers.length > 0) {
      console.log(`  Membros da família: ${familyMembers.length}`);
      const shouldServeWithFamily = availabilityService.shouldServeWithFamily(minister.id);
      console.log(`  Prefere servir com família: ${shouldServeWithFamily ? 'Sim' : 'Não'}`);
    }
  }

  // ===== STEP 7: CRITICAL MASSES ANALYSIS =====
  console.log('\n\n⚠️  STEP 7: Critical masses analysis (low availability)...\n');

  const allDates = [
    '2025-10-05', '2025-10-12', '2025-10-19', '2025-10-26',
    '2025-10-28' // São Judas
  ];

  const allTimes = ['08:00', '10:00', '19:00', '19:30'];

  const criticalMasses: Array<{ date: string; time: string; available: number; percentage: number }> = [];

  for (const date of allDates) {
    for (const time of allTimes) {
      const stats = availabilityService.getAvailabilityStats(date, time);

      // Consider critical if less than 30% available
      if (stats.percentage < 30 && stats.available > 0) {
        criticalMasses.push({
          date,
          time,
          available: stats.available,
          percentage: stats.percentage
        });
      }
    }
  }

  if (criticalMasses.length > 0) {
    console.log('Missas com baixa disponibilidade (<30%):');
    criticalMasses
      .sort((a, b) => a.percentage - b.percentage)
      .forEach(mass => {
        console.log(`  ${mass.date} ${mass.time}: ${mass.available} disponíveis (${mass.percentage}%)`);
      });
  } else {
    console.log('✅ Nenhuma missa com disponibilidade crítica encontrada!');
  }

  // ===== SUMMARY =====
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ Test completed successfully!');
  console.log('='.repeat(60));
}

// Run the test
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
