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

    // 1. Buscar dados da production
    console.log("📥 Buscando dados de questionnaire_responses da production...");
    const responses = await prodDb(
      `SELECT * FROM questionnaire_responses ORDER BY id;`
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

    // 3. Importar dados em lotes
    console.log("📤 Importando respostas para o dev...");

    const batchSize = 100;
    for (let i = 0; i < responses.length; i += batchSize) {
      const batch = responses.slice(i, i + batchSize);

      const placeholders = batch
        .map(
          (_, idx) =>
            `($${idx * 10 + 1},$${idx * 10 + 2},$${idx * 10 + 3},$${idx * 10 + 4},$${idx * 10 + 5},$${idx * 10 + 6},$${idx * 10 + 7},$${idx * 10 + 8},$${idx * 10 + 9},$${idx * 10 + 10})`
        )
        .join(",");

      const values: any[] = [];
      batch.forEach((r: any) => {
        values.push(
          r.id,
          r.questionnaire_id,
          r.user_id,
          r.responses,
          r.submitted_at,
          r.is_shared_response,
          r.shared_by_user_id,
          r.is_deleted,
          r.deleted_at,
          r.created_at
        );
      });

      const insertQuery = `
        INSERT INTO questionnaire_responses 
        (id, questionnaire_id, user_id, responses, submitted_at, is_shared_response, shared_by_user_id, is_deleted, deleted_at, created_at) 
        VALUES ${placeholders}
        ON CONFLICT (id) DO NOTHING;
      `;

      await devDb(insertQuery, values);
      console.log(
        `   ✓ Importadas respostas ${i + 1} a ${Math.min(i + batchSize, responses.length)}`
      );
    }

    console.log("");
    console.log("✅ IMPORTAÇÃO CONCLUÍDA!");
    console.log(`   Total de respostas importadas: ${responses.length}`);
    console.log("   Pronto para testes de escala! 🚀");
  } catch (error) {
    console.error("❌ Erro durante importação:", error);
    process.exit(1);
  }
}

importResponses();
