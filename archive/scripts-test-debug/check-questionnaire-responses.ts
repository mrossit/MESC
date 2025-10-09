import { db } from '../server/db';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function checkResponses() {
  try {
    console.log('🔍 Verificando respostas de questionários...\n');

    // Buscar todas as respostas
    const allResponses = await db
      .select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        questionnaireId: questionnaireResponses.questionnaireId,
        userName: users.name,
        userEmail: users.email,
        submittedAt: questionnaireResponses.submittedAt,
        questionnaire: {
          id: questionnaires.id,
          title: questionnaires.title,
          month: questionnaires.month,
          year: questionnaires.year,
          status: questionnaires.status
        }
      })
      .from(questionnaireResponses)
      .leftJoin(users, eq(questionnaireResponses.userId, users.id))
      .leftJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id));

    if (allResponses.length === 0) {
      console.log('⚠️  Nenhuma resposta encontrada no banco de dados');
      return;
    }

    console.log(`✅ Total de respostas: ${allResponses.length}\n`);

    allResponses.forEach((response, index) => {
      console.log(`📋 Resposta ${index + 1}:`);
      console.log('- ID da Resposta:', response.id);
      console.log('- Usuário:', response.userName, `(${response.userEmail})`);
      console.log('- ID do Usuário:', response.userId);
      console.log('- ID do Questionário:', response.questionnaireId);
      console.log('- Enviado em:', response.submittedAt);

      if (response.questionnaire) {
        console.log('- Questionário:', response.questionnaire.title || 'Sem título');
        console.log('- Período:', `${response.questionnaire.month}/${response.questionnaire.year}`);
        console.log('- Status do Questionário:', response.questionnaire.status);
      } else {
        console.log('- ⚠️  Questionário não encontrado ou foi deletado');
      }

      console.log('---'.repeat(20));
    });

    // Verificar especificamente as respostas da Sonia Teste
    console.log('\n🔎 Buscando respostas da Sonia Teste...');

    const [soniaUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'soniateste@me.com'))
      .limit(1);

    if (soniaUser) {
      console.log('✅ Usuário Sonia encontrado, ID:', soniaUser.id);

      const soniaResponses = await db
        .select({
          id: questionnaireResponses.id,
          questionnaireId: questionnaireResponses.questionnaireId,
          responses: questionnaireResponses.responses,
          submittedAt: questionnaireResponses.submittedAt
        })
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.userId, soniaUser.id));

      console.log(`📊 Total de respostas da Sonia: ${soniaResponses.length}`);

      if (soniaResponses.length > 0) {
        console.log('\nDetalhes das respostas:');
        soniaResponses.forEach((resp, idx) => {
          console.log(`\nResposta ${idx + 1}:`);
          console.log('- ID:', resp.id);
          console.log('- Questionário ID:', resp.questionnaireId);
          console.log('- Enviado em:', resp.submittedAt);

          // Contar quantas perguntas foram respondidas
          const responses = typeof resp.responses === 'string'
            ? JSON.parse(resp.responses)
            : resp.responses;
          console.log('- Número de perguntas respondidas:', Array.isArray(responses) ? responses.length : 'N/A');
          console.log('- Tipo do campo responses:', typeof resp.responses);
        });
      }
    } else {
      console.log('❌ Usuário Sonia não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar respostas:', error);
  }

  process.exit(0);
}

checkResponses();