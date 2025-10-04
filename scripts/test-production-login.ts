import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function testLogin() {
  console.log('🔐 Testando login no banco de produção...\n');

  // Buscar um coordenador para teste
  const [coordinator] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'coordenador'))
    .limit(1);

  if (!coordinator) {
    console.log('❌ Nenhum coordenador encontrado');
    return;
  }

  console.log('👤 Usuário encontrado:');
  console.log(`   Nome: ${coordinator.name}`);
  console.log(`   Email: ${coordinator.email}`);
  console.log(`   Role: ${coordinator.role}`);
  console.log(`   Status: ${coordinator.status}`);
  console.log(`   Tem passwordHash: ${!!coordinator.passwordHash}`);
  console.log(`   PasswordHash (primeiros 20 chars): ${coordinator.passwordHash?.substring(0, 20)}...`);

  // Verificar estrutura
  console.log('\n📋 Campos disponíveis no objeto user:');
  console.log(Object.keys(coordinator).join(', '));

  // Tentar verificar senha (se soubermos alguma senha de teste)
  console.log('\n🔍 Testando bcrypt com hash:');
  const testPassword = 'teste123';
  try {
    const isValid = await bcrypt.compare(testPassword, coordinator.passwordHash);
    console.log(`   Senha "${testPassword}" válida: ${isValid}`);
  } catch (error: any) {
    console.log(`   ❌ Erro ao testar senha: ${error.message}`);
  }

  // Contar todos os usuários com passwordHash válido
  const allUsers = await db.select().from(users);
  const withHash = allUsers.filter(u => u.passwordHash && u.passwordHash.length > 20);

  console.log(`\n📊 Total de usuários: ${allUsers.length}`);
  console.log(`   Com passwordHash válido: ${withHash.length}`);
  console.log(`   Sem passwordHash: ${allUsers.length - withHash.length}`);

  process.exit(0);
}

testLogin().catch(console.error);
