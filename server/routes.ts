import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { authenticateToken, requireRole, AuthRequest } from "./auth";
import authRoutes from "./authRoutes";
import { passwordResetRoutes } from "./passwordResetRoutes";
import questionnaireAdminRoutes from "./routes/questionnaireAdmin";
import questionnaireRoutes from "./routes/questionnaires";
import scheduleGenerationRoutes from "./routes/scheduleGeneration";
import uploadRoutes from "./routes/upload";
import notificationsRoutes from "./routes/notifications";
import profileRoutes from "./routes/profile";
import reportsRoutes from "./routes/reports";
import { insertUserSchema, insertQuestionnaireSchema, insertMassTimeSchema, users, questionnaireResponses, schedules, substitutionRequests, type User } from "@shared/schema";
import { z } from "zod";
import { logger } from "./utils/logger";
import { db } from './db';
import { eq, count, or } from 'drizzle-orm';

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
  
  // Auth routes (nosso sistema próprio)
  app.use('/api/auth', authRoutes);
  
  // Password reset routes
  app.use('/api/password-reset', passwordResetRoutes);
  
  // Questionnaire routes (IMPORTANTE: registrar as rotas regulares ANTES das admin)
  app.use('/api/questionnaires', questionnaireRoutes);
  
  // Questionnaire admin routes
  app.use('/api/questionnaires/admin', questionnaireAdminRoutes);
  
  // Schedule generation routes
  app.use('/api/schedules', scheduleGenerationRoutes);
  
  // Upload routes
  app.use('/api/upload', uploadRoutes);
  
  // Notification routes
  app.use('/api/notifications', notificationsRoutes);

  // Reports routes
  app.use('/api/reports', reportsRoutes);

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

  app.put('/api/profile', authenticateToken, async (req: AuthRequest, res) => {
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
  app.post('/api/profile/family', authenticateToken, async (req: AuthRequest, res) => {
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
  app.delete('/api/profile/family/:id', authenticateToken, async (req: AuthRequest, res) => {
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
      const imageHash = require('crypto').createHash('md5').update(user.imageData).digest('hex');
      
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

  app.post('/api/users', authenticateToken, requireRole(['gestor']), async (req, res) => {
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

  app.put('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
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

  app.patch('/api/users/:id/status', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
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

  app.patch('/api/users/:id/role', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
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

  app.patch('/api/users/:id/block', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
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

  app.delete('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
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

  app.post('/api/questionnaires', authenticateToken, async (req: AuthRequest, res) => {
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

  app.post('/api/questionnaires/:id/responses', authenticateToken, async (req: AuthRequest, res) => {
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
      const schedules = await storage.getSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', authenticateToken, async (req: AuthRequest, res) => {
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

  app.post('/api/mass-times', authenticateToken, async (req, res) => {
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

  app.put('/api/mass-times/:id', authenticateToken, async (req, res) => {
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

  app.delete('/api/mass-times/:id', authenticateToken, async (req, res) => {
    try {
      await storage.deleteMassTime(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mass time:", error);
      res.status(500).json({ message: "Failed to delete mass time" });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
