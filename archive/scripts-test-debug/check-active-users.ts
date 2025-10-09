import { db } from '../server/db.js';
import { users } from '../shared/schema.js';

async function checkActiveUsers() {
  console.log('🔍 Verificando usuários ativos no banco...\n');

  const allUsers = await db.select().from(users);

  console.log(`Total de usuários: ${allUsers.length}\n`);

  const byStatus = allUsers.reduce((acc: any, user) => {
    const status = user.status || 'undefined';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  console.log('Usuários por status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  const activeUser = allUsers.find(u => u.status === 'active');

  if (activeUser) {
    console.log(`\n✅ Usuário ativo encontrado: ${activeUser.name} (${activeUser.username}) - Role: ${activeUser.role}`);
  } else {
    console.log('\n❌ Nenhum usuário com status "active" encontrado');
    console.log('\nPrimeiros 5 usuários:');
    allUsers.slice(0, 5).forEach(u => {
      console.log(`  - ${u.name} (${u.username}) - Status: ${u.status || 'undefined'} - Role: ${u.role}`);
    });
  }
}

checkActiveUsers().catch(console.error);
