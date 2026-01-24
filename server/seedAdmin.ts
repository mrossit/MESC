import { db } from './db';
import { users } from '@shared/schema';
import { hashPassword } from './auth';

async function seedAdmin() {
  try {
    console.log('🔐 Criando usuário administrador...');

    // Dados do administrador master - usar variáveis de ambiente
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Administrador';

    if (!adminEmail || !adminPassword) {
      console.error('❌ ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios!');
      console.log('Use: ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=suasenha npx tsx server/seedAdmin.ts');
      process.exit(1);
    }

    const adminData = {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: 'gestor' as const, // Gestor tem acesso completo conforme PRD
    };
    
    // Hash da senha
    const passwordHash = await hashPassword(adminData.password);
    
    // Cria o usuário admin
    const [admin] = await db
      .insert(users)
      .values({
        email: adminData.email,
        passwordHash,
        name: adminData.name,
        role: adminData.role,
        status: 'active',
        requiresPasswordChange: false, // Não força troca de senha
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoNothing() // Não faz nada se o usuário já existir
      .returning();
    
    if (admin) {
      console.log('✅ Usuário administrador criado com sucesso!');
      console.log('📧 Email:', adminData.email);
      console.log('🔑 Senha: Verifique a senha hardcoded no arquivo seedAdmin.ts');
      console.log('⚠️  IMPORTANTE: Troque a senha no primeiro acesso!');
    } else {
      console.log('ℹ️  Usuário administrador já existe.');
    }
    
    // Usuários de exemplo removidos para produção
    // Para criar usuários adicionais, use a interface de administração

    console.log('\n✨ Seed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exit(1);
  }
}

// Executa o seed
seedAdmin();