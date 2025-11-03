import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkQuestionnaire() {
  console.log('🔍 VERIFICANDO QUESTIONÁRIO - Novembro 2025\n');

  try {
    // Buscar o questionário de Novembro 2025
    const [questionnaire] = await client`
      SELECT id, title, questions, created_at
      FROM questionnaires
      WHERE year = 2025 AND month = 11
      LIMIT 1
    `;

    if (!questionnaire) {
      console.log('❌ Questionário de Novembro 2025 não encontrado!');
      return;
    }

    console.log('📋 Questionário encontrado:');
    console.log(`   ID: ${questionnaire.id}`);
    console.log(`   Título: ${questionnaire.title}`);
    console.log(`   Criado em: ${questionnaire.created_at}\n`);

    const questions = typeof questionnaire.questions === 'string'
      ? JSON.parse(questionnaire.questions)
      : questionnaire.questions;

    console.log('═'.repeat(80));
    console.log('📝 PERGUNTAS DO QUESTIONÁRIO:\n');

    // Procurar perguntas relacionadas aos eventos especiais
    const adorationQuestion = questions.find((q: any) =>
      q.id === 'adoration_monday' ||
      q.question?.toLowerCase().includes('adoração') ||
      q.question?.toLowerCase().includes('adoration')
    );

    const finadosQuestion = questions.find((q: any) =>
      q.id?.toLowerCase().includes('finados') ||
      q.question?.toLowerCase().includes('finados')
    );

    const mass20Question = questions.find((q: any) =>
      q.question?.includes('20/11') ||
      q.question?.includes('20 de novembro')
    );

    console.log('🕯️  ADORAÇÃO NA SEGUNDA-FEIRA:');
    if (adorationQuestion) {
      console.log('   ✅ Pergunta encontrada!');
      console.log(`   ID: ${adorationQuestion.id}`);
      console.log(`   Pergunta: ${adorationQuestion.question}`);
      console.log(`   Tipo: ${adorationQuestion.type}`);
      console.log(`   Obrigatória: ${adorationQuestion.required ? 'Sim' : 'Não'}`);
      if (adorationQuestion.options) {
        console.log(`   Opções:`, adorationQuestion.options);
      }
    } else {
      console.log('   ❌ Pergunta NÃO encontrada no questionário!');
    }

    console.log('\n⚰️  FINADOS (02/11):');
    if (finadosQuestion) {
      console.log('   ✅ Pergunta encontrada!');
      console.log(`   ID: ${finadosQuestion.id}`);
      console.log(`   Pergunta: ${finadosQuestion.question}`);
      console.log(`   Tipo: ${finadosQuestion.type}`);
    } else {
      console.log('   ❌ Pergunta NÃO encontrada no questionário!');
    }

    console.log('\n📅 MISSA ESPECIAL 20/11:');
    if (mass20Question) {
      console.log('   ✅ Pergunta encontrada!');
      console.log(`   ID: ${mass20Question.id}`);
      console.log(`   Pergunta: ${mass20Question.question}`);
      console.log(`   Tipo: ${mass20Question.type}`);
    } else {
      console.log('   ❌ Pergunta NÃO encontrada no questionário!');
    }

    console.log('\n═'.repeat(80));
    console.log(`\n📊 Total de perguntas no questionário: ${questions.length}\n`);

    // Mostrar todas as perguntas de eventos especiais
    console.log('═'.repeat(80));
    console.log('🎯 TODAS AS PERGUNTAS DE EVENTOS ESPECIAIS:\n');

    const specialEventQuestions = questions.filter((q: any) =>
      q.category === 'special_event' ||
      q.id?.startsWith('special_event_') ||
      q.id?.includes('adoration') ||
      q.id?.includes('finados') ||
      q.question?.toLowerCase().includes('especial')
    );

    if (specialEventQuestions.length > 0) {
      specialEventQuestions.forEach((q: any, index: number) => {
        console.log(`${index + 1}. ID: ${q.id}`);
        console.log(`   Pergunta: ${q.question}`);
        console.log(`   Tipo: ${q.type}`);
        console.log(`   Categoria: ${q.category || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhuma pergunta de evento especial encontrada!\n');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkQuestionnaire();
