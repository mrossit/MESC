import * as schema from "@shared/schema";

let db: any;
let pool: any;

async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    // Production - Use Neon database with connection pooler
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');

    // Configure WebSocket for serverless environments
    neonConfig.webSocketConstructor = ws.default;
    
    // Ensure DATABASE_URL uses connection pooler for production
    let connectionString = process.env.DATABASE_URL;
    if (connectionString && !connectionString.includes('-pooler')) {
      // Automatically add -pooler to hostname for production
      connectionString = connectionString.replace(
        /(@[\w.-]+)(\.[\w-]+\.[\w-]+\.neon\.tech)/,
        '$1-pooler$2'
      );
      console.log('🔧 Configured DATABASE_URL with connection pooler for production');
    }
    
    pool = new Pool({ connectionString });
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