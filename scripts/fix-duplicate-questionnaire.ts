import { db } from '../server/db';
import { questionnaires, questionnaireResponses } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixDuplicateQuestionnaire() {
  try {
    console.log('🔧 Corrigindo questionários duplicados...\n');

    // ID do questionário incorreto (com apenas 4 perguntas)
    const wrongQuestionnaireId = 'a84bfba9-11b7-4c13-a40e-af1d5ce2faaa';

    // ID do questionário correto (com 10 perguntas)
    const correctQuestionnaireId = '1d636595-ebf8-4cd2-8682-84fe6e1dbc6c';

    // Verificar se existem respostas para o questionário incorreto
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, wrongQuestionnaireId));

    if (responses.length > 0) {
      console.log(`⚠️  Encontradas ${responses.length} respostas para o questionário incorreto`);
      console.log('📝 Migrando respostas para o questionário correto...');

      // Migrar respostas para o questionário correto
      await db
        .update(questionnaireResponses)
        .set({ questionnaireId: correctQuestionnaireId })
        .where(eq(questionnaireResponses.questionnaireId, wrongQuestionnaireId));

      console.log('✅ Respostas migradas com sucesso');
    } else {
      console.log('✅ Nenhuma resposta encontrada para o questionário incorreto');
    }

    // Deletar o questionário incorreto
    console.log('\n🗑️  Removendo questionário duplicado com apenas 4 perguntas...');
    await db
      .delete(questionnaires)
      .where(eq(questionnaires.id, wrongQuestionnaireId));

    console.log('✅ Questionário duplicado removido com sucesso');

    // Verificar o questionário restante
    const [remainingQuestionnaire] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, correctQuestionnaireId));

    if (remainingQuestionnaire) {
      console.log('\n✨ Questionário correto mantido:');
      console.log('- ID:', remainingQuestionnaire.id);
      console.log('- Título:', remainingQuestionnaire.title);
      console.log('- Total de perguntas:', remainingQuestionnaire.questions.length);
      console.log('- Status:', remainingQuestionnaire.status);
    }

    console.log('\n🎉 Correção concluída com sucesso!');
    console.log('O sistema agora está usando o questionário com 10 perguntas.');

  } catch (error) {
    console.error('❌ Erro ao corrigir questionários:', error);
  }

  process.exit(0);
}

fixDuplicateQuestionnaire();