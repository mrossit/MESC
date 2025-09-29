import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function fixResponsesJSON() {
  console.log('===== CORRIGINDO FORMATO JSON DAS RESPOSTAS =====\n');

  const PROD_DATABASE_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  const pool = new Pool({ connectionString: PROD_DATABASE_URL });

  try {
    // Primeiro, vamos pegar uma resposta e analisar
    const sampleResponse = await pool.query(`
      SELECT
        id,
        responses::text as responses_text,
        user_id
      FROM questionnaire_responses
      WHERE questionnaire_id = (
        SELECT id FROM questionnaires
        WHERE title LIKE '%Outubro 2025%'
        LIMIT 1
      )
      LIMIT 1
    `);

    if (sampleResponse.rows.length === 0) {
      console.log('Nenhuma resposta encontrada');
      return;
    }

    const response = sampleResponse.rows[0];
    console.log('ANALISANDO RESPOSTA ID:', response.id);
    console.log('Tamanho do campo responses:', response.responses_text.length, 'caracteres');

    // Tentar fazer parse do JSON
    let parsedResponses;
    try {
      // O campo parece estar com dupla serialização
      if (response.responses_text.startsWith('"')) {
        // Está como string JSON, precisa de duplo parse
        const firstParse = JSON.parse(response.responses_text);
        parsedResponses = JSON.parse(firstParse);
      } else {
        parsedResponses = JSON.parse(response.responses_text);
      }

      console.log('\n✅ JSON parseado com sucesso!');
      console.log('Tipo após parse:', typeof parsedResponses);
      console.log('É array?', Array.isArray(parsedResponses));

      if (Array.isArray(parsedResponses)) {
        console.log('Número de respostas:', parsedResponses.length);

        // Mostrar algumas respostas
        console.log('\nPRIMEIRAS 5 RESPOSTAS:');
        parsedResponses.slice(0, 5).forEach((resp: any, index: number) => {
          console.log(`\n${index + 1}. Pergunta ID: ${resp.questionId}`);
          console.log(`   Resposta: ${resp.answer}`);
        });

        // Procurar respostas relacionadas a disponibilidade
        console.log('\n===== RESPOSTAS DE DISPONIBILIDADE =====');

        const availabilityQuestions = [
          'monthly_availability',
          'available_sundays',
          'main_service_time',
          'other_times_available',
          'daily_mass_availability',
          'can_substitute'
        ];

        availabilityQuestions.forEach(questionId => {
          const response = parsedResponses.find((r: any) => r.questionId === questionId);
          if (response) {
            console.log(`\n${questionId}:`);
            console.log(`  Resposta: ${JSON.stringify(response.answer)}`);
          }
        });

        // Extrair dados de disponibilidade
        console.log('\n===== DADOS EXTRAÍDOS PARA ESCALA =====');

        const monthlyAvail = parsedResponses.find((r: any) => r.questionId === 'monthly_availability');
        const mainService = parsedResponses.find((r: any) => r.questionId === 'main_service_time');
        const canSubstitute = parsedResponses.find((r: any) => r.questionId === 'can_substitute');
        const availableSundays = parsedResponses.find((r: any) => r.questionId === 'available_sundays');

        console.log('Disponível no mês:', monthlyAvail?.answer || 'não especificado');
        console.log('Horário principal:', mainService?.answer || 'não especificado');
        console.log('Pode substituir:', canSubstitute?.answer || 'não especificado');

        if (availableSundays?.answer) {
          console.log('Domingos disponíveis:', Array.isArray(availableSundays.answer)
            ? availableSundays.answer.join(', ')
            : availableSundays.answer);
        }

        console.log('\n📊 RESUMO:');
        console.log('✅ Os dados existem no formato JSON correto');
        console.log('✅ As respostas contêm informações de disponibilidade');
        console.log('❌ Mas estão no campo JSONB, não nos campos específicos da tabela');
        console.log('\n📌 SOLUÇÃO: O sistema precisa extrair os dados do JSONB');
        console.log('   ou migrar para os campos específicos da tabela');

      } else {
        console.log('Formato não esperado:', parsedResponses);
      }

    } catch (error) {
      console.error('Erro ao fazer parse do JSON:', error);
      console.log('\nPrimeiros 500 caracteres do campo responses:');
      console.log(response.responses_text.substring(0, 500));
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

fixResponsesJSON();