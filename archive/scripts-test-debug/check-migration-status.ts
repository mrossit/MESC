import { db } from '../server/db';
import { questionnaireResponses } from '../shared/schema';
import { isNull, and } from 'drizzle-orm';

async function checkMigrationStatus() {
  console.log('🔍 Verificando status da migração de dados...\n');

  try {
    // Buscar todas as respostas
    const allResponses = await db
      .select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        responses: questionnaireResponses.responses,
        availableSundays: questionnaireResponses.availableSundays,
        preferredMassTimes: questionnaireResponses.preferredMassTimes,
        alternativeTimes: questionnaireResponses.alternativeTimes,
        canSubstitute: questionnaireResponses.canSubstitute
      })
      .from(questionnaireResponses);

    console.log(`📊 Total de respostas no banco: ${allResponses.length}\n`);

    // Analisar cada resposta
    let fullyMigrated = 0;
    let partiallyMigrated = 0;
    let notMigrated = 0;
    let noData = 0;

    for (const response of allResponses) {
      const hasResponses = !!response.responses;
      const hasSpecificFields =
        (response.availableSundays && response.availableSundays.length > 0) ||
        (response.preferredMassTimes && response.preferredMassTimes.length > 0) ||
        (response.alternativeTimes && response.alternativeTimes.length > 0) ||
        response.canSubstitute !== null;

      if (!hasResponses && !hasSpecificFields) {
        noData++;
      } else if (hasResponses && hasSpecificFields) {
        fullyMigrated++;
      } else if (!hasResponses && hasSpecificFields) {
        // Só tem dados nos campos específicos (ideal após migração)
        fullyMigrated++;
      } else if (hasResponses && !hasSpecificFields) {
        notMigrated++;
      } else {
        partiallyMigrated++;
      }
    }

    console.log('📈 Status da migração:');
    console.log(`   ✅ Totalmente migradas: ${fullyMigrated}`);
    console.log(`   ⚠️  Parcialmente migradas: ${partiallyMigrated}`);
    console.log(`   ❌ Não migradas (dados só em responses): ${notMigrated}`);
    console.log(`   🚫 Sem dados: ${noData}`);

    if (notMigrated > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem respostas que precisam de migração!');
      console.log('   Execute: npm run migrate:questionnaire-data');
    } else {
      console.log('\n✅ Todas as respostas estão corretamente migradas!');
    }

    // Mostrar exemplos
    console.log('\n📝 Exemplos de respostas:');
    allResponses.slice(0, 3).forEach((r, i) => {
      console.log(`\n   ${i + 1}. ID: ${r.id.substring(0, 8)}...`);
      console.log(`      - userId: ${r.userId}`);

      if (r.responses) {
        const responsesData = typeof r.responses === 'string'
          ? JSON.parse(r.responses)
          : r.responses;

        if (Array.isArray(responsesData)) {
          console.log(`      - responses: Array com ${responsesData.length} itens`);
        } else {
          console.log(`      - responses: Objeto`);
        }
      } else {
        console.log(`      - responses: vazio`);
      }

      console.log(`      - availableSundays: ${r.availableSundays ? r.availableSundays.length + ' dias' : 'vazio'}`);
      console.log(`      - preferredMassTimes: ${r.preferredMassTimes || 'vazio'}`);
      console.log(`      - canSubstitute: ${r.canSubstitute}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status da migração:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkMigrationStatus();