import { db } from '../server/db.js';
import { DatabaseStorage } from '../server/storage.js';

async function testCalendarAPI() {
  const storage = new DatabaseStorage();

  console.log('🧪 TESTANDO API DO CALENDÁRIO\n');

  // Testar getSchedulesSummary
  console.log('1. Testando getSchedulesSummary para Outubro/2025...');
  const summary = await storage.getSchedulesSummary(10, 2025);
  console.log('Resultado:', JSON.stringify(summary, null, 2));

  if (summary.length > 0) {
    console.log('✅ Sucesso! Resumo da escala encontrado.');
  } else {
    console.log('❌ Nenhuma escala encontrada para Outubro/2025');
  }

  // Testar getSchedulesByDate
  console.log('\n2. Testando getSchedulesByDate para 2025-10-05...');
  const dateSchedules = await storage.getSchedulesByDate('2025-10-05');
  console.log(`Encontradas ${dateSchedules.length} atribuições`);

  if (dateSchedules.length > 0) {
    console.log('\nPrimeiras 5 atribuições:');
    dateSchedules.slice(0, 5).forEach((s, i) => {
      console.log(`${i + 1}. ${s.time} - ${s.ministerName} (posição ${s.position})`);
    });
    console.log('✅ Sucesso!');
  } else {
    console.log('⚠️ Nenhuma atribuição encontrada para essa data');
  }
}

testCalendarAPI().catch(console.error);
