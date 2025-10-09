import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkUser() {
  try {
    // Buscar o usuário rossit@icloud.com
    const [user] = await db.select().from(users).where(eq(users.email, 'rossit@icloud.com'));

    if (user) {
      console.log('Usuário encontrado:');
      console.log('- Nome:', user.name);
      console.log('- Email:', user.email);
      console.log('- Status:', user.status);
      console.log('- Role:', user.role);
      console.log('- Criado em:', user.createdAt);
      console.log('\nNOTA: A senha original do usuário NÃO pode ser recuperada (está hasheada)');
      console.log('Se você esqueceu a senha, você pode:');
      console.log('1. Usar a funcionalidade "Esqueci minha senha" na tela de login');
      console.log('2. Ou criar uma nova senha via script administrativo');
    } else {
      console.log('❌ Usuário rossit@icloud.com NÃO foi encontrado no banco de dados');
      console.log('\nVerificando todos os usuários existentes...');

      const allUsers = await db.select({
        email: users.email,
        name: users.name,
        status: users.status
      }).from(users);

      console.log(`\nTotal de usuários no banco: ${allUsers.length}`);
      allUsers.forEach(u => {
        console.log(`- ${u.email} (${u.name}) - Status: ${u.status}`);
      });
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
  }

  process.exit(0);
}

checkUser();