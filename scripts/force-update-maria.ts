import postgres from 'postgres';
import { QuestionnaireService } from '../server/services/questionnaireService';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function forceUpdate() {
  console.log('🔧 Forçando atualização das respostas de Novembro 2025\n');

  try {
    // 1. Get all responses for November 2025
    const responses = await client`
      SELECT 
        qr.id,
        qr.responses,
        qr.daily_mass_availability,
        u.name
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
    `;

    console.log(`📊 Encontradas ${responses.length} respostas de Novembro 2025\n`);

    let updated = 0;

    for (const row of responses) {
      try {
        // Parse the responses JSON string
        const parsedResponses = typeof row.responses === 'string' 
          ? JSON.parse(row.responses)
          : row.responses;

        // Check if it's v2.0 format
        if (parsedResponses?.format_version !== '2.0') {
          continue;
        }

        // Extract structured data using service
        const extracted = QuestionnaireService.extractStructuredData(parsedResponses);

        // Check if needs update
        const currentValue = row.daily_mass_availability;
        const newValue = extracted.dailyMassAvailability;

        const needsUpdate = JSON.stringify(currentValue) !== JSON.stringify(newValue);

        if (needsUpdate) {
          // Update using SQL
          await client`
            UPDATE questionnaire_responses
            SET daily_mass_availability = ${JSON.stringify(newValue)}::jsonb
            WHERE id = ${row.id}
          `;

          console.log(`✅ Atualizado: ${row.name?.substring(0, 30)}...`);
          console.log(`   ANTES: ${JSON.stringify(currentValue)}`);
          console.log(`   DEPOIS: ${JSON.stringify(newValue)}\n`);
          updated++;
        }
      } catch (err: any) {
        console.log(`❌ Erro ao processar ${row.id}: ${err.message}`);
      }
    }

    console.log(`\n✅ Total atualizado: ${updated} respostas`);

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

forceUpdate();
