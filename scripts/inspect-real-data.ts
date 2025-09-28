import { db } from '../server/db';
import { questionnaires, questionnaireResponses, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function inspectRealData() {
  console.log('🔍 Inspecionando dados reais do banco...\n');

  try {
    // Buscar todos os questionários
    const allQuestionnaires = await db
      .select()
      .from(questionnaires)
      .orderBy(questionnaires.year, questionnaires.month);

    console.log(`📋 Total de questionários: ${allQuestionnaires.length}\n`);

    for (const questionnaire of allQuestionnaires) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Questionário: ${questionnaire.title}`);
      console.log(`   ID: ${questionnaire.id}`);
      console.log(`   Período: ${questionnaire.month}/${questionnaire.year}`);
      console.log(`   Status: ${questionnaire.status}`);

      // Verificar estrutura das perguntas
      console.log('\n📝 Estrutura das perguntas:');
      console.log(JSON.stringify(questionnaire.questions, null, 2));

      // Buscar todas as respostas
      const responses = await db
        .select({
          response: questionnaireResponses,
          userName: users.name,
          userEmail: users.email
        })
        .from(questionnaireResponses)
        .innerJoin(users, eq(questionnaireResponses.userId, users.id))
        .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

      console.log(`\n📊 Total de respostas: ${responses.length}`);

      // Analisar cada resposta
      for (let i = 0; i < Math.min(2, responses.length); i++) {
        const { response, userName, userEmail } = responses[i];
        console.log(`\n   ➤ Resposta ${i + 1}:`);
        console.log(`      Usuário: ${userName} (${userEmail})`);
        console.log(`      ID da resposta: ${response.id}`);

        console.log('\n      Campo "responses" (JSON):');
        console.log(JSON.stringify(response.responses, null, 8));

        console.log('\n      Campos estruturados:');
        console.log(`      - availableSundays: ${JSON.stringify(response.availableSundays)}`);
        console.log(`      - preferredMassTimes: ${JSON.stringify(response.preferredMassTimes)}`);
        console.log(`      - alternativeTimes: ${JSON.stringify(response.alternativeTimes)}`);
        console.log(`      - dailyMassAvailability: ${JSON.stringify(response.dailyMassAvailability)}`);
        console.log(`      - specialEvents: ${JSON.stringify(response.specialEvents)}`);
        console.log(`      - canSubstitute: ${response.canSubstitute}`);
        console.log(`      - notes: ${response.notes || 'null'}`);
        console.log(`      - submittedAt: ${response.submittedAt}`);
      }

      // Estatísticas
      if (responses.length > 0) {
        const withAvailability = responses.filter(r =>
          r.response.availableSundays && r.response.availableSundays.length > 0
        ).length;

        const withNotes = responses.filter(r => r.response.notes).length;

        console.log(`\n   📈 Estatísticas:`);
        console.log(`      - Respostas com disponibilidade: ${withAvailability}`);
        console.log(`      - Respostas com observações: ${withNotes}`);
      }
    }

    // Verificar se há respostas órfãs
    const allResponses = await db.select().from(questionnaireResponses);
    const questionnaireIds = new Set(allQuestionnaires.map(q => q.id));
    const orphanResponses = allResponses.filter(r => !questionnaireIds.has(r.questionnaireId));

    if (orphanResponses.length > 0) {
      console.log(`\n⚠️  Respostas órfãs encontradas: ${orphanResponses.length}`);
    }

  } catch (error) {
    console.error('❌ Erro ao inspecionar dados:', error);
    process.exit(1);
  }

  process.exit(0);
}

inspectRealData().catch(console.error);