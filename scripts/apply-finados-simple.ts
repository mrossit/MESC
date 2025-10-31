#!/usr/bin/env tsx
/**
 * Atualização simplificada de Finados - Produção
 */

import postgres from 'postgres';

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

const emails = [
  'rosana.piazentin@gmail.com',
  'eliane.acquati@adv.oabsp.org.br',
  'lucianourcioli70@gmail.com',
  'ruthalmeidamorelli@gmail.com',
  'almeida.miaco@yahoo.com.br',
  'andre_amorim3@hotmail.com'
];

async function updateFinados() {
  console.log('🎯 ATUALIZANDO DISPONIBILIDADES DE FINADOS - PRODUÇÃO\n');
  const sql = postgres(PRODUCTION_DB_URL, { ssl: 'require' });

  try {
    let updated = 0;
    let notFound = 0;

    for (const email of emails) {
      console.log(`📧 ${email}`);
      
      // Buscar ministro e resposta
      const [row] = await sql`
        SELECT 
          qr.id as response_id,
          qr.responses,
          qr.special_events,
          u.id as user_id,
          u.name
        FROM users u
        JOIN questionnaire_responses qr ON qr.user_id = u.id
        JOIN questionnaires q ON qr.questionnaire_id = q.id
        WHERE LOWER(u.email) = ${email.toLowerCase()}
          AND q.month = 11
          AND q.year = 2025
        LIMIT 1
      `;

      if (!row) {
        console.log(`   ⚠️  Sem resposta de nov/2025\n`);
        notFound++;
        continue;
      }

      // Parse responses
      const responses = typeof row.responses === 'string' 
        ? JSON.parse(row.responses) 
        : row.responses;

      // Garantir que special_events existe
      if (!responses.special_events) {
        responses.special_events = {};
      }

      // Adicionar finados
      responses.special_events.finados = true;

      // Atualizar special_events legacy também
      const legacySpecialEvents = row.special_events || {};
      legacySpecialEvents.finados = true;

      // Atualizar banco
      await sql`
        UPDATE questionnaire_responses
        SET 
          responses = ${JSON.stringify(responses)},
          special_events = ${sql.json(legacySpecialEvents)},
          updated_at = NOW()
        WHERE id = ${row.response_id}
      `;

      console.log(`   ✅ ${row.name} - Atualizado\n`);
      updated++;
    }

    console.log('='.repeat(60));
    console.log(`✅ Atualizados: ${updated}`);
    console.log(`⚠️  Não encontrados: ${notFound}`);
    console.log('='.repeat(60));

    // Verificar
    console.log('\n🔍 VERIFICAÇÃO:\n');
    const results = await sql`
      SELECT 
        u.name,
        u.email,
        qr.special_events->>'finados' as finados
      FROM questionnaire_responses qr
      JOIN users u ON qr.user_id = u.id
      JOIN questionnaires q ON qr.questionnaire_id = q.id
      WHERE q.month = 11 AND q.year = 2025
        AND u.email IN ${sql(emails.map(e => e.toLowerCase()))}
      ORDER BY u.name
    `;

    results.forEach(r => {
      const status = r.finados === 'true' ? '✅' : '❌';
      console.log(`${status} ${r.name}`);
    });

    console.log('\n✅ CONCLUÍDO!\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

updateFinados()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
