import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// JWT secret - em produção isso deve vir de variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'sjt-mesc-secret-key-2025';
const JWT_EXPIRES_IN = '7d';

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
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Middleware para verificar JWT
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Verifica se há token no cookie também
    const cookieToken = req.cookies?.token;
    if (!cookieToken) {
      return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    
    // Usa o token do cookie
    jwt.verify(cookieToken, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Token inválido ou expirado' });
      }
      req.user = user;
      next();
    });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
}

// Middleware para verificar roles
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissão insuficiente para esta ação' });
    }

    next();
  };
}

// Login
export async function login(email: string, password: string) {
  try {
    // Busca usuário por email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error('Email ou senha inválidos');
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
      throw new Error('Email ou senha inválidos');
    }

    // Gera token JWT
    const token = generateToken(user);

    // Atualiza último login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

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
        phone: userData.phone,
        role: userData.role || 'ministro',
        status: userData.status || 'pending', // Novo usuário começa como pendente
        observations: userData.observations,
        requiresPasswordChange: false,
        createdAt: new Date(),
        updatedAt: new Date()
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
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash || '');

    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualiza a senha
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
    // Por enquanto, retorna a senha (apenas para desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      return { 
        message: 'Senha temporária gerada',
        tempPassword // REMOVER EM PRODUÇÃO
      };
    }

    return { message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.' };
  } catch (error) {
    throw error;
  }
}