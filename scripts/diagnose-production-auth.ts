/**
 * Script to diagnose authentication issues in production database
 * Checks for common problems that could prevent login
 */

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function diagnoseProductionAuth() {
  console.log('🔍 Diagnosticando problemas de autenticação no banco de produção...\n');

  try {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = await import('ws');

    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });

    console.log('✅ Conectado ao banco de produção\n');

    // 1. Check total users and their status
    console.log('📊 1. Verificando status geral dos usuários:');
    const statsResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM users
      GROUP BY status
      ORDER BY count DESC
    `);
    console.table(statsResult.rows);

    // 2. Check for users with NULL or invalid password_hash
    console.log('\n🔐 2. Verificando password_hash:');
    const invalidPasswordResult = await pool.query(`
      SELECT
        id,
        email,
        name,
        LENGTH(password_hash) as hash_length,
        CASE
          WHEN password_hash IS NULL THEN 'NULL'
          WHEN password_hash = '' THEN 'EMPTY'
          WHEN LENGTH(password_hash) < 10 THEN 'TOO_SHORT'
          WHEN password_hash NOT LIKE '$2%' THEN 'INVALID_FORMAT'
          ELSE 'OK'
        END as hash_status
      FROM users
      WHERE
        password_hash IS NULL OR
        password_hash = '' OR
        LENGTH(password_hash) < 10 OR
        password_hash NOT LIKE '$2%'
      LIMIT 10
    `);

    if (invalidPasswordResult.rows.length > 0) {
      console.log('❌ Encontrados usuários com password_hash inválido:');
      console.table(invalidPasswordResult.rows);
    } else {
      console.log('✅ Todos os password_hash parecem válidos');
    }

    // 3. Check for users with NULL or invalid emails
    console.log('\n📧 3. Verificando emails:');
    const invalidEmailResult = await pool.query(`
      SELECT
        id,
        email,
        name,
        CASE
          WHEN email IS NULL THEN 'NULL'
          WHEN email = '' THEN 'EMPTY'
          WHEN email NOT LIKE '%@%' THEN 'INVALID_FORMAT'
          ELSE 'OK'
        END as email_status
      FROM users
      WHERE
        email IS NULL OR
        email = '' OR
        email NOT LIKE '%@%'
      LIMIT 10
    `);

    if (invalidEmailResult.rows.length > 0) {
      console.log('❌ Encontrados usuários com email inválido:');
      console.table(invalidEmailResult.rows);
    } else {
      console.log('✅ Todos os emails parecem válidos');
    }

    // 4. Sample of valid users for comparison
    console.log('\n👥 4. Amostra de usuários (para verificação):');
    const sampleResult = await pool.query(`
      SELECT
        id,
        email,
        name,
        role,
        status,
        LENGTH(password_hash) as hash_length,
        SUBSTRING(password_hash, 1, 10) as hash_prefix,
        updated_at,
        created_at
      FROM users
      WHERE status = 'active'
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    console.table(sampleResult.rows);

    // 5. Check for firstName/lastName issues
    console.log('\n👤 5. Verificando firstName/lastName:');
    const nameFieldsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE first_name IS NOT NULL) as has_first_name,
        COUNT(*) FILTER (WHERE last_name IS NOT NULL) as has_last_name,
        COUNT(*) FILTER (WHERE name IS NOT NULL) as has_name,
        COUNT(*) as total
      FROM users
    `);
    console.table(nameFieldsResult.rows);

    // 6. Check recent updates
    console.log('\n📅 6. Atualizações recentes (últimas 24 horas):');
    const recentUpdatesResult = await pool.query(`
      SELECT
        id,
        email,
        name,
        updated_at
      FROM users
      WHERE updated_at > NOW() - INTERVAL '24 hours'
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    if (recentUpdatesResult.rows.length > 0) {
      console.table(recentUpdatesResult.rows);
    } else {
      console.log('Nenhuma atualização nas últimas 24 horas');
    }

    // 7. Try to authenticate one test user
    console.log('\n🔑 7. Testando autenticação com bcrypt:');
    const testUserResult = await pool.query(`
      SELECT id, email, name, password_hash
      FROM users
      WHERE email = 'rossit@icloud.com'
      LIMIT 1
    `);

    if (testUserResult.rows.length > 0) {
      const user = testUserResult.rows[0];
      console.log(`\nUsuário: ${user.email}`);
      console.log(`Nome: ${user.name}`);
      console.log(`Hash length: ${user.password_hash?.length || 0}`);
      console.log(`Hash prefix: ${user.password_hash?.substring(0, 10) || 'NULL'}`);

      // Try to verify password
      const bcrypt = await import('bcrypt');
      try {
        const isValid = await bcrypt.compare('123pEgou$&@', user.password_hash);
        console.log(`Senha válida: ${isValid ? '✅ SIM' : '❌ NÃO'}`);

        if (!isValid) {
          console.log('\n⚠️  PROBLEMA ENCONTRADO: O hash de senha não corresponde à senha conhecida!');
          console.log('   Isso indica que os hashes de senha foram corrompidos.');
        }
      } catch (error: any) {
        console.log(`❌ Erro ao verificar senha: ${error.message}`);
        console.log('   Isso pode indicar que o hash está corrompido.');
      }
    } else {
      console.log('Usuário de teste não encontrado');
    }

    await pool.end();

    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO DO DIAGNÓSTICO:');
    console.log('='.repeat(80));
    console.log('1. Verifique se há usuários com password_hash inválido');
    console.log('2. Verifique se há usuários com email inválido');
    console.log('3. Verifique se a senha do usuário de teste foi validada corretamente');
    console.log('4. Se os hashes foram corrompidos, será necessário resetar as senhas');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Erro ao diagnosticar:', error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseProductionAuth()
    .then(() => {
      console.log('\n✅ Diagnóstico concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Diagnóstico falhou:', error);
      process.exit(1);
    });
}

export { diagnoseProductionAuth };
