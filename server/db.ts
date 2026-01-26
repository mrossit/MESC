import * as schema from "@shared/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Using any for dynamic database type (PostgreSQL via Neon or SQLite via better-sqlite3)
// The actual type is determined at runtime based on DATABASE_URL environment variable
let db: any;
let pool: any;

// Melhor detecção do ambiente
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.REPLIT_DEPLOYMENT === '1' ||
                     (!!process.env.REPL_SLUG && !process.env.DATABASE_URL);

const isDevelopment = process.env.NODE_ENV === 'development' ||
                     process.env.NODE_ENV === 'dev';

if (process.env.DATABASE_URL) {
  // PostgreSQL (Production)
  if (isDevelopment) {
    console.log('🚀 Using PostgreSQL database');
  }

  try {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');

    neonConfig.webSocketConstructor = ws.default;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });

    if (isDevelopment) {
      console.log('✅ PostgreSQL connected');
    }
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
} else if (isDevelopment && !isProduction) {
  // Development - SQLite
  if (isDevelopment) {
    console.log('🔧 Using local SQLite database');
  }
  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  db = drizzle(sqlite, { schema });
} else {
  // Fallback para ambientes sem DATABASE_URL
  console.warn('⚠️ No DATABASE_URL found - using SQLite fallback');

  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  db = drizzle(sqlite, { schema });
}

export { db, pool };