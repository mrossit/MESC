/**
 * Utilitário de Criptografia para Dados Sensíveis
 *
 * LGPD Art. 11: Tratamento de dados sensíveis (religiosos)
 * Implementa criptografia AES-256-GCM para dados sacramentais
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Obtém a chave de criptografia do ambiente
 * IMPORTANTE: ENCRYPTION_KEY deve ter 32 bytes (256 bits)
 */
function getEncryptionKey(): Buffer {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      '🔴 CRITICAL: ENCRYPTION_KEY environment variable is required!\n' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const key = process.env.ENCRYPTION_KEY;

  // Verificar se a chave tem 64 caracteres hex (32 bytes)
  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Current length: ${key.length}`
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Criptografa um texto usando AES-256-GCM
 *
 * @param text - Texto a ser criptografado
 * @returns String codificada contendo: IV:AuthTag:Ciphertext (todos em hex)
 *
 * @example
 * const encrypted = encrypt("Paróquia São Judas Tadeu");
 * // Retorna: "a1b2c3d4e5f6....:f7e8d9c0a1b2....:9f8e7d6c5b4a...."
 */
export function encrypt(text: string | null | undefined): string | null {
  // Se o valor já estiver vazio, retornar null
  if (!text || text.trim() === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();

    // Gerar IV aleatório (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Criar cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Criptografar
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Obter authentication tag (GCM)
    const authTag = cipher.getAuthTag();

    // Retornar no formato: IV:AuthTag:Ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Descriptografa um texto criptografado com AES-256-GCM
 *
 * @param encryptedText - String no formato IV:AuthTag:Ciphertext
 * @returns Texto original descriptografado
 *
 * @example
 * const decrypted = decrypt("a1b2c3d4e5f6....:f7e8d9c0a1b2....:9f8e7d6c5b4a....");
 * // Retorna: "Paróquia São Judas Tadeu"
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  // Se o valor for null/undefined/vazio, retornar null
  if (!encryptedText || encryptedText.trim() === '') {
    return null;
  }

  // Se o texto não está no formato esperado (plaintext antigo), retornar como está
  // Isso permite migração gradual de dados existentes
  if (!encryptedText.includes(':')) {
    console.warn('⚠️  Attempted to decrypt non-encrypted data (plaintext detected)');
    return encryptedText; // Retornar plaintext para compatibilidade
  }

  try {
    const key = getEncryptionKey();

    // Separar IV:AuthTag:Ciphertext
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error(`Invalid encrypted format. Expected 3 parts, got ${parts.length}`);
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Criar decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Descriptografar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Verifica se um texto está criptografado
 *
 * @param text - Texto a verificar
 * @returns true se estiver criptografado, false caso contrário
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text) return false;

  // Formato esperado: IV(32 hex):AuthTag(32 hex):Ciphertext(variable)
  const parts = text.split(':');

  if (parts.length !== 3) return false;

  // Verificar se as partes são hexadecimais válidas
  const isHex = /^[0-9a-f]+$/i;

  return (
    parts[0].length === IV_LENGTH * 2 &&        // IV tem 16 bytes = 32 hex chars
    parts[1].length === AUTH_TAG_LENGTH * 2 &&  // AuthTag tem 16 bytes = 32 hex chars
    isHex.test(parts[0]) &&
    isHex.test(parts[1]) &&
    isHex.test(parts[2])
  );
}

/**
 * Criptografa apenas se o texto ainda não estiver criptografado
 * Útil para migração gradual de dados
 *
 * @param text - Texto a ser criptografado (se necessário)
 * @returns Texto criptografado ou já criptografado
 */
export function encryptIfNeeded(text: string | null | undefined): string | null {
  if (!text) return null;

  if (isEncrypted(text)) {
    return text; // Já está criptografado
  }

  return encrypt(text);
}

/**
 * Gera uma nova chave de criptografia (para uso em scripts)
 * NÃO usar em produção! Apenas para geração inicial da chave
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Teste de encriptação/decriptação
 * Útil para validar que a ENCRYPTION_KEY está correta
 */
export function testEncryption(): boolean {
  try {
    const testData = 'Paróquia São Judas Tadeu - Teste LGPD';

    const encrypted = encrypt(testData);
    if (!encrypted) return false;

    const decrypted = decrypt(encrypted);
    if (!decrypted) return false;

    const match = decrypted === testData;

    if (match) {
      console.log('✅ Encryption test PASSED');
    } else {
      console.error('❌ Encryption test FAILED: decrypted data does not match');
    }

    return match;
  } catch (error) {
    console.error('❌ Encryption test FAILED:', error);
    return false;
  }
}
