import { db } from '../server/db.js';
import { questionnaires, questionnaireResponses, users } from '../shared/schema.js';
import { desc, eq, and, ne, or } from 'drizzle-orm';

async function checkAllQuestionnaires() {
  console.log('\n📋 VERIFICANDO TODOS OS QUESTIONÁRIOS\n');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar todos os questionários
    const allQuestionnaires = await db.select()
      .from(questionnaires)
      .orderBy(desc(questionnaires.year), desc(questionnaires.month));

    if (allQuestionnaires.length === 0) {
      console.log('\n❌ Nenhum questionário encontrado no banco de dados');
      console.log('\n💡 Para criar um questionário, o gestor deve:');
      console.log('   1. Acessar a área de gestão');
      console.log('   2. Criar um novo questionário para o mês desejado');
      console.log('   3. Enviar para os ministros responderem');
      return;
    }

    console.log(`\n📊 Total de questionários encontrados: ${allQuestionnaires.length}\n`);

    // 2. Listar todos os questionários
    for (const quest of allQuestionnaires) {
      console.log(`\n📅 Questionário ${quest.month}/${quest.year}:`);
      console.log(`   - ID: ${quest.id}`);
      console.log(`   - Status: ${quest.status}`);
      console.log(`   - Criado em: ${quest.createdAt}`);

      // Buscar respostas para este questionário
      const responses = await db.select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, quest.id));

      console.log(`   - Total de respostas: ${responses.length}`);

      // Verificar respostas com disponibilidade para missas diárias
      let withDailyMass = 0;
      let withoutDailyMass = 0;
      let noDailyMass = 0;

      for (const resp of responses) {
        const dailyMass = resp.dailyMassAvailability || [];
        if (dailyMass.length === 0) {
          withoutDailyMass++;
        } else if (dailyMass.includes('Não posso')) {
          noDailyMass++;
        } else {
          withDailyMass++;
        }
      }

      console.log(`   - Com disponibilidade para missas diárias: ${withDailyMass}`);
      console.log(`   - Sem resposta para missas diárias: ${withoutDailyMass}`);
      console.log(`   - Marcaram "Não posso" para missas diárias: ${noDailyMass}`);
    }

    // 3. Buscar ministros para comparação
    const ministers = await db.select({
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

    console.log(`\n👥 Total de ministros ativos: ${ministers.length}`);

    // 4. Verificar o questionário mais recente
    if (allQuestionnaires.length > 0) {
      const latest = allQuestionnaires[0];
      console.log(`\n📍 Questionário mais recente: ${latest.month}/${latest.year} (${latest.status})`);

      const responses = await db.select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, latest.id));

      const respondedIds = new Set(responses.map(r => r.userId));
      const notResponded = ministers.filter(m => !respondedIds.has(m.id));

      if (notResponded.length > 0) {
        console.log(`\n⚠️  Ministros que NÃO responderam ao questionário mais recente:`);
        for (const minister of notResponded) {
          console.log(`   - ${minister.name} (${minister.id})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar questionários:', error);
  }

  process.exit(0);
}

checkAllQuestionnaires();