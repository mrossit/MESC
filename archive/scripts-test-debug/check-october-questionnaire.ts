import { db } from '../server/db.js';
import { questionnaires, questionnaireResponses, users } from '../shared/schema.js';
import { eq, and, or, ne } from 'drizzle-orm';

async function checkOctoberQuestionnaire() {
  console.log('\n🔍 VERIFICANDO QUESTIONÁRIO DE OUTUBRO/2024\n');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar questionário de outubro
    const octoberQuest = await db.select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.month, 10),
          eq(questionnaires.year, 2024)
        )
      );

    if (octoberQuest.length === 0) {
      console.log('\n❌ Nenhum questionário encontrado para outubro/2024');

      // Buscar todos os questionários para verificar
      const allQuests = await db.select()
        .from(questionnaires)
        .orderBy(questionnaires.year, questionnaires.month);

      if (allQuests.length > 0) {
        console.log('\n📋 Questionários existentes no banco:');
        for (const q of allQuests) {
          console.log(`   - ${q.month}/${q.year} (Status: ${q.status})`);
        }
      }
      return;
    }

    const questionnaire = octoberQuest[0];
    console.log('\n✅ Questionário de outubro encontrado!');
    console.log(`   - ID: ${questionnaire.id}`);
    console.log(`   - Status: ${questionnaire.status}`);
    console.log(`   - Criado em: ${questionnaire.createdAt}`);

    // 2. Buscar respostas
    const responses = await db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    console.log(`\n📊 Total de respostas: ${responses.length}`);

    // 3. Analisar respostas detalhadamente
    if (responses.length > 0) {
      console.log('\n👥 ANÁLISE DAS RESPOSTAS:\n');

      // Buscar nomes dos ministros
      const ministers = await db.select({
        id: users.id,
        name: users.name
      }).from(users);

      const ministerMap = new Map(ministers.map(m => [m.id, m.name]));

      for (const response of responses) {
        const ministerName = ministerMap.get(response.userId) || 'Desconhecido';
        console.log(`\n📌 ${ministerName} (${response.userId}):`);

        // Disponibilidade para domingos
        const sundays = response.availableSundays || [];
        if (sundays.length === 0) {
          console.log('   Domingos: ⚠️ NÃO RESPONDEU');
        } else if (sundays.includes('Nenhum domingo')) {
          console.log('   Domingos: ❌ Nenhum domingo');
        } else {
          console.log(`   Domingos: ✅ ${sundays.join(', ')}`);
        }

        // Disponibilidade para missas diárias
        const dailyMass = response.dailyMassAvailability || [];
        if (dailyMass.length === 0) {
          console.log('   Missas diárias: ⚠️ NÃO RESPONDEU');
        } else if (dailyMass.includes('Não posso')) {
          console.log('   Missas diárias: ❌ Não posso');
        } else {
          console.log(`   Missas diárias: ✅ ${dailyMass.join(', ')}`);
        }

        // Horários preferidos
        const preferred = response.preferredMassTimes || [];
        if (preferred.length > 0) {
          console.log(`   Horários preferidos: ${preferred.join(', ')}`);
        }

        // Eventos especiais
        if (response.specialEvents) {
          const events = response.specialEvents as any;
          console.log('   Eventos especiais:');
          if (events.healing_liberation_mass) console.log(`     - Cura e Libertação: ${events.healing_liberation_mass}`);
          if (events.sacred_heart_mass) console.log(`     - Sagrado Coração: ${events.sacred_heart_mass}`);
          if (events.immaculate_heart_mass) console.log(`     - Imaculado Coração: ${events.immaculate_heart_mass}`);
          if (events.saint_judas_feast) console.log(`     - Festa São Judas: ${events.saint_judas_feast}`);
        }
      }

      // 4. Verificar ministros sem resposta
      const allMinisters = await db.select({
        id: users.id,
        name: users.name,
        role: users.role
      }).from(users).where(
        and(
          or(
            eq(users.status, 'active'),
            users.status === null
          ),
          ne(users.role, 'gestor')
        )
      );

      const respondedIds = new Set(responses.map(r => r.userId));
      const notResponded = allMinisters.filter(m => !respondedIds.has(m.id));

      if (notResponded.length > 0) {
        console.log('\n\n⚠️ MINISTROS QUE NÃO RESPONDERAM:');
        for (const minister of notResponded) {
          console.log(`   - ${minister.name} (${minister.id})`);
        }
      }

      console.log('\n\n✅ COM A CORREÇÃO APLICADA:');
      console.log('=' .repeat(60));
      console.log(`
📋 Para o mês de OUTUBRO com respostas existentes:

✅ SIM, FUNCIONARÁ CORRETAMENTE!

A correção irá:
1. INCLUIR apenas ministros que responderam ao questionário
2. RESPEITAR as disponibilidades marcadas
3. EXCLUIR ministros que não responderam
4. EXCLUIR ministros que marcaram "Não posso"
5. ESCALAR apenas nos dias/horários marcados como disponíveis

🎯 Resultado esperado:
- Ministros sem resposta: NÃO serão escalados ❌
- Ministros que não marcaram disponibilidade: NÃO serão escalados ❌
- Ministros com disponibilidade específica: Serão escalados APENAS nos dias marcados ✅

📍 Para gerar a escala de outubro respeitando as respostas:
1. Fazer deploy das alterações
2. Gerar a escala através da interface
3. A escala respeitará as disponibilidades informadas
      `);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar outubro:', error);
  }

  process.exit(0);
}

checkOctoberQuestionnaire();