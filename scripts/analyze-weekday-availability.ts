/**
 * Analyze weekday minister availability and preferred times
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { questionnaireResponses, users } from '../shared/schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function analyze() {
  console.log('🔍 ANÁLISE DETALHADA DOS 14 MINISTROS DISPONÍVEIS PARA DIAS DE SEMANA\n');

  const responses = await db.select().from(questionnaireResponses);
  const allUsers = await db.select().from(users);

  const weekdayMinisters = responses.filter(r => {
    const availability = r.dailyMassAvailability;
    return availability && availability.some(a => a !== 'Não posso');
  });

  console.log('📊 Total de ministros disponíveis:', weekdayMinisters.length, '\n');

  weekdayMinisters.forEach((r, i) => {
    const user = allUsers.find(u => u.id === r.userId);
    const daysAvailable = r.dailyMassAvailability?.filter(a => a !== 'Não posso') || [];
    const preferredTimes = r.preferredMassTimes || [];
    const altTimes = r.alternativeTimes || [];

    console.log(`${i+1}. ${user?.name}`);
    console.log(`   Dias disponíveis: ${daysAvailable.join(', ')}`);
    console.log(`   Horários preferidos: ${preferredTimes.join(', ') || 'Nenhum'}`);
    console.log(`   Horários alternativos: ${altTimes.join(', ') || 'Nenhum'}`);
    console.log();
  });

  // Check which times these ministers can serve
  const timesCount: Record<string, number> = {};
  weekdayMinisters.forEach(r => {
    const allTimes = [...(r.preferredMassTimes || []), ...(r.alternativeTimes || [])];
    allTimes.forEach(time => {
      timesCount[time] = (timesCount[time] || 0) + 1;
    });
  });

  console.log('⏰ HORÁRIOS DISPONÍVEIS (pelos 14 ministros):\n');
  Object.entries(timesCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([time, count]) => {
      console.log(`  ${time}: ${count} ministros`);
    });

  console.log('\n📋 CONCLUSÃO:\n');
  if (!timesCount['06:30']) {
    console.log('❌ Nenhum dos 14 ministros disponíveis para dias de semana');
    console.log('   marcou 06:30 como horário preferido ou alternativo.');
    console.log('\n💡 SUGESTÕES:');
    console.log('   1. Remover missas de dias de semana às 06:30 da configuração');
    console.log('   2. Ou: Adicionar manualmente ministros para esses horários');
    console.log('   3. Ou: Ajustar o questionário para capturar melhor a disponibilidade');
  }

  await pool.end();
}

analyze()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
