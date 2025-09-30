import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator.js';

async function testSundayGeneration() {
  console.log('🎯 Testando geração de escalas DOMINICAIS para Outubro/2025\n');

  try {
    const schedules = await generateAutomaticSchedule(2025, 10, true); // preview mode

    // Filtrar apenas missas dominicais
    const sundaySchedules = schedules.filter(s => s.massTime.type === 'missa_dominical');

    console.log(`\n📊 RESULTADOS - MISSAS DOMINICAIS:`);
    console.log(`Total de missas dominicais: ${sundaySchedules.length}`);
    console.log(`\n========================================\n`);

    sundaySchedules.forEach(schedule => {
      console.log(`📅 ${schedule.massTime.date} ${schedule.massTime.time}`);
      console.log(`   Ministros escalados: ${schedule.ministers.length}/${schedule.massTime.minMinisters}`);
      console.log(`   Confiança: ${(schedule.confidence * 100).toFixed(0)}%`);

      if (schedule.ministers.length > 0) {
        console.log(`   Ministros:`);
        schedule.ministers.slice(0, 5).forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.name}`);
        });
        if (schedule.ministers.length > 5) {
          console.log(`      ... e mais ${schedule.ministers.length - 5} ministros`);
        }
      } else {
        console.log(`   ❌ NENHUM ministro escalado!`);
      }
      console.log('');
    });

    // Resumo
    const complete = sundaySchedules.filter(s => s.ministers.length >= s.massTime.minMinisters);
    const incomplete = sundaySchedules.filter(s => s.ministers.length < s.massTime.minMinisters);

    console.log(`\n📈 RESUMO:`);
    console.log(`✅ Escalas completas: ${complete.length}/${sundaySchedules.length}`);
    console.log(`⚠️  Escalas incompletas: ${incomplete.length}/${sundaySchedules.length}`);

    if (incomplete.length > 0) {
      console.log(`\n⚠️  Escalas incompletas:`);
      incomplete.forEach(s => {
        console.log(`   - ${s.massTime.date} ${s.massTime.time}: ${s.ministers.length}/${s.massTime.minMinisters} ministros`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testSundayGeneration();
