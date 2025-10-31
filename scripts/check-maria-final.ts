import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkMaria() {
  const result = await client`
    SELECT 
      qr.daily_mass_availability,
      qr.responses::jsonb->'weekdays' as weekdays,
      u.name
    FROM questionnaire_responses qr
    JOIN users u ON u.id = qr.user_id
    JOIN questionnaires q ON q.id = qr.questionnaire_id
    WHERE q.year = 2025 
      AND q.month = 11
      AND LOWER(u.name) LIKE '%maria%isabel%'
  `;

  console.log('📊 Maria Isabel - Novembro 2025:');
  console.log('─'.repeat(60));
  console.log('Nome:', result[0]?.name);
  console.log('daily_mass_availability:', result[0]?.daily_mass_availability);
  console.log('weekdays (from JSONB):', result[0]?.weekdays);
  console.log('─'.repeat(60));

  await client.end();
}

checkMaria();
