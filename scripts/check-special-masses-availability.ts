import { db } from "../server/db";
import { questionnaireResponses, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkSpecialMassesAvailability() {
  console.log("=".repeat(80));
  console.log("DISPONIBILIDADE PARA MISSAS VAZIAS/BAIXA CONFIANÇA");
  console.log("=".repeat(80));
  console.log();

  const responses = await db
    .select({
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      dailyMassAvailability: questionnaireResponses.dailyMassAvailability,
    })
    .from(questionnaireResponses);

  // Missas para verificar
  const massesToCheck = [
    { date: "2025-10-02", time: "19:30", name: "Cura e Libertação (primeira quinta)" },
    { date: "2025-10-03", time: "06:30", name: "Sexta-feira normal" },
    { date: "2025-10-04", time: "06:30", name: "Imaculado Coração (primeiro sábado)" },
    { date: "2025-10-24", time: "19:30", name: "Sagrado Coração (primeira sexta) + Novena" },
    { date: "2025-10-25", time: "19:00", name: "Sábado da Novena" },
    { date: "2025-10-28", time: "12:00", name: "São Judas 12h" },
    { date: "2025-10-28", time: "17:00", name: "São Judas 17h" },
  ];

  for (const mass of massesToCheck) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`${mass.name}`);
    console.log(`Data: ${mass.date} ${mass.time}`);
    console.log("=".repeat(80));

    const availableMinistersForMass: string[] = [];

    for (const response of responses) {
      let responsesData = response.responses;
      if (typeof responsesData === "string") {
        responsesData = JSON.parse(responsesData);
      }

      if (!responsesData || responsesData.format_version !== "2.0") {
        continue;
      }

      let isAvailable = false;

      // Verificar eventos especiais
      if (responsesData.special_events) {
        const events = responsesData.special_events;

        // Cura e Libertação
        if (mass.name.includes("Cura e Libertação") && events.healing_liberation) {
          isAvailable = true;
        }

        // Imaculado Coração
        if (mass.name.includes("Imaculado Coração") && events.first_saturday) {
          isAvailable = true;
        }

        // Sagrado Coração
        if (mass.name.includes("Sagrado Coração") && events.first_friday) {
          isAvailable = true;
        }

        // São Judas
        if (mass.name.includes("São Judas") && events.saint_judas_feast) {
          const feastKey = `${mass.date}_${mass.time}`;
          if (events.saint_judas_feast[feastKey]) {
            isAvailable = true;
          }
        }

        // Novena
        if (mass.name.includes("Novena") && events.saint_judas_novena) {
          // Check if this date+time is in novena array
          const novenaKey = `${mass.date}_${mass.time}`;
          if (events.saint_judas_novena.includes(novenaKey)) {
            isAvailable = true;
          }
        }
      }

      // Verificar dias de semana para sexta normal
      if (mass.name.includes("Sexta-feira normal")) {
        if (responsesData.weekdays && responsesData.weekdays.friday) {
          isAvailable = true;
        }
      }

      if (isAvailable) {
        const user = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, response.userId))
          .limit(1);
        availableMinistersForMass.push(user[0]?.name || "Desconhecido");
      }
    }

    console.log(`\n📊 Total: ${availableMinistersForMass.length} ministros disponíveis`);
    if (availableMinistersForMass.length > 0 && availableMinistersForMass.length <= 30) {
      console.log("\nMinistros disponíveis:");
      availableMinistersForMass.forEach((name) => console.log(`  - ${name}`));
    } else if (availableMinistersForMass.length === 0) {
      console.log("❌ NENHUM ministro marcou disponibilidade para esta missa!");
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("ANÁLISE CONCLUÍDA");
  console.log("=".repeat(80));

  process.exit(0);
}

checkSpecialMassesAvailability().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
