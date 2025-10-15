import { db } from "../server/db";
import { questionnaireResponses, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkWeekdayAvailability() {
  console.log("=".repeat(80));
  console.log("MINISTROS COM DISPONIBILIDADE PARA DIAS DE SEMANA");
  console.log("=".repeat(80));
  console.log();

  const responses = await db
    .select({
      userId: questionnaireResponses.userId,
      dailyMassAvailability: questionnaireResponses.dailyMassAvailability,
      responses: questionnaireResponses.responses,
    })
    .from(questionnaireResponses);

  let count = 0;
  for (const response of responses) {
    if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
      count++;
      const user = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, response.userId))
        .limit(1);

      console.log(`${count}. ${user[0]?.name || "Desconhecido"}`);
      console.log(`   Dias: ${response.dailyMassAvailability.join(", ")}`);

      // Check weekdays in JSON
      let responsesData = response.responses;
      if (typeof responsesData === "string") {
        responsesData = JSON.parse(responsesData);
      }
      if (responsesData.weekdays) {
        const days = [];
        if (responsesData.weekdays.monday) days.push("Segunda");
        if (responsesData.weekdays.tuesday) days.push("Terça");
        if (responsesData.weekdays.wednesday) days.push("Quarta");
        if (responsesData.weekdays.thursday) days.push("Quinta");
        if (responsesData.weekdays.friday) days.push("Sexta");
        console.log(`   JSON weekdays: ${days.join(", ")}`);
      }
      console.log();
    }
  }

  console.log("=".repeat(80));
  console.log(`Total: ${count} ministros com disponibilidade para dias de semana`);
  console.log("=".repeat(80));

  process.exit(0);
}

checkWeekdayAvailability().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
