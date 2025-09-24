import * as schema from "@shared/schema";

let db: any;
let pool: any;

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
  // Development - Always use SQLite regardless of DATABASE_URL
  console.log('🔧 Development mode detected, using local SQLite database');
  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  db = drizzle(sqlite, { schema });

  // Skip migrations in development - SQLite db already exists with correct schema
} else if (process.env.DATABASE_URL) {
  // Production - Use Neon database
  console.log('🚀 Production mode, using PostgreSQL database');
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');

  neonConfig.webSocketConstructor = ws.default;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // Fallback - Use SQLite
  console.log('⚠️ No DATABASE_URL and no NODE_ENV, defaulting to SQLite');
  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  db = drizzle(sqlite, { schema });

  // Skip migrations in development - SQLite db already exists with correct schema
}

export { db, pool };