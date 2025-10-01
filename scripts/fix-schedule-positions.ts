import { db } from "../server/db";
import { schedules } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixSchedulePositions() {
  console.log("🔧 Iniciando correção das posições...\n");

  try {
    // Buscar todas as escalas agrupadas por data e horário
    const allSchedules = await db
      .select()
      .from(schedules)
      .orderBy(schedules.date, schedules.time, schedules.id);

    // Agrupar por data + horário
    const groupedByMass = new Map<string, any[]>();

    for (const schedule of allSchedules) {
      const key = `${schedule.date}_${schedule.time}`;
      if (!groupedByMass.has(key)) {
        groupedByMass.set(key, []);
      }
      groupedByMass.get(key)!.push(schedule);
    }

    console.log(`📊 Total de missas encontradas: ${groupedByMass.size}\n`);

    let totalUpdated = 0;

    // Para cada missa, atribuir posições sequenciais
    for (const [key, massSchedules] of groupedByMass.entries()) {
      const [date, time] = key.split('_');
      console.log(`📅 Processando: ${date} às ${time} - ${massSchedules.length} ministros`);

      for (let i = 0; i < massSchedules.length; i++) {
        const schedule = massSchedules[i];
        const newPosition = i + 1; // Posição começa em 1

        // Atualizar posição no banco
        await db
          .update(schedules)
          .set({ position: newPosition })
          .where(eq(schedules.id, schedule.id));

        totalUpdated++;
      }

      console.log(`   ✅ ${massSchedules.length} posições atualizadas\n`);
    }

    console.log(`\n✨ Correção concluída! Total de ${totalUpdated} registros atualizados.`);

  } catch (error) {
    console.error("❌ Erro ao corrigir posições:", error);
    throw error;
  }
}

// Executar
fixSchedulePositions()
  .then(() => {
    console.log("\n✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  });
