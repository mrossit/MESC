import postgres from 'postgres';
import { QuestionnaireService } from '../server/services/questionnaireService';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function reprocessFinados() {
  console.log('🔄 RE-PROCESSANDO RESPOSTAS PARA ADICIONAR FINADOS\n');
  console.log('═'.repeat(80));

  try {
    // Get all responses for November 2025
    const responses = await client`
      SELECT 
        qr.id,
        qr.responses,
        u.name,
        u.email
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
    `;

    console.log(`📊 Encontradas ${responses.length} respostas\n`);

    let updated = 0;
    let yesCount = 0;
    let noCount = 0;
    const availableMinsters: string[] = [];

    for (const row of responses) {
      try {
        const parsedResponses = typeof row.responses === 'string' 
          ? JSON.parse(row.responses)
          : row.responses;

        // If already in v2.0 format, check if needs update
        if (parsedResponses.format_version === '2.0') {
          // Check if already has finados key
          if (parsedResponses.special_events?.finados !== undefined) {
            // Already processed
            if (parsedResponses.special_events.finados === true) {
              yesCount++;
              availableMinsters.push(row.name);
            } else {
              noCount++;
            }
            continue;
          }
        }

        // Re-standardize with the FIXED code
        const standardized = QuestionnaireService.standardizeResponse(parsedResponses, 11, 2025);

        // Update the database
        await client`
          UPDATE questionnaire_responses
          SET responses = ${JSON.stringify(standardized)}::jsonb
          WHERE id = ${row.id}
        `;

        updated++;

        // Check if has finados answer
        if ((standardized.special_events as any)?.finados === true) {
          yesCount++;
          availableMinsters.push(row.name);
          console.log(`✅ ${row.name} - DISPONÍVEL para Finados`);
        } else if ((standardized.special_events as any)?.finados === false) {
          noCount++;
        }

      } catch (err: any) {
        console.log(`❌ Erro ao processar ${row.name}: ${err.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 RESULTADO:');
    console.log('─'.repeat(80));
    console.log(`   🔄 Respostas re-processadas: ${updated}`);
    console.log(`   ✅ Disponíveis para Finados: ${yesCount}`);
    console.log(`   ❌ Não disponíveis: ${noCount}`);
    console.log('─'.repeat(80));

    if (availableMinsters.length > 0) {
      console.log('\n👥 MINISTROS DISPONÍVEIS PARA FINADOS:');
      console.log('─'.repeat(80));
      availableMinsters.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

reprocessFinados();
