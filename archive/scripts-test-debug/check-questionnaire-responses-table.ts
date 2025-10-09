import { db } from '../server/db.js';
import { questionnaireResponses, users, questionnaires } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function checkQuestionnaireResponsesTable() {
  console.log('\n🔍 VERIFICANDO DIRETAMENTE A TABELA questionnaire_responses\n');
  console.log('=' .repeat(80));

  try {
    // 1. Contar total de registros
    const countResult = await db.select({
      count: sql`COUNT(*)::int`
    }).from(questionnaireResponses);

    const totalResponses = countResult[0]?.count || 0;
    console.log(`\n📊 Total de registros na tabela: ${totalResponses}\n`);

    if (totalResponses === 0) {
      console.log('❌ A tabela questionnaire_responses está VAZIA');
      return;
    }

    // 2. Buscar TODAS as respostas
    const allResponses = await db.select().from(questionnaireResponses);
    console.log(`\n✅ Encontradas ${allResponses.length} respostas!\n`);

    // 3. Buscar dados dos usuários
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, { name: u.name, email: u.email }]));

    // 4. Buscar questionários relacionados
    const allQuestionnaires = await db.select().from(questionnaires);
    const questMap = new Map(allQuestionnaires.map(q => [q.id, { month: q.month, year: q.year }]));

    // 5. Procurar especificamente pela Roberta
    console.log('🔍 BUSCANDO RESPOSTA DA ROBERTA:');
    console.log('-'.repeat(80));

    const robertaUser = allUsers.find(u =>
      u.email === 'roberta.dellavitta@gmail.com' ||
      u.name?.toLowerCase().includes('roberta')
    );

    if (robertaUser) {
      console.log(`\nEncontrada usuária: ${robertaUser.name} (${robertaUser.email})`);

      const robertaResponse = allResponses.find(r => r.userId === robertaUser.id);

      if (robertaResponse) {
        const quest = questMap.get(robertaResponse.questionnaireId);
        console.log(`\n📅 Questionário: ${quest?.month}/${quest?.year || 'N/A'}`);
        console.log('\n📝 DADOS DA RESPOSTA DA ROBERTA:');
        console.log('-'.repeat(40));
        console.log('\navailableSundays:', JSON.stringify(robertaResponse.availableSundays, null, 2));
        console.log('\npreferredMassTimes:', JSON.stringify(robertaResponse.preferredMassTimes, null, 2));
        console.log('\nalternativeTimes:', JSON.stringify(robertaResponse.alternativeTimes, null, 2));
        console.log('\ndailyMassAvailability:', JSON.stringify(robertaResponse.dailyMassAvailability, null, 2));
        console.log('\ncanSubstitute:', robertaResponse.canSubstitute);
        console.log('\nspecialEvents:', JSON.stringify(robertaResponse.specialEvents, null, 2));
        console.log('\nsubmittedAt:', robertaResponse.submittedAt);
      } else {
        console.log('❌ Resposta da Roberta não encontrada');
      }
    } else {
      console.log('❌ Usuária Roberta não encontrada no banco');
    }

    // 6. Mostrar análise geral das respostas
    console.log('\n\n📊 ANÁLISE GERAL DAS RESPOSTAS:');
    console.log('=' .repeat(80));

    // Agrupar por questionário
    const responsesByQuestionnaire = new Map();
    for (const response of allResponses) {
      const questId = response.questionnaireId;
      if (!responsesByQuestionnaire.has(questId)) {
        responsesByQuestionnaire.set(questId, []);
      }
      responsesByQuestionnaire.get(questId).push(response);
    }

    for (const [questId, responses] of responsesByQuestionnaire) {
      const quest = questMap.get(questId);
      console.log(`\n📅 Questionário ${quest?.month}/${quest?.year || 'N/A'}:`);
      console.log(`   Total de respostas: ${responses.length}`);

      // Mostrar primeiras 3 respostas como exemplo
      console.log('\n   Exemplos de respostas:');
      for (const response of responses.slice(0, 3)) {
        const user = userMap.get(response.userId);
        console.log(`\n   👤 ${user?.name || 'Desconhecido'}`);

        if (response.availableSundays && response.availableSundays.length > 0) {
          console.log(`      Domingos: ${response.availableSundays.join(', ')}`);
        }

        if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
          console.log(`      Horários: ${response.preferredMassTimes.join(', ')}`);
        }

        if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
          console.log(`      Missas diárias: ${response.dailyMassAvailability.join(', ')}`);
        }
      }
    }

    // 7. Identificar o mês/ano das respostas
    console.log('\n\n📅 RESUMO DOS QUESTIONÁRIOS COM RESPOSTAS:');
    console.log('-'.repeat(80));

    for (const [questId, responses] of responsesByQuestionnaire) {
      const quest = questMap.get(questId);
      if (quest) {
        console.log(`\n✅ ${quest.month}/${quest.year}: ${responses.length} respostas`);
      }
    }

    console.log('\n\n💡 CONCLUSÃO:');
    console.log('=' .repeat(80));
    if (totalResponses > 0) {
      console.log('\n✅ HÁ DADOS NA TABELA questionnaire_responses!');
      console.log('✅ Os ministros JÁ RESPONDERAM aos questionários!');
      console.log('\n🔧 Para gerar a escala com estes dados:');
      console.log('   1. Use o mês/ano correto do questionário');
      console.log('   2. A lógica de filtragem respeitará as respostas');
      console.log('   3. Cada ministro será escalado conforme sua disponibilidade');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
  }

  process.exit(0);
}

checkQuestionnaireResponsesTable();