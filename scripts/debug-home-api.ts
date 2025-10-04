import { db } from '../server/db';
import { users, schedules } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function debugHomeAPI() {
  console.log('🔍 DEBUG: Simulando o que a página HOME faz...\n');

  try {
    // 1. Buscar Marcelo
    const [marcelo] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'marcelotadeu@live.com'))
      .limit(1);

    if (!marcelo) {
      console.log('❌ Marcelo não encontrado!');
      return;
    }

    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${marcelo.id}`);
    console.log(`   Nome: ${marcelo.name}`);
    console.log(`   Email: ${marcelo.email}\n`);

    // 2. Simular a API /api/schedules/minister/current-month
    const userId = marcelo.id;
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const firstDayStr = firstDay.toISOString().split('T')[0];
    const lastDayStr = lastDay.toISOString().split('T')[0];

    console.log('📅 Parâmetros da busca:');
    console.log(`   Mês atual: ${now.getMonth() + 1}/${now.getFullYear()}`);
    console.log(`   Data inicial: ${firstDayStr}`);
    console.log(`   Data final: ${lastDayStr}`);
    console.log(`   User ID: ${userId}\n`);

    // 3. Query exata que a API usa
    console.log('🔍 Executando query da API...\n');

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

    console.log(`📊 Resultado: ${monthSchedules.length} escalas encontradas\n`);

    if (monthSchedules.length > 0) {
      console.log('✅ Escalas do mês atual:\n');
      monthSchedules.forEach(s => {
        console.log(`   📅 ${s.date} às ${s.time} - Posição ${s.position}`);
      });

      console.log('\n📤 Resposta formatada (como API retorna):\n');
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
      console.log('❌ Nenhuma escala encontrada!\n');
      console.log('🔍 Verificando todas as escalas do Marcelo (sem filtro de data):\n');

      const allSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.ministerId, userId));

      console.log(`   Total de escalas: ${allSchedules.length}\n`);

      if (allSchedules.length > 0) {
        allSchedules.forEach(s => {
          const inCurrentMonth = s.date >= firstDayStr && s.date <= lastDayStr;
          console.log(`   📅 ${s.date} às ${s.time} - Status: ${s.status} - Mês atual: ${inCurrentMonth ? 'SIM' : 'NÃO'}`);
        });
      }
    }

    // 4. Testar API de versículos
    console.log('\n\n📖 Testando API de versículos...\n');

    const randomVerse = await db
      .select({
        id: sql`versiculos.id`,
        frase: sql`versiculos.frase`,
        referencia: sql`versiculos.referencia`
      })
      .from(sql`versiculos`)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (randomVerse.length > 0) {
      console.log('✅ Versículo encontrado:');
      console.log(`   "${randomVerse[0].frase}"`);
      console.log(`   (${randomVerse[0].referencia})`);
    } else {
      console.log('❌ Nenhum versículo encontrado!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

debugHomeAPI();
