import { neon } from "@neondatabase/serverless";

async function mapCustomQuestions() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 MAPEANDO PERGUNTAS CUSTOMIZADAS → MISSAS...\n");

  // Buscar questionário de dezembro
  const questionnaires = await prodDb(
    `SELECT id, title, questions FROM questionnaires WHERE month = 12 AND year = 2025 LIMIT 1;`
  );
  
  if (questionnaires.length === 0) {
    console.log("❌ Questionário de dezembro não encontrado!");
    return;
  }

  let questions = questionnaires[0].questions;
  if (typeof questions === 'string') {
    questions = JSON.parse(questions);
  }

  console.log(`📋 Total de perguntas: ${(questions as any[]).length}\n`);

  // Filtrar perguntas customizadas e especiais
  const specialQuestions = (questions as any[]).filter(
    q => q.category === 'custom' || q.category === 'special_event' || q.category === 'special'
  );

  console.log("🎯 MAPEAMENTO DE PERGUNTAS ESPECIAIS:\n");
  
  specialQuestions.forEach((q: any) => {
    console.log(`📌 ID: ${q.id}`);
    console.log(`   Categoria: ${q.category}`);
    console.log(`   Pergunta: ${q.question}`);
    console.log('');
  });

  // Agora buscar disponibilidade para cada uma
  const qId = questionnaires[0].id;
  const responses = await prodDb(
    `SELECT qr.special_events, u.name
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1 AND qr.is_deleted = false;`,
    [qId]
  );

  console.log("\n\n📊 RESUMO DE DISPONIBILIDADE POR MISSA:\n");
  
  for (const q of specialQuestions) {
    let yesCount = 0;
    let noCount = 0;
    const yesNames: string[] = [];
    
    for (const r of responses) {
      const se = r.special_events;
      if (!se || typeof se !== 'object') continue;
      
      const val = se[q.id];
      if (val === true || val === 'Sim') {
        yesCount++;
        yesNames.push(r.name);
      } else if (val === false || val === 'Não') {
        noCount++;
      }
    }
    
    console.log(`📌 ${q.question?.substring(0, 80)}...`);
    console.log(`   ID: ${q.id}`);
    console.log(`   ✅ Disponíveis: ${yesCount}`);
    console.log(`   ❌ Indisponíveis: ${noCount}`);
    if (yesCount > 0) {
      console.log(`   Nomes: ${yesNames.slice(0, 15).join(', ')}${yesCount > 15 ? '...' : ''}`);
    }
    console.log('');
  }
}

mapCustomQuestions();
