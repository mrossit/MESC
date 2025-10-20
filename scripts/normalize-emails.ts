#!/usr/bin/env tsx
/**
 * Script para normalizar todos os emails no banco de dados para lowercase
 * 
 * IMPORTANTE: Execute este script IMEDIATAMENTE em produção após o deploy
 * para corrigir emails que podem estar com maiúsculas/minúsculas mistas
 * 
 * Uso: tsx scripts/normalize-emails.ts
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function normalizeEmails() {
  console.log('🔄 Iniciando normalização de emails...\n');
  
  try {
    // Busca todos os usuários
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name
      })
      .from(users);

    console.log(`📊 Total de usuários encontrados: ${allUsers.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      const normalizedEmail = user.email.trim().toLowerCase();
      
      if (user.email !== normalizedEmail) {
        console.log(`✏️  Normalizando: ${user.email} → ${normalizedEmail} (${user.name})`);
        
        try {
          await db
            .update(users)
            .set({ 
              email: normalizedEmail,
              updatedAt: new Date()
            })
            .where(sql`${users.id} = ${user.id}`);
          
          updatedCount++;
        } catch (error: any) {
          console.error(`❌ Erro ao atualizar ${user.email}:`, error.message);
          
          // Se houver conflito de email, tenta adicionar um sufixo
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            console.log(`⚠️  Email ${normalizedEmail} já existe! Pulando...`);
          }
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n✅ Normalização concluída!');
    console.log(`   - Emails atualizados: ${updatedCount}`);
    console.log(`   - Emails já normalizados: ${skippedCount}`);
    console.log(`   - Total processado: ${allUsers.length}\n`);

  } catch (error) {
    console.error('❌ Erro ao normalizar emails:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Executa o script
normalizeEmails();
