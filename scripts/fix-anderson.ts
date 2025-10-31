import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function fixAnderson() {
  const email = 'andermavival3239@gmail.com';
  const weekdays = {
    monday: false,
    tuesday: true,  // Terça-feira
    wednesday: false,
    thursday: false,
    friday: false
  };
  const dailyMassAvailability = ['Terça-feira'];

  try {
    // Get current response
    const current = await client`
      SELECT qr.id, qr.responses, u.name, u.email
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025
        AND q.month = 11
        AND LOWER(u.email) = LOWER(${email})
    `;

    if (current.length === 0) {
      console.log(`❌ Ministro não encontrado: ${email}`);
      await client.end();
      return;
    }

    const row = current[0];
    const currentResponses = typeof row.responses === 'string' 
      ? JSON.parse(row.responses) 
      : row.responses;

    // Update weekdays
    const updatedResponses = {
      ...currentResponses,
      weekdays
    };

    // Update database
    await client`
      UPDATE questionnaire_responses
      SET 
        responses = ${JSON.stringify(updatedResponses)}::jsonb,
        daily_mass_availability = ${JSON.stringify(dailyMassAvailability)}::jsonb
      WHERE id = ${row.id}
    `;

    console.log(`✅ ${row.name} (${row.email})`);
    console.log(`   → Disponível: Terça-feira`);
    console.log('\n✅ Correção concluída!');

  } catch (error: any) {
    console.error(`❌ Erro:`, error.message);
  } finally {
    await client.end();
  }
}

fixAnderson();
