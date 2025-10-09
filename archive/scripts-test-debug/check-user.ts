import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function checkUser() {
  try {
    console.log('🔍 Verificando usuário rossit@icloud.com...\n');

    // Buscar o usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rossit@icloud.com'))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário NÃO encontrado no banco de dados');
      return;
    }

    console.log('✅ Usuário encontrado:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Nome:', user.name);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Password Hash existe:', !!user.passwordHash);
    console.log('   Requer mudança de senha:', user.requiresPasswordChange);

    // Testar a senha
    console.log('\n🔐 Testando senha...');
    const testPassword = '123Pegou$&@';

    if (!user.passwordHash) {
      console.log('❌ Usuário não tem senha definida!');
      return;
    }

    const isValidPassword = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('   Senha válida:', isValidPassword);

    if (!isValidPassword) {
      console.log('\n❌ PROBLEMA: A senha não está correta no banco!');
      console.log('   Vamos atualizar a senha...\n');

      // Criar novo hash
      const newHash = await bcrypt.hash(testPassword, 10);

      // Atualizar no banco
      await db
        .update(users)
        .set({
          passwordHash: newHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      console.log('✅ Senha atualizada com sucesso!');
    } else {
      console.log('✅ Senha está correta no banco');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkUser();