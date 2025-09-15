import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function resetRossitPassword() {
  try {
    console.log('🔐 Resetando senha do usuário rossit@icloud.com...\n');

    // Primeiro, verificar se o usuário existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rossit@icloud.com'))
      .limit(1);

    if (!existingUser) {
      console.log('❌ Usuário rossit@icloud.com não encontrado!');
      console.log('\nCriando novo usuário...');

      // Criar o usuário se não existir
      const plainPassword = 'Admin@2024';
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      const [newUser] = await db.insert(users).values({
        email: 'rossit@icloud.com',
        name: 'Rossit',
        passwordHash,
        role: 'gestor',
        status: 'active',
        phone: '1533351515',
        requiresPasswordChange: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log('✅ Usuário criado com sucesso!');
      console.log('\n=================================');
      console.log('NOVOS DADOS DE ACESSO:');
      console.log('=================================');
      console.log('📧 Email: rossit@icloud.com');
      console.log('🔑 Senha: Admin@2024');
      console.log('👤 Role: gestor');
      console.log('=================================\n');

    } else {
      // Resetar a senha se o usuário existir
      const newPassword = 'Admin@2024';
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          requiresPasswordChange: false,
          updatedAt: new Date()
        })
        .where(eq(users.email, 'rossit@icloud.com'));

      console.log('✅ Senha resetada com sucesso!');
      console.log('\n=================================');
      console.log('NOVOS DADOS DE ACESSO:');
      console.log('=================================');
      console.log('📧 Email: rossit@icloud.com');
      console.log('🔑 Senha: Admin@2024');
      console.log('👤 Role:', existingUser.role);
      console.log('📱 Status:', existingUser.status);
      console.log('=================================\n');
    }

    console.log('⚠️  IMPORTANTE: Por segurança, altere esta senha após o primeiro login!');

  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
  }

  process.exit(0);
}

resetRossitPassword();