import { db } from '../server/db';
import { users, schedules } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function checkMarceloData() {
  console.log('🔍 Verificando dados do Marcelo...\n');
  console.log('Environment:', process.env.NODE_ENV);

  try {
    // Buscar Marcelo
    const [marcelo] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'marcelotadeu@live.com'))
      .limit(1);

    if (!marcelo) {
      console.log('❌ Marcelo não encontrado!');
      process.exit(1);
    }

    console.log('\n✅ Usuário encontrado:');
    console.log('  ID:', marcelo.id);
    console.log('  Nome:', marcelo.name);
    console.log('  Email:', marcelo.email);
    console.log('  Role:', marcelo.role);
    console.log('  Status:', marcelo.status);

    // Buscar escalas do mês atual (outubro 2025)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const firstDayStr = firstDay.toISOString().split('T')[0];
    const lastDayStr = lastDay.toISOString().split('T')[0];

    console.log('\n📅 Buscando escalas do mês atual:');
    console.log('  Primeiro dia:', firstDayStr);
    console.log('  Último dia:', lastDayStr);

    const monthSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, marcelo.id),
          sql`${schedules.date} >= ${firstDayStr}::date`,
          sql`${schedules.date} <= ${lastDayStr}::date`,
          eq(schedules.status, "scheduled")
        )
      )
      .orderBy(schedules.date, schedules.time);

    console.log(`\n✅ Total de escalas encontradas: ${monthSchedules.length}\n`);

    if (monthSchedules.length > 0) {
      console.log('📋 Escalas:');
      monthSchedules.forEach(s => {
        console.log(`  ✅ ${s.date} às ${s.time} - Posição ${s.position} - Status: ${s.status}`);
      });

      console.log('\n📤 Formato da API:');
      const formatted = monthSchedules.map(s => ({
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
      console.log(JSON.stringify({ assignments: formatted }, null, 2));
    } else {
      console.log('❌ Nenhuma escala encontrada!');

      // Debug: verificar todas as escalas do Marcelo
      console.log('\n🔍 DEBUG: Todas as escalas do Marcelo (sem filtro de data):');
      const allSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.ministerId, marcelo.id));

      console.log(`  Total: ${allSchedules.length}`);
      allSchedules.forEach(s => {
        console.log(`  📅 ${s.date} às ${s.time} - Status: ${s.status}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMarceloData();