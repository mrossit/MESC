/**
 * Script para verificar disponibilidade dos ministros para eventos de novembro
 */

import { db } from '../server/db.js';
import { users, questionnaireResponses, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function verifyNovemberAvailability() {
  console.log('\n🔍 Verificando disponibilidade para eventos de novembro 2025...\n');

  try {
    // 1. Buscar questionário de novembro
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(eq(questionnaires.month, 11), eq(questionnaires.year, 2025)));

    if (!questionnaire) {
      console.error('❌ Questionário de novembro não encontrado!');
      return;
    }

    console.log(`✅ Questionário: ${questionnaire.title}\n`);

    // 2. Buscar todas as respostas
    const responses = await db
      .select({
        responseId: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        userName: users.name,
        userEmail: users.email,
        responses: questionnaireResponses.responses
      })
      .from(questionnaireResponses)
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    console.log(`📊 Total de respostas: ${responses.length}\n`);

    if (responses.length === 0) {
      console.log('⚠️  Nenhuma resposta registrada ainda.');
      return;
    }

    // 3. Analisar disponibilidade por evento
    const events = {
      puc_20_11: { name: 'PUC - Consciência Negra (20/11 10h)', ministers: [] as string[] },
      sjt_7h: { name: 'São Judas 28/11 - 7h', ministers: [] as string[] },
      sjt_15h: { name: 'São Judas 28/11 - 15h', ministers: [] as string[] },
      sjt_19h30: { name: 'São Judas 28/11 - 19h30', ministers: [] as string[] },
      finados: { name: 'Finados (02/11 15h30)', ministers: [] as string[] }
    };

    // 4. Processar cada resposta
    for (const response of responses) {
      const parsed = typeof response.responses === 'string'
        ? JSON.parse(response.responses)
        : response.responses;

      const specialEvents = parsed.special_events || {};

      // PUC / Consciência Negra
      if (specialEvents.consciencia_negra || specialEvents.puc_20_11) {
        events.puc_20_11.ministers.push(response.userName);
      }

      // São Judas mensal
      if (specialEvents.saint_judas_monthly_7h) {
        events.sjt_7h.ministers.push(response.userName);
      }
      if (specialEvents.saint_judas_monthly_15h) {
        events.sjt_15h.ministers.push(response.userName);
      }
      if (specialEvents.saint_judas_monthly_19h30) {
        events.sjt_19h30.ministers.push(response.userName);
      }

      // Finados
      if (specialEvents.finados) {
        events.finados.ministers.push(response.userName);
      }
    }

    // 5. Exibir relatório
    console.log('='.repeat(70));
    console.log('📋 RELATÓRIO DE DISPONIBILIDADE - EVENTOS ESPECIAIS NOVEMBRO 2025');
    console.log('='.repeat(70));

    for (const [key, event] of Object.entries(events)) {
      console.log(`\n${event.name}:`);
      console.log(`  Ministros disponíveis: ${event.ministers.length}`);
      if (event.ministers.length > 0) {
        event.ministers.forEach((name, index) => {
          console.log(`    ${index + 1}. ${name}`);
        });
      } else {
        console.log('    ⚠️  Nenhum ministro disponível');
      }
    }

    console.log('\n' + '='.repeat(70));

    // 6. Detalhamento individual
    console.log('\n📊 DETALHAMENTO POR MINISTRO:\n');

    for (const response of responses) {
      const parsed = typeof response.responses === 'string'
        ? JSON.parse(response.responses)
        : response.responses;

      const specialEvents = parsed.special_events || {};
      const availableEvents = [];

      if (specialEvents.consciencia_negra || specialEvents.puc_20_11) {
        availableEvents.push('PUC 20/11');
      }
      if (specialEvents.saint_judas_monthly_7h) {
        availableEvents.push('SJ 7h');
      }
      if (specialEvents.saint_judas_monthly_15h) {
        availableEvents.push('SJ 15h');
      }
      if (specialEvents.saint_judas_monthly_19h30) {
        availableEvents.push('SJ 19h30');
      }
      if (specialEvents.finados) {
        availableEvents.push('Finados');
      }

      if (availableEvents.length > 0) {
        console.log(`${response.userName}:`);
        console.log(`  Disponível para: ${availableEvents.join(', ')}`);
      }
    }

    console.log('\n✅ Verificação concluída!\n');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    throw error;
  }
}

// Executar script
verifyNovemberAvailability()
  .then(() => {
    console.log('🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script falhou:', error);
    process.exit(1);
  });
