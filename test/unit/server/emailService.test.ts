/**
 * Email Service Tests
 *
 * Tests for the email service supporting multiple providers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = process.env;

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock console
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock logger
vi.mock('../../../server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Provider Selection', () => {
    it('should default to console provider when no provider configured', async () => {
      delete process.env.EMAIL_PROVIDER;

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('console');
    });

    it('should fall back to console when resend key not configured', async () => {
      process.env.EMAIL_PROVIDER = 'resend';
      delete process.env.RESEND_API_KEY;

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('console');
    });

    it('should fall back to console when sendgrid key not configured', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      delete process.env.SENDGRID_API_KEY;

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('console');
    });

    it('should fall back to console when smtp not fully configured', async () => {
      process.env.EMAIL_PROVIDER = 'smtp';
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('console');
    });

    it('should use resend when properly configured', async () => {
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 're_test_key';

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('resend');
    });

    it('should use sendgrid when properly configured', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'SG.test_key';

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('sendgrid');
    });

    it('should use smtp when properly configured', async () => {
      process.env.EMAIL_PROVIDER = 'smtp';
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'password';

      const { getEmailProviderName } = await import('../../../server/services/emailService');

      expect(getEmailProviderName()).toBe('smtp');
    });
  });

  describe('Console Provider (Development)', () => {
    beforeEach(() => {
      process.env.EMAIL_PROVIDER = 'console';
    });

    it('should send email via console successfully', async () => {
      const { sendEmail } = await import('../../../server/services/emailService');

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('console-');
    });

    it('should log email content to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const { sendEmail } = await import('../../../server/services/emailService');

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body content',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('EMAIL'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });
  });

  describe('Resend Provider', () => {
    beforeEach(() => {
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.EMAIL_FROM = 'test@mesc.app';
    });

    it('should send email via Resend API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'resend-msg-123' }),
      });

      const { sendEmail } = await import('../../../server/services/emailService');

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend-msg-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer re_test_key',
          }),
        })
      );
    });

    it('should handle Resend API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      });

      const { sendEmail } = await import('../../../server/services/emailService');

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });
  });

  describe('SendGrid Provider', () => {
    beforeEach(() => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'SG.test_key';
      process.env.EMAIL_FROM = 'test@mesc.app';
    });

    it('should send email via SendGrid API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'sg-msg-123',
        },
      });

      const { sendEmail } = await import('../../../server/services/emailService');

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sg-msg-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer SG.test_key',
          }),
        })
      );
    });

    it('should handle SendGrid API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Unauthorized'),
      });

      const { sendEmail } = await import('../../../server/services/emailService');

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('Password Reset Email', () => {
    beforeEach(() => {
      process.env.EMAIL_PROVIDER = 'console';
      process.env.APP_URL = 'https://mesc.app';
    });

    it('should send password reset email with correct content', async () => {
      const { sendPasswordResetEmail } = await import('../../../server/services/emailService');

      const result = await sendPasswordResetEmail(
        'user@example.com',
        'João Silva',
        'TempPass123!'
      );

      expect(result.success).toBe(true);
    });

    it('should include user name in email', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const { sendPasswordResetEmail } = await import('../../../server/services/emailService');

      await sendPasswordResetEmail(
        'user@example.com',
        'João Silva',
        'TempPass123!'
      );

      // Check that the email content includes the user name
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('João Silva');
    });

    it('should include temporary password in email', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const { sendPasswordResetEmail } = await import('../../../server/services/emailService');

      await sendPasswordResetEmail(
        'user@example.com',
        'João Silva',
        'MyTempPass123!'
      );

      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('MyTempPass123!');
    });
  });

  describe('Schedule Notification Email', () => {
    beforeEach(() => {
      process.env.EMAIL_PROVIDER = 'console';
    });

    it('should send schedule notification email', async () => {
      const { sendScheduleNotificationEmail } = await import('../../../server/services/emailService');

      const result = await sendScheduleNotificationEmail(
        'user@example.com',
        'Maria Santos',
        '25 de Janeiro de 2026',
        '08:00',
        'Igreja Matriz'
      );

      expect(result.success).toBe(true);
    });

    it('should include schedule details in email', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const { sendScheduleNotificationEmail } = await import('../../../server/services/emailService');

      await sendScheduleNotificationEmail(
        'user@example.com',
        'Maria Santos',
        '25 de Janeiro de 2026',
        '08:00',
        'Igreja Matriz'
      );

      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Maria Santos');
      expect(logCalls).toContain('25 de Janeiro de 2026');
      expect(logCalls).toContain('08:00');
      expect(logCalls).toContain('Igreja Matriz');
    });
  });

  describe('isEmailConfigured', () => {
    it('should return false when no provider configured in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.EMAIL_PROVIDER;

      const { isEmailConfigured } = await import('../../../server/services/emailService');

      expect(isEmailConfigured()).toBe(false);
    });

    it('should return true in development even with console provider', async () => {
      process.env.NODE_ENV = 'development';
      process.env.EMAIL_PROVIDER = 'console';

      const { isEmailConfigured } = await import('../../../server/services/emailService');

      expect(isEmailConfigured()).toBe(true);
    });

    it('should return true when real provider configured', async () => {
      process.env.NODE_ENV = 'production';
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 're_test_key';

      const { isEmailConfigured } = await import('../../../server/services/emailService');

      expect(isEmailConfigured()).toBe(true);
    });
  });
});
