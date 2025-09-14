import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const sqlite = new Database('local.db');
const db = drizzle(sqlite, { schema });

async function createRossitUser() {
  const email = 'rossit@icloud.com';
  const password = '123Pegou$&@';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const existingUser = db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get();

    if (existingUser) {
      db.update(schema.users)
        .set({
          password: hashedPassword,
          status: 'active',
          mustChangePassword: false,
          role: 'coordenador'
        })
        .where(eq(schema.users.email, email))
        .run();
      console.log('✅ Usuário atualizado!');
    } else {
      const userId = uuidv4();
      db.insert(schema.users).values({
        id: userId,
        email,
        password: hashedPassword,
        name: 'Coordenador Rossit',
        role: 'coordenador',
        status: 'active',
        mustChangePassword: false
      }).run();
      console.log('✅ Usuário criado!');
    }

    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log('Perfil: coordenador');

  } catch (error) {
    console.error('Erro:', error);
  }

  sqlite.close();
}

createRossitUser();
