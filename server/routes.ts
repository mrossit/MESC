import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { storage } from "./storage";
import { authenticateToken, requireRole, AuthRequest } from "./auth";
import authRoutes from "./authRoutes";
import { passwordResetRoutes } from "./passwordResetRoutes";
import { csrfTokenGenerator, csrfProtection, getCsrfToken } from "./middleware/csrf";
import { authRateLimiter, passwordResetRateLimiter } from "./middleware/rateLimiter";
import { noCacheHeaders } from "./middleware/noCacheHeaders";
import questionnaireAdminRoutes from "./routes/questionnaireAdmin";
import questionnaireRoutes from "./routes/questionnaires";
import scheduleGenerationRoutes from "./routes/scheduleGeneration";
import smartScheduleRoutes from "./routes/smartScheduleGeneration";
import testScheduleRoutes from "./routes/testScheduleGeneration";
import schedulesRoutes from "./routes/schedules";
import auxiliaryPanelRoutes from "./routes/auxiliaryPanel";
import uploadRoutes from "./routes/upload";
import notificationsRoutes from "./routes/notifications";
import profileRoutes from "./routes/profile";
import reportsRoutes from "./routes/reports";
import ministersRoutes from "./routes/ministers";
import sessionRoutes from "./routes/session";
import substitutionsRoutes from "./routes/substitutions";
import massPendenciesRoutes from "./routes/mass-pendencies";
import formationAdminRoutes from "./routes/formationAdmin";
import versionRoutes from "./routes/version";
import liturgicalRoutes from "./routes/liturgical";
import saintsRoutes from "./routes/saints";
import cnbbLiturgyRoutes from "./routes/cnbb-liturgy";
import dashboardRoutes from "./routes/dashboard";
import pushSubscriptionsRoutes from "./routes/pushSubscriptions";
import whatsappApiRoutes from "./routes/whatsapp-api";
import escalaAlternativaRoutes from "./escala-alternativa/routes/escalaRoutes";
import { insertUserSchema, insertQuestionnaireSchema, insertMassTimeSchema, insertFormationTrackSchema, insertFormationLessonSchema, insertFormationLessonSectionSchema, users, questionnaireResponses, schedules, substitutionRequests, type User } from "@shared/schema";
import { z } from "zod";
import { logger } from "./utils/logger";
import { db } from './db';
import { eq, count, or } from 'drizzle-orm';
import {
  getFormationOverview as buildFormationOverview,
  getLessonDetail as fetchFormationLessonDetail,
  markLessonCompleted as markFormationLessonCompleted,
  markLessonSectionCompleted as markFormationSectionCompleted,
  upsertLessonProgressEntry as upsertFormationLessonProgress,
  listLessonProgressEntries as listFormationProgressEntries
} from "./services/formationService";

const formationProgressUpdateSchema = z.object({
  lessonId: z.string(),
  isCompleted: z.boolean().optional(),
  timeSpent: z.number().int().min(0).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  completedSections: z.array(z.string()).optional(),
  quizScore: z.number().optional(),
  notes: z.string().optional()
});

// Função utilitária para tratamento de erro centralizado
function handleApiError(error: any, operation: string) {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      message: `Dados inválidos para ${operation}`,
      errors: error.errors
    };
  }

  if (error.code === '23505') { // PostgreSQL unique violation
    return {
      status: 409,
      message: `Já existe um registro com estes dados para ${operation}`
    };
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return {
      status: 400,
      message: `Referência inválida encontrada para ${operation}`
    };
  }

  if (error.message && error.message.includes('não encontrado')) {
    return {
      status: 404,
      message: error.message
    };
  }

  if (error.message && error.message.includes('não autorizado')) {
    return {
      status: 403,
      message: error.message
    };
  }

  // Erro genérico
  logger.error(`Error in ${operation}:`, error);
  return {
    status: 500,
    message: `Erro interno do servidor durante ${operation}`
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Cookie parser middleware
  app.use(cookieParser());

  // CRITICAL: No-cache headers for API routes (prevents stale data caching)
  app.use(noCacheHeaders);

  // CSRF token generator - gera token para todas as rotas
  app.use(csrfTokenGenerator);

  // Endpoint para obter token CSRF
  app.get('/api/csrf-token', getCsrfToken);

  // Auth routes com rate limiting específico
  app.use('/api/auth', authRateLimiter, authRoutes);

  // Password reset routes com rate limiting muito restritivo
  app.use('/api/password-reset', passwordResetRateLimiter, passwordResetRoutes);
  
  // WhatsApp API routes (sem CSRF, autenticado por API key)
  app.use('/api/whatsapp', whatsappApiRoutes);
  
  // Escala Alternativa routes (algoritmo Python para comparação)
  app.use('/api/escala-alternativa', csrfProtection, escalaAlternativaRoutes);
  
  // Questionnaire routes (IMPORTANTE: registrar as rotas regulares ANTES das admin)
  app.use('/api/questionnaires', csrfProtection, questionnaireRoutes);

  // Questionnaire admin routes - com proteção CSRF
  app.use('/api/questionnaires/admin', csrfProtection, questionnaireAdminRoutes);

  // Schedule CRUD routes (publish/unpublish, etc) - MUST be first for route priority
  app.use('/api/schedules', csrfProtection, schedulesRoutes);

  // Schedule generation routes - com proteção CSRF
  app.use('/api/schedules', csrfProtection, scheduleGenerationRoutes);

  // Smart schedule generation routes (advanced algorithm) - com proteção CSRF
  app.use('/api/schedules', csrfProtection, smartScheduleRoutes);

  // Test schedule generation routes (mock data testing) - com proteção CSRF
  app.use('/api/schedules', csrfProtection, testScheduleRoutes);

  // Auxiliary panel routes (for positions 1 and 2) - com proteção CSRF
  app.use('/api/auxiliary', csrfProtection, auxiliaryPanelRoutes);

  // Upload routes - com proteção CSRF
  app.use('/api/upload', csrfProtection, uploadRoutes);

  // Notification routes - com proteção CSRF
  app.use('/api/notifications', csrfProtection, notificationsRoutes);

  // Reports routes (apenas leitura, não precisa CSRF)
  app.use('/api/reports', reportsRoutes);

  // Ministers routes - com proteção CSRF
  app.use('/api/ministers', csrfProtection, ministersRoutes);

  // Session routes (activity monitoring & auto-logout)
  app.use('/api/session', sessionRoutes);

  // Substitution routes - com proteção CSRF
  app.use('/api/substitutions', csrfProtection, substitutionsRoutes);

  // Mass pendencies routes (apenas leitura, não precisa CSRF)
  app.use('/api/mass-pendencies', massPendenciesRoutes);

  // Formation admin routes - com proteção CSRF
  app.use('/api/formation/admin', csrfProtection, formationAdminRoutes);

  // Version endpoint (public - sem auth, sem CSRF)
  app.use('/api/version', versionRoutes);

  // Liturgical calendar routes (read endpoints sem CSRF, write endpoints com CSRF)
  app.use('/api/liturgical', liturgicalRoutes);

  // Saints calendar routes (read-only, no CSRF needed)
  app.use('/api/saints', saintsRoutes);
  
  // CNBB Liturgy routes (read-only, no CSRF needed)
  app.use('/api/cnbb-liturgy', cnbbLiturgyRoutes);

  // Dashboard routes (mix of read and incomplete schedules)
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/schedules/incomplete', dashboardRoutes);

  // Push notification subscription routes (read endpoints sem CSRF, write endpoints com CSRF)
  app.use('/api/push-subscriptions', pushSubscriptionsRoutes);

  // Get current user (compatível com novo sistema)
  app.get('/api/auth/user', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usuário atual");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Profile routes
  app.get('/api/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar perfil");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.put('/api/profile', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Validar e limpar dados do perfil
      const profileData = {
        name: req.body.name,
        phone: req.body.phone,
        ministryStartDate: req.body.ministryStartDate,
        baptismDate: req.body.baptismDate,
        baptismParish: req.body.baptismParish,
        confirmationDate: req.body.confirmationDate,
        confirmationParish: req.body.confirmationParish,
        marriageDate: req.body.marriageDate,
        marriageParish: req.body.marriageParish,
        maritalStatus: req.body.maritalStatus
      };

      // Remover campos undefined
      Object.keys(profileData).forEach(key => {
        if (profileData[key as keyof typeof profileData] === undefined) {
          delete profileData[key as keyof typeof profileData];
        }
      });

      const updatedUser = await storage.updateUser(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar perfil");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Family routes
  // POST /api/profile/family - Add family member
  app.post('/api/profile/family', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { relatedUserId, relationshipType } = req.body;

      if (!relatedUserId || !relationshipType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (relatedUserId === userId) {
        return res.status(400).json({ error: 'Cannot add yourself as a family member' });
      }

      const relatedUser = await storage.getUser(relatedUserId);
      if (!relatedUser) {
        return res.status(404).json({ error: 'Related user not found' });
      }

      const relationship = await storage.addFamilyMember(userId, relatedUserId, relationshipType);

      res.json({
        message: 'Family member added successfully',
        relationship: {
          id: relationship.id,
          relationshipType: relationship.relationshipType,
          user: {
            id: relatedUser.id,
            name: relatedUser.name,
            email: relatedUser.email,
            photoUrl: relatedUser.photoUrl
          }
        }
      });
    } catch (error: any) {
      if (error.message === 'Relationship already exists') {
        return res.status(409).json({ error: 'This family relationship already exists' });
      }
      const errorResponse = handleApiError(error, "adicionar familiar");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // GET /api/profile/family - Get family members
  app.get('/api/profile/family', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const relationships = await storage.getFamilyMembers(userId);

      const familyMembers = await Promise.all(
        relationships.map(async (rel) => {
          const user = await storage.getUser(rel.relatedUserId);
          return {
            id: rel.id,
            relationshipType: rel.relationshipType,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email,
              photoUrl: user.photoUrl
            } : null
          };
        })
      );

      res.json(familyMembers.filter(m => m.user !== null));
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar familiares");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // DELETE /api/profile/family/:id - Remove family member
  app.delete('/api/profile/family/:id', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.removeFamilyMember(id);
      res.json({ message: 'Family member removed successfully' });
    } catch (error) {
      const errorResponse = handleApiError(error, "remover familiar");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.get('/api/users/active', authenticateToken, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeUsers = users.filter(u => u.status === 'active');
      res.json(activeUsers);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usuários ativos");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.get('/api/users/pending', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const pendingUsers = users.filter(u => u.status === 'pending');
      res.json(pendingUsers);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usuários pendentes");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar estatísticas do dashboard");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // User/Minister routes
  app.get('/api/users', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
    try {
      // Prevent caching of sensitive user data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar lista de usuários");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.get('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Rota para servir fotos de perfil
  app.get('/api/users/:id/photo', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Buscar dados da imagem no banco
      const [user] = await db.select({
        imageData: users.imageData,
        imageContentType: users.imageContentType
      }).from(users).where(eq(users.id, userId));
      
      if (!user || !user.imageData) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Converter base64 para buffer
      const imageBuffer = Buffer.from(user.imageData, 'base64');
      
      // Headers de cache com versioning para permitir atualizações
      const imageHash = crypto.createHash('md5').update(user.imageData).digest('hex');
      
      res.set({
        'Content-Type': user.imageContentType || 'image/jpeg',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora apenas
        'ETag': `"${userId}-${imageHash}"`, // ETag baseado no hash completo da imagem
        'Last-Modified': new Date().toUTCString() // Adicionar data de modificação
      });
      
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error serving profile photo:', error);
      res.status(500).json({ error: 'Failed to load photo' });
    }
  });

  app.post('/api/users', authenticateToken, requireRole(['gestor']), csrfProtection, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Forçar padrões seguros - apenas gestor pode criar usuários com roles específicos
      const safeUserData = {
        ...userData,
        role: (userData.role as any) || 'ministro', // padrão ministro
        status: 'pending' as const // sempre pending para aprovação
      };
      
      const user = await storage.createUser(safeUserData);
      res.status(201).json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.put('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      
      // Remover campos sensíveis que devem usar rotas específicas
      const { role, status, ...safeUserData } = userData;
      
      const user = await storage.updateUser(req.params.id, safeUserData);
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.patch('/api/users/:id/status', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
    try {
      const statusUpdateSchema = z.object({
        status: z.enum(['active', 'inactive', 'pending'], {
          errorMap: () => ({ message: "Status deve ser: active, inactive ou pending" })
        })
      });
      
      const { status } = statusUpdateSchema.parse(req.body);
      
      // Impedir auto-mudança de status
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ message: "Não é possível alterar seu próprio status" });
      }
      
      // Se está inativando um gestor, verificar se não é o último
      if (status !== 'active') {
        const targetUser = await storage.getUser(req.params.id);
        if (targetUser?.role === 'gestor') {
          const allUsers = await storage.getAllUsers();
          const activeGestoresCount = allUsers.filter(u => u.role === 'gestor' && u.status === 'active').length;
          
          if (activeGestoresCount <= 1) {
            return res.status(400).json({ message: "Não é possível inativar o último gestor ativo do sistema" });
          }
        }
      }
      
      const user = await storage.updateUser(req.params.id, { status });
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      const errorResponse = handleApiError(error, "atualizar status do usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.patch('/api/users/:id/role', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
    try {
      const roleUpdateSchema = z.object({
        role: z.enum(['gestor', 'coordenador', 'ministro'], {
          errorMap: () => ({ message: "Papel deve ser: gestor, coordenador ou ministro" })
        })
      });
      
      const { role } = roleUpdateSchema.parse(req.body);
      
      // Permitir que coordenadores alterem seu próprio perfil, mas com restrições
      if (req.user?.id === req.params.id) {
        // Coordenadores podem se auto-promover ou rebaixar
        if (req.user?.role === 'coordenador') {
          // Coordenador pode mudar para ministro (rebaixar) ou gestor (promover)
          // Mas não pode mudar para o mesmo perfil
          if (role === 'coordenador') {
            return res.status(400).json({ message: "Você já é um coordenador" });
          }
          // Se está se promovendo a gestor, permitir
          // Se está se rebaixando a ministro, permitir
        } else {
          // Gestores não podem alterar seu próprio papel
          return res.status(400).json({ message: "Gestores não podem alterar seu próprio papel" });
        }
      }
      
      // Verificar o usuário alvo antes de fazer mudanças
      const targetUser = await storage.getUser(req.params.id);
      
      // Se está removendo o papel de gestor, verificar se não é o último ativo
      if (role !== 'gestor' && targetUser?.role === 'gestor') {
        const allUsers = await storage.getAllUsers();
        const activeGestoresCount = allUsers.filter(u => 
          u.role === 'gestor' && 
          u.status === 'active' && 
          u.id !== req.params.id // Excluir o usuário que será modificado da contagem
        ).length;
        
        if (activeGestoresCount < 1) {
          return res.status(400).json({ message: "Não é possível remover o último gestor ativo do sistema" });
        }
      }
      
      const user = await storage.updateUser(req.params.id, { role });
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      const errorResponse = handleApiError(error, "atualizar papel do usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.patch('/api/users/:id/block', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
    try {
      // Impedir auto-bloqueio
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ message: "Não é possível bloquear sua própria conta" });
      }
      
      // Se está bloqueando um gestor, verificar se não é o último ativo
      const targetUser = await storage.getUser(req.params.id);
      if (targetUser?.role === 'gestor') {
        const allUsers = await storage.getAllUsers();
        const activeGestoresCount = allUsers.filter(u => u.role === 'gestor' && u.status === 'active').length;
        
        if (activeGestoresCount <= 1) {
          return res.status(400).json({ message: "Não é possível bloquear o último gestor ativo do sistema" });
        }
      }
      
      // Bloquear usuário = definir status como 'inactive'
      const user = await storage.updateUser(req.params.id, { status: 'inactive' });
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "bloquear usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Check if user has been used in the system (before deletion)
  app.get('/api/users/:id/check-usage', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
    try {
      const userId = req.params.id;
      
      // Check if user has any real activity in the system
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Check for real ministerial activity using storage layer
      const activityCheck = await storage.checkUserMinisterialActivity(userId);
      
      res.json({
        isUsed: activityCheck.isUsed,
        reason: activityCheck.reason
      });
    } catch (error) {
      console.error("Error checking user usage:", error);
      res.status(500).json({ message: "Erro ao verificar uso do usuário" });
    }
  });

  // Health check / diagnostic endpoint - útil para debugar problemas de produção
  app.get('/api/diagnostic/:userId', authenticateToken, requireRole(['gestor']), async (req: AuthRequest, res) => {
    try {
      const userId = req.params.userId;
      
      // Tentar várias operações e ver qual falha
      const diagnostics = {
        userExists: false,
        canQueryUser: false,
        canQueryQuestionnaireResponses: false,
        canQueryScheduleAssignments: false,
        canQuerySubstitutionRequests: false,
        ministerialActivityCheck: null as boolean | null,
        userError: null as string | null,
        questionnaireError: null as string | null,
        scheduleError: null as string | null,
        substitutionError: null as string | null,
        storageError: null as string | null,
        questionnaireCount: 0,
        scheduleMinisterCount: 0,
        scheduleSubstituteCount: 0,
        substitutionRequestCount: 0
      };
      
      try {
        const user = await storage.getUser(userId);
        diagnostics.userExists = !!user;
        diagnostics.canQueryUser = true;
      } catch (e) {
        diagnostics.userError = `Error querying user: ${e}`;
      }
      
      try {
        // Verificação básica de questionários
        const [questionnaireCheck] = await db.select({ count: count() })
          .from(questionnaireResponses)
          .where(eq(questionnaireResponses.userId, userId));
        diagnostics.canQueryQuestionnaireResponses = true;
        diagnostics.questionnaireCount = questionnaireCheck?.count || 0;
      } catch (e) {
        diagnostics.questionnaireError = `Error querying questionnaire responses: ${e}`;
      }
      
      try {
        // Verificação básica de escalas como ministro
        const [scheduleMinisterCheck] = await db.select({ count: count() })
          .from(schedules)
          .where(eq(schedules.ministerId, userId));
        diagnostics.canQueryScheduleAssignments = true;
        diagnostics.scheduleMinisterCount = scheduleMinisterCheck?.count || 0;
        
        // Verificação básica de escalas como substituto
        const [scheduleSubstituteCheck] = await db.select({ count: count() })
          .from(schedules)
          .where(eq(schedules.substituteId, userId));
        diagnostics.scheduleSubstituteCount = scheduleSubstituteCheck?.count || 0;
      } catch (e) {
        diagnostics.scheduleError = `Error querying schedule assignments: ${e}`;
      }
      
      try {
        // Verificação de solicitações de substituição
        const [substitutionCheck] = await db.select({ count: count() })
          .from(substitutionRequests)
          .where(or(
            eq(substitutionRequests.requesterId, userId),
            eq(substitutionRequests.substituteId, userId)
          ));
        diagnostics.canQuerySubstitutionRequests = true;
        diagnostics.substitutionRequestCount = substitutionCheck?.count || 0;
      } catch (e) {
        diagnostics.substitutionError = `Error querying substitution requests: ${e}`;
      }
      
      try {
        // Testar o método que está falhando
        const result = await storage.checkUserMinisterialActivity(userId);
        diagnostics.ministerialActivityCheck = result.isUsed;
      } catch (e) {
        diagnostics.storageError = `Error in checkUserMinisterialActivity: ${e}`;
      }
      
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: `Diagnostic failed: ${error}` });
    }
  });

  app.delete('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user;
      
      // Impedir auto-exclusão
      if (currentUser?.id === userId) {
        return res.status(400).json({ message: "Não é possível excluir sua própria conta" });
      }
      
      // Get target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificação conservadora de atividade ministerial com fallback
      let hasMinisterialActivity = false;
      let activityCheckReason = "";
      
      try {
        const activityCheck = await storage.checkUserMinisterialActivity(userId);
        hasMinisterialActivity = activityCheck.isUsed;
        activityCheckReason = activityCheck.reason;
        
        // Defesa em profundidade: mesmo se storage funcionar, fazer verificação dupla
        if (!hasMinisterialActivity) {
          console.log("Storage returned no activity, performing double-check via direct DB queries...");
          
          const [questionnaireCount] = await db.select({ count: count() })
            .from(questionnaireResponses)
            .where(eq(questionnaireResponses.userId, userId));
          
          const [scheduleMinisterCount] = await db.select({ count: count() })
            .from(schedules)
            .where(eq(schedules.ministerId, userId));
          
          const [scheduleSubstituteCount] = await db.select({ count: count() })
            .from(schedules)
            .where(eq(schedules.substituteId, userId));
          
          const [substitutionCount] = await db.select({ count: count() })
            .from(substitutionRequests)
            .where(or(
              eq(substitutionRequests.requesterId, userId),
              eq(substitutionRequests.substituteId, userId)
            ));
          
          const directQuestionnaireActivity = (questionnaireCount?.count || 0) > 0;
          const directScheduleMinisterActivity = (scheduleMinisterCount?.count || 0) > 0;
          const directScheduleSubstituteActivity = (scheduleSubstituteCount?.count || 0) > 0;
          const directSubstitutionActivity = (substitutionCount?.count || 0) > 0;
          
          const directHasActivity = directQuestionnaireActivity || directScheduleMinisterActivity || directScheduleSubstituteActivity || directSubstitutionActivity;
          
          if (directHasActivity) {
            // Discrepância detectada! Storage disse que não tem atividade, mas query direta encontrou
            console.warn("DISCREPANCY DETECTED: Storage said no activity but direct query found activity", {
              storageResult: activityCheck,
              directChecks: {
                questionnaires: directQuestionnaireActivity,
                scheduleMinister: directScheduleMinisterActivity,
                scheduleSubstitute: directScheduleSubstituteActivity,
                substitutions: directSubstitutionActivity
              }
            });
            
            hasMinisterialActivity = true;
            const activities = [];
            if (directQuestionnaireActivity) activities.push('questionários respondidos');
            if (directScheduleMinisterActivity) activities.push('escalas como ministro');
            if (directScheduleSubstituteActivity) activities.push('escalas como substituto');
            if (directSubstitutionActivity) activities.push('solicitações de substituição');
            activityCheckReason = `ATENÇÃO: Discrepância detectada entre métodos. Verificação direta encontrou: ${activities.join(', ')}`;
          }
        }
      } catch (storageError) {
        console.error("Storage method failed, trying direct DB queries:", storageError);
        
        // Fallback: verificação direta no banco de dados cobrindo TODAS as atividades
        try {
          // 1. Verificar questionários respondidos
          const [questionnaireCount] = await db.select({ count: count() })
            .from(questionnaireResponses)
            .where(eq(questionnaireResponses.userId, userId));
          
          // 2. Verificar escalas como ministro principal
          const [scheduleMinisterCount] = await db.select({ count: count() })
            .from(schedules)
            .where(eq(schedules.ministerId, userId));
          
          // 3. Verificar escalas como substituto
          const [scheduleSubstituteCount] = await db.select({ count: count() })
            .from(schedules)
            .where(eq(schedules.substituteId, userId));
          
          // 4. Verificar solicitações de substituição (como solicitante ou substituto)
          const [substitutionCount] = await db.select({ count: count() })
            .from(substitutionRequests)
            .where(or(
              eq(substitutionRequests.requesterId, userId),
              eq(substitutionRequests.substituteId, userId)
            ));
          
          const questionnaireActivity = (questionnaireCount?.count || 0) > 0;
          const scheduleMinisterActivity = (scheduleMinisterCount?.count || 0) > 0;
          const scheduleSubstituteActivity = (scheduleSubstituteCount?.count || 0) > 0;
          const substitutionActivity = (substitutionCount?.count || 0) > 0;
          
          hasMinisterialActivity = questionnaireActivity || scheduleMinisterActivity || scheduleSubstituteActivity || substitutionActivity;
          
          if (hasMinisterialActivity) {
            const activities = [];
            if (questionnaireActivity) activities.push('questionários respondidos');
            if (scheduleMinisterActivity) activities.push('escalas como ministro');
            if (scheduleSubstituteActivity) activities.push('escalas como substituto');
            if (substitutionActivity) activities.push('solicitações de substituição');
            activityCheckReason = `Usuário tem atividade no sistema: ${activities.join(', ')}`;
          } else {
            activityCheckReason = "Nenhuma atividade ministerial encontrada - usuário pode ser excluído";
          }
        } catch (directError) {
          console.error("Direct DB query also failed:", directError);
          // Se nem isso funcionar, ser ultra-conservador e bloquear a exclusão
          return res.status(500).json({ 
            message: "Erro interno ao verificar atividades do usuário. Por segurança, a exclusão foi bloqueada.",
            shouldBlock: true,
            code: 'DATABASE_CONNECTIVITY_ERROR'
          });
        }
      }
      
      if (hasMinisterialActivity) {
        return res.status(409).json({ 
          message: activityCheckReason.includes("Não foi possível verificar") 
            ? "Erro ao verificar uso do usuário no banco de dados. Não é possível determinar se o usuário pode ser excluído com segurança."
            : activityCheckReason || "Usuário não pode ser excluído pois já foi utilizado no sistema",
          shouldBlock: true,
          code: activityCheckReason.includes("Não foi possível verificar") ? 'USAGE_CHECK_FAILED' : 'USER_HAS_ACTIVITY'
        });
      }
      
      // Coordenadores não podem excluir gestores
      if (currentUser?.role === 'coordenador' && targetUser.role === 'gestor') {
        return res.status(403).json({ 
          message: "Coordenadores não podem excluir gestores",
          shouldBlock: true 
        });
      }
      
      // Verificar se é o último gestor ativo
      if (targetUser.role === 'gestor') {
        const allUsers = await storage.getAllUsers();
        const activeGestores = allUsers.filter((u: User) => u.role === 'gestor' && u.status === 'active');
        if (activeGestores.length <= 1) {
          return res.status(409).json({ 
            message: "Não é possível excluir o último gestor ativo do sistema",
            shouldBlock: true 
          });
        }
      }
      
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      
      // More detailed error information for debugging
      let errorMessage = "Failed to delete user";
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        errorMessage = `Failed to delete user: ${error.message}`;
      }
      
      res.status(500).json({ 
        message: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Questionnaire routes
  app.get('/api/questionnaires', authenticateToken, async (req, res) => {
    try {
      const questionnaires = await storage.getQuestionnaires();
      res.json(questionnaires);
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
      res.status(500).json({ message: "Failed to fetch questionnaires" });
    }
  });

  app.post('/api/questionnaires', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const questionnaireData = insertQuestionnaireSchema.parse(req.body);
      const questionnaire = await storage.createQuestionnaire({
        ...questionnaireData,
        createdById: req.user?.id || '0'
      });
      res.status(201).json(questionnaire);
    } catch (error) {
      console.error("Error creating questionnaire:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid questionnaire data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create questionnaire" });
    }
  });

  app.get('/api/questionnaires/:id/responses', authenticateToken, async (req, res) => {
    try {
      const responses = await storage.getQuestionnaireResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching questionnaire responses:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire responses" });
    }
  });

  app.post('/api/questionnaires/:id/responses', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const responseData = {
        questionnaireId: req.params.id,
        userId: req.user?.id || '0',
        responses: req.body.responses,
        availableSundays: req.body.availableSundays,
        preferredMassTimes: req.body.preferredMassTimes,
        canSubstitute: req.body.canSubstitute,
        notes: req.body.notes
      };
      
      const response = await storage.submitQuestionnaireResponse(responseData);
      res.status(201).json(response);
    } catch (error) {
      console.error("Error submitting questionnaire response:", error);
      res.status(500).json({ message: "Failed to submit questionnaire response" });
    }
  });

  // Schedule routes
  app.get('/api/schedules', authenticateToken, async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const scheduleSummary = await storage.getSchedulesSummary(month, year);
      const assignments = await storage.getMonthAssignments(month, year);
      const substitutionsData = await storage.getMonthSubstitutions(month, year);

      res.json({
        schedules: scheduleSummary,
        assignments: assignments,
        substitutions: substitutionsData
      });
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const scheduleData = {
        ...req.body,
        createdById: req.user?.id
      };
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // NOTA: Rota movida para scheduleGenerationRouter em /api/schedules/by-date/:date
  // Mantida aqui comentada para referência
  /*
  app.get('/api/schedules/by-date/:date', authenticateToken, async (req, res) => {
    try {
      const date = req.params.date;
      const schedules = await storage.getSchedulesByDate(date);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules by date:", error);
      res.status(500).json({ message: "Failed to fetch schedules by date" });
    }
  });
  */

  app.get('/api/schedules/:id/assignments', authenticateToken, async (req, res) => {
    try {
      const assignments = await storage.getScheduleAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching schedule assignments:", error);
      res.status(500).json({ message: "Failed to fetch schedule assignments" });
    }
  });

  // Mass times routes
  app.get('/api/mass-times', authenticateToken, async (req, res) => {
    try {
      const massTimes = await storage.getMassTimes();
      res.json(massTimes);
    } catch (error) {
      console.error("Error fetching mass times:", error);
      res.status(500).json({ message: "Failed to fetch mass times" });
    }
  });

  app.post('/api/mass-times', authenticateToken, csrfProtection, async (req, res) => {
    try {
      const massTimeData = insertMassTimeSchema.parse(req.body);
      const massTime = await storage.createMassTime(massTimeData);
      res.status(201).json(massTime);
    } catch (error) {
      console.error("Error creating mass time:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mass time" });
    }
  });

  app.put('/api/mass-times/:id', authenticateToken, csrfProtection, async (req, res) => {
    try {
      const massTimeData = insertMassTimeSchema.partial().parse(req.body);
      const massTime = await storage.updateMassTime(req.params.id, massTimeData);
      res.json(massTime);
    } catch (error) {
      console.error("Error updating mass time:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update mass time" });
    }
  });

  app.delete('/api/mass-times/:id', authenticateToken, csrfProtection, async (req, res) => {
    try {
      await storage.deleteMassTime(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mass time:", error);
      res.status(500).json({ message: "Failed to delete mass time" });
    }
  });

  // Formation routes
  app.get('/api/formation/overview', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const overview = await buildFormationOverview(req.user?.id);
      res.json(overview);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar visão geral da formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Formation tracks
  app.get('/api/formation/tracks', authenticateToken, async (req, res) => {
    try {
      const tracks = await storage.getFormationTracks();
      res.json(tracks);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar trilhas de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.get('/api/formation/tracks/:id', authenticateToken, async (req, res) => {
    try {
      const track = await storage.getFormationTrackById(req.params.id);
      if (!track) {
        return res.status(404).json({ message: "Trilha de formação não encontrada" });
      }
      res.json(track);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar trilha de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Formation modules by track
  app.get('/api/formation/modules/:trackId', authenticateToken, async (req, res) => {
    try {
      const { trackId } = req.params;
      // Map short names to actual database IDs (development environment)
      const trackIdMap: { [key: string]: string } = {
        'liturgy': 'liturgy-track-1',
        'spirituality': 'spirituality-track-1', 
        'practical': 'practical-track-1',
        'liturgia': 'liturgy-track-1',
        'espiritualidade': 'spirituality-track-1', 
        'pratica': 'practical-track-1'
      };
      
      const fullTrackId = trackIdMap[trackId] || trackId;
      const modules = await storage.getFormationModules(fullTrackId);
      res.json(modules);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar módulos de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Formation lessons
  app.get('/api/formation/lessons', authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId } = req.query;
      const lessons = await storage.getFormationLessons(trackId as string, moduleId as string);
      res.json(lessons);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aulas de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // More specific route must come before single-parameter route
  app.get('/api/formation/lessons/:trackId/:moduleId', authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId } = req.params;
      const lessons = await storage.getFormationLessonsByTrackAndModule(trackId, moduleId);
      if (!lessons || lessons.length === 0) {
        return res.status(404).json({ message: "Aulas não encontradas para este módulo" });
      }
      res.json(lessons);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aulas do módulo");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.get('/api/formation/lessons/:id', authenticateToken, async (req, res) => {
    try {
      const lesson = await storage.getFormationLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Aula não encontrada" });
      }
      res.json(lesson);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Get specific lesson by track, module and lesson number (for URL like /formation/liturgia/1/1)
  app.get('/api/formation/:trackId/:moduleId/:lessonNumber', authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId, lessonNumber } = req.params;
      const detail = await fetchFormationLessonDetail({
        userId: (req as AuthRequest).user?.id,
        trackId,
        moduleId,
        lessonNumber: parseInt(lessonNumber, 10)
      });

      if (!detail) {
        return res.status(404).json({ message: "Aula não encontrada" });
      }

      res.json(detail);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aula completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Formation lesson sections
  app.get('/api/formation/lessons/:id/sections', authenticateToken, async (req, res) => {
    try {
      const sections = await storage.getFormationLessonSections(req.params.id);
      res.json(sections);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar seções da aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Formation progress
  app.get('/api/formation/progress', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const { trackId } = req.query;
      const progress = await listFormationProgressEntries({
        userId,
        trackId: trackId ? String(trackId) : undefined
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar progresso de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.post('/api/formation/progress', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const progressData = formationProgressUpdateSchema.parse(req.body);

      const progress = await upsertFormationLessonProgress({
        userId,
        lessonId: progressData.lessonId,
        isCompleted: progressData.isCompleted,
        timeSpent: progressData.timeSpent,
        progressPercentage: progressData.progressPercentage,
        completedSections: progressData.completedSections,
        quizScore: progressData.quizScore,
        notes: progressData.notes
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar progresso de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Mark lesson section as completed
  app.post('/api/formation/lessons/:lessonId/sections/:sectionId/complete', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const { lessonId, sectionId } = req.params;
      const progress = await markFormationSectionCompleted({
        userId,
        lessonId,
        sectionId
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "marcar seção como completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Mark entire lesson as completed
  app.post('/api/formation/lessons/:lessonId/complete', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const { lessonId } = req.params;
      const progress = await markFormationLessonCompleted({
        userId,
        lessonId
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "marcar aula como completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // Admin routes for managing formation content (restricted to coordinators and managers)
  app.post('/api/formation/tracks', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
    try {
      const trackData = insertFormationTrackSchema.parse(req.body);
      const track = await storage.createFormationTrack(trackData);
      res.status(201).json(track);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar trilha de formação");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.post('/api/formation/lessons', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
    try {
      const lessonData = insertFormationLessonSchema.parse(req.body);
      const lesson = await storage.createFormationLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.post('/api/formation/lessons/:id/sections', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
    try {
      const sectionData = insertFormationLessonSectionSchema.parse({
        ...req.body,
        lessonId: req.params.id
      });
      const section = await storage.createFormationLessonSection(sectionData);
      res.status(201).json(section);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar seção da aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  // DEV MODE ONLY: Role switcher for testing
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/switch-role', authenticateToken, async (req: AuthRequest, res) => {
      try {
        const { role } = req.body;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        // Validate role
        if (!['ministro', 'coordenador', 'gestor'].includes(role)) {
          return res.status(400).json({ message: 'Role inválido' });
        }

        // Update user role in database
        await storage.updateUser(userId, { role });

        res.json({
          message: `Role alterado para ${role} com sucesso`,
          role
        });
      } catch (error) {
        console.error('Error switching role:', error);
        res.status(500).json({ message: 'Erro ao alterar role' });
      }
    });
  }

  // TEMPORARY MIGRATION: Fix inconsistent substitution request status
  // This endpoint can be called once to fix old "pending" requests without substituteId
  app.post('/api/admin/migrate-substitution-status', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
    try {
      const { sql: sqlHelper, isNull, and } = await import('drizzle-orm');

      // Find affected requests
      const affectedRequests = await db
        .select({
          id: substitutionRequests.id,
          requesterId: substitutionRequests.requesterId,
          substituteId: substitutionRequests.substituteId,
          status: substitutionRequests.status,
          createdAt: substitutionRequests.createdAt,
        })
        .from(substitutionRequests)
        .where(
          and(
            eq(substitutionRequests.status, 'pending'),
            isNull(substitutionRequests.substituteId)
          )
        );

      if (affectedRequests.length === 0) {
        return res.json({
          success: true,
          message: 'Nenhum registro inconsistente encontrado. Base de dados está limpa!',
          affectedCount: 0
        });
      }

      // Update the status
      await db
        .update(substitutionRequests)
        .set({ status: 'available' })
        .where(
          and(
            eq(substitutionRequests.status, 'pending'),
            isNull(substitutionRequests.substituteId)
          )
        );

      logger.info('Migration: Fixed substitution status', {
        affectedCount: affectedRequests.length,
        userId: req.user?.id
      });

      res.json({
        success: true,
        message: `Migração concluída com sucesso! ${affectedRequests.length} registro(s) atualizado(s).`,
        affectedCount: affectedRequests.length,
        affectedRequests: affectedRequests.map(r => ({
          id: r.id,
          createdAt: r.createdAt
        }))
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao executar migração',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Global error handler for uncaught route errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('🚨 Route error:', err.message);

    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }

    // Always return 500 with safe error message
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: err.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server for real-time notifications
  const { initializeWebSocket } = await import('./websocket');
  initializeWebSocket(httpServer);

  return httpServer;
}
