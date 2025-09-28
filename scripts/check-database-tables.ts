import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function checkDatabaseTables() {
  console.log('\n🔍 VERIFICANDO TODAS AS TABELAS DO BANCO DE DADOS\n');
  console.log('=' .repeat(80));

  try {
    // 1. Verificar quais tabelas existem
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 TABELAS ENCONTRADAS:');
    console.log('-'.repeat(40));
    for (const table of tables.rows) {
      console.log(`   • ${table.table_name}`);
    }

    // 2. Contar registros em cada tabela importante
    console.log('\n\n📊 CONTAGEM DE REGISTROS:');
    console.log('-'.repeat(40));

    const tablesToCheck = [
      'users',
      'questionnaires',
      'questionnaire_responses',
      'schedules',
      'mass_times_config'
    ];

    for (const tableName of tablesToCheck) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM ${sql.identifier(tableName)}
        `);
        const count = result.rows[0]?.count || 0;
        console.log(`   ${tableName}: ${count} registros`);
      } catch (err) {
        console.log(`   ${tableName}: ❌ tabela não existe ou erro`);
      }
    }

    // 3. Verificar se há usuários
    const usersResult = await db.execute(sql`
      SELECT id, name, email, role, status
      FROM users
      LIMIT 10
    `);

    if (usersResult.rows.length > 0) {
      console.log('\n\n👥 USUÁRIOS ENCONTRADOS:');
      console.log('-'.repeat(40));
      for (const user of usersResult.rows) {
        console.log(`   • ${user.name} (${user.email}) - ${user.role} [${user.status}]`);
      }

      // Procurar especificamente pela Roberta
      const robertaResult = await db.execute(sql`
        SELECT * FROM users
        WHERE email LIKE '%roberta%'
        OR name ILIKE '%roberta%'
      `);

      if (robertaResult.rows.length > 0) {
        console.log('\n\n🔍 USUÁRIA ROBERTA:');
        console.log('-'.repeat(40));
        for (const user of robertaResult.rows) {
          console.log(`   Nome: ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Status: ${user.status}`);
        }
      }
    }

    // 4. Verificar conexão do banco
    console.log('\n\n🔧 INFORMAÇÕES DO BANCO:');
    console.log('-'.repeat(40));

    const dbInfo = await db.execute(sql`
      SELECT current_database() as database,
             current_user as user,
             version() as version
    `);

    if (dbInfo.rows[0]) {
      console.log(`   Database: ${dbInfo.rows[0].database}`);
      console.log(`   User: ${dbInfo.rows[0].user}`);
      console.log(`   Version: ${dbInfo.rows[0].version?.split(',')[0]}`);
    }

    // 5. Verificar se estamos em produção
    console.log('\n\n🌍 AMBIENTE:');
    console.log('-'.repeat(40));
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   DATABASE_URL existe: ${!!process.env.DATABASE_URL}`);

    if (process.env.DATABASE_URL) {
      // Extrair informações básicas da URL (sem senha)
      const urlParts = process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):.*@([^\/]+)\/(.+)/);
      if (urlParts) {
        console.log(`   Host: ${urlParts[2]}`);
        console.log(`   Database: ${urlParts[3]}`);
        console.log(`   User: ${urlParts[1]}`);
      }
    }

    console.log('\n\n💡 CONCLUSÃO:');
    console.log('=' .repeat(80));

    const hasUsers = usersResult.rows.length > 0;
    const hasQuestionnaires = tablesToCheck.includes('questionnaires');
    const hasResponses = tablesToCheck.includes('questionnaire_responses');

    if (!hasUsers) {
      console.log('\n❌ Banco sem usuários cadastrados');
    }
    if (!hasQuestionnaires || !hasResponses) {
      console.log('\n❌ Tabelas de questionário não encontradas ou vazias');
    }

    console.log('\n📝 POSSÍVEIS CAUSAS:');
    console.log('   1. Banco de dados está vazio (precisa popular)');
    console.log('   2. Conexão está apontando para banco errado');
    console.log('   3. Os dados de outubro estão em outro ambiente');
    console.log('\n💡 Verifique se o DATABASE_URL está correto!');

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  }

  process.exit(0);
}

checkDatabaseTables();