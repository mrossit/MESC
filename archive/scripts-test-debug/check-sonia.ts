import { db } from '../server/db';
import { users } from '@shared/schema';
import { like, eq } from 'drizzle-orm';

async function checkSonia() {
  try {
    // Buscar usuários com nome parecido com Sonia
    const soniaUsers = await db.select().from(users).where(like(users.name, '%onia%'));

    if (soniaUsers.length > 0) {
      console.log('Usuários encontrados com nome similar a Sonia:');
      soniaUsers.forEach(user => {
        console.log('\n=================================');
        console.log('Nome:', user.name);
        console.log('Email:', user.email);
        console.log('Status:', user.status);
        console.log('Role:', user.role);
        console.log('ID:', user.id);
        console.log('Criado em:', user.createdAt);
        console.log('=================================');
      });
    } else {
      console.log('Nenhum usuário com nome similar a Sonia encontrado.');
    }

    // Buscar todos os usuários pendentes
    console.log('\n\n📋 TODOS OS USUÁRIOS PENDENTES:');
    const pendingUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).where(eq(users.status, 'pending'));

    if (pendingUsers.length > 0) {
      pendingUsers.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - Status: ${user.status} - Role: ${user.role}`);
      });
    } else {
      console.log('Nenhum usuário pendente encontrado.');
    }

    // Listar todos os usuários do sistema
    console.log('\n\n📊 TODOS OS USUÁRIOS DO SISTEMA:');
    const allUsers = await db.select({
      name: users.name,
      email: users.email,
      status: users.status,
      role: users.role
    }).from(users);

    console.log(`Total: ${allUsers.length} usuários`);
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Status: ${user.status} - Role: ${user.role}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  }

  process.exit(0);
}

checkSonia();