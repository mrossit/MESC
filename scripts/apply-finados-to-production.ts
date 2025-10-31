#!/usr/bin/env tsx
/**
 * Script para atualizar disponibilidades de Finados DIRETAMENTE no banco de PRODUÇÃO
 * Execução: tsx scripts/apply-finados-to-production.ts
 */

import postgres from 'postgres';

// String de conexão de PRODUÇÃO
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

const emails = [
  'rosana.piazentin@gmail.com',
  'eliane.acquati@adv.oabsp.org.br',
  'lucianourcioli70@gmail.com',
  'ruthalmeidamorelli@gmail.com',
  'almeida.miaco@yahoo.com.br',
  'andre_amorim3@hotmail.com'
];

async function updateFinadosAvailability() {
  console.log('🎯 ATUALIZANDO DISPONIBILIDADES DE FINADOS - BANCO DE PRODUÇÃO\n');
  console.log('📅 Missa: 02/11/2025 às 15h30 (Cemitério)');
  console.log('👥 Ministros a atualizar:', emails.length, '\n');

  const sql = postgres(PRODUCTION_DB_URL, { ssl: 'require' });

  try {
    // Criar função auxiliar
    console.log('📝 Criando função auxiliar...');
    await sql`
      CREATE OR REPLACE FUNCTION update_finados_availability(
        p_user_id VARCHAR,
        p_available BOOLEAN
      ) RETURNS VOID AS $$
      DECLARE
        v_response_id UUID;
        v_current_responses JSONB;
        v_special_events JSONB;
        v_responses_text TEXT;
      BEGIN
        SELECT qr.id, qr.responses::TEXT
        INTO v_response_id, v_responses_text
        FROM questionnaire_responses qr
        JOIN questionnaires q ON qr.questionnaire_id = q.id
        WHERE qr.user_id = p_user_id
          AND q.month = 11
          AND q.year = 2025
        LIMIT 1;

        IF v_response_id IS NULL THEN
          RAISE NOTICE 'Ministro % não tem resposta para novembro/2025', p_user_id;
          RETURN;
        END IF;

        -- Converter string JSON para JSONB
        v_current_responses := v_responses_text::JSONB;

        -- Atualizar special_events
        v_special_events := COALESCE(v_current_responses->'special_events', '{}'::jsonb);
        v_special_events := jsonb_set(v_special_events, '{finados}', to_jsonb(p_available));
        v_current_responses := jsonb_set(v_current_responses, '{special_events}', v_special_events);

        -- Atualizar resposta
        UPDATE questionnaire_responses
        SET 
          responses = v_current_responses::TEXT,
          special_events = jsonb_set(COALESCE(special_events, '{}'::jsonb), '{finados}', to_jsonb(p_available)),
          updated_at = NOW()
        WHERE id = v_response_id;

        RAISE NOTICE 'Ministro % atualizado com finados = %', p_user_id, p_available;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Função criada\n');

    let updated = 0;
    let notFound = 0;

    // Atualizar cada ministro
    for (const email of emails) {
      console.log(`📧 Processando: ${email}`);
      
      // Buscar ID do ministro
      const [user] = await sql`
        SELECT id FROM users WHERE LOWER(email) = ${email.toLowerCase()}
      `;

      if (!user) {
        console.log(`   ⚠️  Ministro não encontrado no banco!`);
        notFound++;
        continue;
      }

      // Atualizar disponibilidade
      await sql`
        SELECT update_finados_availability(${user.id}, true)
      `;

      console.log(`   ✅ Atualizado com sucesso`);
      updated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA ATUALIZAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Ministros atualizados: ${updated}`);
    console.log(`⚠️  Ministros não encontrados: ${notFound}`);
    console.log(`📝 Total processado: ${emails.length}`);

    // Verificar resultados
    console.log('\n🔍 VERIFICANDO RESULTADOS...\n');
    const results = await sql`
      SELECT 
        u.name,
        u.email,
        qr.responses->'special_events'->>'finados' as finados_disponivel
      FROM questionnaire_responses qr
      JOIN users u ON qr.user_id = u.id
      JOIN questionnaires q ON qr.questionnaire_id = q.id
      WHERE q.month = 11 AND q.year = 2025
        AND u.email IN ${sql(emails.map(e => e.toLowerCase()))}
      ORDER BY u.name
    `;

    console.log('📋 DISPONIBILIDADES ATUALIZADAS:');
    console.log('─'.repeat(60));
    results.forEach(r => {
      const status = r.finados_disponivel === 'true' ? '✅ DISPONÍVEL' : '❌ NÃO DISPONÍVEL';
      console.log(`${r.name.padEnd(30)} ${status}`);
    });

    // Limpar função
    await sql`DROP FUNCTION IF EXISTS update_finados_availability(VARCHAR, BOOLEAN)`;

    console.log('\n✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('🎉 As disponibilidades de Finados foram salvas no banco de produção.\n');

  } catch (error: any) {
    console.error('\n❌ ERRO AO ATUALIZAR:', error.message);
    console.error('\n🔧 Detalhes do erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Executar
updateFinadosAvailability()
  .then(() => {
    console.log('🏁 Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na execução:', error);
    process.exit(1);
  });
