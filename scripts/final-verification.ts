/**
 * Final verification - check Oct 29-31 have ministers assigned
 */
import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';

async function finalVerification() {
  console.log('🎯 VERIFICAÇÃO FINAL - Outubro 29-31\n');
  console.log('═══════════════════════════════════════════════\n');

  const schedules = await generateAutomaticSchedule(2025, 10, true);

  const targetDates = ['2025-10-29', '2025-10-30', '2025-10-31'];

  for (const date of targetDates) {
    const mass = schedules.find(s => s.massTime.date === date);

    if (!mass) {
      console.log(`❌ ${date}: MISSA NÃO GERADA`);
      continue;
    }

    const nonVacante = mass.ministers.filter(m => m.id !== null);
    const ministerNames = nonVacante.map(m => m.name).join(', ');

    console.log(`✅ ${date} (${mass.massTime.time})`);
    console.log(`   Tipo: ${mass.massTime.type}`);
    console.log(`   Ministros: ${nonVacante.length}/${mass.massTime.minMinisters}`);
    console.log(`   Nomes: ${ministerNames || 'NENHUM'}`);
    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('RESUMO:');
  console.log('═══════════════════════════════════════════════\n');

  const oct29to31Masses = schedules.filter(s => targetDates.includes(s.massTime.date!));
  const totalMinisters = oct29to31Masses.reduce((sum, m) =>
    sum + m.ministers.filter(mi => mi.id !== null).length, 0
  );

  console.log(`Total de missas (29-31/10): ${oct29to31Masses.length}`);
  console.log(`Total de ministros atribuídos: ${totalMinisters}`);

  if (totalMinisters > 0) {
    console.log('\n✅ SUCESSO! Dias 29, 30 e 31 agora têm ministros atribuídos!');
  } else {
    console.log('\n❌ ERRO! Ainda não há ministros nos dias 29-31');
  }

  console.log('\n✅ Verificação completa\n');
}

finalVerification()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
