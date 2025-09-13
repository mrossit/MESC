import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function createSimpleUser() {
  try {
    console.log('🔐 Criando usuário com senha simples...\n');

    // Senha mais simples sem caracteres especiais
    const simplePassword = 'Admin123456';
    const passwordHash = await bcrypt.hash(simplePassword, 10);

    // Verificar se já existe
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@mesc.com.br'))
      .limit(1);

    if (existing) {
      console.log('⚠️  Usuário já existe, atualizando senha...');

      await db
        .update(users)
        .set({
          passwordHash,
          name: 'Administrador MESC',
          role: 'coordenador',
          status: 'active',
          requiresPasswordChange: false,
          updatedAt: new Date()
        })
        .where(eq(users.email, 'admin@mesc.com.br'));

      console.log('✅ Usuário atualizado!');
    } else {
      console.log('➕ Criando novo usuário...');

      await db
        .insert(users)
        .values({
          email: 'admin@mesc.com.br',
          passwordHash,
          name: 'Administrador MESC',
          phone: null,
          role: 'coordenador',
          status: 'active',
          requiresPasswordChange: false,
          observations: 'Usuário administrador do sistema'
        });

      console.log('✅ Usuário criado!');
    }

    console.log('\n🔑 NOVAS CREDENCIAIS DE ACESSO:');
    console.log('================================');
    console.log('📧 Email: admin@mesc.com.br');
    console.log('🔐 Senha: Admin123456');
    console.log('🎭 Perfil: Coordenador');
    console.log('================================\n');

    // Testar login
    console.log('🧪 Testando login...');
    const { login } = await import('../server/auth');

    try {
      const result = await login('admin@mesc.com.br', simplePassword);
      console.log('✅ Login funcionou perfeitamente!');
      console.log('   Token:', result.token.substring(0, 30) + '...');
    } catch (error: any) {
      console.log('❌ Erro no login:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

createSimpleUser();