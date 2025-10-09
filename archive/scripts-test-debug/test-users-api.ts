#!/usr/bin/env tsx

const API_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5000';

async function testUsersAPI() {
  try {
    console.log('Testando API /api/users sem autenticação...');

    // Teste 1: Sem autenticação
    const noAuthResponse = await fetch(`${API_URL}/api/users`);
    console.log('Sem auth - Status:', noAuthResponse.status);
    if (!noAuthResponse.ok) {
      console.log('Sem auth - Resposta:', await noAuthResponse.text());
    }

    console.log('\n-----------------------------------\n');

    // Teste 2: Com autenticação
    console.log('Fazendo login...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'joao.silva@paroquia.com',
        password: 'ministro123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login falhou:', loginResponse.status);
      return;
    }

    const { token } = await loginResponse.json();
    console.log('Login OK, token obtido');

    console.log('\nTestando API /api/users com autenticação...');
    const authResponse = await fetch(`${API_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Com auth - Status:', authResponse.status);

    if (authResponse.ok) {
      const users = await authResponse.json();
      console.log('Com auth - Total de usuários:', users.length);

      // Contar por role
      const byRole: Record<string, number> = {};
      users.forEach((user: any) => {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
      });

      console.log('Por role:', byRole);

      // Listar alguns usuários
      console.log('\nPrimeiros 5 usuários:');
      users.slice(0, 5).forEach((user: any) => {
        console.log(`  - ${user.name} (${user.role}) - ${user.status}`);
      });
    } else {
      console.log('Com auth - Resposta:', await authResponse.text());
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

testUsersAPI();