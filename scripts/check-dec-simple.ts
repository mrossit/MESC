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
    `SELECT id, title, status, month, year
     FROM questionnaires 
     WHERE month = 12 AND year = 2025
     ORDER BY created_at DESC;`
  );
  
  console.log(`📋 Questionários de dezembro encontrados: ${questionnaires.length}`);
  questionnaires.forEach((q: any) => {
    console.log(`   ID: ${q.id}, Título: ${q.title}, Status: ${q.status}`);
  });

  if (questionnaires.length === 0) {
    // Verificar últimos questionários
    const allQ = await prodDb(`SELECT id, title, month, year, status FROM questionnaires ORDER BY year DESC, month DESC LIMIT 5;`);
    console.log("\n📋 Últimos questionários cadastrados:");
    allQ.forEach((q: any) => {
      console.log(`   ${q.month}/${q.year} - ${q.title} (${q.status})`);
    });
    return;
  }

  const qId = questionnaires[0].id;
  
  // Contar respostas
  const responseCount = await prodDb(
    `SELECT COUNT(*) as count FROM questionnaire_responses WHERE questionnaire_id = $1 AND is_deleted = false;`,
    [qId]
  );
  console.log(`📊 Total de respostas: ${responseCount[0].count}\n`);

  // Buscar respostas com special_events
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

  // Coletar estatísticas de special_events
  const keyStats: { [key: string]: { yes: string[], no: string[] } } = {};

  for (const r of responses) {
    const specialEvents = r.special_events;
    if (!specialEvents || typeof specialEvents !== 'object') continue;

    for (const [key, value] of Object.entries(specialEvents)) {
      if (!keyStats[key]) {
        keyStats[key] = { yes: [], no: [] };
      }
      if (value === true || value === 'Sim' || value === 'sim') {
        keyStats[key].yes.push(r.minister_name);
      } else if (value === false || value === 'Não' || value === 'nao') {
        keyStats[key].no.push(r.minister_name);
      }
    }
  }

  console.log("📊 DISPONIBILIDADE POR EVENTO ESPECIAL:\n");
  
  const sortedKeys = Object.keys(keyStats).sort();
  for (const key of sortedKeys) {
    const stats = keyStats[key];
    console.log(`🔑 ${key}:`);
    console.log(`   ✅ Disponíveis: ${stats.yes.length}`);
    if (stats.yes.length > 0) {
      console.log(`      ${stats.yes.slice(0, 25).join(', ')}${stats.yes.length > 25 ? '...' : ''}`);
    }
    console.log(`   ❌ Indisponíveis: ${stats.no.length}`);
    console.log('');
  }
}

checkDecQuestionnaire();
