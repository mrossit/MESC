#!/usr/bin/env tsx
/**
 * Script para testar login no banco de produção
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig } from '@neondatabase/serverless';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function testLogin() {
  const productionDbUrl = process.argv[2];
  const testEmail = process.argv[3];
  const testPassword = process.argv[4];
  
  if (!productionDbUrl || !testEmail) {
    console.error('❌ Uso: tsx scripts/test-production-login.ts "DB_URL" "email@exemplo.com" "[senha_opcional]"');
    process.exit(1);
  }

  console.log('🔄 Conectando no banco de PRODUÇÃO...\n');
  
  try {
    const prodDb = drizzle(productionDbUrl);
    console.log('✅ Conectado!\n');
    
    // Testa busca com email original
    console.log(`🔍 Buscando usuário com email: ${testEmail}`);
    const normalizedEmail = testEmail.trim().toLowerCase();
    console.log(`   Normalizado para: ${normalizedEmail}\n`);
    
    const [user] = await prodDb
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário NÃO encontrado com email normalizado!');
      
      // Tenta buscar sem normalizar
      const [userOriginal] = await prodDb
        .select()
        .from(users)
        .where(eq(users.email, testEmail))
        .limit(1);
      
      if (userOriginal) {
        console.log(`✅ MAS foi encontrado com email ORIGINAL: ${userOriginal.email}`);
        console.log(`   Status: ${userOriginal.status}`);
      } else {
        console.log('❌ Usuário não existe nem com email original');
        
        // Lista emails similares
        console.log('\n📋 Usuários com emails parecidos:');
        const similar = await prodDb.execute(sql`
          SELECT email, name, status 
          FROM users 
          WHERE email ILIKE ${'%' + testEmail.split('@')[0] + '%'}
          LIMIT 5
        `);
        similar.rows?.forEach((row: any) => {
          console.log(`   - ${row.email} (${row.name}) - Status: ${row.status}`);
        });
      }
      return;
    }

    console.log('✅ Usuário ENCONTRADO!');
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email no banco: ${user.email}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Último login: ${user.lastLogin || 'Nunca'}`);
    
    // Verifica status
    if (user.status !== 'active') {
      console.log(`\n⚠️  PROBLEMA: Status é "${user.status}" (deve ser "active")`);
    }
    
    // Testa senha se fornecida
    if (testPassword && user.passwordHash) {
      console.log('\n🔐 Testando senha...');
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      if (isValid) {
        console.log('✅ Senha CORRETA!');
      } else {
        console.log('❌ Senha INCORRETA!');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

testLogin();
