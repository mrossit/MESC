import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function investigateFinados() {
  console.log('🔍 INVESTIGANDO MISSAS DE FINADOS - Novembro 2025\n');
  console.log('═'.repeat(80));

  try {
    // 1. Check questionnaire questions
    console.log('\n📋 PERGUNTA DE FINADOS NO QUESTIONÁRIO:\n');
    const questionnaire = await client`
      SELECT id, questions
      FROM questionnaires
      WHERE year = 2025 AND month = 11
      LIMIT 1
    `;

    if (questionnaire.length > 0) {
      const questions = typeof questionnaire[0].questions === 'string'
        ? JSON.parse(questionnaire[0].questions)
        : questionnaire[0].questions;

      const finadosQuestion = questions.find((q: any) => 
        q.id?.includes('finados') || 
        q.question?.toLowerCase().includes('finados')
      );

      if (finadosQuestion) {
        console.log('✅ Pergunta encontrada:');
        console.log(JSON.stringify(finadosQuestion, null, 2));
      } else {
        console.log('❌ Nenhuma pergunta sobre Finados encontrada no questionário!');
        console.log('\nPerguntas disponíveis:');
        questions.forEach((q: any, i: number) => {
          console.log(`  ${i + 1}. ${q.id} - ${q.question?.substring(0, 60)}...`);
        });
      }
    }

    // 2. Check responses for Finados
    console.log('\n\n📊 RESPOSTAS DE FINADOS:\n');
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

    let yesCount = 0;
    let noCount = 0;
    let withDataCount = 0;
    const yesMinsters: string[] = [];

    for (const row of responses) {
      const parsed = typeof row.responses === 'string' 
        ? JSON.parse(row.responses)
        : row.responses;

      // Check in responses array (legacy format)
      if (Array.isArray(parsed)) {
        const finadosAnswer = parsed.find((r: any) => 
          r.questionId?.includes('special_event') || 
          r.questionId === 'special_event_1'
        );
        
        if (finadosAnswer) {
          withDataCount++;
          if (finadosAnswer.answer === 'Sim' || finadosAnswer.answer === true) {
            yesCount++;
            yesMinsters.push(`${row.name} (${row.email})`);
          } else {
            noCount++;
          }
        }
      }
      // Check in v2.0 format
      else if (parsed?.special_events) {
        // Check all special_events keys
        const hasFinadosKey = Object.keys(parsed.special_events).some(key => 
          key.toLowerCase().includes('finados')
        );
        
        if (hasFinadosKey || parsed.special_events.finados !== undefined) {
          withDataCount++;
          if (parsed.special_events.finados === true) {
            yesCount++;
            yesMinsters.push(`${row.name} (${row.email})`);
          } else {
            noCount++;
          }
        }
      }
    }

    console.log(`Total de respostas: ${responses.length}`);
    console.log(`Responderam sobre Finados: ${withDataCount}`);
    console.log(`  ✅ Sim: ${yesCount}`);
    console.log(`  ❌ Não: ${noCount}`);
    
    if (yesMinsters.length > 0) {
      console.log('\n👥 Ministros disponíveis para Finados:');
      yesMinsters.forEach(name => console.log(`   - ${name}`));
    }

    // 3. Check schedules for Finados
    console.log('\n\n📅 ESCALAS DE FINADOS NO BANCO:\n');
    const schedules = await client`
      SELECT 
        date,
        time,
        mass_type,
        positions
      FROM schedules
      WHERE date = '2025-11-02'
      ORDER BY time
    `;

    if (schedules.length > 0) {
      console.log(`✅ Encontradas ${schedules.length} missas de Finados:\n`);
      for (const sched of schedules) {
        console.log(`   📍 ${sched.date} às ${sched.time} - Tipo: ${sched.mass_type}`);
        const positions = typeof sched.positions === 'string'
          ? JSON.parse(sched.positions)
          : sched.positions;
        console.log(`      Posições: ${JSON.stringify(positions, null, 2)}`);
      }
    } else {
      console.log('❌ NENHUMA missa de Finados encontrada no banco de escalas!');
      console.log('   Data esperada: 2025-11-02 (02 de novembro)');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

investigateFinados();
