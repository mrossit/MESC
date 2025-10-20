/**
 * Script to test second user login
 */

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function testSecondUserLogin() {
  console.log('🔍 Testando autenticação do segundo usuário...\n');

  try {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = await import('ws');
    const bcrypt = await import('bcrypt');

    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });

    console.log('✅ Conectado ao banco de produção\n');

    // Test user: evanilbergamo@yahoo.com.br password: Amanda94
    const testUserResult = await pool.query(`
      SELECT id, email, name, password_hash, role, status, updated_at, created_at
      FROM users
      WHERE email = 'evanilbergamo@yahoo.com.br'
      LIMIT 1
    `);

    if (testUserResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado!');
      await pool.end();
      return;
    }

    const user = testUserResult.rows[0];
    console.log('📋 Dados do usuário:');
    console.table([{
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      hash_length: user.password_hash?.length || 0,
      hash_prefix: user.password_hash?.substring(0, 15) || 'NULL',
      created_at: user.created_at,
      updated_at: user.updated_at
    }]);

    console.log('\n🔑 Testando senha "Amanda94":');
    try {
      const isValid = await bcrypt.compare('Amanda94', user.password_hash);
      console.log(`Resultado: ${isValid ? '✅ SENHA VÁLIDA' : '❌ SENHA INVÁLIDA'}`);

      if (!isValid) {
        console.log('\n⚠️  A senha não confere! Vamos verificar variações:');

        // Test variations
        const variations = [
          'amanda94',
          'AMANDA94',
          'Amanda94!',
          'Amanda@94'
        ];

        for (const variant of variations) {
          const result = await bcrypt.compare(variant, user.password_hash);
          if (result) {
            console.log(`✅ Senha correta: "${variant}"`);
          }
        }
      }
    } catch (error: any) {
      console.log(`❌ Erro ao verificar senha: ${error.message}`);
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecondUserLogin()
    .then(() => {
      console.log('\n✅ Teste concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Teste falhou:', error);
      process.exit(1);
    });
}

export { testSecondUserLogin };
