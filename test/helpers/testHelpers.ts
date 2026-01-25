/**
 * Test Helpers
 *
 * Utility functions for integration tests
 */

import { db } from '../../server/db';
import { users, schedules, questionnaires, substitutionRequests, badges, userPoints } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { TEST_IDS, TEST_USERS } from '../fixtures/testData';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Track created test data IDs for cleanup
const createdTestIds = {
  users: new Set<string>(),
  schedules: new Set<string>(),
  substitutions: new Set<string>(),
};

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(userId: string, role: string = 'ministro'): string {
  return jwt.sign(
    {
      id: userId,
      role: role,
      email: `${userId}@test.com`,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Get auth headers for a test user
 */
export function getAuthHeaders(userId: string, role: string = 'ministro'): Record<string, string> {
  const token = generateTestToken(userId, role);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Get auth headers for gestor
 */
export function getGestorHeaders(): Record<string, string> {
  return getAuthHeaders(TEST_IDS.gestor1, 'gestor');
}

/**
 * Get auth headers for coordenador
 */
export function getCoordenadorHeaders(): Record<string, string> {
  return getAuthHeaders(TEST_IDS.coordenador1, 'coordenador');
}

/**
 * Get auth headers for ministro
 */
export function getMinistroHeaders(): Record<string, string> {
  return getAuthHeaders(TEST_IDS.ministro1, 'ministro');
}

/**
 * Find a test user by ID
 */
export async function findTestUser(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  return user;
}

/**
 * Find all test users (limited for testing)
 */
export async function findAllTestUsers() {
  return db
    .select()
    .from(users)
    .limit(20);
}

/**
 * Find test schedules (limited for testing)
 */
export async function findTestSchedules() {
  return db
    .select()
    .from(schedules)
    .limit(20);
}

/**
 * Find test questionnaires (limited for testing)
 */
export async function findTestQuestionnaires() {
  return db
    .select()
    .from(questionnaires)
    .limit(20);
}

/**
 * Find test substitutions (limited for testing)
 */
export async function findTestSubstitutions() {
  return db
    .select()
    .from(substitutionRequests)
    .limit(20);
}

/**
 * Create a test user directly in DB
 */
export async function createTestUser(overrides: Partial<typeof TEST_USERS[0]> = {}) {
  const testUser = {
    id: uuidv4(),
    email: `dynamic-${Date.now()}@test.com`,
    passwordHash: '$2b$10$test',
    name: 'Dynamic Test User',
    role: 'ministro' as const,
    status: 'active' as const,
    ...overrides,
  };

  await db.insert(users).values(testUser);
  createdTestIds.users.add(testUser.id);
  return testUser;
}

/**
 * Create a test schedule directly in DB
 */
export async function createTestSchedule(overrides: Partial<{
  id: string;
  date: string;
  time: string;
  ministerId: string;
  position: number;
  status: string;
}> = {}) {
  // Get a valid minister ID from the database
  let ministerId = overrides.ministerId;
  if (!ministerId) {
    const [minister] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ministro'))
      .limit(1);
    ministerId = minister?.id;
    if (!ministerId) {
      throw new Error('No minister found in database to create test schedule');
    }
  }

  const schedule = {
    id: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    type: 'missa' as const,
    ministerId: ministerId,
    position: 1,
    status: 'scheduled',
    createdAt: new Date(),
    ...overrides,
  };

  await db.insert(schedules).values(schedule);
  createdTestIds.schedules.add(schedule.id);
  return schedule;
}

/**
 * Create a test substitution request
 */
export async function createTestSubstitution(overrides: Partial<{
  id: string;
  scheduleId: string;
  requesterId: string;
  substituteId: string | null;
  status: string;
  reason: string;
}> = {}) {
  // Get a valid schedule and requester from the database if not provided
  let scheduleId = overrides.scheduleId;
  let requesterId = overrides.requesterId;

  if (!scheduleId) {
    const [schedule] = await db
      .select()
      .from(schedules)
      .limit(1);
    scheduleId = schedule?.id;
    if (!scheduleId) {
      throw new Error('No schedule found in database to create test substitution');
    }
  }

  if (!requesterId) {
    const [minister] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ministro'))
      .limit(1);
    requesterId = minister?.id;
    if (!requesterId) {
      throw new Error('No minister found in database to create test substitution');
    }
  }

  const substitution = {
    id: uuidv4(),
    scheduleId: scheduleId,
    requesterId: requesterId,
    substituteId: null,
    status: 'available' as const,
    urgency: 'medium' as const,
    reason: 'Test reason',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  await db.insert(substitutionRequests).values(substitution);
  createdTestIds.substitutions.add(substitution.id);
  return substitution;
}

/**
 * Clean up dynamically created test data
 */
export async function cleanupDynamicTestData() {
  // Delete substitutions first (foreign key constraints)
  for (const id of createdTestIds.substitutions) {
    try {
      await db.delete(substitutionRequests).where(eq(substitutionRequests.id, id));
    } catch (e) {
      // Ignore errors - record might already be deleted
    }
  }
  createdTestIds.substitutions.clear();

  // Delete schedules
  for (const id of createdTestIds.schedules) {
    try {
      await db.delete(schedules).where(eq(schedules.id, id));
    } catch (e) {
      // Ignore errors - record might already be deleted
    }
  }
  createdTestIds.schedules.clear();

  // Delete users
  for (const id of createdTestIds.users) {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (e) {
      // Ignore errors - record might already be deleted
    }
  }
  createdTestIds.users.clear();
}

/**
 * Check if test data exists in database
 * Returns true if any users exist in the database
 */
export async function testDataExists(): Promise<boolean> {
  const [user] = await db
    .select()
    .from(users)
    .limit(1);
  return !!user;
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return false;
}

/**
 * Mock date for testing time-sensitive operations
 */
export function mockDate(date: Date | string) {
  const mockDate = new Date(date);
  const originalDate = global.Date;

  // @ts-ignore
  global.Date = class extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockDate.getTime());
      } else {
        // @ts-ignore
        super(...args);
      }
    }

    static now() {
      return mockDate.getTime();
    }
  };

  return () => {
    global.Date = originalDate;
  };
}

/**
 * Get upcoming Sunday date
 */
export function getNextSunday(): string {
  const date = new Date();
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Get a date N days from now
 */
export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Assert response is successful JSON
 */
export function assertSuccessResponse(response: any) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/**
 * Assert response is error
 */
export function assertErrorResponse(response: any, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Generate a random string for unique test data
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a random email for testing
 */
export function randomEmail(): string {
  return `test-${randomString()}@test.com`;
}

/**
 * Deep clone an object (useful for modifying test data)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare dates ignoring time
 */
export function sameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1).toISOString().split('T')[0];
  const d2 = new Date(date2).toISOString().split('T')[0];
  return d1 === d2;
}

/**
 * Calculate hours between two dates
 */
export function hoursBetween(date1: Date | string, date2: Date | string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs(d2 - d1) / (1000 * 60 * 60);
}
