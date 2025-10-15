import { db } from "../server/db";
import { questionnaireResponses, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkOct28Availability() {
  console.log("=".repeat(80));
  console.log("DISPONIBILIDADE PARA DIA 28/10 (SÃO JUDAS)");
  console.log("=".repeat(80));
  console.log();

  const responses = await db
    .select({
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
    })
    .from(questionnaireResponses);

  // Count by time slot
  const timeSlots = {
    "07:00": [] as string[],
    "10:00": [] as string[],
    "12:00": [] as string[],
    "15:00": [] as string[],
    "17:00": [] as string[],
    "19:30": [] as string[],
  };

  for (const response of responses) {
    let responsesData = response.responses;
    if (typeof responsesData === "string") {
      responsesData = JSON.parse(responsesData);
    }

    if (responsesData?.special_events?.saint_judas_feast) {
      const user = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, response.userId))
        .limit(1);

      const ministerName = user[0]?.name || "Desconhecido";
      const feast = responsesData.special_events.saint_judas_feast;

      // Check each time slot
      for (const [key, value] of Object.entries(feast)) {
        if (value === true) {
          // Extract time from key like "2025-10-28_07:00"
          const timeMatch = key.match(/(\d{2}:\d{2})/);
          if (timeMatch) {
            const time = timeMatch[1];
            if (timeSlots[time as keyof typeof timeSlots]) {
              timeSlots[time as keyof typeof timeSlots].push(ministerName);
            }
          }
        }
      }
    }
  }

  // Display results
  console.log("Disponibilidade por horário:\n");

  for (const [time, ministers] of Object.entries(timeSlots)) {
    const count = ministers.length;
    const emoji = count === 0 ? "❌" : count < 8 ? "⚠️ " : "✅";
    console.log(`${emoji} ${time}: ${count} ministros disponíveis`);

    if (count > 0 && count <= 10) {
      ministers.forEach(name => console.log(`    - ${name}`));
    }
    console.log();
  }

  console.log("=".repeat(80));
  console.log("LEGENDA:");
  console.log("  ✅ = Boa disponibilidade (8+ ministros)");
  console.log("  ⚠️  = Baixa disponibilidade (1-7 ministros)");
  console.log("  ❌ = Sem disponibilidade (0 ministros)");
  console.log("=".repeat(80));

  process.exit(0);
}

checkOct28Availability().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
