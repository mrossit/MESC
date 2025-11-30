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

  console.log("🔄 Importando TODAS as 349 respostas corretamente...\n");

  try {
    // 1. Buscar TODAS as respostas
    const responses = await prodDb(
      `SELECT * FROM questionnaire_responses;`
    );

    console.log(`📥 Encontradas ${responses.length} respostas`);

    // 2. Limpar dev
    await devDb(`TRUNCATE TABLE questionnaire_responses CASCADE;`);
    console.log("🗑️  Dev limpo");

    // 3. Converter para SQL-ready e importar
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      try {
        // ✅ CRITICAL: Converter OBJETOS para JSON strings para PostgreSQL
        const toJsonString = (val: any): any => {
          if (val === null || val === undefined) return null;
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        };

        await devDb(
          `INSERT INTO questionnaire_responses 
          (id, questionnaire_id, user_id, responses, available_sundays, preferred_mass_times, 
           alternative_times, daily_mass_availability, special_events, can_substitute, notes, 
           submitted_at, shared_with_family_ids, is_shared_response, shared_from_user_id, 
           unmapped_responses, processing_warnings, deleted_at, is_deleted) 
          VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, 
                  $9::jsonb, $10, $11, $12, $13::jsonb, $14, $15, $16::jsonb, 
                  $17::jsonb, $18, $19)
          ON CONFLICT (id) DO NOTHING;`,
          [
            r.id,
            r.questionnaire_id,
            r.user_id,
            toJsonString(r.responses),
            toJsonString(r.available_sundays),
            toJsonString(r.preferred_mass_times),
            toJsonString(r.alternative_times),
            toJsonString(r.daily_mass_availability),
            toJsonString(r.special_events),
            r.can_substitute,
            r.notes,
            r.submitted_at,
            toJsonString(r.shared_with_family_ids),
            r.is_shared_response,
            r.shared_from_user_id,
            toJsonString(r.unmapped_responses),
            toJsonString(r.processing_warnings),
            r.deleted_at,
            r.is_deleted,
          ]
        );

        successCount++;

        if ((i + 1) % 50 === 0) {
          console.log(`   ✓ ${i + 1}/${responses.length}`);
        }
      } catch (err: any) {
        errorCount++;
        if (errorCount <= 5) {
          console.log(`   ⚠️  Erro em linha ${i + 1}: ${err.message?.substring(0, 80)}`);
        }
      }
    }

    console.log("\n✅ IMPORTAÇÃO COMPLETA!");
    console.log(`   Sucesso: ${successCount}/${responses.length}`);
    if (errorCount > 0) {
      console.log(`   Erros: ${errorCount}`);
    }

    // Verificar dados importados
    const devCount = await devDb(
      `SELECT COUNT(*) as count FROM questionnaire_responses WHERE is_deleted = false AND is_shared_response = false;`
    );
    console.log(`\n🔍 Dados de resposta direta no dev: ${devCount[0].count}`);
    
    const devShared = await devDb(
      `SELECT COUNT(*) as count FROM questionnaire_responses WHERE is_shared_response = true;`
    );
    console.log(`🔍 Dados de resposta compartilhada no dev: ${devShared[0].count}`);
    
    console.log("\n🚀 Pronto para testar escala com dados reais de production!");

  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

importResponses();
