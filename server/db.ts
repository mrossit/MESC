import * as schema from "@shared/schema";

let db: any;
let pool: any;

// Melhor detecção do ambiente
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.REPLIT_DEPLOYMENT === '1' ||
                     (!!process.env.REPL_SLUG && !process.env.DATABASE_URL);

const isDevelopment = process.env.NODE_ENV === 'development' ||
                     process.env.NODE_ENV === 'dev';

// Forçar produção se tiver DATABASE_URL configurada
const forceProduction = !!process.env.DATABASE_URL;

console.log(`🔍 Environment check:`, {
  NODE_ENV: process.env.NODE_ENV,
  REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
  REPL_SLUG: !!process.env.REPL_SLUG,
  DATABASE_URL: !!process.env.DATABASE_URL,
  isProduction,
  isDevelopment
});

if (process.env.DATABASE_URL) {
  // Se DATABASE_URL estiver configurada, sempre usar PostgreSQL
  console.log('🚀 DATABASE_URL configured, using PostgreSQL database');
  console.log('📄 Environment:', { NODE_ENV: process.env.NODE_ENV, isProduction, isDevelopment });

  try {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');

    neonConfig.webSocketConstructor = ws.default;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });

    console.log('✅ PostgreSQL connection established successfully');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
} else if (isDevelopment && !isProduction) {
  // Development - Use SQLite when no DATABASE_URL
  console.log('🔧 Development mode detected, using local SQLite database');
  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  db = drizzle(sqlite, { schema });

  // Skip migrations in development - SQLite db already exists with correct schema
} else if (false) {
  // Production - Use Neon database
  // This block is now disabled - handled above
  console.log('⚠️ This code path should not be reached');
} else {
  // Fallback para ambientes sem DATABASE_URL
  console.log('⚠️ No DATABASE_URL found and not in development mode');
  console.log('📝 Using SQLite fallback for compatibility');
  
  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  db = drizzle(sqlite, { schema });
}

export { db, pool };