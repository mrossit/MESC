import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const sqlite = new Database('local.db');

async function createLocalUser() {
  console.log('🔐 Criando usuário local para desenvolvimento...\n');

  const email = 'admin@local.dev';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  try {
    // Check if user exists
    const existingUser = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existingUser) {
      console.log('⚠️  Usuário já existe, atualizando senha...');

      const stmt = sqlite.prepare(`
        UPDATE users
        SET password = ?, status = 'active', mustChangePassword = 0
        WHERE email = ?
      `);
      stmt.run(hashedPassword, email);

      console.log('✅ Senha atualizada!');
    } else {
      // Create new user
      const stmt = sqlite.prepare(`
        INSERT INTO users (id, email, password, name, role, status, mustChangePassword)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(userId, email, hashedPassword, 'Administrador Local', 'coordenador', 'active', 0);

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