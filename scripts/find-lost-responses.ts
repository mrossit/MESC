import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function findLostResponses() {
  console.log('🔍 INVESTIGANDO RESPOSTAS PERDIDAS - Novembro 2025\n');

  try {
    // Pegar algumas respostas para análise detalhada
    const sampleResponses = await client`
      SELECT
        u.name,
        u.email,
        qr.responses,
        qr.daily_mass_availability,
        qr.special_events,
        qr.submitted_at
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
      LIMIT 5
    `;

    console.log('═'.repeat(80));
    console.log('📋 ANÁLISE DE AMOSTRA (5 primeiras respostas):\n');

    for (const row of sampleResponses) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`👤 ${row.name} (${row.email})`);
      console.log(`📅 Submetido em: ${row.submitted_at}\n`);

      const responsesData = typeof row.responses === 'string'
        ? JSON.parse(row.responses)
        : row.responses;

      console.log('📝 FORMATO DA RESPOSTA:');
      if (Array.isArray(responsesData)) {
        console.log('   Formato: ARRAY (legado)');
        console.log(`   Total de items: ${responsesData.length}\n`);

        // Procurar respostas relacionadas a missas diárias
        const dailyMassQuestion = responsesData.find((item: any) =>
          item.questionId === 'daily_mass_availability' ||
          item.questionId === 'daily_mass' ||
          item.questionId === 'daily_mass_days'
        );

        const adorationQuestion = responsesData.find((item: any) =>
          item.questionId === 'adoration_monday'
        );

        const specialEvent3 = responsesData.find((item: any) =>
          item.questionId === 'special_event_3'
        );

        console.log('🔍 RESPOSTAS ENCONTRADAS NO ARRAY:');

        if (dailyMassQuestion) {
          console.log(`   ✓ Missas diárias: questionId="${dailyMassQuestion.questionId}"`);
          console.log(`     Resposta:`, JSON.stringify(dailyMassQuestion.answer, null, 2));
        } else {
          console.log(`   ✗ Missas diárias: NÃO ENCONTRADO`);
        }

        if (adorationQuestion) {
          console.log(`   ✓ Adoração: questionId="${adorationQuestion.questionId}"`);
          console.log(`     Resposta:`, JSON.stringify(adorationQuestion.answer, null, 2));
        } else {
          console.log(`   ✗ Adoração: NÃO ENCONTRADO`);
        }

        if (specialEvent3) {
          console.log(`   ✓ Missa 20/11: questionId="${specialEvent3.questionId}"`);
          console.log(`     Resposta:`, JSON.stringify(specialEvent3.answer, null, 2));
        } else {
          console.log(`   ✗ Missa 20/11: NÃO ENCONTRADO`);
        }

        // Mostrar TODOS os questionIds para análise
        console.log('\n   📋 TODOS os questionIds no array:');
        responsesData.forEach((item: any, index: number) => {
          console.log(`      ${index + 1}. ${item.questionId}`);
        });

      } else if (responsesData?.format_version === '2.0') {
        console.log('   Formato: V2.0 (padronizado)');
        console.log('\n   🗂️ Estrutura:');
        console.log(`      - masses: ${Object.keys(responsesData.masses || {}).length} datas`);
        console.log(`      - special_events: ${Object.keys(responsesData.special_events || {}).length} eventos`);
        console.log(`      - weekdays:`, responsesData.weekdays);
      }

      console.log('\n📊 CAMPOS PROCESSADOS (dailyMassAvailability):');
      console.log(`   ${JSON.stringify(row.daily_mass_availability)}`);

      console.log('\n📊 CAMPOS PROCESSADOS (specialEvents):');
      console.log(`   ${JSON.stringify(row.special_events, null, 2)}`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n🔎 ANÁLISE DETALHADA: Procurando respostas em formato objeto\n');

    // Verificar se há respostas no formato de objeto com selectedOptions
    const responsesWithOptions = await client`
      SELECT
        u.name,
        u.email,
        qr.responses
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
        AND qr.responses::text LIKE '%selectedOptions%'
      LIMIT 10
    `;

    if (responsesWithOptions.length > 0) {
      console.log('✅ ENCONTRADAS RESPOSTAS COM selectedOptions:\n');

      for (const row of responsesWithOptions) {
        const responsesData = typeof row.responses === 'string'
          ? JSON.parse(row.responses)
          : row.responses;

        console.log(`\n👤 ${row.name} (${row.email})`);

        if (Array.isArray(responsesData)) {
          const itemsWithOptions = responsesData.filter((item: any) =>
            item.answer?.selectedOptions || item.answer?.answer === 'Apenas em alguns dias'
          );

          itemsWithOptions.forEach((item: any) => {
            console.log(`   questionId: ${item.questionId}`);
            console.log(`   answer:`, JSON.stringify(item.answer, null, 2));
          });
        }
      }
    } else {
      console.log('❌ NENHUMA resposta com selectedOptions encontrada');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

findLostResponses();
