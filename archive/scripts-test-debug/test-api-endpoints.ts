#!/usr/bin/env tsx
import { db } from '../server/db';
import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function testEndpoints() {
  console.log('🔍 TESTANDO ENDPOINTS DE GERAÇÃO DE ESCALA');
  console.log('='.repeat(60));

  const year = 2025;
  const month = 10;

  console.log(`\n📅 Testando para ${month}/${year}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV}\n`);

  try {
    // Teste 1: Preview (aceita questionários abertos)
    console.log('1️⃣ Testando modo PREVIEW (aceita questionários abertos)...');
    const previewSchedules = await generateAutomaticSchedule(year, month, true);
    console.log(`   ✅ Preview gerou ${previewSchedules.length} escalas`);

    // Contar escalas com ministros
    const withMinisters = previewSchedules.filter(s => s.ministers.length > 0);
    console.log(`   📊 ${withMinisters.length} escalas com ministros alocados`);

    // Teste 2: Definitivo (requer questionário fechado)
    console.log('\n2️⃣ Testando modo DEFINITIVO (requer questionário fechado)...');
    try {
      const definitiveSchedules = await generateAutomaticSchedule(year, month, false);
      console.log(`   ✅ Definitivo gerou ${definitiveSchedules.length} escalas`);

      const withMinistersDefinitive = definitiveSchedules.filter(s => s.ministers.length > 0);
      console.log(`   📊 ${withMinistersDefinitive.length} escalas com ministros alocados`);
    } catch (error: any) {
      console.log(`   ⚠️  Erro esperado se questionário não estiver fechado:`);
      console.log(`       ${error.message}`);
    }

    // Análise dos dados
    console.log('\n📈 ANÁLISE DOS RESULTADOS');
    console.log('='.repeat(60));

    // Tipos de missa
    const massTypes = new Map<string, number>();
    for (const schedule of previewSchedules) {
      const type = schedule.massTime.type || 'outros';
      massTypes.set(type, (massTypes.get(type) || 0) + 1);
    }

    console.log('\nTipos de Missa:');
    for (const [type, count] of massTypes) {
      console.log(`   ${type}: ${count} missas`);
    }

    // Cobertura
    const fullyCovered = previewSchedules.filter(s =>
      s.ministers.length >= s.massTime.minMinisters
    ).length;

    const partiallyCovered = previewSchedules.filter(s =>
      s.ministers.length > 0 && s.ministers.length < s.massTime.minMinisters
    ).length;

    const uncovered = previewSchedules.filter(s =>
      s.ministers.length === 0
    ).length;

    console.log('\nCobertura:');
    console.log(`   ✅ Completas: ${fullyCovered}`);
    console.log(`   ⚠️  Parciais: ${partiallyCovered}`);
    console.log(`   ❌ Sem ministros: ${uncovered}`);

    // Dia 28 - São Judas
    const day28Masses = previewSchedules.filter(s =>
      s.massTime.date?.includes('-28')
    );

    console.log('\n🙏 Dia 28 (São Judas):');
    console.log(`   Total de missas: ${day28Masses.length}`);
    for (const mass of day28Masses) {
      console.log(`   - ${mass.massTime.time}: ${mass.massTime.type} (${mass.ministers.length}/${mass.massTime.minMinisters} ministros)`);
    }

    console.log('\n✅ Testes concluídos!');

  } catch (error) {
    console.error('\n❌ Erro nos testes:', error);
  }

  process.exit(0);
}

testEndpoints().catch(console.error);