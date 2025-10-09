import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator.js';

async function testDailyMasses() {
  console.log('🎯 Testando geração de escalas DIÁRIAS para Outubro/2025\n');

  try {
    const schedules = await generateAutomaticSchedule(2025, 10, true); // preview mode

    // Filtrar apenas missas diárias (exceto dia 28 que é São Judas)
    const dailySchedules = schedules.filter(s =>
      s.massTime.type === 'missa_diaria' &&
      !s.massTime.date?.endsWith('-28')
    );

    console.log(`\n📊 RESULTADOS - MISSAS DIÁRIAS (exceto dia 28):`);
    console.log(`Total de missas diárias: ${dailySchedules.length}`);
    console.log(`\n========================================\n`);

    // Mostrar apenas primeiras 10 para não poluir
    dailySchedules.slice(0, 10).forEach(schedule => {
      console.log(`📅 ${schedule.massTime.date} ${schedule.massTime.time}`);
      console.log(`   Ministros escalados: ${schedule.ministers.length}/${schedule.massTime.minMinisters}`);

      if (schedule.ministers.length > 0) {
        console.log(`   Ministros:`);
        schedule.ministers.forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.name}`);
        });
      } else {
        console.log(`   ❌ NENHUM ministro escalado!`);
      }
      console.log('');
    });

    // Resumo
    const complete = dailySchedules.filter(s => s.ministers.length >= s.massTime.minMinisters);
    const incomplete = dailySchedules.filter(s => s.ministers.length < s.massTime.minMinisters);
    const withSome = dailySchedules.filter(s => s.ministers.length > 0 && s.ministers.length < s.massTime.minMinisters);
    const withNone = dailySchedules.filter(s => s.ministers.length === 0);

    console.log(`\n📈 RESUMO GERAL:`);
    console.log(`✅ Escalas completas: ${complete.length}/${dailySchedules.length}`);
    console.log(`⚠️  Escalas parciais: ${withSome.length}/${dailySchedules.length}`);
    console.log(`❌ Escalas vazias: ${withNone.length}/${dailySchedules.length}`);

    if (withSome.length > 0) {
      console.log(`\n⚠️  Escalas parciais (com alguns ministros):`);
      withSome.slice(0, 5).forEach(s => {
        console.log(`   - ${s.massTime.date} ${s.massTime.time}: ${s.ministers.length}/${s.massTime.minMinisters} ministros`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testDailyMasses();
