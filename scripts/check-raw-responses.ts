import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkRaw() {
  const result = await client`
    SELECT 
      qr.id,
      qr.daily_mass_availability,
      qr.responses,
      u.name,
      q.month,
      q.year
    FROM questionnaire_responses qr
    JOIN users u ON u.id = qr.user_id
    JOIN questionnaires q ON q.id = qr.questionnaire_id
    WHERE q.year = 2025 
      AND q.month = 11
      AND LOWER(u.name) LIKE '%maria%isabel%'
  `;

  console.log('📊 Maria Isabel - Resposta Completa:');
  console.log('─'.repeat(80));
  console.log('Response ID:', result[0]?.id);
  console.log('Nome:', result[0]?.name);
  console.log('Mês/Ano:', `${result[0]?.month}/${result[0]?.year}`);
  console.log('\ndaily_mass_availability (coluna):', result[0]?.daily_mass_availability);
  console.log('\nresponses (JSONB completo):');
  console.log(JSON.stringify(result[0]?.responses, null, 2));
  console.log('─'.repeat(80));

  await client.end();
}

checkRaw();
