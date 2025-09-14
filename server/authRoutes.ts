import { Router } from 'express';
import { login, register, changePassword, resetPassword, authenticateToken, requireRole, AuthRequest } from './auth';
import { z } from 'zod';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

// Schema de validação para registro
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['reitor', 'coordenador', 'ministro']).optional()
});

// Schema de validação para registro público
const publicRegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string().optional(),
  observations: z.string().optional()
});

// Schema para troca de senha
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres')
});

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const result = await login(email, password);
    
    // Define cookie com o token
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // Secure in all environments except development
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: '/' // Explicitly set path for clarity
    });
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    
    res.status(401).json({
      success: false,
      message: error.message || 'Erro ao fazer login'
    });
  }
});

// Rota de registro público (usuários se cadastram e aguardam aprovação)
router.post('/register', async (req, res) => {
  try {
    const userData = publicRegisterSchema.parse(req.body);
    
    // Cria usuário com status pending
    const newUser = await register({
      ...userData,
      role: 'ministro',
      status: 'pending'
    });
    
    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do coordenador.',
      user: newUser
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar usuário'
    });
  }
});

// Rota de registro administrativo (apenas coordenadores e reitor)
router.post('/admin-register', authenticateToken, requireRole(['reitor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    const userData = registerSchema.parse(req.body);
    
    // Apenas reitor pode criar outros coordenadores ou reitor
    if ((userData.role === 'reitor' || userData.role === 'coordenador') && req.user?.role !== 'reitor') {
      return res.status(403).json({
        success: false,
        message: 'Apenas o reitor pode criar coordenadores'
      });
    }
    
    const newUser = await register(userData);
    
    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: newUser
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar usuário'
    });
  }
});

// Rota para obter usuário atual
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Se não tem banco de dados, retorna os dados do token com status padrão
    if (!db) {
      res.json({
        success: true,
        user: {
          ...req.user,
          status: 'active' // Adiciona status padrão
        }
      });
      return;
    }

    // Busca o usuário completo no banco de dados
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const [user] = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      requiresPasswordChange: users.requiresPasswordChange,
      profilePhoto: users.photoUrl,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      photoUrl: users.photoUrl
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    // Em caso de erro, retorna os dados do token com status padrão
    res.json({
      success: true,
      user: {
        ...req.user,
        status: 'active' // Adiciona status padrão em caso de erro
      }
    });
  }
});

// Rota alternativa para obter usuário (compatibilidade)
router.get('/user', authenticateToken, async (req: AuthRequest, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do usuário'
    });
  }
});

// Rota de logout
router.post('/logout', (req, res) => {
  // Clear cookie with same options as when it was set for proper clearing
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/'
  });
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

// Rota para trocar senha
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    const result = await changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao trocar senha'
    });
  }
});

// Rota para resetar senha
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    
    const result = await resetPassword(email);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao resetar senha'
    });
  }
});

// Rota para verificar se está autenticado
router.get('/check', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: req.user
  });
});

export default router;