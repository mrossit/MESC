import { neon } from "@neondatabase/serverless";

async function analyzeDailyStructure() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 ANALISANDO ESTRUTURA DE DISPONIBILIDADE DIÁRIA...\n");

  // 1. Ver estrutura das perguntas de missa diária no questionário
  const questionnaires = await prodDb(
    `SELECT id, questions FROM questionnaires WHERE month = 12 AND year = 2025 LIMIT 1;`
  );
  
  if (questionnaires.length === 0) {
    console.log("❌ Questionário não encontrado!");
    return;
  }

  const qId = questionnaires[0].id;
  let questions = questionnaires[0].questions;
  if (typeof questions === 'string') {
    questions = JSON.parse(questions);
  }

  console.log("📋 PERGUNTAS DE MISSA DIÁRIA NO QUESTIONÁRIO:");
  const dailyQuestions = (questions as any[]).filter(q => 
    q.category === 'daily_mass' || 
    q.category === 'daily' ||
    q.id?.includes('daily') || 
    q.question?.toLowerCase().includes('diária')
  );
  
  dailyQuestions.forEach((q: any) => {
    console.log(`\n   ID: ${q.id}`);
    console.log(`   Categoria: ${q.category}`);
    console.log(`   Pergunta: ${q.question}`);
    console.log(`   Tipo: ${q.type}`);
    if (q.options) console.log(`   Opções: ${JSON.stringify(q.options)}`);
  });

  // 2. Ver estrutura completa de uma resposta que TEM disponibilidade diária
  console.log("\n\n📋 EXEMPLO DE RESPOSTA COM DISPONIBILIDADE DIÁRIA:");
  const withDaily = await prodDb(
    `SELECT u.name, qr.daily_mass_availability, qr.responses
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND qr.daily_mass_availability IS NOT NULL
       AND jsonb_array_length(qr.daily_mass_availability) > 0
     LIMIT 3;`,
    [qId]
  );

  for (const r of withDaily) {
    console.log(`\n✅ ${r.name}:`);
    console.log(`   daily_mass_availability: ${JSON.stringify(r.daily_mass_availability)}`);
  }

  // 3. Ver estrutura de resposta dos 3 ministros que faltam
  console.log("\n\n📋 RESPOSTAS DE DANIELA, ELIANE, DAGUIMAR:");
  const specific = await prodDb(
    `SELECT u.name, qr.responses, qr.daily_mass_availability
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND (u.name ILIKE '%Daniela Pereira%' OR u.name ILIKE '%Eliane%Amorim%' OR u.name ILIKE '%Daguimar%')
     LIMIT 5;`,
    [qId]
  );

  for (const r of specific) {
    console.log(`\n🔍 ${r.name}:`);
    console.log(`   daily_mass_availability column: ${JSON.stringify(r.daily_mass_availability)}`);
    
    if (r.responses) {
      const resp = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
      
      // Mostrar campo daily_mass_availability do responses se existir
      if (resp.daily_mass_availability !== undefined) {
        console.log(`   responses.daily_mass_availability: ${JSON.stringify(resp.daily_mass_availability)}`);
      }
    }
  }

  // 4. Ver a estrutura REAL do campo responses de Meire (que TEM disponibilidade)
  console.log("\n\n📋 ESTRUTURA RESPONSES DE MEIRE (que tem diária):");
  const fullExample = await prodDb(
    `SELECT u.name, qr.responses, qr.daily_mass_availability
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND u.name ILIKE '%Meire Terezinha%'
     LIMIT 1;`,
    [qId]
  );

  if (fullExample.length > 0) {
    const r = fullExample[0];
    console.log(`\n${r.name}:`);
    console.log(`   daily_mass_availability column: ${JSON.stringify(r.daily_mass_availability)}`);
    
    if (r.responses) {
      const resp = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
      console.log(`\n   RESPONSES COMPLETO:`);
      console.log(JSON.stringify(resp, null, 2));
    }
  }

  // 5. Ver estrutura de Daniela Pereira completa
  console.log("\n\n📋 ESTRUTURA RESPONSES DE DANIELA PEREIRA:");
  const daniela = await prodDb(
    `SELECT u.name, qr.responses, qr.daily_mass_availability
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND u.name ILIKE '%Daniela Pereira%'
     LIMIT 1;`,
    [qId]
  );

  if (daniela.length > 0) {
    const r = daniela[0];
    console.log(`\n${r.name}:`);
    console.log(`   daily_mass_availability column: ${JSON.stringify(r.daily_mass_availability)}`);
    
    if (r.responses) {
      const resp = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
      console.log(`\n   RESPONSES COMPLETO:`);
      console.log(JSON.stringify(resp, null, 2));
    }
  }
}

analyzeDailyStructure();
