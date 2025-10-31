import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { questionnaireResponses } from '../shared/schema';
import { QuestionnaireService } from '../server/services/questionnaireService';

// Conectar ao banco de PRODUÇÃO
const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');
const db = drizzle(client);

async function fixDailyMassAvailability() {
  console.log('🔧 Corrigindo campo dailyMassAvailability no banco de PRODUÇÃO\n');

  try {
    // 1. Buscar TODAS as respostas
    console.log('1️⃣ Buscando todas as respostas do banco...');
    const allResponses = await db.select().from(questionnaireResponses);
    console.log(`   ✅ ${allResponses.length} respostas encontradas\n`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Processar cada resposta
    console.log('2️⃣ Re-processando respostas...\n');
    
    for (const response of allResponses) {
      try {
        // Parse responses field
        let parsedResponses;
        try {
          parsedResponses = typeof response.responses === 'string' 
            ? JSON.parse(response.responses) 
            : response.responses;
        } catch (e) {
          console.log(`   ⚠️  Erro ao parsear resposta ${response.id}`);
          errors++;
          continue;
        }

        // Check if it's v2.0 format
        if (parsedResponses?.format_version !== '2.0') {
          skipped++;
          continue;
        }

        // Extract structured data using the FIXED service method
        const extractedData = QuestionnaireService.extractStructuredData(parsedResponses);

        // Update only if dailyMassAvailability changed
        const needsUpdate = 
          (response.dailyMassAvailability === null && extractedData.dailyMassAvailability !== null) ||
          (response.dailyMassAvailability !== null && extractedData.dailyMassAvailability === null) ||
          (JSON.stringify(response.dailyMassAvailability) !== JSON.stringify(extractedData.dailyMassAvailability));

        if (needsUpdate) {
          await db
            .update(questionnaireResponses)
            .set({
              dailyMassAvailability: extractedData.dailyMassAvailability
            })
            .where((t: any) => t.id.equals(response.id));

          console.log(`   ✅ Corrigido response ${response.id.substring(0, 8)}...`);
          console.log(`      ANTES: ${response.dailyMassAvailability}`);
          console.log(`      DEPOIS: ${JSON.stringify(extractedData.dailyMassAvailability)}`);
          fixed++;
        }

      } catch (err: any) {
        console.log(`   ❌ Erro ao processar ${response.id}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n3️⃣ RESUMO:');
    console.log('─'.repeat(60));
    console.log(`   Total de respostas: ${allResponses.length}`);
    console.log(`   ✅ Corrigidas: ${fixed}`);
    console.log(`   ⏭️  Puladas (não v2.0): ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log('─'.repeat(60));

  } catch (error: any) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await client.end();
  }
}

fixDailyMassAvailability();
