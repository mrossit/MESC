import { db } from '../server/db';
import { massTimesConfig } from '@shared/schema';

async function setupMassTimes() {
  console.log('🔧 Configurando horários de missa para produção...\n');
  console.log('Environment:', process.env.NODE_ENV);

  try {
    // Verificar se já existem horários
    const existing = await db.select().from(massTimesConfig);

    if (existing.length > 0) {
      console.log(`⚠️ Já existem ${existing.length} horários configurados.`);
      console.log('Deseja substituir? Use o parâmetro --force');

      if (process.argv.includes('--force')) {
        await db.delete(massTimesConfig);
        console.log('🗑️ Horários anteriores removidos.');
      } else {
        process.exit(0);
      }
    }

    // Inserir horários padrão
    const defaultMassTimes = [
      // Domingos
      { dayOfWeek: 0, time: '07:00:00', minMinisters: 3, maxMinisters: 6, isActive: true },
      { dayOfWeek: 0, time: '09:00:00', minMinisters: 3, maxMinisters: 6, isActive: true },
      { dayOfWeek: 0, time: '11:00:00', minMinisters: 3, maxMinisters: 6, isActive: true },
      { dayOfWeek: 0, time: '19:00:00', minMinisters: 3, maxMinisters: 6, isActive: true },

      // Quarta-feira
      { dayOfWeek: 3, time: '19:30:00', minMinisters: 2, maxMinisters: 4, isActive: true },

      // Sábado
      { dayOfWeek: 6, time: '19:00:00', minMinisters: 3, maxMinisters: 6, isActive: true }
    ];

    const inserted = await db.insert(massTimesConfig).values(defaultMassTimes).returning();

    console.log(`✅ ${inserted.length} horários de missa configurados com sucesso!\n`);

    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    console.log('📋 Horários configurados:');
    inserted.forEach(mt => {
      console.log(`   ${days[mt.dayOfWeek]} às ${mt.time} - Min: ${mt.minMinisters}, Max: ${mt.maxMinisters}`);
    });

    console.log('\n🎉 Configuração concluída!');
    console.log('Agora você pode gerar escalas normalmente.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao configurar horários:', error);
    process.exit(1);
  }
}

setupMassTimes();