import { db } from '../server/db.js';
import { questionnaires, questionnaireResponses, users } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function checkRealOctoberData() {
  console.log('\n🔍 VERIFICANDO DADOS REAIS DE OUTUBRO/2025 NO BANCO\n');
  console.log('=' .repeat(80));

  try {
    // 1. Buscar questionário de outubro/2025
    const octoberQuest = await db.select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.month, 10),
          eq(questionnaires.year, 2025)
        )
      );

    if (octoberQuest.length === 0) {
      console.log('❌ Nenhum questionário encontrado para outubro/2025');

      // Listar todos os questionários
      const allQuests = await db.select()
        .from(questionnaires);

      console.log('\n📋 Questionários existentes:');
      for (const q of allQuests) {
        console.log(`   - ${q.month}/${q.year} (ID: ${q.id}, Status: ${q.status})`);
      }
      return;
    }

    const questionnaire = octoberQuest[0];
    console.log('\n✅ QUESTIONÁRIO DE OUTUBRO ENCONTRADO!');
    console.log(`   ID: ${questionnaire.id}`);
    console.log(`   Status: ${questionnaire.status}`);
    console.log(`   Criado: ${questionnaire.createdAt}`);

    // 2. Buscar todas as respostas
    const responses = await db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    console.log(`\n📊 Total de respostas: ${responses.length}`);

    // 3. Buscar dados dos ministros
    const allUsers = await db.select()
      .from(users);

    const userMap = new Map(allUsers.map(u => [u.id, { name: u.name, email: u.email }]));

    // 4. Analisar resposta da Roberta como exemplo
    console.log('\n\n🔍 ANÁLISE DETALHADA - EXEMPLO: Roberta');
    console.log('-'.repeat(80));

    const robertaResponse = responses.find(r => {
      const user = userMap.get(r.userId);
      return user?.email === 'roberta.dellavitta@gmail.com';
    });

    if (robertaResponse) {
      const user = userMap.get(robertaResponse.userId)!;
      console.log(`\n👤 ${user.name} (${user.email})`);
      console.log('\nDados da resposta:');

      // Mostrar estrutura completa
      console.log('\n📌 availableSundays:', JSON.stringify(robertaResponse.availableSundays, null, 2));
      console.log('📌 preferredMassTimes:', JSON.stringify(robertaResponse.preferredMassTimes, null, 2));
      console.log('📌 alternativeTimes:', JSON.stringify(robertaResponse.alternativeTimes, null, 2));
      console.log('📌 dailyMassAvailability:', JSON.stringify(robertaResponse.dailyMassAvailability, null, 2));
      console.log('📌 canSubstitute:', robertaResponse.canSubstitute);

      if (robertaResponse.specialEvents) {
        console.log('📌 specialEvents:', JSON.stringify(robertaResponse.specialEvents, null, 2));
      }

      console.log('\n💡 INTERPRETAÇÃO:');
      if (robertaResponse.preferredMassTimes?.includes('8h')) {
        console.log('   ✅ Disponível para missas das 8h');
      }
      if (robertaResponse.availableSundays && robertaResponse.availableSundays.length > 0) {
        console.log('   ✅ Domingos disponíveis:', robertaResponse.availableSundays.join(', '));
      }
    } else {
      console.log('❌ Resposta da Roberta não encontrada');
    }

    // 5. Mostrar estrutura de outras respostas
    console.log('\n\n📊 ANÁLISE DE TODAS AS RESPOSTAS:');
    console.log('-'.repeat(80));

    for (const response of responses.slice(0, 5)) { // Mostrar apenas primeiras 5
      const user = userMap.get(response.userId);
      if (!user) continue;

      console.log(`\n👤 ${user.name}`);
      console.log(`   Email: ${user.email}`);

      // Domingos disponíveis
      if (response.availableSundays && response.availableSundays.length > 0) {
        console.log(`   Domingos: ${response.availableSundays.join(', ')}`);
      } else {
        console.log(`   Domingos: SEM RESPOSTA ou VAZIO`);
      }

      // Horários preferidos
      if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
        console.log(`   Horários preferidos: ${response.preferredMassTimes.join(', ')}`);
      } else {
        console.log(`   Horários preferidos: SEM RESPOSTA`);
      }

      // Missas diárias
      if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
        console.log(`   Missas diárias: ${response.dailyMassAvailability.join(', ')}`);
      } else {
        console.log(`   Missas diárias: SEM RESPOSTA`);
      }
    }

    // 6. Estatísticas gerais
    console.log('\n\n📈 ESTATÍSTICAS GERAIS:');
    console.log('-'.repeat(80));

    let comDomingos = 0;
    let semDomingos = 0;
    let comMissasDiarias = 0;
    let semMissasDiarias = 0;
    let comHorarioPreferido = 0;

    for (const r of responses) {
      if (r.availableSundays && r.availableSundays.length > 0) {
        comDomingos++;
      } else {
        semDomingos++;
      }

      if (r.dailyMassAvailability && r.dailyMassAvailability.length > 0 && !r.dailyMassAvailability.includes('Não posso')) {
        comMissasDiarias++;
      } else {
        semMissasDiarias++;
      }

      if (r.preferredMassTimes && r.preferredMassTimes.length > 0) {
        comHorarioPreferido++;
      }
    }

    console.log(`\nDomingos:`);
    console.log(`   ✅ Com disponibilidade: ${comDomingos}`);
    console.log(`   ❌ Sem disponibilidade: ${semDomingos}`);

    console.log(`\nMissas diárias:`);
    console.log(`   ✅ Com disponibilidade: ${comMissasDiarias}`);
    console.log(`   ❌ Sem disponibilidade: ${semMissasDiarias}`);

    console.log(`\nHorários preferidos:`);
    console.log(`   ✅ Informaram preferência: ${comHorarioPreferido}`);

    console.log('\n\n🚨 PROBLEMA IDENTIFICADO:');
    console.log('=' .repeat(80));
    console.log(`
A lógica atual está EXCLUINDO ministros que não marcaram disponibilidade,
mas os dados mostram que:

1. Os ministros RESPONDERAM ao questionário
2. Eles marcaram disponibilidades específicas (ex: Roberta só às 8h)
3. O campo availableSundays pode conter datas específicas como "05/10", "12/10", etc
4. O campo preferredMassTimes contém horários como "8h", "10h", "19h"

❌ ERRO: A lógica está procurando por "Domingo 05/10" mas pode estar "05/10"
❌ ERRO: Está excluindo quem não respondeu, mesmo tendo respostas no banco

✅ SOLUÇÃO: Ajustar a lógica para:
   1. Considerar diferentes formatos de data
   2. Verificar preferredMassTimes para horários
   3. Não excluir automaticamente quem tem resposta no banco
    `);

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

checkRealOctoberData();