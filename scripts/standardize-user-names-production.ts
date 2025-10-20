/**
 * Script to standardize all user names in the PRODUCTION database
 * Formats names with proper capitalization:
 * - First letter of each word in uppercase
 * - Rest in lowercase
 * - Specific prefixes kept in lowercase (da, de, do, das, dos, e, etc.)
 */

import { formatName } from '../server/utils/nameFormatter';
import { eq } from 'drizzle-orm';

// Production database URL
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function standardizeUserNamesProduction() {
  console.log('🔄 Iniciando padronização de nomes de usuários no BANCO DE PRODUÇÃO...');
  console.log('🔗 Conectando ao banco: ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech\n');

  try {
    // Import dependencies
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');
    const schema = await import('@shared/schema');

    // Setup connection
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });
    const db = drizzle({ client: pool, schema });

    console.log('✅ Conexão estabelecida com o banco de produção\n');

    // Fetch all users
    const allUsers = await db.select().from(schema.users);

    console.log(`📊 Total de usuários encontrados: ${allUsers.length}\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    // Process each user
    for (const user of allUsers) {
      const originalName = user.name;
      const formattedName = formatName(originalName);

      // Only update if the name has changed
      if (originalName !== formattedName) {
        await db
          .update(schema.users)
          .set({
            name: formattedName,
            updatedAt: new Date()
          })
          .where(eq(schema.users.id, user.id));

        console.log(`✅ Atualizado: "${originalName}" → "${formattedName}" (${user.email})`);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log('\n📈 Resumo da padronização:');
    console.log(`   - Total de usuários: ${allUsers.length}`);
    console.log(`   - Nomes atualizados: ${updatedCount}`);
    console.log(`   - Nomes sem alteração: ${unchangedCount}`);
    console.log('\n✅ Padronização concluída com sucesso no banco de produção!');

    // Close connection
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erro ao padronizar nomes:', error);
    throw error;
  }
}

// Run the script if executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module being executed
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  standardizeUserNamesProduction()
    .then(() => {
      console.log('\n🎉 Script finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { standardizeUserNamesProduction };
