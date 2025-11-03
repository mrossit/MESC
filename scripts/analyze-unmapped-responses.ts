import { db } from '../server/db';
import { questionnaireResponses, users } from '../server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Script para analisar respostas não mapeadas do questionário de Novembro 2025
 * Identifica quais perguntas não estão sendo salvas corretamente
 */

const NOVEMBER_QUESTIONNAIRE_ID = '3524fdec-aa9d-46af-933b-40c9e53d7e71';

async function analyzeUnmappedResponses() {
  console.log('🔍 Analisando respostas não mapeadas...\n');

  try {
    // Buscar todas as respostas do questionário de novembro
    const responses = await db
      .select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        unmappedResponses: questionnaireResponses.unmappedResponses,
        processingWarnings: questionnaireResponses.processingWarnings,
      })
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, NOVEMBER_QUESTIONNAIRE_ID));

    console.log(`📊 Total de respostas: ${responses.length}\n`);

    // Mapear todas as perguntas não mapeadas
    const unmappedQuestions = new Map<string, number>();
    let totalWithUnmapped = 0;
    let totalWarnings = 0;

    for (const response of responses) {
      if (response.unmappedResponses && Array.isArray(response.unmappedResponses)) {
        if (response.unmappedResponses.length > 0) {
          totalWithUnmapped++;
          
          for (const unmapped of response.unmappedResponses) {
            const questionId = unmapped.questionId || 'unknown';
            unmappedQuestions.set(
              questionId,
              (unmappedQuestions.get(questionId) || 0) + 1
            );
          }
        }
      }

      if (response.processingWarnings && Array.isArray(response.processingWarnings)) {
        if (response.processingWarnings.length > 0) {
          totalWarnings++;
        }
      }
    }

    console.log(`⚠️  Respostas com dados não mapeados: ${totalWithUnmapped}`);
    console.log(`⚠️  Respostas com avisos de processamento: ${totalWarnings}\n`);

    if (unmappedQuestions.size > 0) {
      console.log('📋 Perguntas não mapeadas:\n');
      console.log('ID da Pergunta'.padEnd(40) + 'Ocorrências');
      console.log('─'.repeat(60));

      // Ordenar por número de ocorrências (decrescente)
      const sorted = Array.from(unmappedQuestions.entries())
        .sort((a, b) => b[1] - a[1]);

      for (const [questionId, count] of sorted) {
        console.log(`${questionId.padEnd(40)} ${count}`);
      }
    } else {
      console.log('✅ Nenhuma pergunta não mapeada encontrada!');
    }

    // Buscar exemplos específicos
    console.log('\n🔬 Exemplos detalhados:\n');
    
    const examplesWithUnmapped = responses
      .filter(r => r.unmappedResponses && Array.isArray(r.unmappedResponses) && r.unmappedResponses.length > 0)
      .slice(0, 3);

    for (const example of examplesWithUnmapped) {
      // Buscar nome do usuário
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, example.userId))
        .limit(1);

      console.log(`👤 Ministro: ${user?.name || 'Desconhecido'}`);
      console.log(`Respostas não mapeadas:`);
      console.log(JSON.stringify(example.unmappedResponses, null, 2));
      
      if (example.processingWarnings && Array.isArray(example.processingWarnings) && example.processingWarnings.length > 0) {
        console.log(`Avisos:`);
        console.log(JSON.stringify(example.processingWarnings, null, 2));
      }
      console.log('');
    }

    // Verificar especificamente adoration_monday
    console.log('🔍 Verificando especificamente "adoration_monday":\n');
    
    let adorationCount = 0;
    for (const response of responses) {
      if (response.unmappedResponses && Array.isArray(response.unmappedResponses)) {
        const hasAdoration = response.unmappedResponses.some(
          (u: any) => u.questionId === 'adoration_monday'
        );
        if (hasAdoration) {
          adorationCount++;
        }
      }
    }

    console.log(`Respostas com adoration_monday não mapeada: ${adorationCount}`);
    
    if (adorationCount === 0) {
      console.log('✅ A pergunta adoration_monday não foi respondida por nenhum ministro');
      console.log('   (respostas vazias são filtradas no frontend)');
    }

  } catch (error) {
    console.error('❌ Erro ao analisar respostas:', error);
  }
}

// Executar análise
analyzeUnmappedResponses()
  .then(() => {
    console.log('\n✨ Análise concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
