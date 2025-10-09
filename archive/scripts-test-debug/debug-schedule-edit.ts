import { db } from '../server/db.js';
import { schedules } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Script para debugar problemas de edição de escala
 * Verifica o estado atual dos registros de schedule
 */

async function debugScheduleEdit() {
  try {
    console.log('🔍 Verificando registros de schedule no banco...\n');

    // Buscar todos os schedules de outubro/2025 (ajuste a data conforme necessário)
    const allSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, '2025-10-03') // Data de hoje (ajuste conforme teste)
        )
      );

    console.log(`📊 Total de registros encontrados para 2025-10-03: ${allSchedules.length}\n`);

    // Agrupar por horário
    const byTime = allSchedules.reduce((acc, s) => {
      const key = s.time;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(s);
      return acc;
    }, {} as Record<string, typeof allSchedules>);

    // Mostrar detalhes
    Object.entries(byTime).forEach(([time, records]) => {
      console.log(`⏰ Horário: ${time}`);
      console.log(`   Total de ministros: ${records.length}`);

      records.forEach((r, idx) => {
        console.log(`   ${idx + 1}. ID: ${r.id}`);
        console.log(`      Ministro ID: ${r.ministerId || 'VACANT'}`);
        console.log(`      Posição: ${r.position}`);
        console.log(`      Status: ${r.status}`);
        console.log(`      ---`);
      });
      console.log('');
    });

    // Verificar duplicações
    console.log('🔍 Verificando duplicações...\n');
    const duplicates = allSchedules.filter((s1, idx1) => {
      return allSchedules.some((s2, idx2) => {
        return idx1 !== idx2 &&
          s1.date === s2.date &&
          s1.time === s2.time &&
          s1.ministerId === s2.ministerId &&
          s1.ministerId !== null; // Ignorar VACANT
      });
    });

    if (duplicates.length > 0) {
      console.log(`⚠️ ENCONTRADAS ${duplicates.length} DUPLICAÇÕES!`);
      duplicates.forEach(d => {
        console.log(`   - ID: ${d.id}, Ministro: ${d.ministerId}, Hora: ${d.time}, Posição: ${d.position}`);
      });
    } else {
      console.log('✅ Nenhuma duplicação encontrada');
    }

  } catch (error) {
    console.error('❌ Erro ao debugar:', error);
  } finally {
    process.exit(0);
  }
}

debugScheduleEdit();
