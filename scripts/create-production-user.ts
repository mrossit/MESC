import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function createProductionUser() {
  try {
    console.log('🔐 Criando usuário para PRODUÇÃO...\n');
    console.log('📍 Database URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    console.log('');

    // Criar hash da senha
    const password = '123Pegou';  // Senha mais simples para produção
    const passwordHash = await bcrypt.hash(password, 10);

    // Verificar se já existe
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rossit@icloud.com'))
      .limit(1);

    if (existing) {
      console.log('⚠️  Usuário já existe, atualizando para produção...');

      const [updated] = await db
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

      console.log('✅ Usuário atualizado para produção!');
      console.log('   ID:', updated.id);
    } else {
      console.log('➕ Criando novo usuário para produção...');

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

      console.log('✅ Usuário criado para produção!');
      console.log('   ID:', newUser.id);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🚀 CREDENCIAIS PARA VERSÃO PUBLICADA (PRODUÇÃO)');
    console.log('='.repeat(50));
    console.log('');
    console.log('📧 Email: rossit@icloud.com');
    console.log('🔐 Senha: 123Pegou');
    console.log('🎭 Perfil: Coordenador (acesso total)');
    console.log('');
    console.log('🌐 URL de produção: https://[seu-app].replit.app');
    console.log('='.repeat(50));
    console.log('');

    // Também criar um usuário admin alternativo
    const adminHash = await bcrypt.hash('Admin2024', 10);

    const [adminExists] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@sjt.com.br'))
      .limit(1);

    if (!adminExists) {
      await db
        .insert(users)
        .values({
          email: 'admin@sjt.com.br',
          passwordHash: adminHash,
          name: 'Administrador SJT',
          phone: null,
          role: 'coordenador',
          status: 'active',
          requiresPasswordChange: false,
          observations: 'Administrador do sistema MESC'
        });

      console.log('✅ Usuário admin alternativo criado!');
      console.log('');
      console.log('📧 Email alternativo: admin@sjt.com.br');
      console.log('🔐 Senha alternativa: Admin2024');
      console.log('');
    }

    console.log('✅ Configuração de produção concluída!');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Estas credenciais funcionam na versão PUBLICADA');
    console.log('   - Acesse através da URL pública do Replit');
    console.log('   - Limpe o cache do navegador antes de fazer login');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

// Executar
createProductionUser();