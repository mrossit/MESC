#!/usr/bin/env tsx

/**
 * Teste personalizado para qualquer mês
 */

import { ResponseCompiler } from '../server/services/responseCompiler';
import { AvailabilityService } from '../server/services/availabilityService';

// ⚙️ CONFIGURAR AQUI
const MONTH = 10;  // Mês desejado (1-12)
const YEAR = 2025; // Ano desejado

async function main() {
  console.log(`\n🧪 Testando ${MONTH}/${YEAR}...\n`);

  // 1. Compilar respostas
  console.log('📚 Compilando respostas...');
  const compiled = await ResponseCompiler.compileMonthlyResponses(MONTH, YEAR);

  if (compiled.size === 0) {
    console.error(`❌ Nenhuma resposta encontrada para ${MONTH}/${YEAR}`);
    return;
  }

  console.log(`✅ Compiladas ${compiled.size} respostas\n`);

  // 2. Criar serviço de disponibilidade
  const availService = new AvailabilityService(compiled);

  // 3. Testar algumas datas
  const testDates = [
    { date: `${YEAR}-${MONTH.toString().padStart(2, '0')}-05`, time: '10:00', desc: 'Primeiro domingo' },
    { date: `${YEAR}-${MONTH.toString().padStart(2, '0')}-12`, time: '10:00', desc: 'Segundo domingo' },
    { date: `${YEAR}-${MONTH.toString().padStart(2, '0')}-19`, time: '19:30', desc: 'Terceiro domingo à noite' },
  ];

  console.log('🔍 Testando disponibilidade:\n');

  for (const test of testDates) {
    const stats = availService.getAvailabilityStats(test.date, test.time);
    console.log(`${test.desc} (${test.date} ${test.time})`);
    console.log(`  Disponíveis: ${stats.available}/${stats.total} (${stats.percentage}%)`);

    if (stats.available > 0 && stats.available <= 5) {
      console.log(`  Ministros: ${stats.ministers.map(m => m.name).join(', ')}`);
    }
    console.log('');
  }

  // 4. Estatísticas gerais
  console.log('📊 Estatísticas gerais:\n');
  const monthlyStats = availService.getMonthlyStats();

  console.log(`Total de ministros: ${monthlyStats.totalMinisters}`);
  console.log(`Total de disponibilidades: ${monthlyStats.totalAvailabilities}`);
  console.log(`Média por ministro: ${monthlyStats.avgAvailabilitiesPerMinister}`);
  console.log(`Podem substituir: ${monthlyStats.ministersCanSubstitute} (${monthlyStats.percentageCanSubstitute}%)`);

  console.log('\n✅ Teste concluído!\n');
}

main().catch(console.error);
