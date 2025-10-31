import postgres from 'postgres';
import { QuestionnaireService } from '../server/services/questionnaireService';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function recoverPartialResponses() {
  console.log('🔧 RECUPERANDO RESPOSTAS PARCIAIS PERDIDAS - Novembro 2025\n');

  try {
    // Get all responses for November 2025
    const responses = await client`
      SELECT 
        qr.id,
        qr.responses,
        qr.daily_mass_availability,
        u.name,
        u.email
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
    `;

    console.log(`📊 Encontradas ${responses.length} respostas\n`);

    let recovered = 0;
    let alreadyCorrect = 0;
    let stillEmpty = 0;

    for (const row of responses) {
      try {
        // Parse the responses JSON string
        const parsedResponses = typeof row.responses === 'string' 
          ? JSON.parse(row.responses)
          : row.responses;

        // Check the RAW answer format for daily_mass_availability
        const rawAnswer = Array.isArray(parsedResponses)
          ? parsedResponses.find((r: any) => r.questionId === 'daily_mass_availability')
          : null;

        if (rawAnswer) {
          console.log(`\n📋 ${row.name}`);
          console.log(`   Email: ${row.email}`);
          console.log(`   Formato da resposta RAW:`);
          console.log(`   `, JSON.stringify(rawAnswer.answer, null, 2));
          
          // Re-standardize with the FIXED code
          const standardized = QuestionnaireService.standardizeResponse(parsedResponses, 11, 2025);
          const extracted = QuestionnaireService.extractStructuredData(standardized);

          console.log(`\n   Weekdays processados:`);
          if (standardized.weekdays) {
            if (standardized.weekdays.monday) console.log('      ✓ Segunda-feira');
            if (standardized.weekdays.tuesday) console.log('      ✓ Terça-feira');
            if (standardized.weekdays.wednesday) console.log('      ✓ Quarta-feira');
            if (standardized.weekdays.thursday) console.log('      ✓ Quinta-feira');
            if (standardized.weekdays.friday) console.log('      ✓ Sexta-feira');
            
            const trueCount = Object.values(standardized.weekdays).filter(v => v === true).length;
            if (trueCount === 0) {
              console.log('      (nenhum dia selecionado)');
            }
          }

          // Check if needs update
          const currentValue = row.daily_mass_availability;
          const newValue = extracted.dailyMassAvailability;

          const needsUpdate = JSON.stringify(currentValue) !== JSON.stringify(newValue);

          if (needsUpdate) {
            await client`
              UPDATE questionnaire_responses
              SET daily_mass_availability = ${JSON.stringify(newValue)}::jsonb
              WHERE id = ${row.id}
            `;

            console.log(`\n   ✅ RECUPERADO!`);
            console.log(`      ANTES: ${JSON.stringify(currentValue)}`);
            console.log(`      DEPOIS: ${JSON.stringify(newValue)}`);
            recovered++;
          } else {
            alreadyCorrect++;
          }
        } else {
          // V2.0 format - use existing weekdays data
          if (parsedResponses?.weekdays) {
            const standardized = QuestionnaireService.standardizeResponse(parsedResponses, 11, 2025);
            const extracted = QuestionnaireService.extractStructuredData(standardized);

            const currentValue = row.daily_mass_availability;
            const newValue = extracted.dailyMassAvailability;

            const needsUpdate = JSON.stringify(currentValue) !== JSON.stringify(newValue);

            if (needsUpdate) {
              await client`
                UPDATE questionnaire_responses
                SET daily_mass_availability = ${JSON.stringify(newValue)}::jsonb
                WHERE id = ${row.id}
              `;
              recovered++;
            } else {
              alreadyCorrect++;
            }
          } else {
            stillEmpty++;
          }
        }

      } catch (err: any) {
        console.log(`❌ Erro ao processar ${row.id}: ${err.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 RESULTADO:');
    console.log('─'.repeat(80));
    console.log(`   ✅ Recuperados: ${recovered}`);
    console.log(`   ✓  Já corretos: ${alreadyCorrect}`);
    console.log(`   ⚠️  Vazios: ${stillEmpty}`);
    console.log('─'.repeat(80));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

recoverPartialResponses();
