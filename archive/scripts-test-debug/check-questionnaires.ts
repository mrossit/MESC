import { db } from '../server/db';
import { questionnaires } from '@shared/schema';

async function checkQuestionnaires() {
  try {
    console.log('🔍 Verificando questionários no banco de dados...\n');

    const allQuestionnaires = await db.select().from(questionnaires);

    if (allQuestionnaires.length === 0) {
      console.log('⚠️ Nenhum questionário encontrado no banco de dados');
      return;
    }

    allQuestionnaires.forEach((q, index) => {
      console.log(`\n📋 Questionário ${index + 1}:`);
      console.log('- ID:', q.id);
      console.log('- Título:', q.title);
      console.log('- Descrição:', q.description);
      console.log('- Mês/Ano:', `${q.month}/${q.year}`);
      console.log('- Status:', q.status);
      console.log('- Total de perguntas:', q.questions.length);

      console.log('\n📝 Perguntas:');
      q.questions.forEach((question: any, qIndex: number) => {
        console.log(`\n  Pergunta ${qIndex + 1}:`);
        console.log(`  - ID: ${question.id}`);
        console.log(`  - Tipo: ${question.type}`);
        console.log(`  - Texto: ${question.question || question.text}`);
        console.log(`  - Obrigatória: ${question.required ? 'Sim' : 'Não'}`);

        if (question.options) {
          console.log(`  - Opções: ${question.options.join(', ')}`);
        }

        if (question.condition) {
          console.log(`  - Condição: Depende da pergunta ${question.condition.questionId} = ${question.condition.value}`);
        }
      });

      console.log('\n' + '='.repeat(60));
    });

    // Verificar se há o questionário padrão com todas as perguntas
    console.log('\n\n🔎 ANÁLISE DO PROBLEMA:');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentQuestionnaire = allQuestionnaires.find(
      q => q.month === currentMonth && q.year === currentYear
    );

    if (currentQuestionnaire) {
      const questionsCount = currentQuestionnaire.questions.length;
      console.log(`\n✅ Questionário do mês atual encontrado`);
      console.log(`⚠️  Problema identificado: Apenas ${questionsCount} perguntas (deveria ter 10)`);

      if (questionsCount < 10) {
        console.log('\n📌 Perguntas que parecem estar faltando:');
        console.log('- Pergunta sobre casamento (condicional)');
        console.log('- Pergunta sobre disponibilidade para substituições');
        console.log('- Pergunta sobre missas diárias');
        console.log('- Pergunta sobre eventos especiais');
        console.log('- Outras perguntas relevantes');
      }
    } else {
      console.log('❌ Nenhum questionário encontrado para o mês atual');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar questionários:', error);
  }

  process.exit(0);
}

checkQuestionnaires();