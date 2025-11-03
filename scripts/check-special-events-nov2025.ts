import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkSpecialEvents() {
  console.log('🔍 VERIFICANDO EVENTOS ESPECIAIS - Novembro 2025\n');

  try {
    // Buscar TODAS as respostas de Novembro 2025
    const allResponses = await client`
      SELECT
        u.name,
        u.email,
        qr.responses,
        qr.special_events,
        qr.unmapped_responses,
        qr.submitted_at
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025 AND q.month = 11
      ORDER BY u.name
    `;

    console.log(`Total de respostas: ${allResponses.length}\n`);
    console.log('═'.repeat(80));

    // Estatísticas
    let totalWithAdoration = 0;
    let totalWithFinados = 0;
    let totalWithSpecialMass20Nov = 0;
    let totalUnmappedNonEmpty = 0;

    console.log('\n📋 ADORAÇÃO NA SEGUNDA-FEIRA (22h):');
    console.log('─'.repeat(80));

    for (const row of allResponses) {
      const parsed = typeof row.responses === 'string'
        ? JSON.parse(row.responses)
        : row.responses;

      // Verificar adoração
      if (parsed?.special_events?.adoration_monday === true) {
        totalWithAdoration++;
        console.log(`✓ ${row.name} (${row.email})`);
      }
    }

    console.log(`\nTotal disponíveis para adoração: ${totalWithAdoration}\n`);

    console.log('═'.repeat(80));
    console.log('\n📋 MISSA DE FINADOS (02/11 às 15:30):');
    console.log('─'.repeat(80));

    for (const row of allResponses) {
      const parsed = typeof row.responses === 'string'
        ? JSON.parse(row.responses)
        : row.responses;

      // Verificar finados (pode ser finados, finados_1530, special_event_finados, etc)
      const specialEvents = parsed?.special_events || {};
      const hasFinados = Object.keys(specialEvents).some(key =>
        key.toLowerCase().includes('finados') && specialEvents[key] === true
      );

      if (hasFinados) {
        totalWithFinados++;
        const finadosKey = Object.keys(specialEvents).find(key =>
          key.toLowerCase().includes('finados')
        );
        console.log(`✓ ${row.name} (${row.email}) - key: ${finadosKey}`);
      }
    }

    console.log(`\nTotal disponíveis para Finados: ${totalWithFinados}\n`);

    console.log('═'.repeat(80));
    console.log('\n📋 MISSA ESPECIAL 20/11:');
    console.log('─'.repeat(80));

    for (const row of allResponses) {
      const parsed = typeof row.responses === 'string'
        ? JSON.parse(row.responses)
        : row.responses;

      // Verificar missa do dia 20/11
      const masses = parsed?.masses || {};
      const has20Nov = Object.keys(masses).some(key =>
        key.includes('2025-11-20') && Object.values(masses[key]).some(v => v === true)
      );

      if (has20Nov) {
        totalWithSpecialMass20Nov++;
        console.log(`✓ ${row.name} (${row.email})`);
      }
    }

    console.log(`\nTotal disponíveis para 20/11: ${totalWithSpecialMass20Nov}\n`);

    console.log('═'.repeat(80));
    console.log('\n⚠️  RESPOSTAS NÃO MAPEADAS:');
    console.log('─'.repeat(80));

    for (const row of allResponses) {
      const unmapped = row.unmapped_responses;

      if (unmapped && typeof unmapped === 'object' && Object.keys(unmapped).length > 0) {
        totalUnmappedNonEmpty++;
        console.log(`\n❌ ${row.name} (${row.email})`);
        console.log(`   Respostas não mapeadas:`, JSON.stringify(unmapped, null, 2));
      }
    }

    if (totalUnmappedNonEmpty === 0) {
      console.log('✅ Nenhuma resposta não mapeada encontrada!');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 RESUMO FINAL:');
    console.log('─'.repeat(80));
    console.log(`Total de respostas: ${allResponses.length}`);
    console.log(`Disponíveis para adoração (segunda 22h): ${totalWithAdoration}`);
    console.log(`Disponíveis para Finados (02/11 15:30): ${totalWithFinados}`);
    console.log(`Disponíveis para missa especial 20/11: ${totalWithSpecialMass20Nov}`);
    console.log(`Respostas com campos não mapeados: ${totalUnmappedNonEmpty}`);
    console.log('─'.repeat(80));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkSpecialEvents();
