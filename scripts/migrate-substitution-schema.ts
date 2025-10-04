import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateSubstitutionSchema() {
  try {
    console.log("🔄 Iniciando migração do schema de substituições...");

    // 1. Adicionar novos enums se não existirem
    await db.execute(sql`
      DO $$ BEGIN
        -- Adicionar auto_approved ao enum de status se não existir
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'auto_approved'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'substitution_status')
        ) THEN
          ALTER TYPE substitution_status ADD VALUE 'auto_approved';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        -- Criar enum de urgência se não existir
        CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Adicionar novos campos à tabela substitution_requests
    await db.execute(sql`
      ALTER TABLE substitution_requests
      ADD COLUMN IF NOT EXISTS urgency urgency_level DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS response_message TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // 3. Adicionar onDelete cascade aos foreign keys existentes
    await db.execute(sql`
      DO $$
      BEGIN
        -- Drop e recriar FK de scheduleId com cascade
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'substitution_requests_schedule_id_schedules_id_fk'
        ) THEN
          ALTER TABLE substitution_requests
          DROP CONSTRAINT substitution_requests_schedule_id_schedules_id_fk;

          ALTER TABLE substitution_requests
          ADD CONSTRAINT substitution_requests_schedule_id_schedules_id_fk
          FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE;
        END IF;

        -- Drop e recriar FK de requesterId com cascade
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'substitution_requests_requester_id_users_id_fk'
        ) THEN
          ALTER TABLE substitution_requests
          DROP CONSTRAINT substitution_requests_requester_id_users_id_fk;

          ALTER TABLE substitution_requests
          ADD CONSTRAINT substitution_requests_requester_id_users_id_fk
          FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;

        -- Drop e recriar FK de substituteId com set null
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'substitution_requests_substitute_id_users_id_fk'
        ) THEN
          ALTER TABLE substitution_requests
          DROP CONSTRAINT substitution_requests_substitute_id_users_id_fk;

          ALTER TABLE substitution_requests
          ADD CONSTRAINT substitution_requests_substitute_id_users_id_fk
          FOREIGN KEY (substitute_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 4. Criar índices para melhor performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_substitution_requester ON substitution_requests(requester_id);
      CREATE INDEX IF NOT EXISTS idx_substitution_substitute ON substitution_requests(substitute_id);
      CREATE INDEX IF NOT EXISTS idx_substitution_status ON substitution_requests(status);
      CREATE INDEX IF NOT EXISTS idx_substitution_schedule ON substitution_requests(schedule_id);
    `);

    console.log("✅ Migração concluída com sucesso!");
    console.log("📋 Resumo das alterações:");
    console.log("  - ✅ Enum 'auto_approved' adicionado a substitution_status");
    console.log("  - ✅ Enum 'urgency_level' criado");
    console.log("  - ✅ Campos 'urgency', 'response_message', 'updated_at' adicionados");
    console.log("  - ✅ Foreign keys atualizadas com ON DELETE CASCADE/SET NULL");
    console.log("  - ✅ Índices criados para performance");

  } catch (error) {
    console.error("❌ Erro na migração:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrateSubstitutionSchema();
