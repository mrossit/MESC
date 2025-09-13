import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { login } from '../server/auth';

async function debugLogin() {
  const email = 'rossit@icloud.com';
  const password = '123Pegou$&@';

  console.log('🔍 Debug de Login para rossit@icloud.com\n');
  console.log('Credenciais testadas:');
  console.log('  Email:', email);
  console.log('  Senha:', password);
  console.log('');

  try {
    // 1. Verificar usuário no banco
    console.log('1️⃣ Buscando usuário no banco...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário NÃO encontrado!');
      process.exit(1);
    }

    console.log('✅ Usuário encontrado:');
    console.log('  ID:', user.id);
    console.log('  Nome:', user.name);
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('');

    // 2. Verificar status
    console.log('2️⃣ Verificando status do usuário...');
    if (user.status === 'pending') {
      console.log('❌ Usuário PENDENTE de aprovação!');
      process.exit(1);
    }
    if (user.status === 'inactive') {
      console.log('❌ Usuário INATIVO!');
      process.exit(1);
    }
    console.log('✅ Status OK:', user.status);
    console.log('');

    // 3. Verificar senha
    console.log('3️⃣ Verificando senha...');
    if (!user.passwordHash) {
      console.log('❌ Usuário sem senha definida!');
      process.exit(1);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('  Senha válida?', isValid);

    if (!isValid) {
      console.log('❌ Senha INCORRETA!');
      console.log('\n🔧 Corrigindo senha...');

      const newHash = await bcrypt.hash(password, 10);
      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, user.id));

      console.log('✅ Senha atualizada!');
    } else {
      console.log('✅ Senha correta!');
    }
    console.log('');

    // 4. Testar função de login
    console.log('4️⃣ Testando função de login...');
    try {
      const result = await login(email, password);
      console.log('✅ Login bem sucedido!');
      console.log('  Token gerado:', result.token.substring(0, 50) + '...');
      console.log('  Usuário retornado:', result.user.email);
    } catch (loginError: any) {
      console.log('❌ Erro no login:', loginError.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    process.exit(0);
  }
}

debugLogin();