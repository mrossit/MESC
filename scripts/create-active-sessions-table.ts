import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function createActiveSessionsTable() {
  console.log('🔧 Criando tabela active_sessions...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        last_activity_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    console.log('✅ Tabela active_sessions criada!');

    // Criar índices
    console.log('🔧 Criando índices...');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_active_sessions_user
      ON active_sessions(user_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_active_sessions_active
      ON active_sessions(is_active);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_active_sessions_expires
      ON active_sessions(expires_at);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_active_sessions_activity
      ON active_sessions(last_activity_at);
    `);

    console.log('✅ Índices criados!');
    console.log('🎉 Migration concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  }
}

createActiveSessionsTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
