import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const sqlite = new Database('local.db');

async function testLogin() {
  const email = 'rossit@icloud.com';
  const password = '123Pegou$&@';

  try {
    const user = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (isValidPassword) {
      console.log('✅ Login bem-sucedido!');
      console.log('Usuário:', user.email);
      console.log('Nome:', user.name);
      console.log('Perfil:', user.role);
      console.log('Status:', user.status);
    } else {
      console.log('❌ Senha incorreta');
    }

  } catch (error) {
    console.error('Erro:', error);
  }

  sqlite.close();
}

testLogin();
