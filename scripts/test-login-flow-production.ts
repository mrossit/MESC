/**
 * Script to test complete login flow in production database
 * Simulates exactly what the login API does
 */

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function testLoginFlow() {
  console.log('🔍 Testando fluxo completo de login...\n');

  try {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = await import('ws');
    const bcrypt = await import('bcrypt');

    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });

    console.log('✅ Conectado ao banco de produção\n');

    // Test both users
    const testUsers = [
      { email: 'rossit@icloud.com', password: '123pEgou$&@' },
      { email: 'evanilbergamo@yahoo.com.br', password: 'Amanda94' }
    ];

    for (const testUser of testUsers) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔑 Testando login: ${testUser.email}`);
      console.log('='.repeat(80));

      // Step 1: Search user by email (exactly like auth.ts does)
      console.log('\n1️⃣ Buscando usuário por email...');
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [testUser.email]
      );

      if (userResult.rows.length === 0) {
        console.log('❌ ERRO: Usuário não encontrado!');
        console.log('   Isso indica que o email não está exatamente igual no banco.');

        // Try case-insensitive search
        console.log('\n   Tentando busca case-insensitive...');
        const caseInsensitiveResult = await pool.query(
          'SELECT email FROM users WHERE LOWER(email) = LOWER($1)',
          [testUser.email]
        );

        if (caseInsensitiveResult.rows.length > 0) {
          console.log('   ⚠️  Email encontrado com case diferente:');
          console.table(caseInsensitiveResult.rows);
        }
        continue;
      }

      const user = userResult.rows[0];
      console.log('✅ Usuário encontrado:');
      console.table([{
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        hash_length: user.password_hash?.length || 0,
        hash_prefix: user.password_hash?.substring(0, 15) || 'NULL'
      }]);

      // Step 2: Check status (like auth.ts does)
      console.log('\n2️⃣ Verificando status do usuário...');
      if (user.status === 'pending') {
        console.log('❌ ERRO: Status = pending');
        console.log('   Mensagem: "Sua conta ainda não foi aprovada. Aguarde a aprovação do coordenador."');
        continue;
      }

      if (user.status === 'inactive') {
        console.log('❌ ERRO: Status = inactive');
        console.log('   Mensagem: "Usuário inativo. Entre em contato com a coordenação."');
        continue;
      }

      console.log(`✅ Status OK: ${user.status}`);

      // Step 3: Verify password (like auth.ts does)
      console.log('\n3️⃣ Verificando senha...');
      const passwordHash = user.password_hash || '';

      if (!passwordHash) {
        console.log('❌ ERRO: password_hash está vazio/null!');
        continue;
      }

      console.log(`   Hash: ${passwordHash.substring(0, 20)}...`);
      console.log(`   Senha testada: ${testUser.password}`);

      try {
        const isValidPassword = await bcrypt.compare(testUser.password, passwordHash);

        if (!isValidPassword) {
          console.log('❌ ERRO: Senha NÃO confere!');
          console.log('   Esta é a causa do erro "Usuário ou senha errados"');
          console.log('\n   Vamos testar variações da senha...');

          const variations = [
            testUser.password.toLowerCase(),
            testUser.password.toUpperCase(),
            testUser.password.trim(),
            testUser.password + ' ',
            ' ' + testUser.password
          ];

          for (const variant of variations) {
            if (variant !== testUser.password) {
              const result = await bcrypt.compare(variant, passwordHash);
              if (result) {
                console.log(`   ✅ Senha correta com variação: "${variant}"`);
                console.log(`      (Original tinha: "${testUser.password}")`);
              }
            }
          }
        } else {
          console.log('✅ Senha VÁLIDA!');
          console.log('   Login deveria funcionar!');
        }
      } catch (error: any) {
        console.log(`❌ ERRO ao verificar senha: ${error.message}`);
        console.log('   Isso pode indicar hash corrompido.');
      }

      // Step 4: Check if email normalization could be the issue
      console.log('\n4️⃣ Verificando possíveis problemas de normalização...');
      const emailLower = testUser.email.toLowerCase();
      const emailTrim = testUser.email.trim();

      console.log(`   Email original: "${testUser.email}"`);
      console.log(`   Email no banco: "${user.email}"`);
      console.log(`   São iguais: ${testUser.email === user.email ? '✅ SIM' : '❌ NÃO'}`);

      if (testUser.email !== user.email) {
        console.log('   ⚠️  ATENÇÃO: Emails são diferentes!');
        console.log(`      Frontend envia: "${testUser.email}"`);
        console.log(`      Banco tem: "${user.email}"`);
      }
    }

    await pool.end();

    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO');
    console.log('='.repeat(80));
    console.log('Se ambas as senhas foram validadas como ✅ VÁLIDAS,');
    console.log('mas o login ainda falha, o problema está em:');
    console.log('1. Normalização de email (case sensitivity)');
    console.log('2. Código do frontend enviando dados incorretos');
    console.log('3. Middleware ou código entre frontend e backend');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  testLoginFlow()
    .then(() => {
      console.log('\n✅ Teste concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Teste falhou:', error);
      process.exit(1);
    });
}

export { testLoginFlow };
