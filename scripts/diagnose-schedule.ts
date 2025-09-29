import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function testScheduleGeneration() {
  console.log('===== TESTE DE GERAÇÃO DE ESCALA - DIAGNÓSTICO =====\n');

  const PROD_DATABASE_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  const pool = new Pool({ connectionString: PROD_DATABASE_URL });

  try {
    // Verificar questionário de Outubro
    const questionnaire = await pool.query(`
      SELECT id, title, status, month, year
      FROM questionnaires
      WHERE month = 10 AND year = 2025
    `);

    const q = questionnaire.rows[0];
    console.log(`Questionário: ${q.title} (Status: ${q.status})`);

    // Verificar estrutura das respostas
    const sampleResponses = await pool.query(`
      SELECT
        user_id,
        available_sundays,
        preferred_mass_times,
        responses::text as responses_json
      FROM questionnaire_responses
      WHERE questionnaire_id = $1
      LIMIT 3
    `, [q.id]);

    console.log(`\nAnalisando ${sampleResponses.rowCount} respostas:\n`);

    let hasDataInSpecificFields = false;
    let hasDataInJSONB = false;

    sampleResponses.rows.forEach((r: any, i: number) => {
      console.log(`RESPOSTA ${i + 1}:`);
      console.log(`  Campos específicos: available_sundays = ${r.available_sundays || 'NULL'}`);
      console.log(`  Campos específicos: preferred_mass_times = ${r.preferred_mass_times || 'NULL'}`);

      if (r.available_sundays || r.preferred_mass_times) {
        hasDataInSpecificFields = true;
      }

      if (r.responses_json) {
        try {
          const parsed = JSON.parse(r.responses_json);
          if (Array.isArray(parsed)) {
            const sundays = parsed.find((item: any) => item.questionId === 'available_sundays');
            const mainTime = parsed.find((item: any) => item.questionId === 'main_service_time');

            if (sundays || mainTime) {
              hasDataInJSONB = true;
              console.log(`  JSONB: available_sundays = ${JSON.stringify(sundays?.answer)}`);
              console.log(`  JSONB: main_service_time = ${mainTime?.answer}`);
            }
          }
        } catch (e) {
          console.log('  Erro ao fazer parse do JSONB');
        }
      }
    });

    console.log('\n===== DIAGNÓSTICO =====\n');

    if (!hasDataInSpecificFields && hasDataInJSONB) {
      console.log('❌ PROBLEMA IDENTIFICADO:');
      console.log('   Os dados estão no JSONB mas o sistema lê dos campos NULL');
      console.log('   Por isso a escala não é gerada corretamente!');
      console.log('');
      console.log('📌 CORREÇÃO NECESSÁRIA em server/utils/scheduleGenerator.ts:');
      console.log('   Na linha 298-346, o código precisa ler do campo "responses" (JSONB)');
      console.log('   em vez dos campos específicos da tabela.');
    } else if (hasDataInSpecificFields) {
      console.log('✅ Os dados estão nos campos corretos');
    } else {
      console.log('⚠️ Nenhum dado de disponibilidade encontrado');
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

testScheduleGeneration();