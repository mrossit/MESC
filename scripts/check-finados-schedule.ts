import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function checkFinadosSchedule() {
  console.log('🔍 VERIFICANDO ESCALAS DE FINADOS - 02/11/2025\n');
  console.log('═'.repeat(80));

  try {
    // Check all schedules for November 2, 2025
    const schedules = await client`
      SELECT 
        s.id,
        s.date,
        s.time,
        s.position,
        s.minister_id,
        s.location,
        s.type,
        u.name as minister_name
      FROM schedules s
      LEFT JOIN users u ON s.minister_id = u.id
      WHERE s.date = '2025-11-02'
      ORDER BY s.time, s.position
    `;

    console.log(`\n📅 ESCALAS NO DIA 02/11/2025 (Finados):\n`);
    
    if (schedules.length === 0) {
      console.log('❌ NENHUMA escala encontrada para 02/11/2025!');
      console.log('\n⚠️  PROBLEMA: As escalas para Finados não foram geradas!\n');
    } else {
      console.log(`✅ Encontradas ${schedules.length} escalas:\n`);
      
      let has15h30 = false;
      
      // Group by time
      const groupedByTime: Record<string, any[]> = {};
      for (const sched of schedules) {
        if (!groupedByTime[sched.time]) {
          groupedByTime[sched.time] = [];
        }
        groupedByTime[sched.time].push(sched);
      }

      for (const [time, ministers] of Object.entries(groupedByTime)) {
        console.log(`   📍 ${schedules[0].date} às ${time}`);
        
        if (time === '15:30:00' || time === '15:30' || time === '15h30') {
          has15h30 = true;
        }
        
        if (ministers[0].location) {
          console.log(`      Local: ${ministers[0].location}`);
        }
        
        console.log(`      Ministros escalados: ${ministers.length}`);
        ministers.forEach((m, i) => {
          const ministerName = m.minister_name || 'VACANTE';
          console.log(`        ${i + 1}. ${ministerName} (Posição ${m.position})`);
        });
        console.log('');
      }
      
      console.log('─'.repeat(80));
      
      if (!has15h30) {
        console.log('\n⚠️  PROBLEMA: Missa especial às 15h30 no cemitério NÃO encontrada!');
        console.log('   Essa missa precisa ser criada manualmente ou via geração de escala.\n');
      } else {
        console.log('\n✅ Missa especial às 15h30 encontrada!\n');
      }
    }

    // Check who responded YES to Finados question
    console.log('═'.repeat(80));
    console.log('\n👥 MINISTROS QUE RESPONDERAM SOBRE FINADOS:\n');
    
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
    const availableList: string[] = [];

    for (const row of responses) {
      const parsed = typeof row.responses === 'string' 
        ? JSON.parse(row.responses)
        : row.responses;

      // Check if has finados in special_events
      if (parsed?.special_events?.finados === true) {
        yesCount++;
        availableList.push(row.name);
      } else if (parsed?.special_events?.finados === false) {
        noCount++;
      }
    }

    console.log(`Total de respostas: ${responses.length}`);
    console.log(`  ✅ Disponíveis: ${yesCount}`);
    console.log(`  ❌ Não disponíveis: ${noCount}`);
    console.log(`  ⚠️  Sem resposta: ${responses.length - yesCount - noCount}`);

    if (availableList.length > 0) {
      console.log('\n📋 Ministros disponíveis:');
      availableList.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });
    } else {
      console.log('\n⚠️  NENHUM ministro marcado como disponível para Finados!');
      console.log('   Isso pode ser porque:');
      console.log('   1. A pergunta não foi processada corretamente');
      console.log('   2. Todos responderam "Não"');
      console.log('   3. A resposta está em outro formato\n');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkFinadosSchedule();
