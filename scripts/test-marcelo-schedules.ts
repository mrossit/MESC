import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { eq, and, sql, ilike } from "drizzle-orm";

async function testMarceloSchedules() {
  try {
    console.log('🔍 Buscando usuário "marcelo tadeu sanches"...\n');

    // Buscar usuário
    const marceloUsers = await db
      .select()
      .from(users)
      .where(ilike(users.name, '%marcelo tadeu sanches%'))
      .limit(5);

    if (marceloUsers.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log(`✅ Encontrado(s) ${marceloUsers.length} usuário(s):\n`);
    marceloUsers.forEach(u => {
      console.log(`   - Nome: ${u.name}`);
      console.log(`     ID: ${u.id}`);
      console.log(`     Email: ${u.email}`);
      console.log(`     Role: ${u.role}\n`);
    });

    // Usar o primeiro
    const marcelo = marceloUsers[0];

    console.log(`\n📅 Buscando escalas de ${marcelo.name}...\n`);

    // Buscar todas as escalas deste usuário
    const allSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.ministerId, marcelo.id))
      .orderBy(schedules.date);

    console.log(`📊 Total de escalas: ${allSchedules.length}\n`);

    if (allSchedules.length === 0) {
      console.log('❌ Nenhuma escala encontrada para este usuário');
      return;
    }

    allSchedules.forEach(s => {
      console.log(`   📅 Data: ${s.date}`);
      console.log(`      ⏰ Horário: ${s.time}`);
      console.log(`      🎯 Posição: ${s.position}`);
      console.log(`      📍 Status: ${s.status}`);
      console.log(`      📌 Local: ${s.location || 'N/A'}\n`);
    });

    // Testar filtro de hoje em diante
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`\n🔍 Filtrando escalas >= ${todayStr}...\n`);

    const upcomingSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, marcelo.id),
          sql`${schedules.date} >= ${todayStr}::date`,
          eq(schedules.status, "scheduled")
        )
      )
      .orderBy(schedules.date);

    console.log(`📊 Escalas futuras: ${upcomingSchedules.length}\n`);

    if (upcomingSchedules.length === 0) {
      console.log('❌ Nenhuma escala futura encontrada');
      console.log(`   Verificar: data >= ${todayStr} AND status = "scheduled"`);
    } else {
      upcomingSchedules.forEach(s => {
        console.log(`   ✅ ${s.date} às ${s.time} - Posição ${s.position}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

testMarceloSchedules();
