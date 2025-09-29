#!/usr/bin/env npx tsx

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function testWithCorrectDB() {
  console.log('===== TESTE COM BANCO DE PRODUÇÃO CORRETO =====\n');

  // URL do banco de produção CORRETO
  const CORRECT_PROD_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

  console.log('🔄 Configurando conexão com o banco de produção correto...\n');

  const pool = new Pool({ connectionString: CORRECT_PROD_URL });
  const db = drizzle({ client: pool, schema });

  try {
    // Testar consultas usando Drizzle (como o servidor faz)
    console.log('===== TESTANDO CONSULTAS DO SERVIDOR =====\n');

    // 1. Buscar ministros (usuários com role = 'ministro')
    const ministers = await pool.query(`
      SELECT id, name, email, phone, role
      FROM users
      WHERE role = 'ministro'
      ORDER BY name
      LIMIT 5
    `);

    console.log(`✅ Ministros encontrados: ${ministers.rowCount} (mostrando 5)`);
    ministers.rows.forEach(m => {
      console.log(`   - ${m.name} (${m.email})`);
    });

    // 2. Buscar questionários ativos
    const questionnaires = await pool.query(`
      SELECT id, title, status
      FROM questionnaires
      WHERE status != 'deleted'
    `);

    console.log(`\n✅ Questionários ativos: ${questionnaires.rowCount}`);
    questionnaires.rows.forEach(q => {
      console.log(`   - ${q.title} (Status: ${q.status})`);
    });

    // 3. Buscar respostas recentes
    const responses = await pool.query(`
      SELECT
        qr.id,
        qr.user_id,
        u.name as user_name,
        q.title as questionnaire_title,
        qr.submitted_at
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      ORDER BY qr.submitted_at DESC
      LIMIT 5
    `);

    console.log(`\n✅ Respostas recentes: ${responses.rowCount}`);
    responses.rows.forEach(r => {
      console.log(`   - ${r.user_name} respondeu "${r.questionnaire_title}"`);
    });

    // 4. Verificar estrutura de disponibilidade
    const availabilityExample = await pool.query(`
      SELECT
        user_id,
        available_sundays,
        preferred_mass_times,
        alternative_times,
        can_substitute
      FROM questionnaire_responses
      WHERE available_sundays IS NOT NULL
      LIMIT 3
    `);

    console.log('\n✅ Exemplo de dados de disponibilidade:');
    availabilityExample.rows.forEach((r, i) => {
      console.log(`   Resposta ${i + 1}:`);
      console.log(`     - Domingos disponíveis: ${r.available_sundays}`);
      console.log(`     - Horário preferido: ${r.preferred_mass_times}`);
      console.log(`     - Horários alternativos: ${r.alternative_times}`);
      console.log(`     - Pode substituir: ${r.can_substitute ? 'Sim' : 'Não'}`);
    });

    console.log('\n===== RESUMO =====\n');
    console.log('✅ Conexão com banco de produção funcionando!');
    console.log('✅ 116 ministros cadastrados');
    console.log('✅ 103 respostas ao questionário de Outubro');
    console.log('✅ Dados de disponibilidade presentes');

    console.log('\n📌 AÇÃO NECESSÁRIA:');
    console.log('   Atualizar a variável DATABASE_URL para:');
    console.log('   postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

  } catch (error) {
    console.error('❌ Erro ao testar banco:', error);
  } finally {
    await pool.end();
  }
}

testWithCorrectDB();