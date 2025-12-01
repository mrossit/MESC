import { neon } from "@neondatabase/serverless";

async function checkDailyMass() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 VERIFICANDO DISPONIBILIDADE PARA MISSAS DIÁRIAS...\n");

  // Buscar questionário de dezembro
  const questionnaires = await prodDb(
    `SELECT id FROM questionnaires WHERE month = 12 AND year = 2025 LIMIT 1;`
  );
  
  if (questionnaires.length === 0) {
    console.log("❌ Questionário de dezembro não encontrado!");
    return;
  }

  const qId = questionnaires[0].id;

  // Buscar disponibilidade dos ministros específicos
  const ministersToCheck = ['Daniela Pereira', 'Eliane', 'Daguimar'];
  
  for (const name of ministersToCheck) {
    console.log(`\n📋 Buscando: ${name}`);
    
    const responses = await prodDb(
      `SELECT 
         u.name as minister_name,
         qr.daily_mass_availability,
         qr.responses
       FROM questionnaire_responses qr
       JOIN users u ON qr.user_id = u.id
       WHERE qr.questionnaire_id = $1
         AND qr.is_deleted = false
         AND u.name ILIKE $2
       ORDER BY u.name;`,
      [qId, `%${name}%`]
    );

    if (responses.length === 0) {
      console.log(`   ❌ Nenhuma resposta encontrada para "${name}"`);
    } else {
      for (const r of responses) {
        console.log(`\n   ✅ ${r.minister_name}`);
        console.log(`   📅 Disponibilidade diária: ${JSON.stringify(r.daily_mass_availability)}`);
        
        // Verificar se há respostas de missa diária no responses
        if (r.responses) {
          const resp = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
          const dailyKeys = Object.keys(resp).filter(k => 
            k.includes('daily') || k.includes('diaria') || k.includes('segunda') || 
            k.includes('terca') || k.includes('quarta') || k.includes('quinta') || k.includes('sexta')
          );
          if (dailyKeys.length > 0) {
            console.log(`   📋 Respostas relevantes:`);
            dailyKeys.forEach(k => {
              console.log(`      ${k}: ${resp[k]}`);
            });
          }
        }
      }
    }
  }

  // Buscar TODOS os ministros com disponibilidade para cada dia da semana
  console.log("\n\n📊 DISPONIBILIDADE COMPLETA POR DIA DA SEMANA:");
  
  const allResponses = await prodDb(
    `SELECT 
       u.name as minister_name,
       qr.daily_mass_availability
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND qr.daily_mass_availability IS NOT NULL
     ORDER BY u.name;`,
    [qId]
  );

  const dayMap: { [key: string]: string[] } = {
    'Segunda': [],
    'Terça': [],
    'Quarta': [],
    'Quinta': [],
    'Sexta': []
  };

  for (const r of allResponses) {
    const availability = r.daily_mass_availability;
    if (!availability || !Array.isArray(availability)) continue;
    
    for (const day of availability) {
      const dayStr = String(day);
      if (dayStr.includes('Segunda') || dayStr.includes('segunda')) {
        dayMap['Segunda'].push(r.minister_name);
      }
      if (dayStr.includes('Terça') || dayStr.includes('terca') || dayStr.includes('terça')) {
        dayMap['Terça'].push(r.minister_name);
      }
      if (dayStr.includes('Quarta') || dayStr.includes('quarta')) {
        dayMap['Quarta'].push(r.minister_name);
      }
      if (dayStr.includes('Quinta') || dayStr.includes('quinta')) {
        dayMap['Quinta'].push(r.minister_name);
      }
      if (dayStr.includes('Sexta') || dayStr.includes('sexta')) {
        dayMap['Sexta'].push(r.minister_name);
      }
    }
  }

  for (const [day, ministers] of Object.entries(dayMap)) {
    console.log(`\n📅 ${day}: ${ministers.length} ministros`);
    if (ministers.length > 0) {
      console.log(`   ${ministers.join(', ')}`);
    }
  }
}

checkDailyMass();
