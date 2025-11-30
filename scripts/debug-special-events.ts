import { neon } from "@neondatabase/serverless";

async function debugSpecialEvents() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;

  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);

  console.log("🔍 INVESTIGANDO DADOS DE EVENTOS ESPECIAIS NA PRODUCTION...\n");

  // 1. Contar respostas por status
  console.log("📊 [1] CONTAGEM DE RESPOSTAS:");
  const countResult = await prodDb(
    `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN is_deleted = false THEN 1 END) as active,
       COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted,
       COUNT(CASE WHEN is_shared_response = true THEN 1 END) as shared
     FROM questionnaire_responses;`
  );
  console.log(`Total: ${countResult[0].total}, Ativo: ${countResult[0].active}, Deletado: ${countResult[0].deleted}, Compartilhado: ${countResult[0].shared}`);

  // 2. Verificar estrutura dos dados especiais
  console.log("\n🔍 [2] AMOSTRAS DE special_events (primeiros 5):");
  const samples = await prodDb(
    `SELECT 
       user_id,
       special_events::text,
       LENGTH(special_events::text) as json_size,
       (special_events::jsonb IS NOT NULL) as is_valid_json
     FROM questionnaire_responses
     WHERE special_events IS NOT NULL
     LIMIT 5;`
  );
  
  samples.forEach((s: any, idx: number) => {
    console.log(`\n  [${idx + 1}] User: ${s.user_id}`);
    console.log(`      Size: ${s.json_size} bytes`);
    console.log(`      Valid JSON: ${s.is_valid_json}`);
    console.log(`      Content: ${s.special_events.substring(0, 100)}...`);
  });

  // 3. Procurar dados especiais com problemas
  console.log("\n⚠️  [3] DADOS ESPECIAIS COM POSSÍVEIS PROBLEMAS:");
  const problematic = await prodDb(
    `SELECT 
       user_id,
       special_events::text as raw_data,
       CASE 
         WHEN special_events::text ~ '^\{' THEN 'Valid JSON'
         WHEN special_events::text ~ '^\[' THEN 'JSON Array'
         WHEN special_events IS NULL THEN 'NULL'
         ELSE 'INVALID FORMAT'
       END as format_status
     FROM questionnaire_responses
     WHERE special_events IS NOT NULL
     GROUP BY user_id, special_events::text
     LIMIT 10;`
  );
  
  problematic.forEach((p: any) => {
    console.log(`  User: ${p.user_id} -> ${p.format_status}`);
    if (p.format_status !== 'Valid JSON') {
      console.log(`    Raw: ${p.raw_data.substring(0, 80)}`);
    }
  });

  // 4. Contar quantos questionários de dezembro
  console.log("\n📅 [4] QUESTIONÁRIOS DE DEZEMBRO:");
  const decQuestions = await prodDb(
    `SELECT 
       q.id,
       q.title,
       q.status,
       COUNT(qr.id) as response_count
     FROM questionnaires q
     LEFT JOIN questionnaire_responses qr ON q.id = qr.questionnaire_id
     WHERE q.month = 12 AND q.year = 2025
     GROUP BY q.id;`
  );
  
  decQuestions.forEach((q: any) => {
    console.log(`  ${q.title} (${q.status}): ${q.response_count} respostas`);
  });

  console.log("\n✅ Debug concluído!");
}

debugSpecialEvents();
