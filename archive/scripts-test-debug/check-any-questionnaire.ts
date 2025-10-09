import { db } from '../server/db.js';
import { questionnaires, questionnaireResponses, users } from '../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

async function checkAnyQuestionnaire() {
  console.log('\n🔍 VERIFICANDO TODOS OS QUESTIONÁRIOS NO BANCO\n');
  console.log('=' .repeat(80));

  try {
    // 1. Buscar TODOS os questionários
    const allQuests = await db.select()
      .from(questionnaires)
      .orderBy(desc(questionnaires.year), desc(questionnaires.month));

    if (allQuests.length === 0) {
      console.log('❌ NENHUM questionário encontrado no banco de dados\n');
      console.log('Para testar o sistema, você precisa:');
      console.log('1. Criar um questionário através da interface de gestão');
      console.log('2. Os ministros devem responder o questionário');
      console.log('3. Então será possível gerar a escala\n');
      return;
    }

    console.log(`✅ Encontrados ${allQuests.length} questionário(s):\n`);

    // 2. Para cada questionário, mostrar detalhes
    for (const quest of allQuests) {
      console.log(`\n📅 QUESTIONÁRIO: ${quest.month}/${quest.year}`);
      console.log('=' .repeat(60));
      console.log(`   ID: ${quest.id}`);
      console.log(`   Status: ${quest.status}`);
      console.log(`   Criado: ${quest.createdAt}`);

      // Buscar respostas
      const responses = await db.select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, quest.id));

      console.log(`   Total de respostas: ${responses.length}`);

      if (responses.length > 0) {
        // Buscar dados dos usuários
        const allUsers = await db.select()
          .from(users);

        const userMap = new Map(allUsers.map(u => [u.id, { name: u.name, email: u.email }]));

        console.log('\n   📊 ANÁLISE DAS RESPOSTAS:');
        console.log('   ' + '-'.repeat(40));

        // Mostrar primeiras 3 respostas como exemplo
        for (const response of responses.slice(0, 3)) {
          const user = userMap.get(response.userId);
          if (!user) continue;

          console.log(`\n   👤 ${user.name}`);

          // Domingos
          if (response.availableSundays && response.availableSundays.length > 0) {
            console.log(`      Domingos: ${response.availableSundays.join(', ')}`);
          } else {
            console.log(`      Domingos: NÃO INFORMADO`);
          }

          // Horários preferidos
          if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
            console.log(`      Horários: ${response.preferredMassTimes.join(', ')}`);
          }

          // Missas diárias
          if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
            console.log(`      Missas diárias: ${response.dailyMassAvailability.join(', ')}`);
          }
        }

        if (responses.length > 3) {
          console.log(`\n   ... e mais ${responses.length - 3} respostas`);
        }

        // Procurar especificamente pela Roberta
        const robertaUser = allUsers.find(u => u.email === 'roberta.dellavitta@gmail.com');
        if (robertaUser) {
          const robertaResponse = responses.find(r => r.userId === robertaUser.id);
          if (robertaResponse) {
            console.log('\n   🔍 EXEMPLO ESPECÍFICO - Roberta:');
            console.log('   ' + '-'.repeat(40));
            console.log(`   Nome: ${robertaUser.name}`);
            console.log(`   Email: ${robertaUser.email}`);
            console.log(`   Domingos: ${JSON.stringify(robertaResponse.availableSundays)}`);
            console.log(`   Horários: ${JSON.stringify(robertaResponse.preferredMassTimes)}`);
            console.log(`   Missas diárias: ${JSON.stringify(robertaResponse.dailyMassAvailability)}`);
            console.log(`   Pode substituir: ${robertaResponse.canSubstitute}`);
          }
        }
      }
    }

    console.log('\n\n💡 CONCLUSÃO:');
    console.log('=' .repeat(80));
    if (allQuests.length > 0) {
      const latest = allQuests[0];
      console.log(`\nQuestionário mais recente: ${latest.month}/${latest.year} (${latest.status})`);
      console.log(`\nPara gerar a escala, use este mês/ano na interface.`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

checkAnyQuestionnaire();