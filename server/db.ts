import * as schema from "@shared/schema";

let db: any;
let pool: any;

async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    // Production - Use Neon database
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');

    neonConfig.webSocketConstructor = ws.default;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  } else {
    // Development - Use SQLite
    console.log('No DATABASE_URL found, using local SQLite database for development');
    const Database = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');

    const sqlite = new (Database.default)('local.db');
    db = drizzle(sqlite, { schema });

    // Run migrations automatically in development
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    migrate(db, { migrationsFolder: './migrations' });
  }
}

// Initialize database on module load
initializeDatabase().catch(console.error);

export { db, pool };