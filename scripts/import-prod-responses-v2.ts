import { neon } from "@neondatabase/serverless";

async function importResponses() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;

  if (!prodUrl || !devUrl) {
    console.error("❌ Database URLs não encontradas!");
    process.exit(1);
  }

  const prodDb = neon(prodUrl);
  const devDb = neon(devUrl);

  console.log("🔄 Importando todas as 349 respostas...\n");

  try {
    // 1. Buscar TODAS as respostas sem conversão JSON (como texto)
    const responses = await prodDb(
      `SELECT 
        id, 
        questionnaire_id, 
        user_id, 
        responses, 
        available_sundays, 
        preferred_mass_times, 
        alternative_times, 
        daily_mass_availability, 
        special_events, 
        can_substitute, 
        notes, 
        submitted_at, 
        shared_with_family_ids, 
        is_shared_response, 
        shared_from_user_id, 
        unmapped_responses, 
        processing_warnings, 
        deleted_at, 
        is_deleted
       FROM questionnaire_responses;`
    );

    console.log(`📥 Encontradas ${responses.length} respostas na production`);

    // 2. Limpar dev
    await devDb(`TRUNCATE TABLE questionnaire_responses CASCADE;`);
    console.log("🗑️  Dev limpo");

    // 3. Importar com validação robusta
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < responses.length; i++) {
      const row = responses[i];
      try {
        // Converter JSON fields com fallback
        const toJSON = (val: any) => {
          if (val === null || val === undefined) return null;
          if (typeof val === "object") return val;
          if (typeof val === "string") {
            try {
              return JSON.parse(val);
            } catch {
              return null;
            }
          }
          return val;
        };

        // Inserir diretamente sem validação extra
        await devDb(
          `INSERT INTO questionnaire_responses 
          (id, questionnaire_id, user_id, responses, available_sundays, preferred_mass_times, 
           alternative_times, daily_mass_availability, special_events, can_substitute, notes, 
           submitted_at, shared_with_family_ids, is_shared_response, shared_from_user_id, 
           unmapped_responses, processing_warnings, deleted_at, is_deleted) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO NOTHING;`,
          [
            row.id,
            row.questionnaire_id,
            row.user_id,
            toJSON(row.responses),
            toJSON(row.available_sundays),
            toJSON(row.preferred_mass_times),
            toJSON(row.alternative_times),
            toJSON(row.daily_mass_availability),
            toJSON(row.special_events),
            row.can_substitute,
            row.notes,
            row.submitted_at,
            toJSON(row.shared_with_family_ids),
            row.is_shared_response,
            row.shared_from_user_id,
            toJSON(row.unmapped_responses),
            toJSON(row.processing_warnings),
            row.deleted_at,
            row.is_deleted,
          ]
        );

        successCount++;

        if ((i + 1) % 50 === 0) {
          console.log(`   ✓ ${i + 1}/${responses.length}`);
        }
      } catch (err: any) {
        errorCount++;
        if (errorCount <= 3) {
          console.log(`   ⚠️  Erro em linha ${i}: ${err.message?.substring(0, 60)}`);
        }
      }
    }

    console.log("\n✅ IMPORTAÇÃO COMPLETA!");
    console.log(`   Sucesso: ${successCount}`);
    console.log(`   Erros: ${errorCount}`);
    console.log(`   Total: ${responses.length}`);

    // Verificar dados importados
    const devCount = await devDb(
      `SELECT COUNT(*) as count FROM questionnaire_responses;`
    );
    console.log(`\n🔍 Dados no dev agora: ${devCount[0].count} respostas`);

  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

importResponses();
