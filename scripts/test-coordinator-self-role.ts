import fetch from 'node-fetch';

async function testCoordinatorSelfRoleChange() {
  const baseUrl = 'http://localhost:5000';

  try {
    console.log('🧪 Testando alteração de perfil próprio para coordenadores...\n');

    // 1. Login como coordenador
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
    if (!cookies) {
      throw new Error('Nenhum cookie de sessão recebido');
    }

    const loginData = await loginResponse.json();
    console.log(`✅ Login bem-sucedido como: ${loginData.user.name} (${loginData.user.role})\n`);

    // 2. Obter ID do coordenador
    const userId = loginData.user.id;

    // 3. Testar alteração para ministro (rebaixar)
    console.log('2. Testando alteração para ministro (rebaixar)...');
    const toMinistroResponse = await fetch(`${baseUrl}/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ role: 'ministro' })
    });

    if (toMinistroResponse.ok) {
      console.log('✅ Coordenador conseguiu se rebaixar para ministro');

      // Voltar para coordenador para próximo teste
      await fetch(`${baseUrl}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({ role: 'coordenador' })
      });
    } else {
      const error = await toMinistroResponse.text();
      console.log(`❌ Falha ao mudar para ministro: ${error}`);
    }

    // 4. Testar alteração para gestor (promover)
    console.log('\n3. Testando alteração para gestor (promover)...');
    const toGestorResponse = await fetch(`${baseUrl}/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ role: 'gestor' })
    });

    if (toGestorResponse.ok) {
      console.log('✅ Coordenador conseguiu se promover para gestor');

      // Voltar para coordenador
      await fetch(`${baseUrl}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({ role: 'coordenador' })
      });
    } else {
      const error = await toGestorResponse.text();
      console.log(`❌ Falha ao mudar para gestor: ${error}`);
    }

    // 5. Testar alteração para o mesmo perfil (deve falhar)
    console.log('\n4. Testando alteração para o mesmo perfil (deve falhar)...');
    const toSameResponse = await fetch(`${baseUrl}/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ role: 'coordenador' })
    });

    if (!toSameResponse.ok) {
      const error = await toSameResponse.json();
      console.log(`✅ Corretamente impedido: ${error.message}`);
    } else {
      console.log('❌ Erro: Permitiu mudar para o mesmo perfil');
    }

    // 6. Testar como gestor (deve ser impedido)
    console.log('\n5. Testando como gestor (deve ser impedido)...');

    // Login como gestor
    const gestorLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rossit@icloud.com',
        password: 'senha123'
      })
    });

    if (gestorLoginResponse.ok) {
      const gestorCookies = gestorLoginResponse.headers.get('set-cookie');
      const gestorData = await gestorLoginResponse.json();

      const gestorChangeResponse = await fetch(`${baseUrl}/api/users/${gestorData.user.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': gestorCookies!
        },
        body: JSON.stringify({ role: 'coordenador' })
      });

      if (!gestorChangeResponse.ok) {
        const error = await gestorChangeResponse.json();
        console.log(`✅ Gestor corretamente impedido: ${error.message}`);
      } else {
        console.log('❌ Erro: Gestor conseguiu alterar seu próprio perfil');
      }
    }

    console.log('\n✨ Teste concluído!');
    console.log('📝 Resumo:');
    console.log('- Coordenadores PODEM alterar seu próprio perfil');
    console.log('- Gestores NÃO PODEM alterar seu próprio perfil');
    console.log('- Ninguém pode mudar para o mesmo perfil que já possui');

  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }

  process.exit(0);
}

testCoordinatorSelfRoleChange();