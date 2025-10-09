import { db } from '../server/db';
import { users, questionnaires, questionnaireResponses } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function testResponseEndpoint() {
  try {
    console.log('🔍 Testando endpoint de respostas detalhadas...\n');

    // 1. Buscar o questionário de setembro
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, 9),
        eq(questionnaires.year, 2025)
      ))
      .limit(1);

    if (!questionnaire) {
      console.log('❌ Questionário não encontrado');
      process.exit(1);
    }

    console.log('📋 Questionário encontrado:', questionnaire.id);

    // 2. Buscar uma resposta existente
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id))
      .limit(1);

    if (!response) {
      console.log('❌ Nenhuma resposta encontrada');
      process.exit(1);
    }

    console.log('✅ Resposta encontrada');
    console.log('User ID:', response.userId);
    console.log('Response ID:', response.id);

    // 3. Buscar o usuário
    const [user] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone
      })
      .from(users)
      .where(eq(users.id, response.userId))
      .limit(1);

    console.log('\n👤 Usuário:', user?.name);

    // 4. Processar respostas (simulando o endpoint)
    const userResponses = typeof response.responses === 'string'
      ? JSON.parse(response.responses)
      : response.responses;

    console.log('\n📊 Estrutura das respostas:');
    console.log('Tipo:', typeof response.responses);
    console.log('É string?', typeof response.responses === 'string');
    console.log('Respostas processadas:', userResponses);

    // 5. Montar resposta como o endpoint faz
    const endpointResponse = {
      user,
      response: {
        submittedAt: response.submittedAt?.toISOString(),
        responses: userResponses,
        availabilities: []
      },
      template: {
        questions: questionnaire.questions,
        month: questionnaire.month,
        year: questionnaire.year
      }
    };

    console.log('\n📦 Resposta do endpoint:');
    console.log(JSON.stringify(endpointResponse, null, 2));

    // 6. Verificar estrutura das perguntas
    console.log('\n❓ Perguntas do questionário:');
    if (Array.isArray(questionnaire.questions)) {
      questionnaire.questions.forEach((q: any, i: number) => {
        console.log(`  ${i + 1}. [ID: ${q.id}] ${q.text || q.question}`);
        const answer = userResponses[q.id];
        if (answer !== undefined && answer !== null && answer !== '') {
          console.log(`     Resposta: ${JSON.stringify(answer)}`);
        } else {
          console.log(`     Resposta: (vazia)`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testResponseEndpoint();