import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function checkResponsesStructure() {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0JeUfXEWQxm8@ep-round-sea-af7udjsn.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('===== ESTRUTURA DA TABELA questionnaire_responses =====\n');

    // Verificar colunas
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'questionnaire_responses'
      ORDER BY ordinal_position
    `);

    console.log('Colunas da tabela:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Verificar alguns registros
    const responsesResult = await pool.query(`
      SELECT * FROM questionnaire_responses LIMIT 2
    `);

    console.log('\nExemplo de dados (2 primeiros registros):');
    responsesResult.rows.forEach((r, index) => {
      console.log(`\nRegistro ${index + 1}:`);
      Object.keys(r).forEach(key => {
        const value = r[key];
        if (typeof value === 'string' && value.length > 100) {
          console.log(`  ${key}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    });

    // Verificar usuários relacionados
    console.log('\n===== USUÁRIOS RELACIONADOS =====\n');
    const usersWithResponses = await pool.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.role
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
    `);

    console.log('Usuários que responderam questionários:');
    usersWithResponses.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Contar respostas por usuário
    const responsesByUser = await pool.query(`
      SELECT u.name, COUNT(*) as response_count
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      GROUP BY u.id, u.name
    `);

    console.log('\nRespostas por usuário:');
    responsesByUser.rows.forEach(r => {
      console.log(`  - ${r.name}: ${r.response_count} respostas`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkResponsesStructure();