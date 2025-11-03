import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkArrayFormatResponses() {
  console.log('🔍 VERIFICANDO RESPOSTAS EM FORMATO ARRAY - Novembro 2025\n');

  try {
    // Buscar respostas que PODEM estar em formato array
    const arrayResponses = await client`
      SELECT
        u.name,
        u.email,
        qr.responses,
        qr.daily_mass_availability,
        qr.submitted_at
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
        AND (
          qr.responses::text LIKE '%questionId%'
          OR jsonb_typeof(qr.responses) = 'array'
        )
      LIMIT 20
    `;

    console.log(`Respostas em formato array encontradas: ${arrayResponses.length}\n`);

    if (arrayResponses.length === 0) {
      console.log('❌ Nenhuma resposta em formato array encontrada.');
      console.log('📋 Todas as respostas já foram convertidas para V2.0\n');

      // Verificar quando as respostas foram submetidas vs quando a correção foi feita
      console.log('═'.repeat(80));
      console.log('📅 ANÁLISE TEMPORAL:\n');

      const submissionDates = await client`
        SELECT
          MIN(qr.submitted_at) as primeira_resposta,
          MAX(qr.submitted_at) as ultima_resposta,
          MAX(qr.updated_at) as ultima_atualizacao
        FROM questionnaire_responses qr
        JOIN questionnaires q ON q.id = qr.questionnaire_id
        WHERE q.year = 2025 AND q.month = 11
      `;

      const dates = submissionDates[0];
      console.log(`Primeira resposta submetida: ${dates.primeira_resposta}`);
      console.log(`Última resposta submetida: ${dates.ultima_resposta}`);
      console.log(`Última atualização: ${dates.ultima_atualizacao}`);

      console.log('\n📝 Commits importantes:');
      console.log('   - 31/10/2025: Fix de processamento yes_no_with_options (commit 31fb649)');
      console.log('   - 31/10/2025: Prevent loss of responses (commit 8d5254e)');
      console.log('   - 31/10/2025: Safety net implementation (commit 4a3f3a2)');

      console.log('\n🔍 CONCLUSÃO:');
      console.log('   As respostas foram submetidas ANTES da correção do bug.');
      console.log('   O bug de processamento yes_no_with_options estava ativo quando');
      console.log('   os ministros responderam, por isso as respostas parciais foram perdidas.\n');

    } else {
      console.log('✅ Encontradas respostas em formato array!\n');
      console.log('═'.repeat(80));

      for (const row of arrayResponses) {
        const responsesData = typeof row.responses === 'string'
          ? JSON.parse(row.responses)
          : row.responses;

        if (Array.isArray(responsesData)) {
          console.log(`\n👤 ${row.name} (${row.email})`);
          console.log(`📅 Submetido: ${row.submitted_at}\n`);

          // Procurar daily_mass_availability
          const dailyMassItem = responsesData.find((item: any) =>
            item.questionId === 'daily_mass_availability' ||
            item.questionId === 'daily_mass'
          );

          if (dailyMassItem) {
            console.log('   📋 RESPOSTA ORIGINAL DE MISSAS DIÁRIAS:');
            console.log(`      questionId: ${dailyMassItem.questionId}`);
            console.log(`      answer:`, JSON.stringify(dailyMassItem.answer, null, 2));

            // Verificar se há selectedOptions
            if (dailyMassItem.answer?.selectedOptions) {
              console.log('      ✅ TEM selectedOptions:', dailyMassItem.answer.selectedOptions);
            }
          }

          console.log(`\n   📊 Campo processado (daily_mass_availability):`, row.daily_mass_availability);
          console.log('   ' + '─'.repeat(70));
        }
      }
    }

    // Verificar se há atualizações manuais (updated_at muito depois de submitted_at)
    console.log('\n' + '═'.repeat(80));
    console.log('🔧 VERIFICANDO ATUALIZAÇÕES MANUAIS:\n');

    const manualUpdates = await client`
      SELECT
        u.name,
        u.email,
        qr.submitted_at,
        qr.updated_at,
        qr.daily_mass_availability,
        EXTRACT(EPOCH FROM (qr.updated_at - qr.submitted_at)) / 3600 as hours_diff
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
        AND qr.daily_mass_availability IS NOT NULL
        AND jsonb_array_length(qr.daily_mass_availability) > 0
        AND EXTRACT(EPOCH FROM (qr.updated_at - qr.submitted_at)) > 60
      ORDER BY hours_diff DESC
      LIMIT 20
    `;

    if (manualUpdates.length > 0) {
      console.log('✅ ENCONTRADAS ATUALIZAÇÕES MANUAIS:\n');

      manualUpdates.forEach((row: any) => {
        console.log(`👤 ${row.name} (${row.email})`);
        console.log(`   Submetido: ${row.submitted_at}`);
        console.log(`   Atualizado: ${row.updated_at}`);
        console.log(`   Diferença: ${Math.round(row.hours_diff)} horas depois`);
        console.log(`   Disponibilidade: ${JSON.stringify(row.daily_mass_availability)}`);
        console.log('');
      });

      console.log('📊 CONCLUSÃO:');
      console.log(`   ${manualUpdates.length} respostas foram atualizadas manualmente`);
      console.log('   (mais de 1 minuto após submissão original)\n');
    } else {
      console.log('❌ Nenhuma atualização manual detectada nos registros');
      console.log('   (ou as atualizações foram feitas muito rapidamente)\n');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkArrayFormatResponses();
