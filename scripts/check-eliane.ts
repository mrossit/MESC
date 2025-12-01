import { neon } from "@neondatabase/serverless";

async function checkEliane() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  const questionnaires = await prodDb(
    `SELECT id FROM questionnaires WHERE month = 12 AND year = 2025 LIMIT 1;`
  );
  
  const qId = questionnaires[0].id;

  const eliane = await prodDb(
    `SELECT u.name, qr.responses, qr.daily_mass_availability
     FROM questionnaire_responses qr
     JOIN users u ON qr.user_id = u.id
     WHERE qr.questionnaire_id = $1
       AND qr.is_deleted = false
       AND u.name ILIKE '%Eliane%Amorim%'
     LIMIT 1;`,
    [qId]
  );

  if (eliane.length > 0) {
    const r = eliane[0];
    console.log(`📋 ${r.name}:`);
    console.log(`   daily_mass_availability column: ${JSON.stringify(r.daily_mass_availability)}`);
    
    if (r.responses) {
      const resp = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
      console.log(`   weekdays: ${JSON.stringify(resp.weekdays)}`);
    }
  }
}

checkEliane();
