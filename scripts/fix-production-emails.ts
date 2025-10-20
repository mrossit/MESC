#!/usr/bin/env tsx
/**
 * Script para normalizar emails NO BANCO DE PRODUÇÃO
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig } from '@neondatabase/serverless';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';
import ws from 'ws';

// Configura WebSocket para Neon
neonConfig.webSocketConstructor = ws;

async function fixProductionEmails() {
  // URL do banco de produção (passada como argumento)
  const productionDbUrl = process.argv[2];
  
  if (!productionDbUrl) {
    console.error('❌ Erro: Você precisa passar a URL do banco de produção');
    console.log('Uso: tsx scripts/fix-production-emails.ts "postgresql://..."');
    process.exit(1);
  }

  console.log('🔄 Conectando no banco de PRODUÇÃO...\n');
  
  try {
    // Conecta no banco de produção
    const prodDb = drizzle(productionDbUrl);
    
    console.log('✅ Conectado ao banco de produção!\n');
    console.log('📝 Executando normalização de emails...\n');
    
    // Normaliza todos os emails
    const result = await prodDb.execute(sql`
      UPDATE users 
      SET 
        email = LOWER(TRIM(email)),
        updated_at = NOW()
      WHERE email != LOWER(TRIM(email))
      RETURNING id, email, name
    `);

    console.log(`✅ Normalização concluída!`);
    console.log(`📊 Emails atualizados: ${result.rowCount || 0}\n`);
    
    if (result.rowCount && result.rowCount > 0) {
      console.log('📋 Emails normalizados:');
      result.rows?.forEach((row: any) => {
        console.log(`   - ${row.email} (${row.name})`);
      });
      console.log('');
    }
    
    // Verificação final
    const check = await prodDb.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN email = LOWER(email) THEN 1 ELSE 0 END) as normalized,
        SUM(CASE WHEN email != LOWER(email) THEN 1 ELSE 0 END) as remaining
      FROM users
    `);
    
    const stats = check.rows?.[0];
    console.log('📊 Estatísticas finais:');
    console.log(`   - Total de usuários: ${stats?.total}`);
    console.log(`   - Emails normalizados: ${stats?.normalized}`);
    console.log(`   - Emails com maiúsculas restantes: ${stats?.remaining}`);
    console.log('');
    
    if (stats?.remaining === '0' || stats?.remaining === 0) {
      console.log('✅ SUCESSO! Todos os emails estão normalizados!');
      console.log('🎉 Os usuários já podem fazer login com qualquer variação do email!\n');
    } else {
      console.log('⚠️  Ainda há emails com maiúsculas. Execute o script novamente.\n');
    }

  } catch (error: any) {
    console.error('❌ Erro ao normalizar emails:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Executa o script
fixProductionEmails();
