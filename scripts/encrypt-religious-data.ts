#!/usr/bin/env tsx

/**
 * Script de Migração - Criptografia de Dados Religiosos
 *
 * LGPD Art. 11: Dados religiosos são considerados SENSÍVEIS
 * Este script criptografa campos sacramentais existentes no banco
 *
 * Uso:
 *   npm run tsx scripts/encrypt-religious-data.ts
 *
 * IMPORTANTE:
 * - Execute ANTES em ambiente de teste
 * - Faça BACKUP do banco antes de executar
 * - Tenha ENCRYPTION_KEY configurado no .env
 */

import { db } from '../server/db';
import { users } from '@shared/schema';
import { encrypt, decrypt, isEncrypted, testEncryption } from '../server/utils/encryption';
import { eq } from 'drizzle-orm';

async function encryptReligiousData() {
  console.log('🔐 ========================================');
  console.log('🔐 MIGRAÇÃO: Criptografia de Dados Religiosos');
  console.log('🔐 ========================================\n');

  // 1. Testar criptografia primeiro
  console.log('1️⃣  Testando sistema de criptografia...');
  const testPassed = testEncryption();

  if (!testPassed) {
    console.error('❌ Teste de criptografia falhou!');
    console.error('❌ Verifique se ENCRYPTION_KEY está configurado corretamente no .env');
    process.exit(1);
  }

  console.log('✅ Sistema de criptografia OK\n');

  // 2. Buscar todos os usuários
  console.log('2️⃣  Buscando usuários...');
  const allUsers = await db.select().from(users);
  console.log(`✅ Encontrados ${allUsers.length} usuários\n`);

  // 3. Analisar dados
  let totalFieldsToEncrypt = 0;
  let alreadyEncrypted = 0;
  let empty = 0;

  console.log('3️⃣  Analisando dados...');

  for (const user of allUsers) {
    const fields = [
      user.baptismParish,
      user.confirmationParish,
      user.marriageParish
    ];

    for (const field of fields) {
      if (!field) {
        empty++;
      } else if (isEncrypted(field)) {
        alreadyEncrypted++;
      } else {
        totalFieldsToEncrypt++;
      }
    }
  }

  console.log(`   Total de campos: ${allUsers.length * 3}`);
  console.log(`   Vazios: ${empty}`);
  console.log(`   Já criptografados: ${alreadyEncrypted}`);
  console.log(`   A criptografar: ${totalFieldsToEncrypt}\n`);

  if (totalFieldsToEncrypt === 0) {
    console.log('✅ Todos os dados já estão criptografados ou vazios!');
    console.log('✅ Nenhuma ação necessária.');
    process.exit(0);
  }

  // 4. Confirmar execução
  console.log('⚠️  ========================================');
  console.log(`⚠️  ATENÇÃO: Irá criptografar ${totalFieldsToEncrypt} campos`);
  console.log('⚠️  Esta operação modifica o banco de dados!');
  console.log('⚠️  ========================================\n');

  // 5. Executar criptografia
  console.log('4️⃣  Iniciando criptografia...\n');

  let usersUpdated = 0;
  let fieldsEncrypted = 0;
  const errors: Array<{ userId: string; field: string; error: string }> = [];

  for (const user of allUsers) {
    const updates: Partial<typeof user> = {};
    let userNeedsUpdate = false;

    // Verificar e criptografar baptismParish
    if (user.baptismParish && !isEncrypted(user.baptismParish)) {
      try {
        updates.baptismParish = encrypt(user.baptismParish);
        userNeedsUpdate = true;
        fieldsEncrypted++;
        console.log(`   ✓ ${user.email}: baptismParish`);
      } catch (error: any) {
        errors.push({
          userId: user.id,
          field: 'baptismParish',
          error: error.message
        });
      }
    }

    // Verificar e criptografar confirmationParish
    if (user.confirmationParish && !isEncrypted(user.confirmationParish)) {
      try {
        updates.confirmationParish = encrypt(user.confirmationParish);
        userNeedsUpdate = true;
        fieldsEncrypted++;
        console.log(`   ✓ ${user.email}: confirmationParish`);
      } catch (error: any) {
        errors.push({
          userId: user.id,
          field: 'confirmationParish',
          error: error.message
        });
      }
    }

    // Verificar e criptografar marriageParish
    if (user.marriageParish && !isEncrypted(user.marriageParish)) {
      try {
        updates.marriageParish = encrypt(user.marriageParish);
        userNeedsUpdate = true;
        fieldsEncrypted++;
        console.log(`   ✓ ${user.email}: marriageParish`);
      } catch (error: any) {
        errors.push({
          userId: user.id,
          field: 'marriageParish',
          error: error.message
        });
      }
    }

    // Atualizar usuário se houver mudanças
    if (userNeedsUpdate) {
      try {
        await db
          .update(users)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        usersUpdated++;
      } catch (error: any) {
        console.error(`   ❌ Erro ao atualizar ${user.email}:`, error.message);
        errors.push({
          userId: user.id,
          field: 'update',
          error: error.message
        });
      }
    }
  }

  // 6. Resumo final
  console.log('\n🔐 ========================================');
  console.log('🔐 RESUMO DA MIGRAÇÃO');
  console.log('🔐 ========================================');
  console.log(`✅ Usuários atualizados: ${usersUpdated}`);
  console.log(`✅ Campos criptografados: ${fieldsEncrypted}`);

  if (errors.length > 0) {
    console.log(`\n❌ Erros encontrados: ${errors.length}`);
    console.log('\nDetalhes dos erros:');
    errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. User ${err.userId} - ${err.field}: ${err.error}`);
    });
  } else {
    console.log('\n✅ Nenhum erro encontrado!');
  }

  // 7. Verificar resultado
  console.log('\n5️⃣  Verificando resultado...');

  const updatedUsers = await db.select().from(users);
  let verificationPassed = true;

  for (const user of updatedUsers) {
    const fields = [
      { name: 'baptismParish', value: user.baptismParish },
      { name: 'confirmationParish', value: user.confirmationParish },
      { name: 'marriageParish', value: user.marriageParish }
    ];

    for (const field of fields) {
      // Se o campo tem valor, deve estar criptografado
      if (field.value && !isEncrypted(field.value)) {
        console.error(`❌ ${user.email}.${field.name} NÃO está criptografado!`);
        verificationPassed = false;
      }
    }
  }

  if (verificationPassed) {
    console.log('✅ Verificação PASSOU! Todos os dados sensíveis estão criptografados.\n');
  } else {
    console.error('❌ Verificação FALHOU! Alguns dados não foram criptografados.\n');
    process.exit(1);
  }

  console.log('🔐 ========================================');
  console.log('🔐 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('🔐 ========================================\n');

  console.log('📝 Próximos passos:');
  console.log('   1. Verificar os dados criptografados no banco');
  console.log('   2. Testar a aplicação para garantir que a descriptografia funciona');
  console.log('   3. Documentar a migração realizada');
  console.log('   4. Fazer backup do banco pós-migração\n');

  process.exit(0);
}

// Executar migração
encryptReligiousData().catch((error) => {
  console.error('\n❌ ERRO FATAL:', error);
  console.error('\n❌ Migração abortada!');
  process.exit(1);
});
