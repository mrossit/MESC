import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function checkDay5Schedules() {
  try {
    console.log('🔍 Verificando escalas do dia 5...\n');

    // Buscar todas as escalas do dia 5 de qualquer mês
    const day5Schedules = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        ministerId: schedules.ministerId,
        ministerName: users.name,
        position: schedules.position,
        status: schedules.status
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(sql`EXTRACT(DAY FROM ${schedules.date}) = 5`)
      .orderBy(schedules.date, schedules.time);

    console.log(`📊 Total de escalas no dia 5: ${day5Schedules.length}\n`);

    if (day5Schedules.length === 0) {
      console.log('❌ Nenhuma escala encontrada no dia 5');
      return;
    }

    // Agrupar por data
    const byDate = day5Schedules.reduce((acc, schedule) => {
      const dateKey = schedule.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(schedule);
      return acc;
    }, {} as Record<string, typeof day5Schedules>);

    // Exibir por data
    Object.entries(byDate).forEach(([date, schedules]) => {
      console.log(`📅 Data: ${date}`);

      // Agrupar por horário
      const byTime = schedules.reduce((acc, s) => {
        if (!acc[s.time]) {
          acc[s.time] = [];
        }
        acc[s.time].push(s);
        return acc;
      }, {} as Record<string, typeof schedules>);

      Object.entries(byTime).forEach(([time, timeSchedules]) => {
        console.log(`  ⏰ Horário: ${time} - ${timeSchedules.length} ministros`);
        timeSchedules.forEach(s => {
          console.log(`     - ${s.ministerName || 'SEM MINISTRO'} (Posição: ${s.position})`);
        });
      });
      console.log('');
    });

    // Verificar formato do horário
    console.log('\n🔍 Verificando formatos de horário únicos:');
    const uniqueTimes = [...new Set(day5Schedules.map(s => s.time))];
    uniqueTimes.forEach(time => {
      console.log(`  - "${time}" (tipo: ${typeof time}, length: ${time?.length})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkDay5Schedules();
