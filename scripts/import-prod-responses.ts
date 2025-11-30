import { neon } from "@neondatabase/serverless";

async function importResponses() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;

  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL não encontrada nos secrets!");
    process.exit(1);
  }

  if (!devUrl) {
    console.error("❌ DATABASE_URL não encontrada!");
    process.exit(1);
  }

  console.log("🔄 Conectando aos bancos de dados...");

  try {
    const prodDb = neon(prodUrl);
    const devDb = neon(devUrl);

    // 1. Buscar dados da production SEM as colunas JSON problemáticas
    console.log("📥 Buscando dados de questionnaire_responses da production...");
    const responses = await prodDb(
      `SELECT 
        id, 
        questionnaire_id, 
        user_id, 
        responses::text, 
        available_sundays::text, 
        preferred_mass_times::text, 
        alternative_times::text, 
        daily_mass_availability::text, 
        special_events::text, 
        can_substitute, 
        notes, 
        submitted_at, 
        shared_with_family_ids::text, 
        is_shared_response, 
        shared_from_user_id, 
        unmapped_responses::text, 
        processing_warnings::text, 
        deleted_at, 
        is_deleted
       FROM questionnaire_responses 
       ORDER BY id;`
    );
    console.log(`   ✓ ${responses.length} respostas encontradas`);

    if (responses.length === 0) {
      console.log("⚠️  Nenhuma resposta encontrada na production!");
      process.exit(0);
    }

    // 2. Limpar dados antigos no dev
    console.log("🗑️  Limpando dados antigos do dev...");
    await devDb(`TRUNCATE TABLE questionnaire_responses CASCADE;`);
    console.log("   ✓ Tabela limpa");

    // 3. Importar dados com conversão segura de JSON
    console.log("📤 Importando respostas para o dev...");

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < responses.length; i++) {
      const row = responses[i];
      try {
        // Parse JSON fields com validação
        const parseJSON = (val: any) => {
          if (!val) return null;
          try {
            return typeof val === "string" ? JSON.parse(val) : val;
          } catch {
            return null;
          }
        };

        const values = [
          row.id,
          row.questionnaire_id,
          row.user_id,
          parseJSON(row.responses),
          parseJSON(row.available_sundays),
          parseJSON(row.preferred_mass_times),
          parseJSON(row.alternative_times),
          parseJSON(row.daily_mass_availability),
          parseJSON(row.special_events),
          row.can_substitute,
          row.notes,
          row.submitted_at,
          parseJSON(row.shared_with_family_ids),
          row.is_shared_response,
          row.shared_from_user_id,
          parseJSON(row.unmapped_responses),
          parseJSON(row.processing_warnings),
          row.deleted_at,
          row.is_deleted,
        ];

        await devDb(
          `INSERT INTO questionnaire_responses 
          (id, questionnaire_id, user_id, responses, available_sundays, preferred_mass_times, 
           alternative_times, daily_mass_availability, special_events, can_substitute, notes, 
           submitted_at, shared_with_family_ids, is_shared_response, shared_from_user_id, 
           unmapped_responses, processing_warnings, deleted_at, is_deleted) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO NOTHING;`,
          values
        );

        successCount++;

        if ((i + 1) % 50 === 0) {
          console.log(`   ✓ Processadas ${i + 1} respostas...`);
        }
      } catch (rowError: any) {
        errorCount++;
        errors.push({
          index: i,
          id: row.id,
          userId: row.user_id,
          message: rowError.message,
          code: rowError.code,
        });
      }
    }

    console.log("");
    console.log("✅ IMPORTAÇÃO CONCLUÍDA!");
    console.log(`   Total de respostas importadas: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Erros ao importar: ${errorCount}`);
      console.log("\n📋 Primeiros 5 erros:");
      errors.slice(0, 5).forEach((err) => {
        console.log(`   - ID ${err.id} (user: ${err.userId}): ${err.message.substring(0, 80)}`);
      });
    }
    console.log("   Pronto para testes de escala! 🚀");
  } catch (error) {
    console.error("❌ Erro durante importação:", error);
    process.exit(1);
  }
}

importResponses();
