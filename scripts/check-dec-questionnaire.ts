import { neon } from "@neondatabase/serverless";

async function checkDecQuestionnaire() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 VERIFICANDO QUESTIONÁRIO DE DEZEMBRO NA PRODUCTION...\n");

  // Buscar todos os questionários de dezembro
  const questionnaires = await prodDb(
    `SELECT id, title, status, month, year, starts_at, ends_at
     FROM questionnaires 
     WHERE month = 12 AND year = 2025
     ORDER BY created_at DESC;`
  );
  
  console.log(`📋 Questionários de dezembro encontrados: ${questionnaires.length}`);
  questionnaires.forEach((q: any) => {
    console.log(`   ID: ${q.id}`);
    console.log(`   Título: ${q.title}`);
    console.log(`   Status: ${q.status}`);
    console.log(`   Período: ${q.starts_at} - ${q.ends_at}`);
    console.log('');
  });

  if (questionnaires.length === 0) {
    console.log("\n❌ Nenhum questionário de dezembro encontrado!");
    
    // Verificar se existe algum questionário
    const allQ = await prodDb(`SELECT id, title, month, year, status FROM questionnaires ORDER BY year DESC, month DESC LIMIT 5;`);
    console.log("\n📋 Últimos questionários cadastrados:");
    allQ.forEach((q: any) => {
      console.log(`   ${q.month}/${q.year} - ${q.title} (${q.status})`);
    });
    return;
  }

  // Pegar o primeiro questionário de dezembro
  const qId = questionnaires[0].id;
  
  // Contar respostas
  const responseCount = await prodDb(
    `SELECT COUNT(*) as count FROM questionnaire_responses WHERE questionnaire_id = $1 AND is_deleted = false;`,
    [qId]
  );
  console.log(`📊 Total de respostas: ${responseCount[0].count}\n`);

  // Verificar estrutura das perguntas (questions)
  const questionData = await prodDb(
    `SELECT questions FROM questionnaires WHERE id = $1;`,
    [qId]
  );
  
  let questions = questionData[0].questions;
  if (typeof questions === 'string') {
    questions = JSON.parse(questions);
  }

  console.log("📋 PERGUNTAS DO QUESTIONÁRIO:");
  
  // Filtrar perguntas especiais/customizadas
  const specialQuestions = (questions as any[]).filter(
    q => q.category === 'custom' || q.category === 'special_event' || q.category === 'special'
  );
  
  console.log(`\n🎯 Perguntas especiais/customizadas: ${specialQuestions.length}`);
  specialQuestions.forEach((q: any, idx: number) => {
    console.log(`\n   [${idx + 1}] ID: ${q.id}`);
    console.log(`       Categoria: ${q.category}`);
    console.log(`       Tipo: ${q.type}`);
    console.log(`       Pergunta: ${q.question?.substring(0, 100)}...`);
  });

  // Agora buscar respostas com special_events
  console.log("\n\n📊 ANALISANDO RESPOSTAS SPECIAL_EVENTS:");
  const responses = await prodDb(
    `SELECT 
       qr.user_id,
       u.name as minister_name,
       qr.special_events
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
     ORDER BY u.name;`,
    [qId]
  );

  // Coletar todas as chaves únicas de special_events
  const allKeys = new Set<string>();
  const keyStats: { [key: string]: { yes: number, no: number, names: string[] } } = {};

  for (const r of responses) {
    const specialEvents = r.special_events;
    if (!specialEvents || typeof specialEvents !== 'object') continue;

    for (const [key, value] of Object.entries(specialEvents)) {
      allKeys.add(key);
      if (!keyStats[key]) {
        keyStats[key] = { yes: 0, no: 0, names: [] };
      }
      if (value === true || value === 'Sim' || value === 'sim') {
        keyStats[key].yes++;
        keyStats[key].names.push(r.minister_name);
      } else if (value === false || value === 'Não' || value === 'nao') {
        keyStats[key].no++;
      }
    }
  }

  console.log(`\n📊 Chaves encontradas em special_events: ${allKeys.size}`);
  for (const key of Array.from(allKeys).sort()) {
    const stats = keyStats[key];
    console.log(`\n   🔑 ${key}:`);
    console.log(`      ✅ Sim: ${stats.yes} ministros`);
    console.log(`      ❌ Não: ${stats.no} ministros`);
    if (stats.names.length > 0 && stats.names.length <= 30) {
      console.log(`      Nomes: ${stats.names.join(', ')}`);
    }
  }
}

checkDecQuestionnaire();
