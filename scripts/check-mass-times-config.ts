import { db } from "../server/db";
import { massTimesConfig } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkMassTimesConfig() {
  console.log("=".repeat(80));
  console.log("HORÁRIOS DE MISSA CADASTRADOS NO SISTEMA");
  console.log("=".repeat(80));
  console.log();

  const massTimes = await db
    .select()
    .from(massTimesConfig)
    .where(eq(massTimesConfig.isActive, true));

  const byDay: Record<number, string> = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado",
  };

  const grouped: Record<string, any[]> = {};
  for (const mass of massTimes) {
    const day = byDay[mass.dayOfWeek];
    if (!grouped[day]) {
      grouped[day] = [];
    }
    grouped[day].push(mass);
  }

  // Ordenar dias da semana
  const orderedDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  for (const day of orderedDays) {
    if (grouped[day]) {
      console.log(`\n${day}:`);
      grouped[day].forEach((mass) => {
        console.log(`  - ${mass.time} (${mass.type || "missa"})`);
      });
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`Total: ${massTimes.length} horários cadastrados`);
  console.log("=".repeat(80));

  process.exit(0);
}

checkMassTimesConfig().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
