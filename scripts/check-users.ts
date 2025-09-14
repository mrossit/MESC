#!/usr/bin/env tsx

const API_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5000';

async function checkUsers() {
  try {
    // Login
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'temp-admin@paroquia.com',
        password: 'september2024'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login falhou');
    }

    const { token } = await loginResponse.json();

    // Buscar usuários
    const usersResponse = await fetch(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!usersResponse.ok) {
      throw new Error('Erro ao buscar usuários');
    }

    const users = await usersResponse.json();

    // Agrupar por role
    const byRole: Record<string, any[]> = {};
    users.forEach((user: any) => {
      if (!byRole[user.role]) {
        byRole[user.role] = [];
      }
      byRole[user.role].push(user);
    });

    console.log('========================================');
    console.log('USUÁRIOS NO SISTEMA');
    console.log('========================================\n');

    Object.keys(byRole).sort().forEach(role => {
      console.log(`\n${role.toUpperCase()} (${byRole[role].length}):`);
      console.log('-------------------');
      byRole[role].forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.status}`);
      });
    });

    console.log('\n========================================');
    console.log(`TOTAL: ${users.length} usuários`);
    console.log('========================================');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

checkUsers();