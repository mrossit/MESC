import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addExtraActivitiesField() {
  try {
    console.log('🔧 Adicionando campo extra_activities...');

    // Adicionar a coluna se não existir
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS extra_activities JSONB DEFAULT '{"sickCommunion": false, "mondayAdoration": false, "helpOtherPastorals": false, "festiveEvents": false}'::jsonb
    `);

    console.log('✅ Campo extra_activities adicionado com sucesso!');

    // Verificar se o campo foi criado
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'extra_activities'
    `);

    if (result.rows.length > 0) {
      console.log('📊 Detalhes do campo criado:', result.rows[0]);
    }

  } catch (error) {
    console.error('❌ Erro ao adicionar campo:', error);
  }

  process.exit(0);
}

addExtraActivitiesField();