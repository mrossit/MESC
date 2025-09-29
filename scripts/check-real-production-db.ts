import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function checkRealProductionDB() {
  console.log('===== VERIFICANDO BANCO DE PRODUÇÃO REAL =====\n');

  // URL do banco de produção real
  const PROD_DATABASE_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

  // URL configurada atualmente no sistema
  const CURRENT_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0JeUfXEWQxm8@ep-round-sea-af7udjsn.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

  console.log('URL do banco de PRODUÇÃO REAL:');
  console.log('  Host: ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech');

  console.log('\nURL configurada ATUALMENTE no sistema:');
  console.log('  Host:', CURRENT_DATABASE_URL.includes('ep-round-sea') ? 'ep-round-sea-af7udjsn.c-2.us-west-2.aws.neon.tech' : 'outro');

  console.log('\n⚠️  PROBLEMA IDENTIFICADO: O sistema está usando um banco DIFERENTE do banco de produção!\n');

  const pool = new Pool({ connectionString: PROD_DATABASE_URL });

  try {
    // Estatísticas gerais
    console.log('===== ESTATÍSTICAS DO BANCO DE PRODUÇÃO =====\n');

    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'ministro') as total_ministros,
        (SELECT COUNT(*) FROM users WHERE role = 'coordenador') as total_coordenadores,
        (SELECT COUNT(*) FROM questionnaires) as total_questionnaires,
        (SELECT COUNT(*) FROM questionnaire_responses) as total_responses
    `);

    const s = stats.rows[0];
    console.log(`Total de usuários: ${s.total_users}`);
    console.log(`  - Ministros: ${s.total_ministros}`);
    console.log(`  - Coordenadores: ${s.total_coordenadores}`);
    console.log(`Total de questionários: ${s.total_questionnaires}`);
    console.log(`Total de respostas: ${s.total_responses}`);

    // Listar questionários
    console.log('\n===== QUESTIONÁRIOS =====\n');
    const questionnaires = await pool.query('SELECT id, title, status FROM questionnaires');
    questionnaires.rows.forEach(q => {
      console.log(`- ${q.title}`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Status: ${q.status}`);
    });

    // Verificar respostas por questionário
    console.log('\n===== RESPOSTAS POR QUESTIONÁRIO =====\n');
    const responsesByQuestionnaire = await pool.query(`
      SELECT
        q.title,
        COUNT(qr.id) as response_count
      FROM questionnaires q
      LEFT JOIN questionnaire_responses qr ON q.id = qr.questionnaire_id
      GROUP BY q.id, q.title
    `);

    responsesByQuestionnaire.rows.forEach(r => {
      console.log(`${r.title}: ${r.response_count} respostas`);
    });

    // Verificar alguns ministros
    console.log('\n===== AMOSTRA DE MINISTROS (10 primeiros) =====\n');
    const ministers = await pool.query(`
      SELECT id, name, email, phone
      FROM users
      WHERE role = 'ministro'
      ORDER BY name
      LIMIT 10
    `);

    ministers.rows.forEach(m => {
      console.log(`- ${m.name}`);
      console.log(`  Email: ${m.email}`);
      console.log(`  Telefone: ${m.phone || 'não informado'}`);
    });

    // Verificar quantos ministros responderam
    console.log('\n===== PARTICIPAÇÃO NAS RESPOSTAS =====\n');
    const participation = await pool.query(`
      SELECT
        COUNT(DISTINCT u.id) as ministros_que_responderam,
        COUNT(DISTINCT qr.user_id) as usuarios_unicos_respostas
      FROM users u
      INNER JOIN questionnaire_responses qr ON u.id = qr.user_id
      WHERE u.role = 'ministro'
    `);

    const p = participation.rows[0];
    console.log(`Ministros que responderam: ${p.ministros_que_responderam}`);
    console.log(`Total de usuários únicos com respostas: ${p.usuarios_unicos_respostas}`);

    // Verificar últimas respostas
    console.log('\n===== ÚLTIMAS 5 RESPOSTAS =====\n');
    const lastResponses = await pool.query(`
      SELECT
        u.name,
        u.role,
        q.title as questionnaire_title,
        qr.submitted_at
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      ORDER BY qr.submitted_at DESC
      LIMIT 5
    `);

    lastResponses.rows.forEach(r => {
      console.log(`- ${r.name} (${r.role})`);
      console.log(`  Questionário: ${r.questionnaire_title}`);
      console.log(`  Data: ${new Date(r.submitted_at).toLocaleString('pt-BR')}`);
    });

    console.log('\n===== DIAGNÓSTICO DO PROBLEMA =====\n');
    console.log('1. ❌ O sistema está configurado com o banco ERRADO');
    console.log('2. O banco de produção REAL tem:');
    console.log(`   - ${s.total_users} usuários (sendo ${s.total_ministros} ministros)`);
    console.log(`   - ${s.total_responses} respostas de questionário`);
    console.log('3. O banco atualmente configurado tem apenas 4 usuários');
    console.log('\n📌 SOLUÇÃO: Atualizar DATABASE_URL para usar o banco de produção correto');

  } catch (error) {
    console.error('Erro ao conectar ao banco de produção:', error);
  } finally {
    await pool.end();
  }
}

checkRealProductionDB();