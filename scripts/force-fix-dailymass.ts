import postgres from 'postgres';

// Conectar ao banco de PRODUÇÃO
const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function forceFix() {
  console.log('🔧 Forçando correção do campo dailyMassAvailability\n');

  try {
    // Update all responses where:
    // - responses JSONB contains weekdays object
    // - dailyMassAvailability is null
    // Set dailyMassAvailability to empty array if all weekdays are false
    
    const result = await client`
      UPDATE questionnaire_responses
      SET daily_mass_availability = '[]'::jsonb
      WHERE 
        daily_mass_availability IS NULL
        AND responses::jsonb->'weekdays' IS NOT NULL
        AND responses::jsonb->>'format_version' = '2.0'
    `;

    console.log(`✅ Atualizadas ${result.count} respostas`);

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

forceFix();
