import fetch from 'node-fetch';

async function forceCacheInvalidation() {
  const baseUrl = 'http://localhost:5000';

  try {
    console.log('🔄 Forçando invalidação de cache...\n');

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

    // Fazer múltiplas requisições para forçar refresh
    console.log('2. Fazendo múltiplas requisições para limpar cache...');

    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${baseUrl}/api/users/pending?t=${Date.now()}`, {
        headers: {
          'Cookie': cookies!,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  Tentativa ${i + 1}: ${data.length} usuários pendentes`);

        if (data.length > 0) {
          console.log('  Usuários:', data.map((u: any) => u.name).join(', '));
        }
      }

      // Pequena pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Cache invalidado com sucesso!');
    console.log('\n📝 RECOMENDAÇÕES:');
    console.log('1. Faça um hard refresh no navegador (Ctrl+Shift+F5)');
    console.log('2. Abra o DevTools e na aba Network, marque "Disable cache"');
    console.log('3. Faça logout e login novamente');
    console.log('4. Se ainda não aparecer, verifique o console do navegador para logs de debug');

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

forceCacheInvalidation();