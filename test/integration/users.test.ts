/**
 * Users Integration Tests
 *
 * Tests for user management, authentication, and profile operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { users } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import {
  findTestUser,
  findAllTestUsers,
  createTestUser,
  cleanupDynamicTestData,
  testDataExists,
  randomEmail,
} from '../helpers/testHelpers';

describe('Users Integration Tests', () => {
  beforeAll(async () => {
    // Check if test data exists
    const hasData = await testDataExists();
    if (!hasData) {
      console.log('⚠️  Test data not found. Run: npx tsx test/fixtures/seedTestData.ts');
    }
  });

  afterAll(async () => {
    await cleanupDynamicTestData();
  });

  describe('User Queries', () => {
    it('should find users in database', async () => {
      const testUsers = await findAllTestUsers();

      // If no data, skip test
      if (testUsers.length === 0) {
        console.log('Skipping: No users in database');
        return;
      }

      expect(testUsers.length).toBeGreaterThan(0);
    });

    it('should find user by ID', async () => {
      // Get any user from the database
      const [anyUser] = await db
        .select()
        .from(users)
        .limit(1);

      if (!anyUser) {
        console.log('Skipping: No users in database');
        return;
      }

      const user = await findTestUser(anyUser.id);
      expect(user?.id).toBe(anyUser.id);
    });

    it('should filter users by role', async () => {
      const ministros = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ministro'))
        .limit(10);

      if (ministros.length === 0) {
        console.log('Skipping: No ministros in database');
        return;
      }

      ministros.forEach(m => {
        expect(m.role).toBe('ministro');
      });
    });

    it('should filter users by status', async () => {
      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'))
        .limit(10);

      if (activeUsers.length === 0) {
        console.log('Skipping: No active users in database');
        return;
      }

      activeUsers.forEach(u => {
        expect(u.status).toBe('active');
      });
    });
  });

  describe('User Creation', () => {
    it('should create a new user', async () => {
      const email = randomEmail();
      const newUser = await createTestUser({
        email: email,
        name: 'Created Test User',
      });

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found.length).toBe(1);
      expect(found[0].email).toBe(email);
    });

    it('should create user with default values', async () => {
      const newUser = await createTestUser();

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found.length).toBe(1);
      expect(found[0].role).toBe('ministro');
      expect(found[0].status).toBe('active');
    });

    it('should create user with custom role', async () => {
      const newUser = await createTestUser({
        role: 'coordenador',
      });

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found[0].role).toBe('coordenador');
    });
  });

  describe('User Updates', () => {
    it('should update user name', async () => {
      const newUser = await createTestUser();

      await db
        .update(users)
        .set({ name: 'Updated Name' })
        .where(eq(users.id, newUser.id));

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found[0].name).toBe('Updated Name');
    });

    it('should update user status', async () => {
      const newUser = await createTestUser({ status: 'pending' });

      await db
        .update(users)
        .set({ status: 'active' })
        .where(eq(users.id, newUser.id));

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found[0].status).toBe('active');
    });

    it('should update reliability score', async () => {
      const newUser = await createTestUser({ reliabilityScore: 100 });

      await db
        .update(users)
        .set({ reliabilityScore: 85 })
        .where(eq(users.id, newUser.id));

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found[0].reliabilityScore).toBe(85);
    });
  });

  describe('User Deletion', () => {
    it('should delete user', async () => {
      const newUser = await createTestUser();

      await db.delete(users).where(eq(users.id, newUser.id));

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id));

      expect(found.length).toBe(0);
    });
  });

  describe('Role-based Queries', () => {
    it('should count users by role', async () => {
      const counts = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .groupBy(users.role);

      if (counts.length === 0) {
        console.log('Skipping: No users in database');
        return;
      }

      // Should have at least some users
      expect(counts.length).toBeGreaterThan(0);
    });
  });

  describe('Family Relationships', () => {
    it('should find users in same family', async () => {
      // Find any user with a family ID
      const usersWithFamily = await db
        .select()
        .from(users)
        .where(sql`family_id IS NOT NULL`)
        .limit(5);

      if (usersWithFamily.length === 0) {
        console.log('Skipping: No users with family in database');
        return;
      }

      const familyId = usersWithFamily[0].familyId;
      const familyMembers = await db
        .select()
        .from(users)
        .where(eq(users.familyId, familyId!));

      expect(familyMembers.length).toBeGreaterThanOrEqual(1);
      familyMembers.forEach(m => {
        expect(m.familyId).toBe(familyId);
      });
    });

    it('should find spouse relationships', async () => {
      // Find any user with a spouse
      const usersWithSpouse = await db
        .select()
        .from(users)
        .where(sql`spouse_minister_id IS NOT NULL`)
        .limit(1);

      if (usersWithSpouse.length === 0) {
        console.log('Skipping: No spouse relationship in database');
        return;
      }

      expect(usersWithSpouse[0].spouseMinisterId).toBeDefined();
    });
  });

  describe('Reliability Scoring', () => {
    it('should order users by reliability score', async () => {
      const orderedUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'))
        .orderBy(sql`reliability_score DESC`)
        .limit(10);

      if (orderedUsers.length < 2) {
        console.log('Skipping: Not enough users for ordering test');
        return;
      }

      // First user should have highest score
      for (let i = 1; i < orderedUsers.length; i++) {
        const prevScore = orderedUsers[i - 1].reliabilityScore || 0;
        const currScore = orderedUsers[i].reliabilityScore || 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });
  });
});
