import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkResponse() {
  // Get just ONE response to analyze
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
    LIMIT 1
  `;

  if (result.length > 0) {
    const row = result[0];
    console.log('📋 EXEMPLO DE RESPOSTA - Novembro 2025:\n');
    console.log('Nome:', row.name);
    console.log('Email:', row.email);
    console.log('\nCampo responses:');
    console.log('═'.repeat(80));
    
    const parsed = typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses;
    console.log(JSON.stringify(parsed, null, 2));
    console.log('═'.repeat(80));
    
    // Check if it's array or v2.0 format
    if (Array.isArray(parsed)) {
      console.log('\n🔍 FORMATO: ARRAY (legado)\n');
      console.log(`Total de perguntas respondidas: ${parsed.length}\n`);
      
      const specialEvents = parsed.filter((r: any) => r.questionId?.includes('special_event'));
      console.log(`Perguntas de eventos especiais: ${specialEvents.length}`);
      if (specialEvents.length > 0) {
        console.log('\nEventos especiais encontrados:');
        specialEvents.forEach((e: any) => {
          console.log(`  - ${e.questionId}: ${e.answer}`);
        });
      }
    } else if (parsed?.format_version === '2.0') {
      console.log('\n🔍 FORMATO: V2.0\n');
      console.log('special_events:', parsed.special_events);
      console.log('\nMissas (masses):', Object.keys(parsed.masses || {}).length, 'datas');
    }
  }

  await client.end();
}

checkResponse();
