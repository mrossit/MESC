import * as schema from "@shared/schema";
import type { Pool } from '@neondatabase/serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Sql } from "postgres";

// Database type - declared as NeonDatabase for consistent API typing across consumers.
// At runtime, may be either PostgreSQL (Neon) or SQLite (better-sqlite3) based on
// DATABASE_URL environment variable. Both backends share compatible Drizzle query APIs.
// Using type assertion at assignment to handle the runtime-determined type.
let db: NeonDatabase<typeof schema>;
let pool: Pool | Sql | undefined;

function resolveDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const vercelPostgresUrl = process.env.POSTGRES_URL?.trim();

  if (process.env.VERCEL === "1" && vercelPostgresUrl) {
    process.env.DATABASE_URL = vercelPostgresUrl;
    return vercelPostgresUrl;
  }

  const resolvedUrl = databaseUrl || vercelPostgresUrl;
  if (resolvedUrl) {
    process.env.DATABASE_URL = resolvedUrl;
  }

  return resolvedUrl;
}

function shouldUseNeonDriver(databaseUrl: string): boolean {
  try {
    const hostname = new URL(databaseUrl).hostname.toLowerCase();
    return hostname.includes("neon.tech");
  } catch {
    return false;
  }
}

function parseMaxConnections(value?: string): number {
  const parsed = Number.parseInt(value ?? "5", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

// Melhor detecção do ambiente
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.REPLIT_DEPLOYMENT === '1' ||
                     (!!process.env.REPL_SLUG && !process.env.DATABASE_URL);

const isDevelopment = process.env.NODE_ENV === 'development' ||
                     process.env.NODE_ENV === 'dev';

const databaseUrl = resolveDatabaseUrl();

if (databaseUrl) {
  // PostgreSQL (Production)
  if (isDevelopment) {
    console.log('🚀 Using PostgreSQL database');
  }

  try {
    if (shouldUseNeonDriver(databaseUrl)) {
      const { Pool, neonConfig } = await import('@neondatabase/serverless');
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const ws = await import('ws');

      neonConfig.webSocketConstructor = ws.default;
      pool = new Pool({ connectionString: databaseUrl });
      db = drizzle({ client: pool, schema });
    } else {
      const postgres = (await import('postgres')).default;
      const { drizzle } = await import('drizzle-orm/postgres-js');

      pool = postgres(databaseUrl, {
        max: parseMaxConnections(process.env.POSTGRES_MAX_CONNECTIONS),
        prepare: false,
      });
      db = drizzle(pool, { schema }) as unknown as NeonDatabase<typeof schema>;
    }

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
  // Cast to NeonDatabase - SQLite shares compatible Drizzle query API at runtime
  db = drizzle(sqlite, { schema }) as unknown as NeonDatabase<typeof schema>;
} else {
  // Fallback para ambientes sem DATABASE_URL
  console.warn('⚠️ No DATABASE_URL found - using SQLite fallback');

  const Database = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new (Database.default)('local.db');
  // Cast to NeonDatabase - SQLite shares compatible Drizzle query API at runtime
  db = drizzle(sqlite, { schema }) as unknown as NeonDatabase<typeof schema>;
}

export { db, pool };
