import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function investigate() {
  console.log('🔍 INVESTIGANDO RESPOSTAS PARCIAIS - Novembro 2025\n');

  try {
    // Buscar TODAS as respostas de Novembro 2025
    const allResponses = await client`
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
      ORDER BY u.name
    `;

    console.log(`Total de respostas: ${allResponses.length}\n`);
    console.log('═'.repeat(80));

    // Analisar cada resposta
    let totalWithWeekdayData = 0;
    let totalAllFalse = 0;
    let totalPartial = 0;
    let totalAllTrue = 0;

    for (const row of allResponses) {
      const parsed = typeof row.responses === 'string' 
        ? JSON.parse(row.responses)
        : row.responses;

      if (parsed?.weekdays) {
        totalWithWeekdayData++;
        
        const weekdays = parsed.weekdays;
        const trueCount = Object.values(weekdays).filter(v => v === true).length;

        if (trueCount === 0) {
          totalAllFalse++;
        } else if (trueCount === 5) {
          totalAllTrue++;
        } else {
          totalPartial++;
          
          // Mostrar detalhes das respostas PARCIAIS
          console.log(`\n📋 ${row.name}`);
          console.log(`   Email: ${row.email}`);
          console.log(`   Respondeu em: ${row.submitted_at}`);
          console.log(`   Dias marcados:`);
          if (weekdays.monday) console.log('      ✓ Segunda-feira');
          if (weekdays.tuesday) console.log('      ✓ Terça-feira');
          if (weekdays.wednesday) console.log('      ✓ Quarta-feira');
          if (weekdays.thursday) console.log('      ✓ Quinta-feira');
          if (weekdays.friday) console.log('      ✓ Sexta-feira');
          console.log(`   Campo dailyMassAvailability: ${JSON.stringify(row.daily_mass_availability)}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 ESTATÍSTICAS:');
    console.log('─'.repeat(80));
    console.log(`Total com dados de dias da semana: ${totalWithWeekdayData}`);
    console.log(`  ❌ Todos FALSE (não pode em nenhum dia): ${totalAllFalse}`);
    console.log(`  ✅ Todos TRUE (pode em todos os dias): ${totalAllTrue}`);
    console.log(`  ⚠️  PARCIAL (alguns dias apenas): ${totalPartial}`);
    console.log('─'.repeat(80));

    if (totalPartial === 0) {
      console.log('\n🚨 ALERTA: Nenhuma resposta parcial encontrada!');
      console.log('   Isso indica que o frontend NÃO está salvando respostas parciais corretamente.');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

investigate();
