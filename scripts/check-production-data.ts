#!/usr/bin/env tsx
import postgres from 'postgres';

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkData() {
  const sql = postgres(PRODUCTION_DB_URL, { ssl: 'require' });

  try {
    // Pegar uma resposta de exemplo
    const [sample] = await sql`
      SELECT 
        u.name,
        u.email,
        qr.responses,
        qr.special_events
      FROM questionnaire_responses qr
      JOIN users u ON qr.user_id = u.id
      JOIN questionnaires q ON qr.questionnaire_id = q.id
      WHERE q.month = 11 AND q.year = 2025
        AND u.email = 'rosana.piazentin@gmail.com'
      LIMIT 1
    `;

    if (sample) {
      console.log('📋 ESTRUTURA ATUAL DOS DADOS:\n');
      console.log('Ministro:', sample.name);
      console.log('\nResponses (raw):', typeof sample.responses);
      console.log('\nResponses (parsed):');
      const parsed = typeof sample.responses === 'string' ? JSON.parse(sample.responses) : sample.responses;
      console.log(JSON.stringify(parsed, null, 2));
      
      console.log('\nSpecial Events (legacy field):');
      console.log(JSON.stringify(sample.special_events, null, 2));
    } else {
      console.log('❌ Nenhuma resposta encontrada para rosana.piazentin@gmail.com');
    }

  } catch (error: any) {
    console.error('Erro:', error.message);
  } finally {
    await sql.end();
  }
}

checkData();
