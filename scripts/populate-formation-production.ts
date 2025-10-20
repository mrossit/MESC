/**
 * Script to populate formation data in production database
 */

// Production database URL
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function populateFormationProduction() {
  console.log('🌱 Populando dados de formação no banco de produção...\n');

  try {
    // Import dependencies
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');
    const schema = await import('@shared/schema');

    // Setup connection
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });
    const oldDb = (await import('../server/db.js')).db;

    // Temporarily replace db with production connection
    const productionDb = drizzle({ client: pool, schema });

    // Import the seed function
    const { seedFormation } = await import('../server/seeds/formation-seed.js');

    // Replace the db temporarily
    const dbModule = await import('../server/db.js');
    const originalDb = dbModule.db;
    (dbModule as any).db = productionDb;

    console.log('✅ Conectado ao banco de produção\n');

    // Run the seed
    const result = await seedFormation();

    // Restore original db
    (dbModule as any).db = originalDb;

    console.log('\n✅ População concluída!');
    console.log(result);

    // Close connection
    await pool.end();

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the script
import { fileURLToPath } from 'url';

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  populateFormationProduction()
    .then(() => {
      console.log('\n🎉 Script finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { populateFormationProduction };
