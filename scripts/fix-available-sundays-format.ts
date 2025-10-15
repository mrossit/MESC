import { db } from "../server/db";
import { questionnaireResponses, questionnaires } from "../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Script para corrigir o formato de availableSundays
 * DE: ["2025-10-05", "2025-10-12"]
 * PARA: ["2025-10-05 10:00", "2025-10-12 08:00"]
 */

async function fixAvailableSundaysFormat() {
  console.log("\n" + "=".repeat(80));
  console.log("CORREÇÃO DO FORMATO DE AVAILABLE_SUNDAYS");
  console.log("=".repeat(80) + "\n");

  // 1. Buscar questionário de outubro
  const octoberQuestionnaires = await db
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.month, 10), eq(questionnaires.year, 2025)));

  if (octoberQuestionnaires.length === 0) {
    console.log("❌ Nenhum questionário de outubro 2025 encontrado");
    process.exit(1);
  }

  const questionnaireId = octoberQuestionnaires[0].id;
  console.log(`✅ Questionário encontrado: ${questionnaireId}\n`);

  // 2. Buscar todas as respostas
  const responses = await db
    .select()
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId));

  console.log(`📝 Total de respostas: ${responses.length}\n`);

  let fixed = 0;
  let errors = 0;

  for (const response of responses) {
    try {
      // Parse responses JSON
      let responsesData = response.responses;
      if (typeof responsesData === "string") {
        responsesData = JSON.parse(responsesData);
      }

      // Verificar se é v2.0
      if (!responsesData || responsesData.format_version !== "2.0") {
        continue;
      }

      // Verificar se tem availableSundays no formato errado
      if (!response.availableSundays || response.availableSundays.length === 0) {
        continue;
      }

      // Verificar se já está no formato correto
      const hasTime = response.availableSundays.some((s: string) => s.includes(" "));
      if (hasTime) {
        continue; // Já está correto
      }

      // CORRIGIR: Extrair data+hora do JSON masses
      const masses = responsesData.masses || {};
      const newAvailableSundays: string[] = [];

      Object.entries(masses).forEach(([date, times]: [string, any]) => {
        Object.entries(times).forEach(([time, available]) => {
          if (available === true) {
            newAvailableSundays.push(`${date} ${time}`);
          }
        });
      });

      if (newAvailableSundays.length === 0) {
        console.log(`⚠️  ${response.userId}: Nenhum horário disponível encontrado`);
        continue;
      }

      // Atualizar no banco
      await db
        .update(questionnaireResponses)
        .set({
          availableSundays: newAvailableSundays,
        })
        .where(eq(questionnaireResponses.id, response.id));

      fixed++;
      console.log(`✅ ${response.userId}: ${newAvailableSundays.join(", ")}`);
    } catch (error) {
      errors++;
      console.error(`❌ ${response.userId}: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("RESULTADO:");
  console.log(`  ✅ Corrigidas: ${fixed}`);
  console.log(`  ❌ Erros: ${errors}`);
  console.log(`  📊 Total: ${responses.length}`);
  console.log("=".repeat(80) + "\n");

  process.exit(0);
}

fixAvailableSundaysFormat().catch((error) => {
  console.error("\n❌ ERRO:", error);
  console.error(error.stack);
  process.exit(1);
});
