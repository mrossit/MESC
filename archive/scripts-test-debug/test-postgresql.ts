import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure websocket
neonConfig.webSocketConstructor = ws;

async function testPostgreSQL() {
  console.log('===== TESTE DO BANCO POSTGRESQL (NEON) =====');

  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0JeUfXEWQxm8@ep-round-sea-af7udjsn.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  console.log('Conectando ao banco PostgreSQL...');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Verificar tabelas
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\nTabelas existentes:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verificar estrutura da tabela users
    const userColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
      LIMIT 10
    `);

    console.log('\nPrimeiras 10 colunas da tabela users:');
    userColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Contar usuários
    const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log('\nTotal de usuários:', userCountResult.rows[0].count);

    // Listar alguns usuários
    const usersResult = await pool.query(`
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('coordenador', 'minister', 'admin')
         OR role IS NOT NULL
      LIMIT 10
    `);

    console.log('\nUsuários com roles relevantes:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Verificar se existe tabela ministers
    const ministersTableResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%minister%'
    `);

    console.log('\nTabelas relacionadas a ministros:',
      ministersTableResult.rows.map(r => r.table_name).join(', ') || 'nenhuma encontrada');

    // Verificar questionários
    const questionnairesResult = await pool.query('SELECT id, title, status FROM questionnaires');
    console.log('\n===== QUESTIONÁRIOS =====');
    if (questionnairesResult.rows.length === 0) {
      console.log('Nenhum questionário encontrado');
    } else {
      questionnairesResult.rows.forEach(q => {
        console.log(`  - ${q.title} (ID: ${q.id}, Status: ${q.status})`);
      });
    }

    // Verificar respostas - a tabela se chama questionnaire_responses (com underscore)
    const responsesCountResult = await pool.query('SELECT COUNT(*) FROM questionnaire_responses');
    console.log('\n===== RESPOSTAS =====');
    console.log('Total de respostas:', responsesCountResult.rows[0].count);

    if (parseInt(responsesCountResult.rows[0].count) > 0) {
      const responsesResult = await pool.query(`
        SELECT qr.*, u.name as user_name
        FROM questionnaire_responses qr
        LEFT JOIN users u ON u.id = qr.minister_id
        LIMIT 5
      `);

      console.log('Primeiras 5 respostas:');
      responsesResult.rows.forEach(r => {
        console.log(`  - Usuário: ${r.user_name} (Questionnaire: ${r.questionnaire_id})`);
      });
    }

    console.log('\n===== ANÁLISE DO PROBLEMA =====');
    console.log('1. O sistema está usando PostgreSQL (Neon) quando DATABASE_URL está configurada');
    console.log('2. Existe ' + userCountResult.rows[0].count + ' usuários no banco PostgreSQL');
    console.log('3. Não existe uma tabela "ministers" separada - os ministros são usuários com roles específicos');
    console.log('4. O frontend/backend pode estar esperando uma estrutura diferente');

  } catch (error) {
    console.error('Erro ao conectar ao PostgreSQL:', error);
  } finally {
    await pool.end();
  }
}

testPostgreSQL();