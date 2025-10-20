#!/usr/bin/env tsx
/**
 * VERSÃO ALTERNATIVA - Normalização usando SQL DIRETO
 * Use este script se o normalize-emails.ts não funcionar
 * 
 * Uso: tsx scripts/normalize-emails-sql.ts
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function normalizeEmailsSQL() {
  console.log('🔄 Iniciando normalização de emails via SQL...\n');
  
  try {
    // MÉTODO 1: Atualização direta com SQL
    console.log('📝 Executando: UPDATE users SET email = LOWER(TRIM(email))...\n');
    
    const result = await db.execute(sql`
      UPDATE users 
      SET 
        email = LOWER(TRIM(email)),
        updated_at = NOW()
      WHERE email != LOWER(TRIM(email))
      RETURNING id, email, name
    `);

    console.log('✅ Normalização concluída!\n');
    console.log('📊 Resultado:', result);
    
    // Verificação
    const check = await db.execute(sql`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN email = LOWER(email) THEN 1 ELSE 0 END) as normalized,
             SUM(CASE WHEN email != LOWER(email) THEN 1 ELSE 0 END) as remaining
      FROM users
    `);
    
    console.log('\n📊 Verificação final:', check.rows?.[0]);
    console.log('\n✅ Todos os emails devem estar normalizados agora!\n');

  } catch (error: any) {
    console.error('❌ Erro ao normalizar emails:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Executa o script
normalizeEmailsSQL();
