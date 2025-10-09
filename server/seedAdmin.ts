import { db } from './db';
import { users } from '@shared/schema';
import { hashPassword } from './auth';

async function seedAdmin() {
  try {
    console.log('🔐 Criando usuário administrador...');
    
    // Dados do administrador master
    const adminData = {
      email: 'rossit@icloud.com',
      password: '123Pegou$&@',
      name: 'Marco Rossit',
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
    
    // Cria também um coordenador de exemplo
    const coordenadorData = {
      email: 'coordenador@saoludastadeu.com.br',
      password: 'Coord@2025',
      name: 'Coordenador Exemplo',
      role: 'coordenador' as const,
    };
    
    const coordPasswordHash = await hashPassword(coordenadorData.password);
    
    const [coord] = await db
      .insert(users)
      .values({
        email: coordenadorData.email,
        passwordHash: coordPasswordHash,
        name: coordenadorData.name,
        role: coordenadorData.role,
        status: 'active',
        requiresPasswordChange: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoNothing()
      .returning();
    
    if (coord) {
      console.log('\n✅ Usuário coordenador criado com sucesso!');
      console.log('📧 Email:', coordenadorData.email);
      console.log('🔑 Senha: Verifique a senha hardcoded no arquivo seedAdmin.ts');
    }
    
    // Cria um ministro de exemplo
    const ministroData = {
      email: 'ministro@exemplo.com',
      password: 'Ministro@2025',
      name: 'Ministro Exemplo',
      role: 'ministro' as const,
    };
    
    const ministroPasswordHash = await hashPassword(ministroData.password);
    
    const [ministro] = await db
      .insert(users)
      .values({
        email: ministroData.email,
        passwordHash: ministroPasswordHash,
        name: ministroData.name,
        role: ministroData.role,
        status: 'active',
        requiresPasswordChange: true,
        phone: '(15) 99999-9999',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoNothing()
      .returning();
    
    if (ministro) {
      console.log('\n✅ Usuário ministro criado com sucesso!');
      console.log('📧 Email:', ministroData.email);
      console.log('🔑 Senha: Verifique a senha hardcoded no arquivo seedAdmin.ts');
    }
    
    console.log('\n✨ Seed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exit(1);
  }
}

// Executa o seed
seedAdmin();