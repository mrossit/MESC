#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';

async function createReitor() {
  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash('reitor2025', 10);

    // Dados do reitor
    const reitor = {
      email: 'padre.antonio@paroquia.com',
      name: 'Pe. Antônio Carlos',
      passwordHash: hashedPassword,
      role: 'reitor' as const,
      status: 'active' as const,
      phone: '(11) 98765-4300',
      preferredPosition: null,
      preferredTimes: ['8h', '10h', '19h'],
      availableForSpecialEvents: true,
      canServeAsCouple: false,
      specialSkills: 'Celebração, Homilia, Confissão, Direção Espiritual',
      liturgicalTraining: true,
      experience: '15 anos de sacerdócio, 5 anos como pároco',
      observations: 'Pároco responsável pela paróquia'
    };

    try {
      const [created] = await db.insert(users).values(reitor).returning();
      console.log('✅ Reitor criado com sucesso!');
      console.log(`   Nome: ${reitor.name}`);
      console.log(`   Email: ${reitor.email}`);
      console.log(`   Senha: reitor2025`);
      console.log(`   Role: ${reitor.role}`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('⚠️  Reitor já existe');
      } else {
        console.error('❌ Erro ao criar reitor:', error.message);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

createReitor();