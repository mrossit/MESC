import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';

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
  console.log('🔍 DEBUG: [AUTH] Middleware de autenticação chamado');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const secret: string = JWT_SECRET;

  console.log('🔍 DEBUG: [AUTH] Token no header:', token ? 'PRESENTE' : 'AUSENTE');

  const verifyAndCheckStatus = async (user: any) => {
    console.log('🔍 DEBUG: [AUTH] Verificando status do usuário:', user.id);
    try {
      // Usar SQLite direto como fallback (mesmo problema de esquema)
      const sqliteDb = new Database('local.db');
      
      const currentUser = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      sqliteDb.close();

      console.log('✅ DEBUG: [AUTH] Usuário encontrado no banco:', currentUser ? 'SIM' : 'NÃO');

      if (!currentUser || currentUser.status !== 'active') {
        console.log('❌ DEBUG: [AUTH] Usuário inativo ou não encontrado');
        return res.status(403).json({ message: 'Conta inativa ou pendente. Entre em contato com a coordenação.' });
      }

      console.log('✅ DEBUG: [AUTH] Usuário ativo, prosseguindo...');
      req.user = user;
      next();
    } catch (error) {
      console.log('❌ DEBUG: [AUTH] Erro ao verificar usuário no banco:', error);
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
    jwt.verify(cookieToken, secret, async (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Token inválido ou expirado' });
      }
      await verifyAndCheckStatus(user);
    });
    return;
  }

  jwt.verify(token, secret, async (err: any, user: any) => {
    if (err) {
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
    console.log('🔍 DEBUG: Tentando login para:', email);
    
    // Busca usuário por email
    let user;
    try {
      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      user = foundUser;
    } catch (dbError) {
      console.log('❌ DEBUG: Erro no banco Drizzle:', dbError);
      // Fallback para query SQLite direta
      const Database = await import('better-sqlite3');
      const sqlite = new (Database.default)('local.db');
      const sqliteUser = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);
      sqlite.close();
      
      // Mapear campos SQLite para o formato esperado
      if (sqliteUser) {
        user = {
          ...sqliteUser,
          passwordHash: sqliteUser.password_hash,
          requiresPasswordChange: !!sqliteUser.requires_password_change
        };
        console.log('✅ DEBUG: Usando fallback SQLite, usuário encontrado');
      } else {
        console.log('❌ DEBUG: Usuário não encontrado nem no Drizzle nem no SQLite');
      }
    }

    console.log('🔍 DEBUG: Usuário encontrado:', user ? 'SIM' : 'NÃO');
    if (user) {
      console.log('🔍 DEBUG: Status:', user.status, 'Role:', user.role);
      console.log('🔍 DEBUG: Tem passwordHash:', !!user.passwordHash);
    }

    if (!user) {
      console.log('❌ DEBUG: Usuário não encontrado para email:', email);
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
    console.log('🔍 DEBUG: Verificando senha...');
    console.log('🔍 DEBUG: Senha fornecida:', password);
    console.log('🔍 DEBUG: Hash armazenado:', passwordHash.substring(0, 20) + '...');
    
    const isValidPassword = await verifyPassword(password, passwordHash);
    console.log('🔍 DEBUG: Resultado da verificação:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ DEBUG: Senha inválida, rejeitando login');
      throw new Error('Usuário ou senha errados, revise os dados e tente novamente.');
    }
    
    console.log('✅ DEBUG: Senha válida, continuando login...');

    // Gera token JWT
    console.log('🔍 DEBUG: Gerando token JWT...');
    const token = generateToken(user);
    console.log('✅ DEBUG: Token JWT gerado com sucesso');

    // Atualiza último login
    console.log('🔍 DEBUG: Atualizando último login...');
    try {
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));
      console.log('✅ DEBUG: Último login atualizado com sucesso');
    } catch (updateError) {
      console.log('⚠️ DEBUG: Erro ao atualizar último login, mas continuando...', updateError);
    }

    // Remove informações sensíveis
    console.log('🔍 DEBUG: Removendo informações sensíveis...');
    const { passwordHash: _, ...userWithoutPassword } = user;

    console.log('✅ DEBUG: Login completo! Retornando dados...');
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
    // Usar SQLite direto como fallback (mesmo problema de esquema)
    const sqliteDb = new Database('local.db');
    
    // Busca usuário
    const user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      sqliteDb.close();
      throw new Error('Usuário não encontrado');
    }

    // Verifica senha atual
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash || '');

    if (!isValidPassword) {
      sqliteDb.close();
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualiza a senha usando SQLite direto
    sqliteDb.prepare(`
      UPDATE users 
      SET passwordHash = ?, requiresPasswordChange = 0 
      WHERE id = ?
    `).run(newPasswordHash, userId);
    
    sqliteDb.close();

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