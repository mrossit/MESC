import { db } from '../server/db.js';
import { schedules, users } from '@shared/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

async function checkOctoberSchedule() {
  console.log('📅 VERIFICANDO ESCALAS DE OUTUBRO 2025\n');

  // Buscar escalas de outubro 2025 (data entre 2025-10-01 e 2025-10-31)
  const octoberSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.date, '2025-10-01'),
        lte(schedules.date, '2025-10-31')
      )
    )
    .limit(10);

  console.log(`Total de atribuições encontradas: ${octoberSchedules.length}\n`);

  if (octoberSchedules.length === 0) {
    console.log('❌ NENHUMA escala encontrada para Outubro/2025!');
    console.log('A escala precisa ser criada/salva primeiro.\n');
    return;
  }

  console.log('✅ ESCALAS ENCONTRADAS!\n');
  console.log('Primeiras 10 atribuições:');

  for (const [i, schedule] of octoberSchedules.entries()) {
    console.log(`\n${i + 1}. Data: ${schedule.date} ${schedule.time}`);
    console.log(`   Tipo: ${schedule.type}`);
    console.log(`   Ministro ID: ${schedule.ministerId || 'VAZIO'}`);
    console.log(`   Posição: ${schedule.position}`);
    console.log(`   Status: ${schedule.status}`);

    if (schedule.ministerId) {
      const [minister] = await db.select().from(users).where(eq(users.id, schedule.ministerId)).limit(1);
      if (minister) {
        console.log(`   Nome: ${minister.name}`);
      }
    }
  }

  // Contar total por status
  const statusCount = await db
    .select({
      status: schedules.status,
      count: sql<number>`count(*)::int`
    })
    .from(schedules)
    .where(
      and(
        gte(schedules.date, '2025-10-01'),
        lte(schedules.date, '2025-10-31')
      )
    )
    .groupBy(schedules.status);

  console.log('\n\n📊 RESUMO POR STATUS:');
  statusCount.forEach(s => {
    console.log(`   ${s.status}: ${s.count} atribuições`);
  });
}

checkOctoberSchedule().catch(console.error);
