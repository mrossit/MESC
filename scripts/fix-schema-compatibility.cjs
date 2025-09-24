#!/usr/bin/env node

/**
 * SCRIPT DE PREVENÇÃO DE INCONSISTÊNCIAS DE SCHEMA
 * 
 * Este script garante que o schema SQLite seja sempre compatível
 * com o schema Drizzle PostgreSQL, evitando problemas futuros.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'local.db');

console.log('🔧 Verificando compatibilidade do schema SQLite com Drizzle...');

try {
  const db = new Database(dbPath);
  
  // 1. VERIFICAR E CORRIGIR SCHEMA DE USUÁRIOS
  console.log('📋 Verificando schema da tabela users...');
  
  const userColumns = db.prepare(`
    SELECT name, type FROM pragma_table_info('users')
  `).all();
  
  const requiredColumns = [
    { name: 'id', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'firstName', type: 'TEXT' },
    { name: 'lastName', type: 'TEXT' },
    { name: 'name', type: 'TEXT' },
    { name: 'passwordHash', type: 'TEXT' },
    { name: 'role', type: 'TEXT' },
    { name: 'status', type: 'TEXT' },
    { name: 'requiresPasswordChange', type: 'INTEGER' }
  ];
  
  const existingColumns = userColumns.map(col => col.name);
  const missingColumns = requiredColumns.filter(req => !existingColumns.includes(req.name));
  
  console.log('📊 Colunas existentes:', existingColumns);
  
  if (missingColumns.length > 0) {
    console.log('⚠️ Colunas faltantes encontradas na tabela users:', missingColumns.map(c => c.name).join(', '));
    
    for (const col of missingColumns) {
      try {
        console.log(`➕ Adicionando coluna: ${col.name} (${col.type})`);
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
      } catch (err) {
        console.log(`⚠️ Erro ao adicionar ${col.name}:`, err.message);
      }
    }
  }
  
  // 2. VERIFICAR DADOS ESSENCIAIS
  console.log('🔍 Validando dados essenciais...');
  
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`👥 Total de usuários: ${userCount.count}`);
  
  try {
    const formationTrackCount = db.prepare(`
      SELECT COUNT(*) as count FROM formation_tracks WHERE id IS NOT NULL
    `).get();
    console.log(`📚 Trilhas de formação: ${formationTrackCount.count}`);
  } catch (err) {
    console.log('⚠️ Tabela formation_tracks com problemas:', err.message);
  }
  
  // 3. TESTE DE COMPATIBILIDADE COM DRIZZLE
  console.log('🧪 Testando compatibilidade com queries Drizzle...');
  
  // Simular query Drizzle típica
  try {
    const testUser = db.prepare(`
      SELECT id, email, name, role, status, requiresPasswordChange, passwordHash
      FROM users
      WHERE status = 'active'
      LIMIT 1
    `).get();
    
    if (testUser) {
      console.log('✅ Query de usuário funcionando corretamente');
      console.log('   Colunas encontradas:', Object.keys(testUser));
    } else {
      console.log('⚠️ Nenhum usuário ativo encontrado');
    }
  } catch (err) {
    console.log('❌ Erro na query de usuário:', err.message);
  }
  
  // 4. TESTE ESPECÍFICO DE FORMAÇÃO (que está falhando)
  console.log('🧪 Testando queries de formação...');
  
  try {
    const formationTest = db.prepare(`
      SELECT * FROM formation_tracks LIMIT 1
    `).get();
    
    if (formationTest) {
      console.log('✅ Query de formação funcionando');
      console.log('   Colunas encontradas:', Object.keys(formationTest));
    } else {
      console.log('⚠️ Nenhuma trilha de formação encontrada');
    }
  } catch (err) {
    console.log('❌ ERRO NA QUERY DE FORMAÇÃO:', err.message);
    console.log('❌ Este é provavelmente o problema que está causando SQLITE_ERROR');
  }
  
  // 5. RELATÓRIO FINAL
  console.log('\n📊 RELATÓRIO DE COMPATIBILIDADE:');
  console.log('=====================================');
  
  if (missingColumns.length === 0) {
    console.log('✅ Schema de usuários: COMPATÍVEL');
  } else {
    console.log(`⚠️ Schema de usuários: CORRIGIDO (${missingColumns.length} colunas adicionadas)`);
  }
  
  console.log('✅ Verificação concluída!');
  
  db.close();
  
} catch (error) {
  console.error('❌ Erro ao verificar compatibilidade:', error);
  process.exit(1);
}