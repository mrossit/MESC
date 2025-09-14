#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function createTempAdmin() {
  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash('september2024', 10);

    // Verificar se já existe
    const [existing] = await db.select().from(users)
      .where(eq(users.email, 'temp-admin@paroquia.com'));

    if (existing) {
      // Atualizar senha
      await db.update(users)
        .set({
          passwordHash: hashedPassword,
          role: 'coordenador'
        })
        .where(eq(users.email, 'temp-admin@paroquia.com'));

      console.log('✅ Usuário admin temporário atualizado!');
    } else {
      // Criar novo usuário
      await db.insert(users).values({
        email: 'temp-admin@paroquia.com',
        passwordHash: hashedPassword,
        name: 'Admin Temporário',
        role: 'coordenador',
        status: 'active'
      });

      console.log('✅ Usuário admin temporário criado!');
    }

    console.log('Email: temp-admin@paroquia.com');
    console.log('Senha: september2024');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createTempAdmin();