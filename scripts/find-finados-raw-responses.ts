import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function findRawFinadosResponses() {
  console.log('🔍 BUSCANDO RESPOSTAS RAW DE FINADOS - Novembro 2025\n');
  console.log('═'.repeat(80));

  try {
    const responses = await client`
      SELECT 
        u.name,
        u.email,
        qr.responses
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
    `;

    console.log(`\n📊 Analisando ${responses.length} respostas...\n`);

    let yesCount = 0;
    let noCount = 0;
    const availableList: Array<{name: string, email: string}> = [];

    for (const row of responses) {
      const parsed = typeof row.responses === 'string' 
        ? JSON.parse(row.responses)
        : row.responses;

      // Se for array (formato legado não convertido ainda)
      if (Array.isArray(parsed)) {
        const finadosQuestion = parsed.find((q: any) => 
          q.questionId === 'special_event_1' ||
          (q.metadata?.eventName && q.metadata.eventName.toLowerCase().includes('finados'))
        );

        if (finadosQuestion) {
          if (finadosQuestion.answer === 'Sim' || finadosQuestion.answer === true) {
            yesCount++;
            availableList.push({ name: row.name, email: row.email });
          } else {
            noCount++;
          }
        }
      }
      // Se for v2.0
      else if (parsed?.special_events) {
        if (parsed.special_events.finados === true) {
          yesCount++;
          availableList.push({ name: row.name, email: row.email });
        } else if (parsed.special_events.finados === false) {
          noCount++;
        }
      }
    }

    console.log('📊 RESULTADO:');
    console.log('─'.repeat(80));
    console.log(`   ✅ Disponíveis: ${yesCount}`);
    console.log(`   ❌ Não disponíveis: ${noCount}`);
    console.log(`   Total analisado: ${responses.length}`);
    console.log('─'.repeat(80));

    if (availableList.length > 0) {
      console.log('\n👥 MINISTROS DISPONÍVEIS PARA FINADOS (15h30 - Cemitério):\n');
      availableList.forEach((m, i) => {
        console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${m.name}`);
        console.log(`       ${m.email}`);
      });
      console.log('');
    } else {
      console.log('\n⚠️  NENHUM ministro disponível encontrado!\n');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

findRawFinadosResponses();
