#!/usr/bin/env tsx
/**
 * Corrigir disponibilidade de dias de semana para acsjaco@gmail.com
 * Marcar TODOS os dias de semana como INDISPONÍVEIS (false)
 */

import postgres from 'postgres';

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function fixWeekdayAvailability() {
  console.log('🔧 CORRIGINDO DISPONIBILIDADE DE DIAS DE SEMANA\n');
  console.log('Ministro: Ana Claudia da Silva Jacó (acsjaco@gmail.com)');
  console.log('Ação: Marcar TODOS os dias de semana como INDISPONÍVEIS\n');
  console.log('='.repeat(60) + '\n');

  const sql = postgres(PRODUCTION_DB_URL, { ssl: 'require' });

  try {
    // 1. Buscar questionário atual
    const [current] = await sql`
      SELECT 
        qr.id as response_id,
        qr.responses,
        qr.daily_mass_availability,
        u.name,
        u.email
      FROM users u
      JOIN questionnaire_responses qr ON qr.user_id = u.id
      JOIN questionnaires q ON qr.questionnaire_id = q.id
      WHERE LOWER(u.email) = 'acsjaco@gmail.com'
        AND q.month = 11
        AND q.year = 2025
      LIMIT 1
    `;

    if (!current) {
      console.log('❌ Questionário não encontrado para novembro/2025');
      return;
    }

    console.log('📋 DADOS ATUAIS:');
    console.log(`Nome: ${current.name}`);
    console.log(`Email: ${current.email}\n`);

    // 2. Parse responses
    const responses = typeof current.responses === 'string' 
      ? JSON.parse(current.responses) 
      : current.responses;

    console.log('ANTES:');
    console.log('  Weekdays:', responses.weekdays);
    console.log('  Daily Mass Availability:', current.daily_mass_availability);
    console.log();

    // 3. Marcar TODOS os dias de semana como FALSE
    responses.weekdays = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false
    };

    console.log('DEPOIS:');
    console.log('  Weekdays:', responses.weekdays);
    console.log('  Daily Mass Availability: []');
    console.log();

    // 4. Atualizar banco
    await sql`
      UPDATE questionnaire_responses
      SET 
        responses = ${JSON.stringify(responses)},
        daily_mass_availability = ${sql.array([])},
        updated_at = NOW()
      WHERE id = ${current.response_id}
    `;

    console.log('✅ ATUALIZADO COM SUCESSO!\n');
    console.log('='.repeat(60) + '\n');

    // 5. Verificar
    const [updated] = await sql`
      SELECT 
        qr.responses,
        qr.daily_mass_availability
      FROM questionnaire_responses qr
      WHERE id = ${current.response_id}
    `;

    const verifyResponses = typeof updated.responses === 'string'
      ? JSON.parse(updated.responses)
      : updated.responses;

    console.log('🔍 VERIFICAÇÃO FINAL:');
    console.log('  Segunda-feira:', verifyResponses.weekdays.monday ? '✅ Disponível' : '❌ Indisponível');
    console.log('  Terça-feira:', verifyResponses.weekdays.tuesday ? '✅ Disponível' : '❌ Indisponível');
    console.log('  Quarta-feira:', verifyResponses.weekdays.wednesday ? '✅ Disponível' : '❌ Indisponível');
    console.log('  Quinta-feira:', verifyResponses.weekdays.thursday ? '✅ Disponível' : '❌ Indisponível');
    console.log('  Sexta-feira:', verifyResponses.weekdays.friday ? '✅ Disponível' : '❌ Indisponível');
    console.log('  Daily Mass Array:', updated.daily_mass_availability);
    console.log();

    const allFalse = Object.values(verifyResponses.weekdays).every((v: any) => v === false);
    
    if (allFalse && updated.daily_mass_availability.length === 0) {
      console.log('✅ CORREÇÃO CONFIRMADA! Todos os dias de semana estão marcados como INDISPONÍVEIS.');
      console.log('\n📊 Próximo passo: Gere uma nova escala para ver as mudanças aplicadas.\n');
    } else {
      console.log('⚠️  ATENÇÃO: Algum problema na verificação!');
    }

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

fixWeekdayAvailability()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
