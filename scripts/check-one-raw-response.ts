import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkRaw() {
  // Get just ONE response to analyze the raw format
  const result = await client`
    SELECT 
      u.name,
      u.email,
      qr.responses,
      qr.submitted_at
    FROM questionnaire_responses qr
    JOIN users u ON u.id = qr.user_id
    JOIN questionnaires q ON q.id = qr.questionnaire_id
    WHERE q.year = 2025 AND q.month = 11
      AND LOWER(u.name) LIKE '%maria%isabel%'
    LIMIT 1
  `;

  if (result.length > 0) {
    const row = result[0];
    console.log('📋 MARIA ISABEL - RESPOSTA RAW:\n');
    console.log('Nome:', row.name);
    console.log('Email:', row.email);
    console.log('Respondeu:', row.submitted_at);
    console.log('\nCampo responses (RAW):');
    console.log('═'.repeat(80));
    
    const parsed = typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses;
    console.log(JSON.stringify(parsed, null, 2));
    console.log('═'.repeat(80));
    
    // Check if it's array or v2.0 format
    if (Array.isArray(parsed)) {
      console.log('\n🔍 FORMATO: ARRAY (legado)\n');
      
      const dailyMassQ = parsed.find((r: any) => r.questionId === 'daily_mass_availability');
      if (dailyMassQ) {
        console.log('Pergunta daily_mass_availability:');
        console.log('  questionId:', dailyMassQ.questionId);
        console.log('  answer:', JSON.stringify(dailyMassQ.answer, null, 2));
        console.log('  metadata:', JSON.stringify(dailyMassQ.metadata, null, 2));
      }
    } else if (parsed?.format_version === '2.0') {
      console.log('\n🔍 FORMATO: V2.0 (já convertido)\n');
      console.log('Weekdays:', parsed.weekdays);
    }
  }

  await client.end();
}

checkRaw();
