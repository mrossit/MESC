import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function testSimple() {
  console.log('🧪 Teste simples de geração...\n');

  try {
    // Testar geração para outubro 2025
    console.log('📝 Gerando escalas para Outubro 2025...');
    const schedules = await generateAutomaticSchedule(2025, 10, false);

    console.log(`\n✅ Geradas ${schedules.length} escalas`);

    // Analisar resultados
    let totalMinisters = 0;
    let emptySchedules = 0;

    schedules.forEach(s => {
      totalMinisters += s.ministers.length;
      if (s.ministers.length === 0) {
        emptySchedules++;
      }
    });

    console.log(`\n📊 Análise:`);
    console.log(`   Total de ministros escalados: ${totalMinisters}`);
    console.log(`   Escalas sem ministros: ${emptySchedules}`);
    console.log(`   Média de ministros por escala: ${(totalMinisters / schedules.length).toFixed(1)}`);

    // Mostrar primeiras escalas dominicais
    console.log('\n📅 Escalas dominicais:');
    const sundaySchedules = schedules.filter(s => s.massTime.dayOfWeek === 0);
    sundaySchedules.slice(0, 3).forEach(s => {
      console.log(`   ${s.massTime.date} ${s.massTime.time}: ${s.ministers.length} ministros`);
      s.ministers.forEach(m => {
        console.log(`     - ${m.name} (posição ${m.position})`);
      });
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testSimple().catch(console.error);