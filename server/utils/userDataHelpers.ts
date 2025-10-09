/**
 * Helpers para Manipulação de Dados de Usuários
 *
 * Facilita a criptografia/descriptografia automática de dados sensíveis
 * conforme LGPD Art. 11 (dados religiosos)
 */

import { encrypt, decrypt } from './encryption';

/**
 * Interface para dados de usuário com campos religiosos
 */
export interface UserReligiousData {
  baptismDate?: Date | string | null;
  baptismParish?: string | null;
  confirmationDate?: Date | string | null;
  confirmationParish?: string | null;
  marriageDate?: Date | string | null;
  marriageParish?: string | null;
}

/**
 * Interface para dados de usuário completos
 */
export interface UserData extends UserReligiousData {
  id?: string;
  email: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  photo?: string | null;
  role?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Criptografa campos religiosos antes de salvar no banco
 *
 * @param userData - Dados do usuário
 * @returns Dados com campos religiosos criptografados
 *
 * @example
 * const encryptedData = encryptReligiousFields({
 *   email: 'user@example.com',
 *   baptismParish: 'Paróquia São Judas Tadeu'
 * });
 * // baptismParish agora está criptografado
 */
export function encryptReligiousFields(userData: Partial<UserData>): Partial<UserData> {
  const encrypted = { ...userData };

  // Criptografar campos religiosos sensíveis
  if (userData.baptismParish) {
    encrypted.baptismParish = encrypt(userData.baptismParish);
  }

  if (userData.confirmationParish) {
    encrypted.confirmationParish = encrypt(userData.confirmationParish);
  }

  if (userData.marriageParish) {
    encrypted.marriageParish = encrypt(userData.marriageParish);
  }

  return encrypted;
}

/**
 * Descriptografa campos religiosos após ler do banco
 *
 * @param userData - Dados do usuário do banco
 * @returns Dados com campos religiosos descriptografados
 *
 * @example
 * const user = await db.select().from(users).where(...);
 * const decryptedUser = decryptReligiousFields(user);
 * // baptismParish agora está em plaintext para exibição
 */
export function decryptReligiousFields(userData: Partial<UserData> | null): Partial<UserData> | null {
  if (!userData) return null;

  const decrypted = { ...userData };

  // Descriptografar campos religiosos
  if (userData.baptismParish) {
    try {
      decrypted.baptismParish = decrypt(userData.baptismParish);
    } catch (error) {
      console.error('Error decrypting baptismParish:', error);
      decrypted.baptismParish = null;
    }
  }

  if (userData.confirmationParish) {
    try {
      decrypted.confirmationParish = decrypt(userData.confirmationParish);
    } catch (error) {
      console.error('Error decrypting confirmationParish:', error);
      decrypted.confirmationParish = null;
    }
  }

  if (userData.marriageParish) {
    try {
      decrypted.marriageParish = decrypt(userData.marriageParish);
    } catch (error) {
      console.error('Error decrypting marriageParish:', error);
      decrypted.marriageParish = null;
    }
  }

  return decrypted;
}

/**
 * Descriptografa array de usuários
 *
 * @param users - Array de usuários do banco
 * @returns Array com dados descriptografados
 */
export function decryptUsersList(users: Partial<UserData>[]): Partial<UserData>[] {
  return users.map(user => decryptReligiousFields(user) || user);
}

/**
 * Remove campos sensíveis antes de enviar para o cliente
 *
 * @param userData - Dados do usuário
 * @returns Dados sem campos sensíveis (senha, tokens, etc)
 */
export function sanitizeUserData(userData: Partial<UserData>): Partial<UserData> {
  const {
    passwordHash,
    password,
    ...sanitized
  }: any = userData;

  return sanitized;
}

/**
 * Prepara dados de usuário para salvar no banco
 *
 * @param userData - Dados do usuário (formulário, API, etc)
 * @param shouldEncrypt - Se deve criptografar campos religiosos (padrão: true)
 * @returns Dados prontos para insert/update
 *
 * @example
 * const dataToSave = prepareUserDataForDb(formData);
 * await db.insert(users).values(dataToSave);
 */
export function prepareUserDataForDb(
  userData: Partial<UserData>,
  shouldEncrypt: boolean = true
): Partial<UserData> {
  let prepared = { ...userData };

  // Criptografar campos religiosos se necessário
  if (shouldEncrypt) {
    prepared = encryptReligiousFields(prepared);
  }

  // Remover campos que não devem ser salvos
  delete (prepared as any).password;
  delete (prepared as any).id; // ID não deve ser alterado manualmente

  return prepared;
}

/**
 * Prepara dados de usuário para enviar ao cliente
 *
 * @param userData - Dados do usuário do banco
 * @param shouldDecrypt - Se deve descriptografar campos religiosos (padrão: true)
 * @returns Dados prontos para enviar via API
 *
 * @example
 * const user = await db.select().from(users).where(...);
 * const response = prepareUserDataForClient(user);
 * res.json(response);
 */
export function prepareUserDataForClient(
  userData: Partial<UserData> | null,
  shouldDecrypt: boolean = true
): Partial<UserData> | null {
  if (!userData) return null;

  let prepared = { ...userData };

  // Descriptografar campos religiosos se necessário
  if (shouldDecrypt) {
    prepared = decryptReligiousFields(prepared) || prepared;
  }

  // Remover campos sensíveis
  prepared = sanitizeUserData(prepared);

  return prepared;
}

/**
 * Valida se os dados religiosos estão completos para ministério
 *
 * @param userData - Dados do usuário
 * @returns true se possui sacramentos mínimos necessários
 */
export function validateMinistryEligibility(userData: Partial<UserReligiousData>): {
  isEligible: boolean;
  missingRequirements: string[];
} {
  const missingRequirements: string[] = [];

  // Batismo é obrigatório
  if (!userData.baptismDate) {
    missingRequirements.push('Data de Batismo');
  }

  // Confirmação/Crisma é obrigatória
  if (!userData.confirmationDate) {
    missingRequirements.push('Data de Confirmação (Crisma)');
  }

  return {
    isEligible: missingRequirements.length === 0,
    missingRequirements
  };
}

/**
 * Exemplo de uso completo em uma rota
 *
 * @example
 * // Criar/Atualizar usuário
 * app.post('/api/users', async (req, res) => {
 *   const userData = prepareUserDataForDb(req.body);
 *
 *   const [newUser] = await db.insert(users)
 *     .values(userData)
 *     .returning();
 *
 *   const response = prepareUserDataForClient(newUser);
 *   res.json(response);
 * });
 *
 * // Buscar usuário
 * app.get('/api/users/:id', async (req, res) => {
 *   const [user] = await db.select()
 *     .from(users)
 *     .where(eq(users.id, req.params.id));
 *
 *   const response = prepareUserDataForClient(user);
 *   res.json(response);
 * });
 *
 * // Listar usuários
 * app.get('/api/users', async (req, res) => {
 *   const users = await db.select().from(users);
 *   const response = decryptUsersList(users).map(sanitizeUserData);
 *   res.json(response);
 * });
 */
