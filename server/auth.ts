import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { formatName } from './utils/nameFormatter';
import { expandRoles } from '@shared/roles';
import { getMatrizCommunityId } from './utils/communityContext';

// JWT secret - SEMPRE deve vir de variável de ambiente
function getJWTSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      '🔴 CRITICAL: JWT_SECRET environment variable is required!\n' +
      'Please set JWT_SECRET in your .env file with a strong random value.\n' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  return process.env.JWT_SECRET;
}

const JWT_SECRET = getJWTSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Tipos
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    homeCommunityId: string;
  };
}

// Função para criar hash de senha
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Função para verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// User payload for JWT token
interface JWTUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  homeCommunityId: string;
}

// Função para gerar JWT
export function generateToken(user: JWTUserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      homeCommunityId: user.homeCommunityId
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    } as jwt.SignOptions
  );
}

// Middleware para verificar JWT
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const secret: string = JWT_SECRET;

  const verifyAndCheckStatus = async (user: JWTUserPayload) => {
    try {
      // Busca dados ATUAIS do banco para garantir role e status corretos
      // (o JWT pode ter dados stale se o usuário foi promovido/demovido)
      const [currentUser] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          status: users.status,
          homeCommunityId: users.homeCommunityId
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!currentUser || currentUser.status !== 'active') {
        return res.status(403).json({ message: 'Conta inativa ou pendente. Entre em contato com a coordenação.' });
      }

      // Usar dados frescos do banco, não do JWT (evita role/comunidade stale)
      req.user = {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        homeCommunityId: currentUser.homeCommunityId
      };
      next();
    } catch (error) {
      console.error('[AUTH] Database error:', error);
      return res.status(500).json({ message: 'Erro interno de autenticação' });
    }
  };

  if (!token) {
    // Verifica se há token no cookie também
    const cookieToken = req.cookies?.token;
    if (!cookieToken) {
      return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    
    // Usa o token do cookie
    jwt.verify(cookieToken, secret, async (err: jwt.VerifyErrors | null, decoded: unknown) => {
      if (err || !decoded) {
        return res.status(403).json({ message: 'Token inválido ou expirado' });
      }
      await verifyAndCheckStatus(decoded as JWTUserPayload);
    });
    return;
  }

  jwt.verify(token, secret, async (err: jwt.VerifyErrors | null, decoded: unknown) => {
    if (err || !decoded) {
      return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
    await verifyAndCheckStatus(decoded as JWTUserPayload);
  });
}

// Middleware para verificar roles
// Usa os dados já atualizados por authenticateToken (que busca do banco)
export function requireRole(roles: string[]) {
  // Expande para reconhecer o vocabulário multi-comunidade: uma rota que permite
  // 'coordenador' (legado) também aceita coordenador_comunidade/coordenador_paroquial.
  const allowed = expandRoles(roles);
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // req.user.role já vem atualizado do banco via authenticateToken
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissão insuficiente para esta ação' });
    }

    next();
  };
}

// Login
export async function login(email: string, password: string) {
  try {
    // Normaliza o email para busca case-insensitive
    const normalizedEmail = email.trim().toLowerCase();
    
    // Busca usuário por email (case-insensitive usando SQL lower)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new Error('Usuário ou senha errados, revise os dados e tente novamente.');
    }

    // Verifica o status do usuário
    if (user.status === 'pending') {
      throw new Error('Sua conta ainda não foi aprovada. Aguarde a aprovação do coordenador.');
    }
    
    if (user.status === 'inactive') {
      throw new Error('Usuário inativo. Entre em contato com a coordenação.');
    }

    // Verifica a senha
    const passwordHash = user.passwordHash || '';
    const isValidPassword = await verifyPassword(password, passwordHash);

    if (!isValidPassword) {
      throw new Error('Usuário ou senha errados, revise os dados e tente novamente.');
    }

    // Gera token JWT
    const token = generateToken(user);

    // Atualiza último login
    try {
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));
    } catch (updateError) {
      // Silent fail - não bloquear login por erro de update
    }

    // Remove informações sensíveis
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  } catch (error) {
    throw error;
  }
}

// Registro de novo usuário
export async function register(userData: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
  status?: string;
  observations?: string;
}) {
  try {
    // Normaliza o email para lowercase
    const normalizedEmail = userData.email.trim().toLowerCase();
    
    // Verifica se o email já existe (case-insensitive)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      throw new Error('Este email já está cadastrado');
    }

    // Hash da senha
    const passwordHash = await hashPassword(userData.password);

    // Format name with proper capitalization
    const formattedName = formatName(userData.name);

    // Sem seleção de comunidade no cadastro ainda (Fase 3 da UI) → matriz por padrão
    const homeCommunityId = await getMatrizCommunityId();

    // Cria o usuário
    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        name: formattedName,
        phone: userData.phone || null,
        role: userData.role as any || 'ministro',
        status: userData.status as any || 'pending',
        observations: userData.observations || null,
        requiresPasswordChange: false,
        homeCommunityId
      })
      .returning();

    // Remove informações sensíveis
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// Trocar senha
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    // Busca usuário usando Drizzle ORM com PostgreSQL
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica senha atual
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualiza a senha e remove flag de troca obrigatória
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        requiresPasswordChange: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return { message: 'Senha alterada com sucesso' };
  } catch (error) {
    throw error;
  }
}

// Resetar senha (gera uma senha temporária)
export async function resetPassword(email: string) {
  try {
    // Normaliza o email para busca case-insensitive
    const normalizedEmail = email.trim().toLowerCase();

    // Busca usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return { message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.' };
    }

    // Gera senha temporária segura usando crypto
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12) + '!Aa1';
    const passwordHash = await hashPassword(tempPassword);

    // Atualiza a senha e marca que precisa trocar
    await db
      .update(users)
      .set({
        passwordHash,
        requiresPasswordChange: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Envia email com a senha temporária
    const { sendPasswordResetEmail, getEmailProviderName } = await import('./services/emailService');

    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.name,
      tempPassword
    );

    if (!emailResult.success) {
      // Log error but don't reveal to user for security
      console.error('[AUTH] Failed to send password reset email:', emailResult.error);
    } else {
      console.log(`[AUTH] Password reset email sent via ${getEmailProviderName()} to ${email}`);
    }

    return { message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.' };
  } catch (error) {
    throw error;
  }
}