import { neon } from "@neondatabase/serverless";

async function checkSpecialAvailability() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 VERIFICANDO DISPONIBILIDADE PARA MISSAS ESPECIAIS DE DEZEMBRO...\n");

  // Buscar questionário de dezembro
  const questionnaire = await prodDb(
    `SELECT id, title FROM questionnaires WHERE month = 12 AND year = 2025 AND status = 'active' LIMIT 1;`
  );
  
  if (questionnaire.length === 0) {
    console.log("❌ Questionário de dezembro não encontrado!");
    return;
  }
  
  const qId = questionnaire[0].id;
  console.log(`📋 Questionário: ${questionnaire[0].title} (ID: ${qId})\n`);

  // Buscar todas as respostas com special_events
  const responses = await prodDb(
    `SELECT 
       qr.user_id,
       u.name as minister_name,
       qr.special_events::text
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND qr.special_events IS NOT NULL
       AND qr.special_events::text != '{}'
     ORDER BY u.name;`,
    [qId]
  );

  console.log(`📊 Total de respostas com eventos especiais: ${responses.length}\n`);

  // Analisar cada tipo de evento especial
  const eventTypes = [
    { key: 'healing_liberation', label: '04/12 - Missa por Cura e Libertação' },
    { key: 'first_friday', label: '05/12 - Sagrado Coração (1ª Sexta)' },
    { key: 'first_saturday', label: '06/12 - Imaculado Coração (1º Sábado)' },
    { key: 'ordination_dec_08', label: '08/12 - Ordenação Pe. Flávio' },
    { key: 'christmas_eve', label: '24/12 - Véspera de Natal' },
    { key: 'christmas', label: '25/12 - Natal' },
    { key: 'new_year_eve', label: '31/12 - Véspera Ano Novo' },
    { key: 'new_year', label: '01/01 - Santa Mãe de Deus' },
    { key: 'finados', label: '02/11 - Finados' },
  ];

  for (const event of eventTypes) {
    const available: string[] = [];
    const notAvailable: string[] = [];
    
    for (const r of responses) {
      try {
        const specialEvents = typeof r.special_events === 'string' 
          ? JSON.parse(r.special_events) 
          : r.special_events;
        
        if (specialEvents[event.key] === true) {
          available.push(r.minister_name);
        } else if (specialEvents[event.key] === false) {
          notAvailable.push(r.minister_name);
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    
    console.log(`\n📅 ${event.label}`);
    console.log(`   ✅ Disponíveis: ${available.length}`);
    if (available.length > 0 && available.length <= 30) {
      console.log(`      ${available.join(', ')}`);
    }
    console.log(`   ❌ Indisponíveis: ${notAvailable.length}`);
  }

  // Verificar estrutura dos special_events (primeiras 5 amostras)
  console.log("\n\n🔍 AMOSTRA DE ESTRUTURA DOS SPECIAL_EVENTS:");
  for (let i = 0; i < Math.min(5, responses.length); i++) {
    const r = responses[i];
    console.log(`\n${r.minister_name}:`);
    console.log(`   ${r.special_events}`);
  }
}

checkSpecialAvailability();
