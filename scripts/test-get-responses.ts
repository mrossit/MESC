import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function testGetResponses() {
  try {
    console.log('🔍 Testando busca de respostas...\n');

    const userId = '7736879f-16e7-4672-b57f-2c1cf607f949'; // Sonia Teste
    const month = 9;
    const year = 2025;

    console.log('Buscando para:', { userId, month, year });

    // Simular a query do endpoint
    const [response] = await db.select({
      id: questionnaireResponses.id,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      submittedAt: questionnaireResponses.submittedAt,
      questionnaireTemplate: {
        id: questionnaires.id,
        month: questionnaires.month,
        year: questionnaires.year,
        questions: questionnaires.questions,
        status: questionnaires.status
      }
    }).from(questionnaireResponses)
      .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
      .where(and(
        eq(questionnaireResponses.userId, userId),
        eq(questionnaires.month, month),
        eq(questionnaires.year, year)
      ))
      .limit(1);

    if (response) {
      console.log('\n✅ Resposta encontrada!');
      console.log('- ID:', response.id);
      console.log('- User ID:', response.userId);
      console.log('- Submitted At:', response.submittedAt);
      console.log('- Tipo do campo responses:', typeof response.responses);

      if (response.questionnaireTemplate) {
        console.log('- Questionário:');
        console.log('  - ID:', response.questionnaireTemplate.id);
        console.log('  - Mês/Ano:', `${response.questionnaireTemplate.month}/${response.questionnaireTemplate.year}`);
        console.log('  - Status:', response.questionnaireTemplate.status);
      }
    } else {
      console.log('\n❌ Nenhuma resposta encontrada');

      // Verificar se existe resposta sem join
      const [directResponse] = await db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.userId, userId))
        .limit(1);

      if (directResponse) {
        console.log('\n⚠️  Resposta existe mas join falhou:');
        console.log('- ID da resposta:', directResponse.id);
        console.log('- ID do questionário:', directResponse.questionnaireId);

        // Verificar se o questionário existe
        const [questionnaire] = await db
          .select()
          .from(questionnaires)
          .where(eq(questionnaires.id, directResponse.questionnaireId))
          .limit(1);

        if (questionnaire) {
          console.log('\n📋 Questionário encontrado:');
          console.log('- Mês/Ano:', `${questionnaire.month}/${questionnaire.year}`);
          console.log('- Status:', questionnaire.status);
        } else {
          console.log('\n❌ Questionário não encontrado com ID:', directResponse.questionnaireId);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testGetResponses();