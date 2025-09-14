import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const sqlite = new Database('local.db');

async function createRossitUser() {
  const email = 'rossit@icloud.com';
  const password = '123Pegou$&@';
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  try {
    // Check if user exists
    const existingUser = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existingUser) {
      // Update existing user
      const stmt = sqlite.prepare(`
        UPDATE users 
        SET password = ?, status = ?, mustChangePassword = ?, role = ?
        WHERE email = ?
      `);
      stmt.run(hashedPassword, 'active', 0, 'coordenador', email);
      console.log('✅ Usuário atualizado!');
    } else {
      // Create new user
      const stmt = sqlite.prepare(`
        INSERT INTO users (id, email, password, name, role, status, mustChangePassword)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(userId, email, hashedPassword, 'Coordenador Rossit', 'coordenador', 'active', 0);
      console.log('✅ Usuário criado!');
    }

    console.log(`\nCredenciais:`);
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log('Perfil: coordenador');

  } catch (error) {
    console.error('Erro:', error);
  }

  sqlite.close();
}

createRossitUser();
