#!/usr/bin/env node
/**
 * Script para testar login via API local
 * Simula chamadas HTTP para o endpoint de autenticação
 */

async function testLoginAPI() {
  const baseURL = process.env.API_URL || 'http://localhost:5000';

  console.log('🌐 === 5. TESTE DE LOGIN VIA API ===\n');
  console.log(`Base URL: ${baseURL}\n`);

  const testUsers = [
    { email: 'rossit@icloud.com', password: 'teste123', label: 'Rossit com senha teste' },
    { email: 'machadopri@hotmail.com', password: 'teste123', label: 'Priscila com senha teste' },
  ];

  for (const testUser of testUsers) {
    console.log(`\n🧪 Testando: ${testUser.label}`);
    console.log(`   Email: ${testUser.email}`);

    try {
      const response = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      // Headers
      console.log(`   Headers relevantes:`);
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log(`      Set-Cookie: ${setCookie.substring(0, 50)}...`);
      } else {
        console.log(`      Set-Cookie: (nenhum)`);
      }

      // Body
      const data = await response.json();
      console.log(`   Response Body:`);
      console.log(`      success: ${data.success}`);
      console.log(`      message: ${data.message || '(sem mensagem)'}`);

      if (data.success) {
        console.log(`      ✅ LOGIN SUCESSO!`);
        console.log(`      user.id: ${data.user?.id}`);
        console.log(`      user.email: ${data.user?.email}`);
        console.log(`      user.role: ${data.user?.role}`);
        console.log(`      token (primeiros 20): ${data.token?.substring(0, 20)}...`);
      } else {
        console.log(`      ❌ LOGIN FALHOU: ${data.message}`);
      }

    } catch (error: any) {
      console.log(`   ❌ ERRO DE REQUISIÇÃO: ${error.message}`);
    }
  }

  console.log('\n\n📋 DIAGNÓSTICO:');
  console.log('Se todos os testes falharam com "Email ou senha incorretos",');
  console.log('significa que as senhas no banco NÃO são "teste123".');
  console.log('\nPróximos passos:');
  console.log('1. Resetar senha de um usuário coordenador');
  console.log('2. Testar novamente com a senha conhecida');
}

// Iniciar servidor se necessário
const serverURL = process.env.API_URL || 'http://localhost:5000';
console.log(`Verificando servidor em ${serverURL}...`);

testLoginAPI().catch(console.error);
