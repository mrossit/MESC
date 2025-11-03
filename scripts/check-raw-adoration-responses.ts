import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkRawAdorationResponses() {
  console.log('🔍 VERIFICANDO RESPOSTAS BRUTAS - Adoração e Missa 20/11\n');

  try {
    // Buscar TODAS as respostas de Novembro 2025
    const allResponses = await client`
      SELECT
        u.name,
        u.email,
        qr.responses,
        qr.special_events
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
      ORDER BY u.name
    `;

    console.log(`Total de respostas: ${allResponses.length}\n`);
    console.log('═'.repeat(80));

    let adorationResponses = {
      sim: 0,
      nao: 0,
      naoRespondeu: 0,
      detalhes: [] as any[]
    };

    let mass20Responses = {
      sim: 0,
      nao: 0,
      naoRespondeu: 0,
      detalhes: [] as any[]
    };

    console.log('\n🕯️  ANÁLISE DE RESPOSTAS - ADORAÇÃO SEGUNDA 22H:\n');

    for (const row of allResponses) {
      const responsesData = typeof row.responses === 'string'
        ? JSON.parse(row.responses)
        : row.responses;

      // Se for formato array (legado)
      if (Array.isArray(responsesData)) {
        const adorationItem = responsesData.find((item: any) => item.questionId === 'adoration_monday');

        if (adorationItem) {
          const answer = adorationItem.answer;
          if (answer === 'Sim, posso conduzir' || answer === 'Sim' || answer === true) {
            adorationResponses.sim++;
            adorationResponses.detalhes.push({
              nome: row.name,
              email: row.email,
              resposta: answer
            });
          } else if (answer === 'Não posso conduzir' || answer === 'Não' || answer === false) {
            adorationResponses.nao++;
          }
        } else {
          adorationResponses.naoRespondeu++;
        }
      }
      // Se for formato v2.0
      else if (responsesData?.format_version === '2.0') {
        const adorationValue = responsesData.special_events?.adoration_monday;

        if (adorationValue === true) {
          adorationResponses.sim++;
          adorationResponses.detalhes.push({
            nome: row.name,
            email: row.email,
            resposta: 'true (v2.0)'
          });
        } else if (adorationValue === false) {
          adorationResponses.nao++;
        } else {
          adorationResponses.naoRespondeu++;
        }
      }
    }

    console.log('📊 ESTATÍSTICAS ADORAÇÃO:');
    console.log(`   ✅ Responderam SIM: ${adorationResponses.sim}`);
    console.log(`   ❌ Responderam NÃO: ${adorationResponses.nao}`);
    console.log(`   ⚪ Não responderam: ${adorationResponses.naoRespondeu}`);

    if (adorationResponses.sim > 0) {
      console.log('\n📋 MINISTROS QUE DISSERAM SIM PARA ADORAÇÃO:');
      adorationResponses.detalhes.forEach((m: any) => {
        console.log(`   ✓ ${m.nome} (${m.email}) - Resposta: ${m.resposta}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📅 ANÁLISE DE RESPOSTAS - MISSA 20/11 (formatura PUC):\n');

    for (const row of allResponses) {
      const responsesData = typeof row.responses === 'string'
        ? JSON.parse(row.responses)
        : row.responses;

      // Se for formato array (legado)
      if (Array.isArray(responsesData)) {
        const mass20Item = responsesData.find((item: any) => item.questionId === 'special_event_3');

        if (mass20Item) {
          const answer = mass20Item.answer;
          if (answer === 'Sim' || answer === true) {
            mass20Responses.sim++;
            mass20Responses.detalhes.push({
              nome: row.name,
              email: row.email,
              resposta: answer
            });
          } else if (answer === 'Não' || answer === false) {
            mass20Responses.nao++;
          }
        } else {
          mass20Responses.naoRespondeu++;
        }
      }
      // Se for formato v2.0
      else if (responsesData?.format_version === '2.0') {
        const specialEvents = responsesData.special_events || {};
        const mass20Value = specialEvents.special_event_3 || specialEvents.missa_formatura_puc_20_11_2025_as_10h;

        if (mass20Value === true) {
          mass20Responses.sim++;
          mass20Responses.detalhes.push({
            nome: row.name,
            email: row.email,
            resposta: 'true (v2.0)'
          });
        } else if (mass20Value === false) {
          mass20Responses.nao++;
        } else {
          mass20Responses.naoRespondeu++;
        }
      }
    }

    console.log('📊 ESTATÍSTICAS MISSA 20/11:');
    console.log(`   ✅ Responderam SIM: ${mass20Responses.sim}`);
    console.log(`   ❌ Responderam NÃO: ${mass20Responses.nao}`);
    console.log(`   ⚪ Não responderam: ${mass20Responses.naoRespondeu}`);

    if (mass20Responses.sim > 0) {
      console.log('\n📋 MINISTROS QUE DISSERAM SIM PARA MISSA 20/11:');
      mass20Responses.detalhes.forEach((m: any) => {
        console.log(`   ✓ ${m.nome} (${m.email}) - Resposta: ${m.resposta}`);
      });
    }

    console.log('\n' + '═'.repeat(80));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkRawAdorationResponses();
