import fetch from 'node-fetch';

async function testPendingAPI() {
  const baseUrl = 'http://localhost:5000';

  try {
    console.log('🧪 Testando API de usuários pendentes...\n');

    // Login como coordenador
    console.log('1. Fazendo login como coordenador...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'coordenador@test.com',
        password: 'senha123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${await loginResponse.text()}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login bem-sucedido\n');

    // Testar API de usuários pendentes
    console.log('2. Buscando usuários pendentes...');
    const pendingResponse = await fetch(`${baseUrl}/api/users/pending`, {
      headers: { 'Cookie': cookies! }
    });

    if (!pendingResponse.ok) {
      throw new Error(`Falha ao buscar pendentes: ${await pendingResponse.text()}`);
    }

    const pendingUsers = await pendingResponse.json();
    console.log(`✅ Encontrados ${pendingUsers.length} usuários pendentes:`);

    pendingUsers.forEach((user: any) => {
      console.log(`\n- Nome: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  ID: ${user.id}`);
    });

    // Testar API de todos os usuários
    console.log('\n\n3. Buscando todos os usuários...');
    const allUsersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: { 'Cookie': cookies! }
    });

    if (allUsersResponse.ok) {
      const allUsers = await allUsersResponse.json();
      const pendingInAll = allUsers.filter((u: any) => u.status === 'pending');
      console.log(`✅ Total de usuários: ${allUsers.length}`);
      console.log(`   Pendentes em /api/users: ${pendingInAll.length}`);

      if (pendingInAll.length > 0) {
        console.log('\nUsuários pendentes encontrados em /api/users:');
        pendingInAll.forEach((user: any) => {
          console.log(`- ${user.name} (${user.email})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testPendingAPI();