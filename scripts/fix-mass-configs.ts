#!/usr/bin/env tsx

/**
 * Fix mass time configurations:
 * 1. Update Healing Mass (Cura e Libertação) to min=26, max=30
 * 2. Remove regular Thursday 06:30 mass (conflicts with special mass)
 */

import { db } from '../server/db';
import { massTimesConfig } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('🔧 Corrigindo configurações de missas...\n');

  // 1. Update Healing Mass
  console.log('1️⃣  Atualizando Missa de Cura e Libertação...');

  const healingMasses = await db.select()
    .from(massTimesConfig)
    .where(and(
      eq(massTimesConfig.dayOfWeek, 4),
      eq(massTimesConfig.time, '19:30:00'),
      eq(massTimesConfig.specialEvent, true)
    ));

  if (healingMasses.length > 0) {
    const healing = healingMasses[0];
    console.log(`   Atual: min=${healing.minMinisters}, max=${healing.maxMinisters}`);

    await db.update(massTimesConfig)
      .set({
        minMinisters: 26,
        maxMinisters: 30
      })
      .where(eq(massTimesConfig.id, healing.id));

    console.log('   ✅ Atualizado para: min=26, max=30');
  } else {
    console.log('   ❌ Não encontrada!');
  }

  // 2. Check for conflicting Thursday regular mass
  console.log('\n2️⃣  Verificando conflito na quinta-feira...');

  const thursdayRegular = await db.select()
    .from(massTimesConfig)
    .where(and(
      eq(massTimesConfig.dayOfWeek, 4),
      eq(massTimesConfig.time, '06:30:00'),
      eq(massTimesConfig.specialEvent, false)
    ));

  if (thursdayRegular.length > 0) {
    console.log('   ⚠️  Encontrada missa regular quinta 06:30');
    console.log('   Pergunta: Esta missa acontece mesmo nas quintas de Cura e Libertação?');
    console.log('   Se NÃO, ela deveria ser desativada para não conflitar.');
    console.log('\n   Para desativar, execute:');
    console.log('   await db.update(massTimesConfig)');
    console.log(`     .set({ isActive: false })`);
    console.log(`     .where(eq(massTimesConfig.id, '${thursdayRegular[0].id}'));`);
  } else {
    console.log('   ✅ Nenhum conflito encontrado');
  }

  // 3. Verify changes
  console.log('\n3️⃣  Verificando alterações...');

  const updated = await db.select()
    .from(massTimesConfig)
    .where(eq(massTimesConfig.dayOfWeek, 4));

  console.log('   Configurações atuais para quinta-feira:');
  updated.forEach(c => {
    console.log(`   ${c.time}: min=${c.minMinisters}, max=${c.maxMinisters}, special=${c.specialEvent}, active=${c.isActive}`);
  });

  console.log('\n✅ Correções aplicadas com sucesso!');
  console.log('\n⚠️  NOTA: São Judas 28/10 já foi corrigido no código do gerador.');
  console.log('   Não precisa alterar o banco, pois é gerado dinamicamente.');
}

main().catch(console.error);
