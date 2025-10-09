import { db } from '../server/db';
import { schedules, users, substitutionRequests } from '../shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

async function testPendencies() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular início e fim do mês corrente
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formatar datas para string YYYY-MM-DD
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    console.log(`\n🔍 Buscando missas entre ${startDateStr} e ${endDateStr}\n`);

    // Buscar todas as missas do mês
    const monthSchedules = await db
      .select({
        date: schedules.date,
        time: schedules.time,
        location: schedules.location,
        ministerId: schedules.ministerId,
        ministerName: users.name,
        position: schedules.position,
        status: schedules.status,
        id: schedules.id
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          gte(schedules.date, startDateStr),
          lte(schedules.date, endDateStr),
          eq(schedules.status, "scheduled")
        )
      )
      .orderBy(schedules.date, schedules.time);

    console.log(`📅 Total de escalações encontradas: ${monthSchedules.length}\n`);

    if (monthSchedules.length > 0) {
      console.log('Primeiras 5 escalações:');
      monthSchedules.slice(0, 5).forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.date} às ${s.time} - ${s.ministerName || 'Sem ministro'} (${s.location || 'Matriz'})`);
      });
    }

    // Agrupar por data e horário
    const massesByDateTime = new Map<string, typeof monthSchedules>();
    monthSchedules.forEach(schedule => {
      const key = `${schedule.date}-${schedule.time}`;
      if (!massesByDateTime.has(key)) {
        massesByDateTime.set(key, []);
      }
      massesByDateTime.get(key)!.push(schedule);
    });

    console.log(`\n🕐 Missas únicas (data + horário): ${massesByDateTime.size}\n`);

    // Definir mínimos
    const MINIMUM_MINISTERS: Record<string, number> = {
      "08:00:00": 15,
      "10:00:00": 20,
      "19:00:00": 20,
      "19:30:00": 15,
    };

    let pendenciesCount = 0;

    for (const [dateTimeKey, scheduleGroup] of massesByDateTime.entries()) {
      const firstSchedule = scheduleGroup[0];
      const massTime = firstSchedule.time;
      const minimumRequired = MINIMUM_MINISTERS[massTime] || 15;
      const currentConfirmed = scheduleGroup.filter(s => s.ministerId).length;
      const ministersShort = Math.max(0, minimumRequired - currentConfirmed);

      if (ministersShort > 0) {
        pendenciesCount++;
        console.log(`⚠️  ${dateTimeKey} - ${firstSchedule.location || 'Matriz'}`);
        console.log(`    Confirmados: ${currentConfirmed}/${minimumRequired} (faltam ${ministersShort})`);
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Total de pendências: ${pendenciesCount}`);
    console.log(`   Missas completas: ${massesByDateTime.size - pendenciesCount}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
  process.exit(0);
}

testPendencies();
