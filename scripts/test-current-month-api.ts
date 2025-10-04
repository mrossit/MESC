import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function testCurrentMonthAPI() {
  try {
    console.log('🧪 TESTANDO API /api/schedules/minister/current-month\n');

    // Buscar Marcelo
    const marceloResult = await db
      .select()
      .from(users)
      .where(eq(users.email, 'marcelotadeu@live.com'))
      .limit(1);

    if (marceloResult.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const marcelo = marceloResult[0];
    const userId = marcelo.id;

    console.log(`✅ Usuário: ${marcelo.name}`);
    console.log(`   ID: ${userId}\n`);

    // Simular a lógica da API
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const firstDayStr = firstDay.toISOString().split('T')[0];
    const lastDayStr = lastDay.toISOString().split('T')[0];

    console.log(`📅 Mês atual: ${now.getMonth() + 1}/${now.getFullYear()}`);
    console.log(`   Primeiro dia: ${firstDayStr}`);
    console.log(`   Último dia: ${lastDayStr}\n`);

    console.log(`🔍 Query: SELECT * FROM schedules WHERE`);
    console.log(`   ministerId = '${userId}'`);
    console.log(`   AND date >= '${firstDayStr}'`);
    console.log(`   AND date <= '${lastDayStr}'`);
    console.log(`   AND status = 'scheduled'\n`);

    // Executar query exatamente como a API faz
    const monthSchedules = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        position: schedules.position,
        status: schedules.status
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, userId),
          sql`${schedules.date} >= ${firstDayStr}::date`,
          sql`${schedules.date} <= ${lastDayStr}::date`,
          eq(schedules.status, "scheduled")
        )
      )
      .orderBy(schedules.date, schedules.time);

    console.log(`✅ Resultado: ${monthSchedules.length} escalas encontradas\n`);

    if (monthSchedules.length === 0) {
      console.log('❌ PROBLEMA: Nenhuma escala retornada!\n');

      // Debug: buscar sem filtro de data
      console.log('🔍 DEBUG: Buscando SEM filtro de data...\n');

      const allSchedules = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.ministerId, userId),
            eq(schedules.status, "scheduled")
          )
        );

      console.log(`   Total: ${allSchedules.length} escalas no banco\n`);

      allSchedules.forEach(s => {
        const dateObj = new Date(s.date);
        console.log(`   📅 ${s.date} (mês: ${dateObj.getMonth() + 1}, ano: ${dateObj.getFullYear()})`);
        console.log(`      Comparação: ${s.date} >= ${firstDayStr} ? ${s.date >= firstDayStr}`);
        console.log(`      Comparação: ${s.date} <= ${lastDayStr} ? ${s.date <= lastDayStr}\n`);
      });
    } else {
      console.log('📋 Escalas encontradas:\n');

      monthSchedules.forEach(s => {
        console.log(`   ✅ ${s.date} às ${s.time} - Posição ${s.position}`);
      });

      console.log('\n📤 Resposta formatada (como API retornaria):\n');

      const formattedAssignments = monthSchedules.map(s => ({
        id: s.id,
        date: s.date,
        massTime: s.time,
        position: s.position || 0,
        confirmed: true,
        scheduleId: s.id,
        scheduleTitle: s.type,
        scheduleStatus: s.status,
        location: s.location
      }));

      console.log(JSON.stringify({ assignments: formattedAssignments }, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

testCurrentMonthAPI();
