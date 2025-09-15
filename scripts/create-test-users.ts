import { db } from '../server/db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';

async function createTestUsers() {
  try {
    console.log('Creating test users...');

    const passwordHash = await bcrypt.hash('senha123', 10);

    const testUsers = [
      {
        email: 'joao.silva@test.com',
        name: 'João Silva',
        passwordHash,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11999999999',
        ministryStartDate: new Date('2020-01-01'),
      },
      {
        email: 'maria.santos@test.com',
        name: 'Maria Santos',
        passwordHash,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11888888888',
        ministryStartDate: new Date('2019-06-15'),
      },
      {
        email: 'pedro.oliveira@test.com',
        name: 'Pedro Oliveira',
        passwordHash,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11777777777',
        ministryStartDate: new Date('2021-03-20'),
      },
    ];

    for (const userData of testUsers) {
      try {
        await db.insert(users).values(userData);
        console.log(`✅ Created user: ${userData.name}`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`ℹ️  User ${userData.email} already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✨ Test users created successfully!');
  } catch (error) {
    console.error('Error creating test users:', error);
  }

  process.exit(0);
}

createTestUsers();