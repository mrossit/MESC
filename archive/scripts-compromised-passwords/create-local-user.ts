import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Use SQLite local
const sqlite = new Database('local.db');
const db = drizzle(sqlite, { schema });

async function createLocalUser() {
  console.log('🔐 Criando usuário local para desenvolvimento...\n');

  const email = 'admin@local.dev';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if user exists
    const existingUser = db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get();

    if (existingUser) {
      console.log('⚠️  Usuário já existe, atualizando senha...');

      db.update(schema.users)
        .set({
          password: hashedPassword,
          status: 'active',
          mustChangePassword: false
        })
        .where(eq(schema.users.email, email))
        .run();

      console.log('✅ Senha atualizada!');
    } else {
      // Create new user
      const userId = uuidv4();

      db.insert(schema.users).values({
        id: userId,
        email,
        password: hashedPassword,
        name: 'Administrador Local',
        role: 'coordenador',
        status: 'active',
        mustChangePassword: false
      }).run();

      console.log('✅ Usuário criado com sucesso!');
    }

    console.log('\n==================================================');
    console.log('🚀 CREDENCIAIS LOCAIS PARA DESENVOLVIMENTO');
    console.log('==================================================\n');
    console.log('📧 Email: admin@local.dev');
    console.log('🔐 Senha: admin123');
    console.log('🎭 Perfil: Coordenador (acesso total)');
    console.log('\n🌐 URL local: http://localhost:5173');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    process.exit(1);
  }

  sqlite.close();
}

createLocalUser();