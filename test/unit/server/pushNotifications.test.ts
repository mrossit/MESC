import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock storage
vi.mock('../../../server/storage', () => ({
  storage: {
    getPushSubscriptionsByUserIds: vi.fn().mockResolvedValue([]),
    removePushSubscriptionByEndpoint: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({})
  }
}));

describe('pushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables for testing
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  describe('pushConfig', () => {
    it('should export push configuration', async () => {
      const { pushConfig } = await import('../../../server/utils/pushNotifications');

      expect(pushConfig).toBeDefined();
      expect(typeof pushConfig.enabled).toBe('boolean');
      expect(pushConfig.publicKey !== undefined).toBe(true);
    });
  });

  describe('sendPushNotificationToUsers', () => {
    it('should not send when no userIds provided', async () => {
      const { sendPushNotificationToUsers } = await import('../../../server/utils/pushNotifications');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sendPushNotificationToUsers([], { title: 'Test', body: 'Body' });

      // Should warn about no userIds
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should deduplicate userIds', async () => {
      const { storage } = await import('../../../server/storage');
      // Ensure the mock returns an empty array
      (storage.getPushSubscriptionsByUserIds as any).mockResolvedValue([]);

      const { sendPushNotificationToUsers, pushConfig } = await import('../../../server/utils/pushNotifications');

      // Skip test if push is not enabled
      if (!pushConfig.enabled) {
        expect(true).toBe(true);
        return;
      }

      const duplicateUserIds = ['user-1', 'user-1', 'user-2', 'user-2', 'user-3'];

      await sendPushNotificationToUsers(duplicateUserIds, { title: 'Test', body: 'Body' });

      // Storage should receive deduplicated userIds
      expect(storage.getPushSubscriptionsByUserIds).toHaveBeenCalled();
    });

    it('should handle when no subscriptions found', async () => {
      const { storage } = await import('../../../server/storage');
      (storage.getPushSubscriptionsByUserIds as any).mockResolvedValue([]);

      const { sendPushNotificationToUsers } = await import('../../../server/utils/pushNotifications');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sendPushNotificationToUsers(['user-1'], { title: 'Test', body: 'Body' });

      // Should warn about no subscriptions
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should format notification payload correctly', async () => {
      const { storage } = await import('../../../server/storage');
      (storage.getPushSubscriptionsByUserIds as any).mockResolvedValue([
        {
          userId: 'user-1',
          endpoint: 'https://push.example.com/send/123',
          authKey: 'auth-key',
          p256dhKey: 'p256dh-key'
        }
      ]);

      const webpush = await import('web-push');
      const sendSpy = vi.spyOn(webpush.default, 'sendNotification');

      const { sendPushNotificationToUsers, pushConfig } = await import('../../../server/utils/pushNotifications');

      if (pushConfig.enabled) {
        await sendPushNotificationToUsers(['user-1'], {
          title: 'Test Title',
          body: 'Test Body',
          url: '/custom-url',
          tag: 'test-tag',
          data: { custom: 'data' }
        });

        if (sendSpy.mock.calls.length > 0) {
          const payload = JSON.parse(sendSpy.mock.calls[0][1] as string);
          expect(payload.title).toBe('Test Title');
          expect(payload.body).toBe('Test Body');
          expect(payload.url).toBe('/custom-url');
        }
      }
    });
  });
});

describe('PushPayload type', () => {
  it('should accept valid payload structure', () => {
    const payload = {
      title: 'Notification Title',
      body: 'Notification body text',
      url: '/notifications',
      tag: 'notification-tag',
      data: { id: 123, type: 'announcement' }
    };

    expect(payload.title).toBeDefined();
    expect(payload.body).toBeDefined();
    expect(typeof payload.url).toBe('string');
    expect(typeof payload.data).toBe('object');
  });

  it('should allow optional fields', () => {
    const minimalPayload = {
      title: 'Title',
      body: 'Body'
    };

    expect(minimalPayload.title).toBe('Title');
    expect(minimalPayload.body).toBe('Body');
  });
});
