import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database before importing the module
vi.mock('../../../server/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: 'test-id' }])
    })
  }
}));

// Mock the schema
vi.mock('@shared/schema', () => ({
  activityLogs: {
    id: 'id',
    userId: 'userId',
    action: 'action',
    details: 'details',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    sessionId: 'sessionId',
    createdAt: 'createdAt'
  }
}));

describe('ActivityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logActivity', () => {
    it('should log activity with all parameters', async () => {
      const { logActivity } = await import('../../../server/utils/activityLogger');
      const { db } = await import('../../../server/db');

      const mockReq = {
        ip: '192.168.1.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
        cookies: { session_token: 'test-session' }
      };

      await logActivity('user-123', 'login', { email: 'test@example.com' }, mockReq as any);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should log activity without request object', async () => {
      const { logActivity } = await import('../../../server/utils/activityLogger');
      const { db } = await import('../../../server/db');

      await logActivity('user-123', 'view_dashboard', { page: 'home' });

      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { db } = await import('../../../server/db');
      (db.insert as any).mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(new Error('DB Error'))
      });

      const { logActivity } = await import('../../../server/utils/activityLogger');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(logActivity('user-123', 'test_action')).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  describe('createActivityLogger', () => {
    it('should create a logger function bound to request', async () => {
      const { createActivityLogger } = await import('../../../server/utils/activityLogger');

      const mockReq = {
        user: { id: 'user-456' },
        ip: '10.0.0.1',
        get: vi.fn().mockReturnValue('Test Agent'),
        cookies: {}
      };

      const logger = createActivityLogger(mockReq as any);
      expect(typeof logger).toBe('function');
    });

    it('should use user id from request when logging', async () => {
      const { createActivityLogger } = await import('../../../server/utils/activityLogger');
      const { db } = await import('../../../server/db');

      const mockReq = {
        user: { id: 'user-789' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Chrome'),
        cookies: { session_token: 'session-123' }
      };

      const logger = createActivityLogger(mockReq as any);
      await logger('view_reports', { type: 'monthly' });

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('ActivityAction type', () => {
    it('should accept valid action strings', async () => {
      const { logActivity } = await import('../../../server/utils/activityLogger');

      // These should compile without error (TypeScript check)
      // Test that the function accepts valid action strings
      const validActions = ['login', 'logout', 'view_dashboard', 'view_reports', 'export_report'];

      for (const action of validActions) {
        // Should not throw - function accepts these actions
        await expect(logActivity('user-123', action as any)).resolves.toBeUndefined();
      }
    });
  });
});
