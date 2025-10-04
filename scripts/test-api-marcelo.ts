import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function testAPIForMarcelo() {
  try {
    console.log('🔍 Simulando API /api/schedules/minister/upcoming para Marcelo...\n');

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
    console.log(`✅ Usuário: ${marcelo.name}`);
    console.log(`   ID: ${marcelo.id}\n`);

    // Simular a query da API
    const ministerId = marcelo.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`📅 Hoje: ${todayStr}\n`);

    const upcomingAssignments = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        notes: schedules.notes,
        position: schedules.position,
        ministerId: schedules.ministerId,
        status: schedules.status
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, ministerId),
          sql`${schedules.date} >= ${todayStr}::date`,
          eq(schedules.status, "scheduled")
        )
      )
      .orderBy(schedules.date)
      .limit(10);

    console.log(`📊 Query resultado: ${upcomingAssignments.length} escalas\n`);

    if (upcomingAssignments.length === 0) {
      console.log('❌ Nenhuma escala encontrada!\n');

      // Debug: buscar SEM filtros
      console.log('🔍 Buscando TODAS as escalas do Marcelo (sem filtro de data/status):\n');

      const allSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.ministerId, ministerId));

      console.log(`   Total: ${allSchedules.length} escalas\n`);

      allSchedules.forEach(s => {
        console.log(`   📅 ${s.date} | ⏰ ${s.time} | Status: ${s.status} | Posição: ${s.position}`);
      });

    } else {
      console.log('✅ Escalas encontradas:\n');

      upcomingAssignments.forEach(a => {
        console.log(`   📅 Data: ${a.date}`);
        console.log(`      ⏰ Horário: ${a.time}`);
        console.log(`      🎯 Posição: ${a.position}`);
        console.log(`      📍 Status: ${a.status}`);
        console.log('');
      });

      // Formatar como a API faz
      const formattedAssignments = upcomingAssignments.map(assignment => ({
        id: assignment.id,
        date: assignment.date,
        massTime: assignment.time,
        position: assignment.position || 0,
        confirmed: true,
        scheduleId: assignment.id,
        scheduleTitle: assignment.type,
        scheduleStatus: "scheduled",
        location: assignment.location
      }));

      console.log('\n📤 Resposta formatada da API:\n');
      console.log(JSON.stringify({ assignments: formattedAssignments }, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

testAPIForMarcelo();
