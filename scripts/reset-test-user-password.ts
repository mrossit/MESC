import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function resetTestUserPassword() {
  const testEmail = 'rossit@icloud.com';
  const newPassword = 'Teste@2025';

  console.log('🔐 Resetando senha do usuário de teste...\n');
  console.log(`Email: ${testEmail}`);
  console.log(`Nova senha: ${newPassword}`);

  // Buscar usuário
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, testEmail))
    .limit(1);

  if (!user) {
    console.log(`❌ Usuário ${testEmail} não encontrado`);
    process.exit(1);
  }

  console.log(`\n✅ Usuário encontrado: ${user.name}`);

  // Gerar novo hash
  const saltRounds = 10;
  const newHash = await bcrypt.hash(newPassword, saltRounds);

  console.log(`\n🔧 Gerando novo hash...`);
  console.log(`   Algoritmo: bcrypt`);
  console.log(`   Rounds: ${saltRounds}`);
  console.log(`   Hash (primeiros 29): ${newHash.substring(0, 29)}`);

  // Atualizar no banco
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      requiresPasswordChange: false,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  console.log(`\n✅ Senha atualizada com sucesso!`);

  // Verificar
  const isValid = await bcrypt.compare(newPassword, newHash);
  console.log(`\n🧪 Verificação:`);
  console.log(`   Senha "${newPassword}" é válida: ${isValid ? '✅ SIM' : '❌ NÃO'}`);

  console.log(`\n📋 Credenciais para teste:`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Senha: ${newPassword}`);
  console.log(`\nUse estas credenciais para testar o login!`);

  process.exit(0);
}

resetTestUserPassword().catch(console.error);
