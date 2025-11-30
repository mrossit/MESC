import { neon } from "@neondatabase/serverless";

async function findJsonErrors() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 Procurando dados JSON quebrados...\n");

  // Buscar respostas e checar cada campo
  const responses = await prodDb(
    `SELECT 
      id, 
      user_id,
      responses,
      available_sundays,
      preferred_mass_times,
      alternative_times,
      daily_mass_availability,
      special_events,
      unmapped_responses,
      processing_warnings
    FROM questionnaire_responses LIMIT 10;`
  );

  const fields = [
    'responses',
    'available_sundays',
    'preferred_mass_times',
    'alternative_times',
    'daily_mass_availability',
    'special_events',
    'unmapped_responses',
    'processing_warnings'
  ];

  console.log("📋 Verificando estrutura de cada resposta:\n");

  responses.forEach((r: any, idx: number) => {
    console.log(`Resposta ${idx + 1} (User: ${r.user_id.substring(0, 8)}):`);
    
    fields.forEach(field => {
      const val = r[field];
      let status = '❓';
      let info = '';

      if (val === null) {
        status = '✓';
        info = 'NULL (ok)';
      } else if (typeof val === 'object') {
        status = '✓';
        info = `Object com ${Object.keys(val).length} keys`;
      } else if (typeof val === 'string') {
        try {
          JSON.parse(val);
          status = '✓';
          info = `String JSON válido`;
        } catch (e) {
          status = '❌';
          info = `JSON INVÁLIDO: ${e.message.substring(0, 40)}`;
        }
      }

      console.log(`  ${status} ${field}: ${info}`);
    });
    console.log('');
  });
}

findJsonErrors();
