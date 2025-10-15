import { db } from "../server/db";
import { questionnaireResponses } from "../shared/schema";

async function inspectQuestionnaireStructure() {
  console.log("\n=== INSPEÇÃO DA ESTRUTURA DOS QUESTIONÁRIOS ===\n");

  const allResponses = await db.select().from(questionnaireResponses);
  console.log(`📝 Total de Respostas: ${allResponses.length}\n`);

  if (allResponses.length === 0) {
    console.log("❌ Nenhuma resposta encontrada!");
    process.exit(1);
  }

  // Pegar primeira resposta para inspecionar
  const firstResponse = allResponses[0];
  console.log("🔍 Estrutura da primeira resposta:");
  console.log("ID:", firstResponse.id);
  console.log("UserID:", firstResponse.userId);
  console.log("QuestionnaireID:", firstResponse.questionnaireId);
  console.log("\nCampos disponíveis:");
  console.log("- availableSundays:", firstResponse.availableSundays);
  console.log("- preferredMassTimes:", firstResponse.preferredMassTimes);
  console.log("- alternativeTimes:", firstResponse.alternativeTimes);
  console.log("- dailyMassAvailability:", firstResponse.dailyMassAvailability);
  console.log("- canSubstitute:", firstResponse.canSubstitute);
  console.log("- notes:", firstResponse.notes);

  console.log("\n📦 Campo 'responses' (JSON):");
  console.log(JSON.stringify(firstResponse.responses, null, 2));

  // Verificar quantas respostas têm availability
  console.log("\n\n📊 Análise de todas as respostas:");

  let hasAvailabilityField = 0;
  let hasAvailableSundays = 0;
  let hasPreferredMassTimes = 0;
  let hasAlternativeTimes = 0;
  let hasDailyMassAvailability = 0;

  for (const response of allResponses) {
    const responses_data = response.responses;

    if (responses_data && typeof responses_data === 'object') {
      const availability = (responses_data as any).availability;
      if (availability) hasAvailabilityField++;
    }

    if (response.availableSundays && response.availableSundays.length > 0) {
      hasAvailableSundays++;
    }

    if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
      hasPreferredMassTimes++;
    }

    if (response.alternativeTimes && response.alternativeTimes.length > 0) {
      hasAlternativeTimes++;
    }

    if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
      hasDailyMassAvailability++;
    }
  }

  console.log(`  Respostas com campo 'availability' no JSON: ${hasAvailabilityField}`);
  console.log(`  Respostas com 'availableSundays': ${hasAvailableSundays}`);
  console.log(`  Respostas com 'preferredMassTimes': ${hasPreferredMassTimes}`);
  console.log(`  Respostas com 'alternativeTimes': ${hasAlternativeTimes}`);
  console.log(`  Respostas com 'dailyMassAvailability': ${hasDailyMassAvailability}`);

  // Mostrar exemplo de resposta com availableSundays
  const withSundays = allResponses.find(r => r.availableSundays && r.availableSundays.length > 0);
  if (withSundays) {
    console.log("\n\n📅 Exemplo de resposta com availableSundays:");
    console.log("UserID:", withSundays.userId);
    console.log("availableSundays:", withSundays.availableSundays);
    console.log("preferredMassTimes:", withSundays.preferredMassTimes);
    console.log("alternativeTimes:", withSundays.alternativeTimes);
    console.log("dailyMassAvailability:", withSundays.dailyMassAvailability);
  }

  // Mostrar exemplo de dailyMassAvailability
  const withDaily = allResponses.find(r => r.dailyMassAvailability && r.dailyMassAvailability.length > 0);
  if (withDaily) {
    console.log("\n\n🕐 Exemplo de resposta com dailyMassAvailability:");
    console.log("UserID:", withDaily.userId);
    console.log("dailyMassAvailability:", withDaily.dailyMassAvailability);
  }

  process.exit(0);
}

inspectQuestionnaireStructure().catch((error) => {
  console.error("Erro durante inspeção:", error);
  process.exit(1);
});
