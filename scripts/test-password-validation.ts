import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testPasswordValidation() {
  console.log('🔐 === 4. VALIDAÇÃO DE HASH/SENHA ===\n');

  // Pegar um usuário coordenador
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'rossit@icloud.com'))
    .limit(1);

  if (!user) {
    console.log('❌ Usuário rossit@icloud.com não encontrado');
    process.exit(1);
  }

  console.log('✅ Usuário encontrado:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Status: ${user.status}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Hash (primeiros 29 chars): ${user.passwordHash?.substring(0, 29)}`);
  console.log(`   Hash completo length: ${user.passwordHash?.length}`);

  // Detectar algoritmo e rounds do bcrypt
  if (user.passwordHash?.startsWith('$2b$')) {
    const parts = user.passwordHash.split('$');
    console.log(`\n📊 Algoritmo: bcrypt (2b)`);
    console.log(`   Cost/Rounds: ${parts[2]}`);
  }

  // Testar com senha conhecida (se soubermos)
  console.log('\n🧪 Testando validação de senha...');
  const testPasswords = ['teste123', '123456', 'admin', 'rossit123'];

  for (const pwd of testPasswords) {
    try {
      const isValid = await bcrypt.compare(pwd, user.passwordHash);
      console.log(`   Senha "${pwd}": ${isValid ? '✅ VÁLIDA' : '❌ inválida'}`);
      if (isValid) {
        console.log(`\n🎯 SENHA CORRETA ENCONTRADA: "${pwd}"`);
        break;
      }
    } catch (error: any) {
      console.log(`   Erro ao testar "${pwd}": ${error.message}`);
    }
  }

  // Informações sobre bcrypt
  console.log('\n📦 Versão do bcrypt instalado:');
  try {
    const bcryptPkg = await import('bcrypt/package.json');
    console.log(`   bcrypt@${bcryptPkg.version}`);
  } catch {
    console.log('   (não foi possível detectar versão)');
  }

  process.exit(0);
}

testPasswordValidation().catch(console.error);
