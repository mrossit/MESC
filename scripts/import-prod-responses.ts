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

    // 1. Descobrir colunas que existem em ambos os bancos
    console.log("🔍 Descobrindo estrutura do banco...");
    
    const prodColumns = await prodDb(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'questionnaire_responses' 
       ORDER BY ordinal_position`
    );
    
    const devColumns = await devDb(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'questionnaire_responses' 
       ORDER BY ordinal_position`
    );

    const prodColumnNames = new Set(prodColumns.map((c: any) => c.column_name));
    const devColumnNames = new Set(devColumns.map((c: any) => c.column_name));
    
    // Colunas comuns (existem em ambos os bancos)
    const commonColumns = Array.from(devColumnNames).filter(col => 
      prodColumnNames.has(col) && col !== 'updated_at'
    );

    console.log(`   ✓ Colunas compatíveis: ${commonColumns.join(", ")}`);

    // 2. Buscar dados da production
    console.log("📥 Buscando dados de questionnaire_responses da production...");
    const responses = await prodDb(
      `SELECT ${commonColumns.join(", ")} FROM questionnaire_responses ORDER BY id;`
    );
    console.log(`   ✓ ${responses.length} respostas encontradas`);

    if (responses.length === 0) {
      console.log("⚠️  Nenhuma resposta encontrada na production!");
      process.exit(0);
    }

    // 3. Limpar dados antigos no dev
    console.log("🗑️  Limpando dados antigos do dev...");
    await devDb(`TRUNCATE TABLE questionnaire_responses CASCADE;`);
    console.log("   ✓ Tabela limpa");

    // 4. Importar dados em lotes
    console.log("📤 Importando respostas para o dev...");

    const batchSize = 50;
    for (let i = 0; i < responses.length; i += batchSize) {
      const batch = responses.slice(i, i + batchSize);

      const placeholders = batch
        .map((_, idx) => {
          const params = commonColumns.map((_, paramIdx) => `$${idx * commonColumns.length + paramIdx + 1}`);
          return `(${params.join(",")})`;
        })
        .join(",");

      const values: any[] = [];
      batch.forEach((r: any) => {
        commonColumns.forEach(col => {
          values.push(r[col]);
        });
      });

      const insertQuery = `
        INSERT INTO questionnaire_responses 
        (${commonColumns.join(",")}) 
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
