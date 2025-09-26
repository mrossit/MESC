import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testScheduleGeneration() {
  console.log('🔍 Testing schedule generation...\n');

  try {
    // 1. Login como coordenador
    console.log('1. Fazendo login...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rossit@icloud.com',
        password: '123Pegou'
      })
    });

    if (!loginRes.ok) {
      console.log('❌ Login falhou');
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login bem-sucedido\n');

    // 2. Testar preview de geração (aceita questionários abertos)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    console.log(`2. Testando preview para ${currentMonth}/${currentYear}...`);
    const previewRes = await fetch(`${API_URL}/api/schedules/preview/${currentYear}/${currentMonth}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${previewRes.status}`);

    if (previewRes.ok) {
      const previewData = await previewRes.json();

      if (previewData.success) {
        console.log('✅ Preview gerado com sucesso!');
        console.log(`   Total de escalas: ${previewData.data.totalSchedules}`);
        console.log(`   Confiança média: ${previewData.data.averageConfidence}`);

        if (previewData.data.schedules && previewData.data.schedules.length > 0) {
          console.log('\n   Primeiras 3 escalas:');
          previewData.data.schedules.slice(0, 3).forEach((s: any) => {
            console.log(`     - ${s.date} às ${s.time}: ${s.ministers.length} ministros`);
          });
        }

        if (previewData.data.qualityMetrics) {
          console.log('\n   Métricas de qualidade:');
          console.log(`     - Ministros únicos: ${previewData.data.qualityMetrics.uniqueMinistersUsed}`);
          console.log(`     - Média por missa: ${previewData.data.qualityMetrics.averageMinistersPerMass}`);
          console.log(`     - Alta confiança: ${previewData.data.qualityMetrics.highConfidenceSchedules}`);
          console.log(`     - Baixa confiança: ${previewData.data.qualityMetrics.lowConfidenceSchedules}`);
        }
      } else {
        console.log('❌ Preview falhou:', previewData.message);
      }
    } else {
      const error = await previewRes.text();
      console.log(`❌ Erro na API: ${error}`);
    }

    // 3. Verificar se há questionários no banco
    console.log('\n3. Verificando questionários...');
    const questRes = await fetch(`${API_URL}/api/questionnaires`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (questRes.ok) {
      const questionnaires = await questRes.json();
      console.log(`   Questionários encontrados: ${questionnaires.length}`);

      if (questionnaires.length > 0) {
        const current = questionnaires.find((q: any) =>
          q.month === currentMonth && q.year === currentYear
        );

        if (current) {
          console.log(`   Questionário do mês atual:`, {
            status: current.status,
            questions: current.questions?.length || 0,
            responses: current.responseCount || 0
          });
        }
      }
    }

    // 4. Verificar respostas do questionário
    console.log('\n4. Verificando respostas de questionário...');
    const responseRes = await fetch(`${API_URL}/api/questionnaires/responses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (responseRes.ok) {
      const responses = await responseRes.json();
      console.log(`   Total de respostas: ${responses.length}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testScheduleGeneration();