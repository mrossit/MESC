import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';

async function createCoordinatorUser() {
  try {
    console.log('🔐 Criando usuário coordenador...');

    // Hash da senha
    const passwordHash = await bcrypt.hash('123Pegou$&@', 10);

    // Verificar se o usuário já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rossit@icloud.com'))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('⚠️  Usuário já existe, atualizando...');

      // Atualizar usuário existente
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordHash,
          name: 'Coordenador Rossit',
          role: 'coordenador',
          status: 'active',
          requiresPasswordChange: false,
          updatedAt: new Date()
        })
        .where(eq(users.email, 'rossit@icloud.com'))
        .returning();

      console.log('✅ Usuário atualizado com sucesso!');
      console.log('📧 Email:', updatedUser.email);
      console.log('👤 Nome:', updatedUser.name);
      console.log('🎭 Perfil:', updatedUser.role);
      console.log('✨ Status:', updatedUser.status);
    } else {
      console.log('➕ Criando novo usuário...');

      // Criar novo usuário
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'rossit@icloud.com',
          passwordHash,
          name: 'Coordenador Rossit',
          phone: null,
          role: 'coordenador',
          status: 'active',
          requiresPasswordChange: false,
          observations: 'Usuário coordenador com acesso total ao sistema'
        })
        .returning();

      console.log('✅ Usuário criado com sucesso!');
      console.log('📧 Email:', newUser.email);
      console.log('👤 Nome:', newUser.name);
      console.log('🎭 Perfil:', newUser.role);
      console.log('✨ Status:', newUser.status);
    }

    console.log('\n🔑 Credenciais de acesso:');
    console.log('   Email: rossit@icloud.com');
    console.log('   Senha: 123Pegou$&@');
    console.log('   Perfil: Coordenador (acesso total)');

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Importar eq do drizzle-orm
import { eq } from 'drizzle-orm';

// Executar a função
createCoordinatorUser();