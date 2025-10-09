// Script para testar API diretamente (simulando o frontend)
import fetch from 'node-fetch';

async function testAPI() {
  console.log('🧪 TESTANDO API DO CALENDÁRIO (simulando frontend)\n');

  // Testar endpoint de escalas
  console.log('1. GET /api/schedules?month=10&year=2025');
  try {
    const response = await fetch('http://localhost:5000/api/schedules?month=10&year=2025', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('   Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('   Resposta:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('   Erro:', error);
    }
  } catch (error) {
    console.log('   ❌ Erro de conexão:', error.message);
  }

  console.log('\n2. GET /api/schedules/by-date/2025-10-05');
  try {
    const response = await fetch('http://localhost:5000/api/schedules/by-date/2025-10-05', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('   Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log(`   Total de atribuições: ${data.length}`);
      if (data.length > 0) {
        console.log('   Primeiras 3:');
        data.slice(0, 3).forEach((item: any, i: number) => {
          console.log(`   ${i + 1}. ${item.time} - ${item.ministerName || 'Sem nome'}`);
        });
      }
    } else {
      const error = await response.text();
      console.log('   Erro:', error);
    }
  } catch (error) {
    console.log('   ❌ Erro de conexão:', error.message);
  }
}

testAPI();
