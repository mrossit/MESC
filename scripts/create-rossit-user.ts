import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';

async function createRossitUser() {
  try {
    console.log('Criando usuário rossit@icloud.com...\n');

    // Definir a senha
    const plainPassword = 'senha123'; // Senha padrão
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Criar o usuário
    const [newUser] = await db.insert(users).values({
      email: 'rossit@icloud.com',
      name: 'Rossit',
      passwordHash,
      role: 'gestor', // Definindo como gestor para ter acesso total
      status: 'active',
      phone: '11999999999',
      ministryStartDate: new Date('2020-01-01'),
      requiresPasswordChange: false
    }).returning();

    console.log('✅ Usuário criado com sucesso!');
    console.log('\n=================================');
    console.log('DADOS DE ACESSO:');
    console.log('=================================');
    console.log('Email: rossit@icloud.com');
    console.log('Senha: senha123');
    console.log('Role: gestor (acesso total)');
    console.log('=================================\n');
    console.log('⚠️  IMPORTANTE: Por segurança, altere a senha após o primeiro login!');

  } catch (error: any) {
    if (error.code === '23505') {
      console.log('ℹ️  O usuário rossit@icloud.com já existe no banco de dados');
      console.log('\nSe você esqueceu a senha, use a funcionalidade "Esqueci minha senha" na tela de login');
    } else {
      console.error('Erro ao criar usuário:', error);
    }
  }

  process.exit(0);
}

createRossitUser();
