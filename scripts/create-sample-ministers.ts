#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';

async function createSampleMinisters() {
  try {
    // Hash da senha padrão
    const defaultPassword = await bcrypt.hash('ministro123', 10);

    // Lista de ministros de exemplo
    const ministers = [
      {
        email: 'joao.silva@paroquia.com',
        name: 'João Silva',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '(11) 98765-4321',
        preferredPosition: 1,
        preferredTimes: ['8h', '10h'],
        availableForSpecialEvents: true,
        canServeAsCouple: false,
        specialSkills: 'Leitura, Canto',
        liturgicalTraining: true,
        experience: '5 anos como ministro',
        observations: 'Disponível principalmente aos domingos pela manhã'
      },
      {
        email: 'maria.santos@paroquia.com',
        name: 'Maria Santos',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '(11) 98765-4322',
        preferredPosition: 2,
        preferredTimes: ['10h', '19h'],
        availableForSpecialEvents: true,
        canServeAsCouple: true,
        specialSkills: 'Coordenação, Organização',
        liturgicalTraining: true,
        experience: '8 anos como ministra',
        observations: 'Coordenadora experiente, pode ajudar na formação de novos ministros'
      },
      {
        email: 'pedro.oliveira@paroquia.com',
        name: 'Pedro Oliveira',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '(11) 98765-4323',
        preferredPosition: 5,
        preferredTimes: ['19h'],
        availableForSpecialEvents: false,
        canServeAsCouple: false,
        specialSkills: 'Acólito',
        liturgicalTraining: true,
        experience: '2 anos como ministro',
        observations: 'Disponível apenas nas missas noturnas'
      },
      {
        email: 'ana.costa@paroquia.com',
        name: 'Ana Costa',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '(11) 98765-4324',
        preferredPosition: 13,
        preferredTimes: ['8h'],
        availableForSpecialEvents: true,
        canServeAsCouple: false,
        specialSkills: 'Leitura, Distribuição',
        liturgicalTraining: true,
        experience: '3 anos como ministra',
        observations: 'Prefere servir no mezanino'
      },
      {
        email: 'carlos.rodrigues@paroquia.com',
        name: 'Carlos Rodrigues',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '(11) 98765-4325',
        preferredPosition: 9,
        preferredTimes: ['10h'],
        availableForSpecialEvents: true,
        canServeAsCouple: true,
        spouseUserId: null, // Será atualizado depois se necessário
        specialSkills: 'Purificação, Exposição',
        liturgicalTraining: true,
        experience: '6 anos como ministro',
        observations: 'Especialista em adoração e exposição do Santíssimo'
      },
      {
        email: 'lucia.ferreira@paroquia.com',
        name: 'Lúcia Ferreira',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'inactive' as const,
        phone: '(11) 98765-4326',
        preferredPosition: 7,
        preferredTimes: ['8h', '10h'],
        availableForSpecialEvents: false,
        canServeAsCouple: false,
        specialSkills: 'Procissão',
        liturgicalTraining: true,
        experience: '1 ano como ministra',
        observations: 'Temporariamente afastada por motivos pessoais'
      }
    ];

    console.log('Criando ministros de exemplo...\n');

    for (const minister of ministers) {
      try {
        const [created] = await db.insert(users).values(minister).returning();
        console.log(`✅ ${minister.name} criado com sucesso`);
        console.log(`   Email: ${minister.email}`);
        console.log(`   Senha: ministro123\n`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⚠️  ${minister.name} já existe (${minister.email})\n`);
        } else {
          console.error(`❌ Erro ao criar ${minister.name}:`, error.message, '\n');
        }
      }
    }

    console.log('========================================');
    console.log('Ministros de exemplo criados!');
    console.log('Senha padrão para todos: ministro123');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

createSampleMinisters();