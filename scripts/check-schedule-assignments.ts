import { db } from "../server/db";
import { scheduleAssignments, ministers } from "../server/db/schema";
import { eq } from "drizzle-orm";

async function checkScheduleAssignments() {
  console.log("🔍 Verificando assignments de escalas...\n");

  // Buscar todos os assignments com detalhes
  const assignments = await db
    .select({
      id: scheduleAssignments.id,
      scheduleId: scheduleAssignments.scheduleId,
      date: scheduleAssignments.date,
      massTime: scheduleAssignments.massTime,
      position: scheduleAssignments.position,
      ministerId: scheduleAssignments.ministerId,
      ministerName: ministers.name,
      confirmed: scheduleAssignments.confirmed,
    })
    .from(scheduleAssignments)
    .leftJoin(ministers, eq(scheduleAssignments.ministerId, ministers.id))
    .orderBy(scheduleAssignments.date, scheduleAssignments.massTime, scheduleAssignments.position);

  console.log(`📊 Total de assignments: ${assignments.length}\n`);

  // Agrupar por data
  const byDate: Record<string, any[]> = {};

  for (const row of assignments) {
    const dateKey = new Date(row.date).toISOString().split('T')[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(row);
  }

  // Mostrar dados por data
  for (const [date, dateAssignments] of Object.entries(byDate)) {
    console.log(`\n📅 Data: ${date}`);
    console.log(`   Total de assignments: ${dateAssignments.length}`);

    // Agrupar por horário
    const byTime: Record<string, any[]> = {};
    for (const assignment of dateAssignments) {
      const time = assignment.massTime || 'SEM HORÁRIO';
      if (!byTime[time]) {
        byTime[time] = [];
      }
      byTime[time].push(assignment);
    }

    // Mostrar por horário
    for (const [time, timeAssignments] of Object.entries(byTime)) {
      console.log(`\n   ⏰ Horário: ${time}`);
      console.log(`      Total: ${timeAssignments.length} ministros`);

      for (const assignment of timeAssignments) {
        const ministerInfo = assignment.ministerId
          ? `${assignment.ministerName || 'SEM NOME'} (ID: ${assignment.ministerId})`
          : '❌ MINISTER_ID NULL';

        console.log(`      - Posição ${assignment.position}: ${ministerInfo}`);
        console.log(`        Confirmado: ${assignment.confirmed ? '✅' : '❌'}`);
      }
    }
  }
}

checkScheduleAssignments()
  .then(() => {
    console.log("\n✅ Verificação concluída!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  });
