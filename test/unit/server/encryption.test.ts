/**
 * Encryption Utility Tests
 *
 * Security-critical tests for AES-256-GCM encryption used for LGPD compliance.
 * Tests encryption, decryption, key validation, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Valid 32-byte (64 hex chars) encryption key for testing
const TEST_ENCRYPTION_KEY = 'a'.repeat(64);
const ORIGINAL_ENV = process.env;

describe('Encryption Utility', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Key Validation', () => {
    it('should throw error when ENCRYPTION_KEY is missing', async () => {
      delete process.env.ENCRYPTION_KEY;

      const { encrypt } = await import('../../../server/utils/encryption');

      // Error is wrapped in "Failed to encrypt data"
      expect(() => encrypt('test')).toThrow('Failed to encrypt data');
    });

    it('should throw error when ENCRYPTION_KEY is too short', async () => {
      process.env.ENCRYPTION_KEY = 'tooshort';

      const { encrypt } = await import('../../../server/utils/encryption');

      expect(() => encrypt('test')).toThrow(); // Throws because key is invalid
    });

    it('should throw error when ENCRYPTION_KEY is too long', async () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(100);

      const { encrypt } = await import('../../../server/utils/encryption');

      // Error is wrapped in "Failed to encrypt data"
      expect(() => encrypt('test')).toThrow('Failed to encrypt data');
    });

    it('should accept valid 64-character hex key', async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const { encrypt } = await import('../../../server/utils/encryption');

      expect(() => encrypt('test')).not.toThrow();
    });
  });

  describe('Encryption', () => {
    it('should encrypt text successfully', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      const encrypted = encrypt('Hello World');

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe('Hello World');
      expect(encrypted).toContain(':'); // Format: IV:AuthTag:Ciphertext
    });

    it('should produce different ciphertext for same plaintext (unique IV)', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      const encrypted1 = encrypt('Same text');
      const encrypted2 = encrypt('Same text');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return null for empty string', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      expect(encrypt('')).toBeNull();
      expect(encrypt('   ')).toBeNull();
    });

    it('should return null for null input', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      expect(encrypt(null)).toBeNull();
      expect(encrypt(undefined)).toBeNull();
    });

    it('should handle special characters', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const specialText = 'Olá! São Judas Tadeu - @#$%^&*()';
      const encrypted = encrypt(specialText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const unicodeText = '日本語テスト 🎉 مرحبا';
      const encrypted = encrypt(unicodeText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });

    it('should handle long text', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const longText = 'A'.repeat(10000);
      const encrypted = encrypt(longText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longText);
    });
  });

  describe('Decryption', () => {
    it('should decrypt text successfully', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const original = 'Secret Message';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should return null for empty encrypted text', async () => {
      const { decrypt } = await import('../../../server/utils/encryption');

      expect(decrypt('')).toBeNull();
      expect(decrypt('   ')).toBeNull();
      expect(decrypt(null)).toBeNull();
      expect(decrypt(undefined)).toBeNull();
    });

    it('should return plaintext for non-encrypted input (migration support)', async () => {
      const { decrypt } = await import('../../../server/utils/encryption');

      // Data without colons is considered plaintext
      const plaintext = 'LegacyPlaintext';
      const result = decrypt(plaintext);

      expect(result).toBe(plaintext);
    });

    it('should throw error for tampered ciphertext', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const encrypted = encrypt('Sensitive data');
      // Tamper with the encrypted data
      const parts = encrypted!.split(':');
      parts[2] = 'tampered' + parts[2].substring(8);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should throw error for tampered auth tag', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const encrypted = encrypt('Sensitive data');
      const parts = encrypted!.split(':');
      // Tamper with auth tag
      parts[1] = 'ff'.repeat(16);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should throw error for invalid format', async () => {
      const { decrypt } = await import('../../../server/utils/encryption');

      // Too few parts - wrapped in "Failed to decrypt data"
      expect(() => decrypt('only:two')).toThrow('Failed to decrypt data');

      // Too many parts
      expect(() => decrypt('too:many:parts:here')).toThrow('Failed to decrypt data');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted text', async () => {
      const { encrypt, isEncrypted } = await import('../../../server/utils/encryption');

      const encrypted = encrypt('Test data');

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', async () => {
      const { isEncrypted } = await import('../../../server/utils/encryption');

      expect(isEncrypted('plaintext')).toBe(false);
      expect(isEncrypted('text:with:colons:but:wrong')).toBe(false);
    });

    it('should return false for null/undefined', async () => {
      const { isEncrypted } = await import('../../../server/utils/encryption');

      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });

    it('should validate IV length (32 hex chars)', async () => {
      const { isEncrypted } = await import('../../../server/utils/encryption');

      // Valid format but wrong IV length
      const invalidIV = 'abc:' + 'a'.repeat(32) + ':' + 'a'.repeat(32);
      expect(isEncrypted(invalidIV)).toBe(false);

      // Correct IV length
      const validFormat = 'a'.repeat(32) + ':' + 'a'.repeat(32) + ':' + 'a'.repeat(32);
      expect(isEncrypted(validFormat)).toBe(true);
    });

    it('should validate AuthTag length (32 hex chars)', async () => {
      const { isEncrypted } = await import('../../../server/utils/encryption');

      // Valid format but wrong AuthTag length
      const invalidAuthTag = 'a'.repeat(32) + ':abc:' + 'a'.repeat(32);
      expect(isEncrypted(invalidAuthTag)).toBe(false);
    });

    it('should validate hex characters only', async () => {
      const { isEncrypted } = await import('../../../server/utils/encryption');

      // Non-hex characters
      const nonHex = 'g'.repeat(32) + ':' + 'a'.repeat(32) + ':' + 'a'.repeat(32);
      expect(isEncrypted(nonHex)).toBe(false);
    });
  });

  describe('encryptIfNeeded', () => {
    it('should encrypt plaintext', async () => {
      const { encryptIfNeeded, isEncrypted } = await import('../../../server/utils/encryption');

      const result = encryptIfNeeded('plaintext');

      expect(isEncrypted(result)).toBe(true);
    });

    it('should not double-encrypt already encrypted text', async () => {
      const { encrypt, encryptIfNeeded, decrypt } = await import('../../../server/utils/encryption');

      const original = 'Original text';
      const encrypted = encrypt(original);
      const result = encryptIfNeeded(encrypted);

      // Should be the same as the encrypted text
      expect(result).toBe(encrypted);

      // Should decrypt to original
      expect(decrypt(result)).toBe(original);
    });

    it('should return null for null/undefined', async () => {
      const { encryptIfNeeded } = await import('../../../server/utils/encryption');

      expect(encryptIfNeeded(null)).toBeNull();
      expect(encryptIfNeeded(undefined)).toBeNull();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate 64-character hex key', async () => {
      const { generateEncryptionKey } = await import('../../../server/utils/encryption');

      const key = generateEncryptionKey();

      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });

    it('should generate unique keys', async () => {
      const { generateEncryptionKey } = await import('../../../server/utils/encryption');

      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('testEncryption', () => {
    it('should return true when encryption is working', async () => {
      const { testEncryption } = await import('../../../server/utils/encryption');

      const result = testEncryption();

      expect(result).toBe(true);
    });

    it('should return false when encryption key is invalid', async () => {
      process.env.ENCRYPTION_KEY = 'invalid';

      // Clear module cache
      vi.resetModules();

      const { testEncryption } = await import('../../../server/utils/encryption');

      const result = testEncryption();

      expect(result).toBe(false);
    });
  });

  describe('Roundtrip Tests', () => {
    it('should successfully encrypt and decrypt various data types', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const testCases = [
        'Simple text',
        'Texto com acentos: ação, coração, pão',
        'Numbers: 123456789',
        'Email: test@example.com',
        'Phone: +55 (11) 99999-9999',
        'JSON: {"key": "value"}',
        '<html>Tags</html>',
        '   Whitespace   preserved   ',
        'Line\nbreaks\npreserved',
        'Tabs\tpreserved',
      ];

      for (const testCase of testCases) {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted);

        expect(decrypted).toBe(testCase);
      }
    });

    it('should handle empty string in data', async () => {
      const { encrypt, decrypt } = await import('../../../server/utils/encryption');

      const result = encrypt('');
      expect(result).toBeNull();

      // But whitespace-only should also return null
      expect(encrypt('   ')).toBeNull();
    });
  });

  describe('Security Properties', () => {
    it('should produce ciphertext longer than plaintext (includes IV and AuthTag)', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      const plaintext = 'Short';
      const encrypted = encrypt(plaintext);

      // Encrypted format: IV(32) + ':' + AuthTag(32) + ':' + Ciphertext
      // So minimum overhead is 65 chars (32 + 1 + 32 + variable ciphertext)
      expect(encrypted!.length).toBeGreaterThan(65);
    });

    it('should not contain plaintext in ciphertext', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      const plaintext = 'SensitiveDataThatShouldNotBeVisible';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toContain('Sensitive');
      expect(encrypted).not.toContain('ShouldNotBeVisible');
    });

    it('should use different IV for each encryption', async () => {
      const { encrypt } = await import('../../../server/utils/encryption');

      const encrypted1 = encrypt('Same text');
      const encrypted2 = encrypt('Same text');

      const iv1 = encrypted1!.split(':')[0];
      const iv2 = encrypted2!.split(':')[0];

      expect(iv1).not.toBe(iv2);
    });
  });
});

describe('Encryption Error Handling', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should handle missing environment gracefully in decrypt', async () => {
    // First encrypt with valid key
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const { encrypt } = await import('../../../server/utils/encryption');
    const encrypted = encrypt('test');

    // Now try to decrypt without key
    vi.resetModules();
    delete process.env.ENCRYPTION_KEY;

    const { decrypt } = await import('../../../server/utils/encryption');

    // Error is wrapped in "Failed to decrypt data"
    expect(() => decrypt(encrypted)).toThrow('Failed to decrypt data');
  });

  it('should handle key change between encrypt and decrypt', async () => {
    // Encrypt with key 1
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    const { encrypt } = await import('../../../server/utils/encryption');
    const encrypted = encrypt('test');

    // Try to decrypt with key 2
    vi.resetModules();
    process.env.ENCRYPTION_KEY = 'b'.repeat(64);

    const { decrypt } = await import('../../../server/utils/encryption');

    expect(() => decrypt(encrypted)).toThrow('Failed to decrypt data');
  });
});
