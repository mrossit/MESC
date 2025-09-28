import { db } from '../server/db';
import { questionnaires } from '@shared/schema';
import {
  getQuestionnaireResponsesForExport,
  createDetailedCSV,
  convertResponsesToCSV
} from '../server/utils/csvExporter';

async function verifyCSVExport() {
  console.log('✅ Verificando exportação CSV com dados reais...\n');

  try {
    // Buscar todos os questionários
    const allQuestionnaires = await db
      .select()
      .from(questionnaires)
      .orderBy(questionnaires.year, questionnaires.month);

    if (allQuestionnaires.length === 0) {
      console.log('⚠️  Nenhum questionário encontrado no banco de dados.');
      process.exit(0);
    }

    for (const questionnaire of allQuestionnaires) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Testando exportação para: ${questionnaire.title}`);
      console.log(`   Período: ${questionnaire.month}/${questionnaire.year}`);
      console.log(`   Status: ${questionnaire.status}`);

      try {
        // Obter dados para exportação
        const exportData = await getQuestionnaireResponsesForExport(questionnaire.id);

        console.log(`\n   📊 Dados coletados:`);
        console.log(`      Total de registros: ${exportData.length}`);

        const withResponses = exportData.filter(d => d.responses.length > 0).length;
        const withoutResponses = exportData.filter(d => d.responses.length === 0).length;

        console.log(`      Com respostas: ${withResponses}`);
        console.log(`      Sem respostas: ${withoutResponses}`);

        if (withResponses > 0) {
          // Mostrar exemplo de dados coletados
          const sample = exportData.find(d => d.responses.length > 0);
          if (sample) {
            console.log(`\n   📝 Exemplo de dados coletados:`);
            console.log(`      Ministro: ${sample.ministerName}`);
            console.log(`      Email: ${sample.ministerEmail}`);
            console.log(`      Data de envio: ${sample.submittedAt ? new Date(sample.submittedAt).toLocaleString('pt-BR') : 'Não enviado'}`);
            console.log(`      Número de respostas: ${sample.responses.length}`);

            console.log(`\n      Respostas:`);
            sample.responses.forEach(r => {
              const value = Array.isArray(r.answer) ? r.answer.join(', ') : r.answer;
              console.log(`        - ${r.questionText}: ${value}`);
            });
          }

          // Gerar CSV detalhado
          const detailedCSV = createDetailedCSV(exportData);
          const lines = detailedCSV.split('\n');

          console.log(`\n   📄 Preview do CSV (primeiras 3 linhas):`);
          for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i].substring(0, 150);
            console.log(`      ${i + 1}: ${line}${lines[i].length > 150 ? '...' : ''}`);
          }

          // Salvar arquivo para inspeção manual
          const fs = await import('fs/promises');
          const filename = `/tmp/export_${questionnaire.month}_${questionnaire.year}_verified.csv`;
          await fs.writeFile(filename, detailedCSV, 'utf-8');
          console.log(`\n   💾 CSV salvo em: ${filename}`);

          // Validar estrutura do CSV
          console.log(`\n   ✅ Validação:`);
          const hasHeaders = lines[0].includes('Nome do Ministro') && lines[0].includes('Email');
          console.log(`      Headers corretos: ${hasHeaders ? '✅' : '❌'}`);

          const hasData = lines.length > 1;
          console.log(`      Contém dados: ${hasData ? '✅' : '❌'}`);

          const properEncoding = detailedCSV.startsWith('\uFEFF');
          console.log(`      BOM UTF-8: ${properEncoding ? '✅' : '❌'}`);

        } else {
          console.log('\n   ⚠️  Nenhuma resposta encontrada para este questionário');
        }

      } catch (error) {
        console.error(`\n   ❌ Erro ao exportar: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    process.exit(1);
  }

  process.exit(0);
}

verifyCSVExport().catch(console.error);