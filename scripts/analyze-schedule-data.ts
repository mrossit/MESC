import { db } from '../server/db.js';
import { schedules, users } from '../shared/schema.js';
import { eq, sql, and, desc } from 'drizzle-orm';

async function analyzeScheduleData() {
  console.log('🔍 Analisando dados da tabela schedules...\n');

  try {
    // 1. Contagem total de registros
    const [totalCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schedules);
    console.log(`📊 Total de registros: ${totalCount.count}`);

    // 2. Distribuição por status
    const statusDistribution = await db.select({
      status: schedules.status,
      count: sql<number>`count(*)`
    })
      .from(schedules)
      .groupBy(schedules.status);

    console.log('\n📋 Distribuição por status:');
    statusDistribution.forEach(s => {
      console.log(`   ${s.status}: ${s.count}`);
    });

    // 3. Verificar registros com ministerId null (VACANTE)
    const [vacanteCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schedules)
      .where(sql`${schedules.ministerId} IS NULL`);
    console.log(`\n👤 Posições VACANTE (ministerId null): ${vacanteCount.count}`);

    // 4. Verificar distribuição de positions por data/hora
    console.log('\n📍 Analisando distribuição de positions...');
    const positionStats = await db.select({
      date: schedules.date,
      time: schedules.time,
      maxPosition: sql<number>`max(${schedules.position})`,
      count: sql<number>`count(*)`
    })
      .from(schedules)
      .groupBy(schedules.date, schedules.time)
      .orderBy(desc(sql<number>`max(${schedules.position})`))
      .limit(10);

    console.log('   Top 10 missas com mais ministros:');
    for (const stat of positionStats) {
      console.log(`   ${stat.date} ${stat.time} - ${stat.count} ministros (max position: ${stat.maxPosition})`);
    }

    // 5. Verificar datas com dados
    const dateRange = await db.select({
      minDate: sql<string>`min(${schedules.date})`,
      maxDate: sql<string>`max(${schedules.date})`
    })
      .from(schedules);

    console.log(`\n📅 Período com dados: ${dateRange[0].minDate} até ${dateRange[0].maxDate}`);

    // 6. Verificar duplicatas (mesma data/hora/position)
    const duplicates = await db.select({
      date: schedules.date,
      time: schedules.time,
      position: schedules.position,
      count: sql<number>`count(*)`
    })
      .from(schedules)
      .groupBy(schedules.date, schedules.time, schedules.position)
      .having(sql`count(*) > 1`);

    if (duplicates.length > 0) {
      console.log(`\n⚠️  ATENÇÃO: Encontradas ${duplicates.length} duplicatas (mesma data/hora/position):`);
      duplicates.slice(0, 5).forEach(dup => {
        console.log(`   ${dup.date} ${dup.time} position ${dup.position} - ${dup.count} registros`);
      });
    } else {
      console.log('\n✅ Nenhuma duplicata encontrada (OK)');
    }

    // 7. Verificar tipos de missa
    const typeDistribution = await db.select({
      type: schedules.type,
      count: sql<number>`count(*)`
    })
      .from(schedules)
      .groupBy(schedules.type);

    console.log('\n⛪ Distribuição por tipo de missa:');
    typeDistribution.forEach(t => {
      console.log(`   ${t.type}: ${t.count}`);
    });

    // 8. Verificar um exemplo de missa com muitos ministros
    console.log('\n🔎 Exemplo de missa com muitos ministros escalados:');
    const example = await db.select({
      date: schedules.date,
      time: schedules.time,
      position: schedules.position,
      ministerId: schedules.ministerId,
      ministerName: users.name,
      notes: schedules.notes
    })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(and(
        eq(schedules.date, '2025-10-02'),
        eq(schedules.time, '19:30:00')
      ))
      .orderBy(schedules.position)
      .limit(30);

    console.log(`   Data: 2025-10-02 19:30:00 - ${example.length} ministros`);
    example.forEach(m => {
      const name = m.ministerName || 'VACANTE';
      console.log(`   Position ${m.position}: ${name} - ${m.notes}`);
    });

    console.log('\n✅ Análise concluída!');

  } catch (error) {
    console.error('❌ Erro ao analisar dados:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

analyzeScheduleData();
