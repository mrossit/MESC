/**
 * Script para importar escala revisada de novembro 2025 do Excel
 */

import XLSX from 'xlsx';
import { db } from '../server/db.js';
import { users, schedules } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

interface ScheduleRow {
  date: string;
  day: string;
  time: string;
  ministers: string[];
}

async function importNovemberSchedule() {
  console.log('\n🚀 Importando escala revisada de novembro 2025...\n');

  try {
    // 1. Ler arquivo Excel
    const workbook = XLSX.readFile('attached_assets/Escala_Novembro_2025_1761951862356.xlsx');
    const sheet = workbook.Sheets['Escala'];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log(`📄 Arquivo lido: ${data.length} linhas\n`);

    // 2. Buscar todos os ministros para mapear nomes -> IDs
    const allUsers = await db.select().from(users);
    const userMap = new Map<string, string>();
    
    allUsers.forEach(user => {
      // Priorizar schedule_display_name (apelido usado nas escalas)
      if (user.scheduleDisplayName) {
        const normalizedDisplayName = user.scheduleDisplayName.trim().toLowerCase();
        userMap.set(normalizedDisplayName, user.id);
      }
      
      // Também adicionar nome completo como alternativa
      const normalizedName = user.name.trim().toLowerCase();
      if (!userMap.has(normalizedName)) {
        userMap.set(normalizedName, user.id);
      }
      
      // Adicionar primeiro nome como última opção
      const firstName = user.name.split(' ')[0].trim().toLowerCase();
      if (!userMap.has(firstName)) {
        userMap.set(firstName, user.id);
      }
    });

    console.log(`👥 ${allUsers.length} ministros carregados do banco (${userMap.size} mapeamentos)\n`);

    // 3. Processar linhas do Excel
    const scheduleData: ScheduleRow[] = [];
    
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[2]) continue; // Pular linhas vazias

      const dateNum = parseInt(row[0]);
      if (isNaN(dateNum)) continue;

      let time = row[2];
      
      // Converter decimal do Excel para horário (0.6458... = 15:30)
      if (typeof time === 'number') {
        const hours = Math.floor(time * 24);
        const minutes = Math.round((time * 24 - hours) * 60);
        time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      // Extrair nomes de ministros (colunas 3+)
      const ministers: string[] = [];
      for (let col = 3; col < row.length; col++) {
        if (row[col] && row[col].toString().trim()) {
          ministers.push(row[col].toString().trim());
        }
      }

      if (ministers.length > 0) {
        scheduleData.push({
          date: `2025-11-${String(dateNum).padStart(2, '0')}`,
          day: row[1],
          time: time,
          ministers: ministers
        });
      }
    }

    console.log(`📋 ${scheduleData.length} missas encontradas na escala\n`);

    // 4. Deletar escala existente de novembro 2025
    console.log('🗑️  Deletando escala existente de novembro 2025...');
    const deleteResult = await db
      .delete(schedules)
      .where(
        and(
          gte(schedules.date, '2025-11-01'),
          lte(schedules.date, '2025-11-30')
        )
      );

    console.log(`   Escala de novembro deletada\n`);

    // 5. Inserir nova escala
    let insertedCount = 0;
    let notFoundCount = 0;
    const notFoundMinisters = new Set<string>();

    for (const mass of scheduleData) {
      console.log(`\n📅 ${mass.date} ${mass.time} - ${mass.ministers.length} ministros`);

      for (let position = 0; position < mass.ministers.length; position++) {
        const ministerName = mass.ministers[position];
        const normalizedName = ministerName.trim().toLowerCase();
        const ministerId = userMap.get(normalizedName);

        if (!ministerId) {
          console.warn(`   ⚠️  Ministro não encontrado: "${ministerName}"`);
          notFoundMinisters.add(ministerName);
          notFoundCount++;
          continue;
        }

        try {
          await db.insert(schedules).values({
            date: mass.date,
            time: mass.time,
            type: 'missa',
            ministerId: ministerId,
            position: position + 1,
            status: 'scheduled'
          });

          insertedCount++;
          console.log(`   ✅ Pos ${position + 1}: ${ministerName}`);

        } catch (error) {
          console.error(`   ❌ Erro ao inserir ${ministerName}:`, error);
        }
      }
    }

    // 6. Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DA IMPORTAÇÃO:');
    console.log('='.repeat(70));
    console.log(`✅ Missas processadas: ${scheduleData.length}`);
    console.log(`✅ Escalações inseridas: ${insertedCount}`);
    console.log(`⚠️  Ministros não encontrados: ${notFoundCount}`);
    
    if (notFoundMinisters.size > 0) {
      console.log('\n❌ Ministros não encontrados no banco:');
      notFoundMinisters.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    console.log('='.repeat(70) + '\n');

    console.log('✅ Importação concluída!\n');

  } catch (error) {
    console.error('❌ Erro durante importação:', error);
    throw error;
  }
}

// Executar script
importNovemberSchedule()
  .then(() => {
    console.log('🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script falhou:', error);
    process.exit(1);
  });
