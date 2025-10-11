/**
 * Test Accounts Seed - DEV MODE ONLY
 * Creates test accounts with different roles for quick testing
 */

import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const TEST_ACCOUNTS = [
  {
    email: 'test.ministro@test.com',
    name: 'Ministro Teste',
    role: 'ministro' as const,
    password: 'test123',
    phone: '15999999001',
    status: 'active' as const
  },
  {
    email: 'test.coord@test.com',
    name: 'Coordenador Teste',
    role: 'coordenador' as const,
    password: 'test123',
    phone: '15999999002',
    status: 'active' as const
  },
  {
    email: 'test.gestor@test.com',
    name: 'Gestor Teste',
    role: 'gestor' as const,
    password: 'test123',
    phone: '15999999003',
    status: 'active' as const
  }
];

export async function seedTestAccounts() {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    console.log('[TEST ACCOUNTS] Skipping - only available in development mode');
    return;
  }

  console.log('[TEST ACCOUNTS] Creating test accounts...');

  for (const account of TEST_ACCOUNTS) {
    try {
      // Check if account already exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      if (existing) {
        console.log(`[TEST ACCOUNTS] ✓ ${account.email} already exists (${account.role})`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(account.password, 10);

      // Create user
      await db.insert(users).values({
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
        phone: account.phone,
        status: account.status,
        createdAt: new Date()
      });

      console.log(`[TEST ACCOUNTS] ✓ Created ${account.email} (${account.role})`);
    } catch (error) {
      console.error(`[TEST ACCOUNTS] ✗ Error creating ${account.email}:`, error);
    }
  }

  console.log('[TEST ACCOUNTS] Test accounts seeding complete!');
  console.log('[TEST ACCOUNTS] Credentials:');
  console.log('[TEST ACCOUNTS]   • test.ministro@test.com / test123');
  console.log('[TEST ACCOUNTS]   • test.coord@test.com / test123');
  console.log('[TEST ACCOUNTS]   • test.gestor@test.com / test123');
}

// Allow running directly with tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestAccounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding test accounts:', error);
      process.exit(1);
    });
}
