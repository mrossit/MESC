import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function analyzeResponsesJSONB() {
  console.log('===== ANÁLISE DO CAMPO JSONB RESPONSES =====\n');

  const PROD_DATABASE_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  const pool = new Pool({ connectionString: PROD_DATABASE_URL });

  try {
    // Pegar uma resposta completa para analisar
    const fullResponse = await pool.query(`
      SELECT
        qr.*,
        u.name as user_name
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      WHERE qr.questionnaire_id = (
        SELECT id FROM questionnaires
        WHERE title LIKE '%Outubro 2025%'
        LIMIT 1
      )
      LIMIT 1
    `);

    if (fullResponse.rows.length === 0) {
      console.log('Nenhuma resposta encontrada');
      return;
    }

    const response = fullResponse.rows[0];
    console.log(`ANALISANDO RESPOSTA DE: ${response.user_name}\n`);

    // Analisar o campo responses JSONB
    const responsesData = response.responses;
    console.log('ESTRUTURA DO CAMPO responses (JSONB):');
    console.log('Tipo:', typeof responsesData);
    console.log('É array?', Array.isArray(responsesData));
    console.log('Chaves:', Object.keys(responsesData).join(', '));
    console.log('\nCONTEÚDO DETALHADO:');

    // Mostrar cada resposta
    Object.entries(responsesData).forEach(([key, value]) => {
      console.log(`\nPergunta ${key}:`);
      console.log('  Valor:', JSON.stringify(value, null, 2));
    });

    // Buscar as perguntas do questionário para entender o mapeamento
    console.log('\n\n===== PERGUNTAS DO QUESTIONÁRIO =====\n');

    const questionnaire = await pool.query(`
      SELECT
        id,
        title,
        questions
      FROM questionnaires
      WHERE title LIKE '%Outubro 2025%'
      LIMIT 1
    `);

    if (questionnaire.rows.length > 0) {
      const questions = questionnaire.rows[0].questions;
      console.log('PERGUNTAS DO QUESTIONÁRIO:');

      if (questions) {
        const questionsData = typeof questions === 'string' ? JSON.parse(questions) : questions;

        if (Array.isArray(questionsData)) {
          questionsData.forEach((q: any, index: number) => {
            console.log(`\n${index}. ${q.text || q.question || q.title || 'Pergunta sem título'}`);
            if (q.type) console.log(`   Tipo: ${q.type}`);
            if (q.options) console.log(`   Opções: ${JSON.stringify(q.options)}`);
          });
        } else {
          console.log('Formato das perguntas:', JSON.stringify(questionsData, null, 2));
        }
      }
    }

    // Analisar múltiplas respostas para encontrar padrões
    console.log('\n\n===== ANÁLISE DE PADRÕES NAS RESPOSTAS =====\n');

    const multipleResponses = await pool.query(`
      SELECT
        u.name,
        qr.responses
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      WHERE qr.questionnaire_id = (
        SELECT id FROM questionnaires
        WHERE title LIKE '%Outubro 2025%'
        LIMIT 1
      )
      LIMIT 10
    `);

    console.log('ANÁLISE DE 10 RESPOSTAS:\n');
    multipleResponses.rows.forEach((r: any) => {
      const responses = r.responses;
      console.log(`${r.name}:`);

      // Procurar por padrões comuns de disponibilidade
      Object.entries(responses).forEach(([key, value]: [string, any]) => {
        if (typeof value === 'object' && value !== null) {
          // Pode ser uma resposta complexa
          if (value.sundays || value.domingos || value.availability) {
            console.log(`  Pergunta ${key} - Possível disponibilidade: ${JSON.stringify(value)}`);
          }
          if (value.times || value.horarios || value.schedule) {
            console.log(`  Pergunta ${key} - Possível horário: ${JSON.stringify(value)}`);
          }
        } else if (typeof value === 'string') {
          // Verificar se contém informações de horário
          if (value.includes(':') || value.toLowerCase().includes('missa')) {
            console.log(`  Pergunta ${key} - Possível horário: ${value}`);
          }
        } else if (Array.isArray(value)) {
          console.log(`  Pergunta ${key} - Array: ${JSON.stringify(value)}`);
        }
      });
    });

    console.log('\n===== CONCLUSÃO =====\n');
    console.log('❗ Os dados de disponibilidade estão armazenados no campo JSONB "responses"');
    console.log('❗ Os campos específicos (available_sundays, preferred_mass_times, etc) estão NULL');
    console.log('❗ É necessário extrair os dados do JSONB para usar na geração de escala');
    console.log('\n📌 PRÓXIMO PASSO: Processar o campo JSONB para extrair as disponibilidades');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

analyzeResponsesJSONB();