import { db } from '../server/db.js';
import { users, questionnaireResponses, questionnaires } from '../shared/schema.js';
import { eq, and, or, ne } from 'drizzle-orm';

async function checkAvailabilityIssues() {
  console.log('\n🔍 VERIFICANDO PROBLEMAS DE DISPONIBILIDADE\n');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar todos os ministros ativos
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

    console.log(`\n📊 Total de ministros ativos: ${ministers.length}`);

    // 2. Buscar questionário do mês atual
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const activeQuestionnaire = await db.select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.month, currentMonth),
          eq(questionnaires.year, currentYear)
        )
      );

    if (activeQuestionnaire.length === 0) {
      console.log('\n❌ Nenhum questionário encontrado para o mês atual');
      return;
    }

    console.log(`\n📋 Questionário encontrado:`);
    console.log(`   - ID: ${activeQuestionnaire[0].id}`);
    console.log(`   - Status: ${activeQuestionnaire[0].status}`);
    console.log(`   - Mês/Ano: ${activeQuestionnaire[0].month}/${activeQuestionnaire[0].year}`);

    // 3. Buscar respostas do questionário
    const responses = await db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, activeQuestionnaire[0].id));

    console.log(`\n📊 Total de respostas: ${responses.length}`);

    // 4. Analisar ministros sem resposta
    const ministersWithResponse = new Set(responses.map(r => r.userId));
    const ministersWithoutResponse = ministers.filter(m => !ministersWithResponse.has(m.id));

    console.log(`\n⚠️  Ministros SEM resposta ao questionário: ${ministersWithoutResponse.length}`);
    if (ministersWithoutResponse.length > 0) {
      console.log('\nLista de ministros sem resposta:');
      ministersWithoutResponse.forEach(m => {
        console.log(`   - ${m.name} (${m.id})`);
      });
    }

    // 5. Analisar disponibilidade para missas diárias
    console.log('\n\n📅 ANÁLISE DE DISPONIBILIDADE PARA MISSAS DIÁRIAS:');
    console.log('-'.repeat(60));

    for (const response of responses) {
      const minister = ministers.find(m => m.id === response.userId);
      if (!minister) continue;

      const dailyMass = response.dailyMassAvailability || [];
      const sundays = response.availableSundays || [];

      console.log(`\n👤 ${minister.name}:`);

      // Missas diárias
      if (dailyMass.length === 0) {
        console.log('   📌 Missas diárias: NÃO RESPONDEU (será incluído por padrão!)');
      } else if (dailyMass.includes('Não posso')) {
        console.log('   ❌ Missas diárias: NÃO DISPONÍVEL');
      } else {
        console.log(`   ✅ Missas diárias: ${dailyMass.join(', ')}`);
      }

      // Domingos
      if (sundays.length === 0) {
        console.log('   📌 Domingos: NÃO RESPONDEU (será incluído por padrão!)');
      } else if (sundays.includes('Nenhum domingo')) {
        console.log('   ❌ Domingos: NÃO DISPONÍVEL');
      } else {
        console.log(`   ✅ Domingos disponíveis: ${sundays.join(', ')}`);
      }

      // Horários preferidos
      const preferred = response.preferredMassTimes || [];
      if (preferred.length > 0) {
        console.log(`   ⏰ Horários preferidos: ${preferred.join(', ')}`);
      }
    }

    // 6. Identificar o problema principal
    console.log('\n\n🚨 PROBLEMA IDENTIFICADO:');
    console.log('=' .repeat(60));
    console.log(`
O código atual em scheduleGenerator.ts está INCLUINDO ministros que:
1. Não responderam ao questionário (${ministersWithoutResponse.length} ministros)
2. Não marcaram disponibilidade específica para missas diárias

Isso ocorre porque a função getAvailableMinistersForMass() retorna TRUE
quando não há dados de disponibilidade, ao invés de FALSE.

📍 Linhas problemáticas no código:
- Linha 608: retorna true quando não há dados
- Linha 631: considera disponível para domingos sem dados
- Linha 641: considera disponível para missas diárias sem dados

🔧 SOLUÇÃO NECESSÁRIA:
Alterar o comportamento padrão para EXCLUIR ministros sem dados
de disponibilidade, ao invés de incluí-los.
    `);

  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error);
  }

  process.exit(0);
}

checkAvailabilityIssues();