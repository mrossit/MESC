import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// JWT secret - deve vir de variável de ambiente
function getJWTSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  // Only allow fallback in explicit development environment
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  JWT_SECRET não definido, usando valor padrão para desenvolvimento');
    return 'sjt-mesc-development-secret-2025';
  }
  
  // All other environments (production, staging, test, etc.) require JWT_SECRET
  throw new Error('JWT_SECRET environment variable is required. Please set this environment variable for security.');
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

// Função para gerar JWT
export function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN
    } as any
  );
}

// Middleware para verificar JWT
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  console.log('[AUTH] authenticateToken called for:', req.method, req.path);
  console.log('[AUTH] Cookies:', req.cookies);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const secret: string = JWT_SECRET;

  const verifyAndCheckStatus = async (user: any) => {
    try {
      console.log('[AUTH] Verifying user:', user.id, user.email);

      // Use Drizzle ORM for database access (works with both SQLite and PostgreSQL)
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      console.log('[AUTH] User from DB:', currentUser?.id, currentUser?.status);

      if (!currentUser || currentUser.status !== 'active') {
        console.log('[AUTH] User blocked - Status:', currentUser?.status);
        return res.status(403).json({ message: 'Conta inativa ou pendente. Entre em contato com a coordenação.' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[AUTH] Database error:', error);
      return res.status(500).json({ message: 'Erro interno de autenticação' });
    }
  };

  if (!token) {
    // Verifica se há token no cookie também
    const cookieToken = req.cookies?.token;
    console.log('[AUTH] No bearer token, checking cookie. Cookie token exists:', !!cookieToken);
    
    if (!cookieToken) {
      console.log('[AUTH] No cookie token found. Returning 401');
      return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    
    // Usa o token do cookie
    jwt.verify(cookieToken, secret, async (err: any, user: any) => {
      if (err) {
        console.log('[AUTH] Cookie token verification failed:', err.message);
        return res.status(403).json({ message: 'Token inválido ou expirado' });
      }
      console.log('[AUTH] Cookie token verified successfully');
      await verifyAndCheckStatus(user);
    });
    return;
  }

  console.log('[AUTH] Using bearer token from header');
  jwt.verify(token, secret, async (err: any, user: any) => {
    if (err) {
      console.log('[AUTH] Bearer token verification failed:', err.message);
      return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
    await verifyAndCheckStatus(user);
  });
}

// Middleware para verificar roles - verifica role atual no banco
export function requireRole(roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Buscar role atual no banco para evitar bypass com tokens antigos
    const [currentUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!currentUser || !roles.includes(currentUser.role)) {
      return res.status(403).json({ message: 'Permissão insuficiente para esta ação' });
    }

    next();
  };
}

// Login
export async function login(email: string, password: string) {
  try {
    // CRITICAL: Normalizar email para evitar problemas de case e espaços
    const normalizedEmail = email.trim().toLowerCase();
    
    console.log('[AUTH] Login attempt for:', normalizedEmail);
    
    // Busca usuário por email
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
    // Verifica se o email já existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser) {
      throw new Error('Este email já está cadastrado');
    }

    // Hash da senha
    const passwordHash = await hashPassword(userData.password);

    // Cria o usuário
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
        name: userData.name,
        phone: userData.phone || null,
        role: userData.role as any || 'ministro',
        status: userData.status as any || 'pending',
        observations: userData.observations || null,
        requiresPasswordChange: false
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
    // Busca usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return { message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.' };
    }

    // Gera senha temporária
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
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

    // TODO: Enviar email com a senha temporária
    // Log temporário apenas para desenvolvimento (não retornar ao cliente)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Senha temporária gerada para ${email}: ${tempPassword}`);
    }

    return { message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.' };
  } catch (error) {
    throw error;
  }
}