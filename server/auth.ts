import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

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

// Middleware para verificar role
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Sem permissão para acessar este recurso',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
}

// ============= FUNÇÃO DE LOGIN REESCRITA - MAIS SIMPLES E DIRETA =============
export async function login(emailInput: string, passwordInput: string) {
  try {
    console.log('[AUTH] Login attempt for:', emailInput);

    // Normaliza email: remove espaços e converte para minúsculas
    const normalizedEmail = emailInput.trim().toLowerCase();
    
    // Busca usuário no banco de dados usando LOWER() para case-insensitive
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (!user) {
      console.log('[AUTH] User not found:', normalizedEmail);
      throw new Error('Email ou senha incorretos');
    }

    console.log('[AUTH] User found:', user.email, 'Status:', user.status, 'PID:', user.pid);

    // Verifica se a conta está pendente
    if (user.status === 'pending') {
      console.log('[AUTH] User account pending approval');
      throw new Error('Account pending approval');
    }

    // Verifica se a conta está ativa
    if (user.status !== 'active') {
      console.log('[AUTH] User account not active:', user.status);
      throw new Error('Conta inativa. Entre em contato com a coordenação.');
    }

    // Verifica a senha (remove trim da senha para respeitar espaços)
    const isPasswordValid = await bcrypt.compare(passwordInput, user.password);
    
    console.log('[AUTH] Password verification result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[AUTH] Invalid password for user:', normalizedEmail);
      throw new Error('Email ou senha incorretos');
    }

    // Gera token JWT
    const token = generateToken(user);

    console.log('[AUTH] Login successful for:', user.email);

    // Retorna dados do usuário (sem senha)
    const { password, ...userWithoutPassword } = user;
    
    return {
      token,
      user: userWithoutPassword
    };
  } catch (error: any) {
    console.error('[AUTH] Login error:', error.message);
    throw error;
  }
}

// Função de registro
export async function register(userData: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
  status?: string;
}) {
  try {
    // Verifica se o email já existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Hash da senha
    const hashedPassword = await hashPassword(userData.password);

    // Cria novo usuário
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name,
        phone: userData.phone || null,
        role: (userData.role as any) || 'ministro',
        status: (userData.status as any) || 'pending',
        requiresPasswordChange: false
      })
      .returning();

    // Retorna usuário sem senha
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error: any) {
    console.error('[AUTH] Registration error:', error);
    throw error;
  }
}

// Função para trocar senha
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    // Busca usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica senha atual
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const hashedPassword = await hashPassword(newPassword);

    // Atualiza senha
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        requiresPasswordChange: false 
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error: any) {
    console.error('[AUTH] Change password error:', error);
    throw error;
  }
}

// Função para resetar senha (admin)
export async function resetPassword(userId: string, newPassword: string) {
  try {
    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        requiresPasswordChange: true 
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error: any) {
    console.error('[AUTH] Reset password error:', error);
    throw error;
  }
}
