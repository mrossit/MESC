import { db } from '../server/db';
import { users, questionnaires, questionnaireResponses } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function verifySeptemberResponses() {
  try {
    console.log('🔍 Verificando respostas do questionário de SETEMBRO/2025...\n');

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
      console.log('❌ Questionário de setembro/2025 não encontrado!');
      process.exit(1);
    }

    console.log('📋 Questionário encontrado:', questionnaire.id);
    console.log('Status:', questionnaire.status);
    console.log('Perguntas:', questionnaire.questions.length);

    // 2. Buscar todas as respostas
    const responses = await db
      .select({
        responseId: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        userName: users.name,
        userEmail: users.email,
        responses: questionnaireResponses.responses,
        submittedAt: questionnaireResponses.submittedAt
      })
      .from(questionnaireResponses)
      .leftJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id))
      .orderBy(users.name);

    console.log(`\n📊 Total de respostas: ${responses.length}`);
    console.log('='.repeat(60));

    // 3. Analisar cada resposta
    for (const response of responses) {
      console.log(`\n👤 ${response.userName} (${response.userEmail})`);
      console.log(`   Enviado em: ${response.submittedAt?.toLocaleString('pt-BR')}`);

      const answers = response.responses as any;

      // Disponibilidade
      if (answers['1']) {
        console.log(`   📅 Domingos disponíveis: ${Array.isArray(answers['1']) ? answers['1'].join(', ') : answers['1']}`);
      }

      // Funções
      if (answers['4']) {
        console.log(`   🎯 Funções: ${Array.isArray(answers['4']) ? answers['4'].join(', ') : answers['4']}`);
      }

      // Horários preferidos
      if (answers['6']) {
        console.log(`   ⏰ Horários: ${Array.isArray(answers['6']) ? answers['6'].join(', ') : answers['6']}`);
      }

      // Restrições
      if (answers['2'] === 'sim') {
        console.log(`   ⚠️  Restrição de horário: ${answers['3'] || 'Não especificado'}`);
      }

      // Impedimentos
      if (answers['7'] === 'sim') {
        console.log(`   🏥 Impedimento de saúde: ${answers['8'] || 'Não especificado'}`);
      }

      // Formação
      console.log(`   📚 Participará da formação: ${answers['5']}`);

      // Confirmação
      console.log(`   ✅ Confirma disponibilidade: ${answers['10']}`);
    }

    // 4. Estatísticas gerais
    console.log('\n' + '='.repeat(60));
    console.log('📈 ESTATÍSTICAS GERAIS');
    console.log('='.repeat(60));

    // Disponibilidade por domingo
    const availabilityCount: Record<string, number> = {};
    const functionCount: Record<string, number> = {};
    const scheduleCount: Record<string, number> = {};
    let formationCount = 0;
    let restrictionCount = 0;
    let healthCount = 0;

    for (const response of responses) {
      const answers = response.responses as any;

      // Contar disponibilidade
      if (Array.isArray(answers['1'])) {
        for (const sunday of answers['1']) {
          availabilityCount[sunday] = (availabilityCount[sunday] || 0) + 1;
        }
      }

      // Contar funções
      if (Array.isArray(answers['4'])) {
        for (const func of answers['4']) {
          functionCount[func] = (functionCount[func] || 0) + 1;
        }
      }

      // Contar horários
      if (Array.isArray(answers['6'])) {
        for (const schedule of answers['6']) {
          scheduleCount[schedule] = (scheduleCount[schedule] || 0) + 1;
        }
      }

      // Contar formação
      if (answers['5'] === 'sim') formationCount++;

      // Contar restrições
      if (answers['2'] === 'sim') restrictionCount++;
      if (answers['7'] === 'sim') healthCount++;
    }

    console.log('\n📅 Disponibilidade por domingo:');
    for (const [sunday, count] of Object.entries(availabilityCount).sort()) {
      const percentage = ((count / responses.length) * 100).toFixed(1);
      console.log(`   ${sunday}: ${count} ministros (${percentage}%)`);
    }

    console.log('\n🎯 Ministros por função:');
    for (const [func, count] of Object.entries(functionCount).sort()) {
      const percentage = ((count / responses.length) * 100).toFixed(1);
      console.log(`   ${func}: ${count} ministros (${percentage}%)`);
    }

    console.log('\n⏰ Preferência de horários:');
    for (const [schedule, count] of Object.entries(scheduleCount).sort()) {
      const percentage = ((count / responses.length) * 100).toFixed(1);
      console.log(`   ${schedule}: ${count} ministros (${percentage}%)`);
    }

    console.log('\n📊 Outras estatísticas:');
    console.log(`   Participarão da formação: ${formationCount} (${((formationCount / responses.length) * 100).toFixed(1)}%)`);
    console.log(`   Com restrição de horário: ${restrictionCount} (${((restrictionCount / responses.length) * 100).toFixed(1)}%)`);
    console.log(`   Com impedimento de saúde: ${healthCount} (${((healthCount / responses.length) * 100).toFixed(1)}%)`);

    console.log('\n✅ Verificação concluída!');
    console.log('As respostas estão prontas para gerar a escala automática.');

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }

  process.exit(0);
}

verifySeptemberResponses();