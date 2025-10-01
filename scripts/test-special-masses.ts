import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator.js';

async function testSpecialMasses() {
  console.log('🎯 Testando geração de MISSAS ESPECIAIS para Outubro/2025\n');

  try {
    const schedules = await generateAutomaticSchedule(2025, 10, true);

    // Filtrar Novena de São Judas
    const novenaSchedules = schedules.filter(s => s.massTime.type === 'missa_sao_judas');

    // Filtrar Cura e Libertação
    const curaSchedules = schedules.filter(s => s.massTime.type === 'missa_cura_libertacao');

    console.log(`\n📊 NOVENA DE SÃO JUDAS:`);
    console.log(`Total de missas: ${novenaSchedules.length}`);
    console.log(`\n========================================\n`);

    novenaSchedules.forEach(schedule => {
      console.log(`📅 ${schedule.massTime.date} ${schedule.massTime.time}`);
      console.log(`   Ministros escalados: ${schedule.ministers.length}/${schedule.massTime.minMinisters}`);

      if (schedule.ministers.length > 0) {
        console.log(`   Ministros:`);
        schedule.ministers.slice(0, 10).forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.name}`);
        });
        if (schedule.ministers.length > 10) {
          console.log(`      ... e mais ${schedule.ministers.length - 10} ministros`);
        }
      } else {
        console.log(`   ❌ NENHUM ministro escalado!`);
      }
      console.log('');
    });

    console.log(`\n========================================`);
    console.log(`\n📊 MISSA DE CURA E LIBERTAÇÃO:`);
    console.log(`Total de missas: ${curaSchedules.length}`);
    console.log(`\n========================================\n`);

    curaSchedules.forEach(schedule => {
      console.log(`📅 ${schedule.massTime.date} ${schedule.massTime.time}`);
      console.log(`   Ministros escalados: ${schedule.ministers.length}/${schedule.massTime.minMinisters}`);

      if (schedule.ministers.length > 0) {
        console.log(`   Ministros:`);
        schedule.ministers.slice(0, 10).forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.name}`);
        });
        if (schedule.ministers.length > 10) {
          console.log(`      ... e mais ${schedule.ministers.length - 10} ministros`);
        }
      } else {
        console.log(`   ❌ NENHUM ministro escalado!`);
      }
      console.log('');
    });

    // Resumo
    const novenaComplete = novenaSchedules.filter(s => s.ministers.length >= s.massTime.minMinisters);
    const curaComplete = curaSchedules.filter(s => s.ministers.length >= s.massTime.minMinisters);

    console.log(`\n📈 RESUMO:`);
    console.log(`✅ Novena - Escalas completas: ${novenaComplete.length}/${novenaSchedules.length}`);
    console.log(`✅ Cura e Libertação - Escalas completas: ${curaComplete.length}/${curaSchedules.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testSpecialMasses();
