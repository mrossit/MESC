#!/usr/bin/env tsx

/**
 * Debug: Por que não está encontrando todos os ministros disponíveis para São Judas 28/10?
 */

import { ResponseCompiler } from '../server/services/responseCompiler';
import { AvailabilityService } from '../server/services/availabilityService';

async function main() {
  console.log('🔍 Debugando disponibilidade São Judas 28/10...\n');

  // Compilar respostas
  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);
  const service = new AvailabilityService(compiled);

  // Testar cada horário da festa
  const feastTimes = [
    { time: '07:00', expected: 15, label: '7h' },
    { time: '10:00', expected: 17, label: '10h' },
    { time: '12:00', expected: 11, label: '12h' },
    { time: '15:00', expected: 22, label: '15h' },
    { time: '17:00', expected: 13, label: '17h' },
    { time: '19:30', expected: 36, label: '19h30 (evening)' }
  ];

  console.log('='.repeat(70));
  console.log('COMPARAÇÃO: Sistema vs Contagem Manual');
  console.log('='.repeat(70));
  console.log('');

  for (const { time, expected, label } of feastTimes) {
    const available = service.getAvailableMinistersForMass('2025-10-28', time);
    const found = available.length;
    const difference = expected - found;

    console.log(`📅 ${label}:`);
    console.log(`   Sistema encontrou: ${found} ministros`);
    console.log(`   Contagem manual: ${expected} ministros`);
    console.log(`   Diferença: ${difference > 0 ? '⚠️  FALTAM ' + difference : '✅ OK'}`);

    if (difference > 0) {
      console.log(`   Status: ❌ Sistema não está encontrando todos!`);
    } else {
      console.log(`   Status: ✅ Correto`);
    }
    console.log('');
  }

  // Investigar o problema mais a fundo
  console.log('='.repeat(70));
  console.log('INVESTIGAÇÃO: Por que está faltando?');
  console.log('='.repeat(70));
  console.log('');

  // Testar um horário específico em detalhe (12h que você disse ter 11)
  console.log('🔬 Análise detalhada: 12h (deveria ter 11)');
  console.log('');

  // Verificar os dados compilados diretamente
  let count12h = 0;
  const ministers12h: string[] = [];

  for (const [userId, data] of compiled) {
    const dayData = data.availability.dates['2025-10-28'];
    if (dayData) {
      // Verificar se tem 12:00
      if (dayData.times['12:00'] === true) {
        count12h++;
        ministers12h.push(data.userName);
      }
    }
  }

  console.log(`Encontrados nos dados compilados: ${count12h} ministros`);
  console.log(`Ministros com 12:00: ${ministers12h.slice(0, 5).join(', ')}...`);
  console.log('');

  // Verificar o que o AvailabilityService está retornando
  const available12h = service.getAvailableMinistersForMass('2025-10-28', '12:00');
  console.log(`AvailabilityService retornou: ${available12h.length} ministros`);
  console.log('');

  if (count12h !== available12h.length) {
    console.log('❌ PROBLEMA IDENTIFICADO:');
    console.log('   Os dados estão compilados corretamente, mas o AvailabilityService');
    console.log('   não está retornando todos!');
    console.log('');
    console.log('   Possível causa: Bug no método isMinisterAvailable()');
    console.log('   ou na normalização de horários.');
  }

  // Testar normalização de horários
  console.log('='.repeat(70));
  console.log('TESTE: Normalização de horários');
  console.log('='.repeat(70));
  console.log('');

  // Verificar se o problema é formato de horário
  const testMinister = Array.from(compiled.values())[0];
  if (testMinister.availability.dates['2025-10-28']) {
    const times = testMinister.availability.dates['2025-10-28'].times;
    console.log('Exemplo de formato armazenado:');
    console.log(JSON.stringify(times, null, 2));
    console.log('');
    console.log('Horários procurados pelo sistema:');
    console.log('  "07:00" (com segundos removidos)');
    console.log('  "10:00"');
    console.log('  "12:00"');
    console.log('  etc.');
  }

  // Resumo
  console.log('');
  console.log('='.repeat(70));
  console.log('RESUMO DO PROBLEMA');
  console.log('='.repeat(70));
  console.log('');
  console.log('Totais esperados (sua contagem manual):');
  let totalExpected = 0;
  feastTimes.forEach(t => {
    console.log(`  ${t.label}: ${t.expected} ministros`);
    totalExpected += t.expected;
  });
  console.log(`  TOTAL: ${totalExpected} disponibilidades`);
  console.log('');

  const allFound = feastTimes.reduce((sum, t) => {
    return sum + service.getAvailableMinistersForMass('2025-10-28', t.time).length;
  }, 0);

  console.log('Totais encontrados pelo sistema:');
  feastTimes.forEach(t => {
    const found = service.getAvailableMinistersForMass('2025-10-28', t.time).length;
    console.log(`  ${t.label}: ${found} ministros`);
  });
  console.log(`  TOTAL: ${allFound} disponibilidades`);
  console.log('');
  console.log(`Diferença: ${totalExpected - allFound} disponibilidades faltando!`);
}

main().catch(console.error);
