/**
 * Script de teste para a API de santos
 * Executa: node test-saints-api.js
 */

async function testSaintsAPI() {
  console.log('=== Testando API de Santos ===\n');

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');

  console.log(`Data atual: ${day}/${month}/${today.getFullYear()}`);
  console.log(`Formato esperado no banco: ${month}-${day}\n`);

  // Teste 1: API local
  try {
    console.log('Teste 1: Chamando /api/saints/today...');
    const response = await fetch('http://localhost:5000/api/saints/today');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const data = await response.json();
    console.log('Resposta:', JSON.stringify(data, null, 2));

    if (data.success && data.data.saints.length > 0) {
      console.log('\n✅ SUCESSO! Santo encontrado:', data.data.saints[0].name);
    } else {
      console.log('\n❌ Nenhum santo retornado');
    }
  } catch (error) {
    console.error('❌ Erro na chamada à API:', error.message);
  }

  console.log('\n=== Fim do teste ===');
}

testSaintsAPI();
