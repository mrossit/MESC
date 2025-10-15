#!/usr/bin/env tsx

import { db } from '../server/db';
import { massTimesConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const configs = await db.select().from(massTimesConfig).where(eq(massTimesConfig.isActive, true));

  console.log('🔍 Verificando configurações específicas:\n');

  // 1. Missa de Cura e Libertação
  console.log('=== 1️⃣ Missa de Cura e Libertação ===');
  const cura = configs.find(c => c.eventName?.includes('Cura'));
  if (cura) {
    console.log(`  Dia: Quinta-feira (${cura.dayOfWeek})`);
    console.log(`  Horário: ${cura.time}`);
    console.log(`  Min: ${cura.minMinisters}, Max: ${cura.maxMinisters}`);
    console.log(`  ⚠️  PROBLEMA: Deveria ser min=26, max=30 para Cura e Libertação`);
  } else {
    console.log('  ❌ Não encontrada!');
  }

  // 2. Todas as quintas-feiras
  console.log('\n=== 2️⃣ Todas as missas de Quinta-feira ===');
  configs.filter(c => c.dayOfWeek === 4).forEach(c => {
    console.log(`  ${c.time}: min=${c.minMinisters}, max=${c.maxMinisters}, special=${c.specialEvent} (${c.eventName || 'regular'})`);
  });

  // 3. Verificar se há conflito na quinta
  const quintas = configs.filter(c => c.dayOfWeek === 4);
  console.log(`\n  Total de configurações para quinta: ${quintas.length}`);

  if (quintas.length > 1) {
    console.log('  ⚠️  ATENÇÃO: Múltiplas configurações para quinta-feira podem causar conflito!');
    console.log('  Sugestão: Manter apenas a Cura e Libertação às 19h30 com min=26');
  }

  // 4. Verificar configuração de São Judas no gerador
  console.log('\n=== 3️⃣ Configuração de São Judas (28/10) no Gerador V2 ===');
  console.log('  Código atual do gerador:');
  console.log('  ```typescript');
  console.log('  const feastTimes = ["07:00", "10:00", "12:00", "15:00", "17:00", "19:30"];');
  console.log('  for (const time of feastTimes) {');
  console.log('    masses.push({');
  console.log('      minMinisters: 4,  // ❌ ERRADO!');
  console.log('      maxMinisters: 8   // ❌ ERRADO!');
  console.log('    });');
  console.log('  }');
  console.log('  ```');
  console.log('');
  console.log('  ⚠️  PROBLEMA: São Judas dia 28/10 precisa de:');
  console.log('     - Mínimo: 26 ministros por missa');
  console.log('     - Máximo: 30 ministros por missa');

  // 5. Resumo dos problemas
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO DOS PROBLEMAS ENCONTRADOS:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1️⃣  Missa de Cura e Libertação (Quinta 19h30):');
  console.log('   Atual: min=24, max=26');
  console.log('   Correto: min=26, max=30');
  console.log('');
  console.log('2️⃣  São Judas Festa (28/10 - todas as missas):');
  console.log('   Atual: min=4, max=8 (no código do gerador)');
  console.log('   Correto: min=26, max=30');
  console.log('');
  console.log('3️⃣  Possível conflito de configuração na quinta-feira');
  console.log('   Solução: Remover missa regular 06:30 da quinta, manter só Cura 19h30');
  console.log('');
}

main();
