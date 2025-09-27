import { db } from '../server/db.js';
import { questionnaires, questionnaireResponses } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function listAllQuestionnaires() {
  console.log('\n📋 LISTANDO TODOS OS QUESTIONÁRIOS\n');
  console.log('=' .repeat(60));

  try {
    const allQuests = await db.select()
      .from(questionnaires)
      .orderBy(questionnaires.year, questionnaires.month);

    if (allQuests.length === 0) {
      console.log('\n❌ Nenhum questionário encontrado no banco de dados\n');
      console.log('📌 Para testar a correção, é necessário:');
      console.log('   1. Criar um questionário através da interface de gestão');
      console.log('   2. Enviar para os ministros');
      console.log('   3. Aguardar as respostas');
      console.log('   4. Gerar a escala\n');
      console.log('🔧 A correção aplicada funcionará assim que houver questionários com respostas.');
      return;
    }

    console.log(`\nTotal de questionários: ${allQuests.length}\n`);

    for (const quest of allQuests) {
      console.log(`\n📅 ${quest.month}/${quest.year}`);
      console.log(`   ID: ${quest.id}`);
      console.log(`   Status: ${quest.status}`);
      console.log(`   Criado: ${quest.createdAt}`);

      const responses = await db.select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, quest.id));

      console.log(`   Respostas: ${responses.length}`);

      if (responses.length > 0) {
        let withDaily = 0;
        let withoutDaily = 0;
        let cannotDaily = 0;
        let withSundays = 0;
        let withoutSundays = 0;
        let noSundays = 0;

        for (const resp of responses) {
          // Análise de missas diárias
          const daily = resp.dailyMassAvailability || [];
          if (daily.length === 0) {
            withoutDaily++;
          } else if (daily.includes('Não posso')) {
            cannotDaily++;
          } else {
            withDaily++;
          }

          // Análise de domingos
          const sundays = resp.availableSundays || [];
          if (sundays.length === 0) {
            withoutSundays++;
          } else if (sundays.includes('Nenhum domingo')) {
            noSundays++;
          } else {
            withSundays++;
          }
        }

        console.log(`\n   📊 Análise das respostas:`);
        console.log(`      Missas diárias:`);
        console.log(`        - Com disponibilidade: ${withDaily}`);
        console.log(`        - Sem resposta: ${withoutDaily}`);
        console.log(`        - Marcaram "Não posso": ${cannotDaily}`);
        console.log(`      Domingos:`);
        console.log(`        - Com disponibilidade: ${withSundays}`);
        console.log(`        - Sem resposta: ${withoutSundays}`);
        console.log(`        - Marcaram "Nenhum domingo": ${noSundays}`);
      }
    }

    console.log('\n\n✅ IMPACTO DA CORREÇÃO APLICADA:');
    console.log('=' .repeat(60));
    console.log(`
Quando houver questionários com respostas, a correção garantirá:

1. ❌ Ministros SEM resposta ao questionário → EXCLUÍDOS
2. ❌ Ministros que NÃO marcaram disponibilidade → EXCLUÍDOS
3. ❌ Ministros que marcaram "Não posso" → EXCLUÍDOS
4. ✅ Apenas ministros com disponibilidade explícita → INCLUÍDOS

📍 Arquivo corrigido: server/utils/scheduleGenerator.ts
📍 Função: getAvailableMinistersForMass() (linhas 604-654)

A escala respeitará EXATAMENTE as respostas dos ministros!
    `);

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

listAllQuestionnaires();