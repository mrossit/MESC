import { db } from "../server/db";
import { schedules } from "../shared/schema";

async function addSaturdayMass() {
  console.log("🕒 Adicionando missa de sábado 04/10/25 às 16h...\n");

  const date = '2025-10-04';
  const time = '16:00:00';
  const totalPositions = 20; // Posições padrão para uma missa

  try {
    // Criar 20 posições com VACANT
    const positions = [];
    for (let i = 1; i <= totalPositions; i++) {
      positions.push({
        date,
        time,
        type: 'missa' as const,
        position: i,
        status: 'scheduled',
        ministerId: null, // VACANT = sem ministro atribuído
        location: 'Santuário São Judas Tadeu',
        notes: 'Missa de sábado às 16h - Escala manual'
      });
    }

    // Inserir todas as posições
    await db.insert(schedules).values(positions);

    console.log(`✅ Missa criada com sucesso!`);
    console.log(`📅 Data: ${date}`);
    console.log(`🕒 Horário: ${time}`);
    console.log(`👥 Posições criadas: ${totalPositions} (todas VACANT)`);
    console.log(`\n💡 Agora você pode editar a escala manualmente no sistema.`);

  } catch (error) {
    console.error("❌ Erro ao criar missa:", error);
    throw error;
  }
}

// Executar
addSaturdayMass()
  .then(() => {
    console.log("\n✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  });
