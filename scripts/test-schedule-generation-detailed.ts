import { db } from "../server/db";
import { users, questionnaireResponses, questionnaires } from "../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Script de teste detalhado para entender o fluxo de geração
 * Mostra exatamente o que está sendo lido e como está sendo processado
 */

async function testScheduleGeneration() {
  console.log("\n" + "=".repeat(80));
  console.log("TESTE DETALHADO DE GERAÇÃO DE ESCALAS");
  console.log("=".repeat(80) + "\n");

  // 1. BUSCAR QUESTIONÁRIOS DE OUTUBRO 2025
  console.log("📋 PASSO 1: Buscando questionários de outubro 2025...\n");

  const octoberQuestionnaires = await db
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.month, 10), eq(questionnaires.year, 2025)));

  console.log(`Encontrados ${octoberQuestionnaires.length} questionários:`);
  for (const q of octoberQuestionnaires) {
    console.log(`  - ID: ${q.id}`);
    console.log(`    Título: ${q.title}`);
    console.log(`    Status: ${q.status}`);
    console.log(`    Criado em: ${q.createdAt}`);
  }
  console.log();

  if (octoberQuestionnaires.length === 0) {
    console.log("❌ ERRO: Nenhum questionário encontrado para outubro 2025!");
    process.exit(1);
  }

  const questionnaireId = octoberQuestionnaires[0].id;

  // 2. BUSCAR RESPOSTAS DOS MINISTROS
  console.log("👥 PASSO 2: Buscando respostas dos ministros...\n");

  const responses = await db
    .select({
      id: questionnaireResponses.id,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      availableSundays: questionnaireResponses.availableSundays,
      preferredMassTimes: questionnaireResponses.preferredMassTimes,
      dailyMassAvailability: questionnaireResponses.dailyMassAvailability,
      canSubstitute: questionnaireResponses.canSubstitute,
    })
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId));

  console.log(`Encontradas ${responses.length} respostas\n`);

  // 3. ANALISAR FORMATO DAS RESPOSTAS
  console.log("🔍 PASSO 3: Analisando formato das respostas...\n");

  let v2Count = 0;
  let legacyCount = 0;
  let unknownCount = 0;

  for (let i = 0; i < Math.min(responses.length, 5); i++) {
    const response = responses[i];
    const minister = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, response.userId))
      .limit(1);

    const ministerName = minister[0]?.name || "Desconhecido";

    console.log(`\n${"─".repeat(80)}`);
    console.log(`Resposta ${i + 1}/${responses.length}: ${ministerName}`);
    console.log(`${"─".repeat(80)}`);

    // Parse responses
    let responsesData = response.responses;
    if (typeof responsesData === "string") {
      try {
        responsesData = JSON.parse(responsesData);
      } catch (e) {
        console.log("❌ Erro ao fazer parse do JSON");
        continue;
      }
    }

    // Detectar versão
    const isV2 =
      responsesData &&
      typeof responsesData === "object" &&
      responsesData.format_version === "2.0";
    const isLegacy = Array.isArray(responsesData);

    if (isV2) {
      v2Count++;
      console.log("✅ FORMATO: v2.0");
      console.log("\nCampos do banco:");
      console.log(`  - availableSundays: ${response.availableSundays?.length || 0} entradas`);
      console.log(`  - preferredMassTimes: ${response.preferredMassTimes?.length || 0} entradas`);
      console.log(`  - dailyMassAvailability: ${response.dailyMassAvailability?.length || 0} entradas`);
      console.log(`  - canSubstitute: ${response.canSubstitute}`);

      console.log("\nConteúdo detalhado:");

      // Domingos disponíveis
      if (response.availableSundays && response.availableSundays.length > 0) {
        console.log("\n  📅 DOMINGOS DISPONÍVEIS:");
        response.availableSundays.forEach((sunday) => {
          console.log(`    - ${sunday}`);
        });
      }

      // Horários preferidos
      if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
        console.log("\n  ⏰ HORÁRIOS PREFERIDOS:");
        response.preferredMassTimes.forEach((time) => {
          console.log(`    - ${time}`);
        });
      }

      // Dias de semana
      if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
        console.log("\n  📆 DIAS DE SEMANA:");
        response.dailyMassAvailability.forEach((day) => {
          console.log(`    - ${day}`);
        });
      }

      // Eventos especiais do JSON
      if (responsesData.special_events) {
        console.log("\n  🎉 EVENTOS ESPECIAIS:");
        const events = responsesData.special_events;

        if (events.saint_judas_novena && Array.isArray(events.saint_judas_novena)) {
          console.log(`    - Novena: ${events.saint_judas_novena.length} dias`);
          events.saint_judas_novena.forEach((day: string) => {
            console.log(`      • ${day}`);
          });
        }

        if (events.saint_judas_feast) {
          console.log(`    - Dia de São Judas (28/10):`);
          Object.entries(events.saint_judas_feast).forEach(([datetime, available]) => {
            if (available) {
              console.log(`      • ${datetime} ✅`);
            }
          });
        }

        if (events.healing_liberation) {
          console.log(`    - Cura e Libertação: ${events.healing_liberation ? "SIM" : "NÃO"}`);
        }

        if (events.first_friday) {
          console.log(`    - Primeira Sexta: ${events.first_friday ? "SIM" : "NÃO"}`);
        }

        if (events.first_saturday) {
          console.log(`    - Primeiro Sábado: ${events.first_saturday ? "SIM" : "NÃO"}`);
        }
      }

      // Weekdays do JSON
      if (responsesData.weekdays) {
        console.log("\n  🗓️  DIAS DE SEMANA (JSON):");
        Object.entries(responsesData.weekdays).forEach(([day, available]) => {
          if (available) {
            console.log(`    - ${day}: SIM`);
          }
        });
      }
    } else if (isLegacy) {
      legacyCount++;
      console.log("⚠️  FORMATO: Legacy (array)");
      console.log(`  - ${responsesData.length} questões respondidas`);
    } else {
      unknownCount++;
      console.log("❓ FORMATO: Desconhecido");
      console.log("  Tipo:", typeof responsesData);
    }
  }

  // 4. RESUMO FINAL
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMO DA ANÁLISE");
  console.log("=".repeat(80));
  console.log(`Total de respostas: ${responses.length}`);
  console.log(`  - Formato v2.0: ${v2Count}`);
  console.log(`  - Formato Legacy: ${legacyCount}`);
  console.log(`  - Formato Desconhecido: ${unknownCount}`);

  // 5. ESTATÍSTICAS DE DISPONIBILIDADE
  console.log("\n📈 ESTATÍSTICAS DE DISPONIBILIDADE:\n");

  let totalSundayAvailability = 0;
  let totalWeekdayAvailability = 0;
  let totalSpecialEventsAvailability = 0;

  for (const response of responses) {
    if (response.availableSundays && response.availableSundays.length > 0) {
      totalSundayAvailability++;
    }
    if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
      totalWeekdayAvailability++;
    }

    let responsesData = response.responses;
    if (typeof responsesData === "string") {
      try {
        responsesData = JSON.parse(responsesData);
      } catch (e) {
        continue;
      }
    }

    if (
      responsesData &&
      typeof responsesData === "object" &&
      responsesData.special_events
    ) {
      totalSpecialEventsAvailability++;
    }
  }

  console.log(`Ministros disponíveis para DOMINGOS: ${totalSundayAvailability}`);
  console.log(`Ministros disponíveis para DIAS DE SEMANA: ${totalWeekdayAvailability}`);
  console.log(`Ministros com EVENTOS ESPECIAIS: ${totalSpecialEventsAvailability}`);

  // 6. TESTAR CRIAÇÃO DE UM HORÁRIO DE MISSA
  console.log("\n" + "=".repeat(80));
  console.log("🧪 TESTE: Simulando busca de ministros para uma missa");
  console.log("=".repeat(80));

  const testMass = {
    date: "2025-10-05",
    time: "10:00",
    dayOfWeek: 0, // Domingo
  };

  console.log(`\nMissa de teste: ${testMass.date} às ${testMass.time}`);
  console.log("\nBuscando ministros disponíveis...\n");

  let availableForTestMass = 0;

  for (const response of responses) {
    if (!response.availableSundays || response.availableSundays.length === 0) {
      continue;
    }

    // Verificar se está disponível nesta data/hora
    const dateTimeKey = `${testMass.date} ${testMass.time}`;
    const isAvailable = response.availableSundays.some((entry) => {
      return entry === dateTimeKey || entry === testMass.date || entry.includes(testMass.date);
    });

    if (isAvailable) {
      availableForTestMass++;
      const minister = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, response.userId))
        .limit(1);
      console.log(`  ✅ ${minister[0]?.name || "Desconhecido"}`);
    }
  }

  console.log(`\n📊 Total: ${availableForTestMass} ministros disponíveis para esta missa`);

  console.log("\n" + "=".repeat(80));
  console.log("✅ TESTE CONCLUÍDO");
  console.log("=".repeat(80) + "\n");

  process.exit(0);
}

testScheduleGeneration().catch((error) => {
  console.error("\n❌ ERRO NO TESTE:", error);
  console.error(error.stack);
  process.exit(1);
});
