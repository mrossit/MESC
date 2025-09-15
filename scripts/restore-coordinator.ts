import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function restoreCoordinator() {
  await db.update(users)
    .set({ role: 'coordenador' })
    .where(eq(users.email, 'coordenador@test.com'));

  console.log('✅ Usuário coordenador@test.com restaurado para role: coordenador');
  process.exit(0);
}

restoreCoordinator();