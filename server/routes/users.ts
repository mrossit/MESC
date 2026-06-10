import { Router } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../auth";
import { isCoordinator as isCoordinatorRole } from "@shared/roles";
import { csrfProtection } from "../middleware/csrf";
import { stripHeavyFields, sanitizeUserData, handleApiError } from "../utils/routeHelpers";
import { insertUserSchema, users, questionnaireResponses, schedules, substitutionRequests, type User } from "@shared/schema";
import { z } from "zod";
import { db } from '../db';
import { eq, count, or } from 'drizzle-orm';

const router = Router();

router.get('/api/users/active', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await storage.getUsersByStatusPaginated('active', { limit, offset });
    // Strip imageData/passwordHash to avoid massive responses
    res.json({
      ...result,
      data: result.data.map(stripHeavyFields)
    });
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar usuários ativos");
    res.status(errorResponse.status).json(errorResponse);
  }
});

router.get('/api/users/pending', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await storage.getUsersByStatusPaginated('pending', { limit, offset });
    // Strip imageData/passwordHash to avoid massive responses
    res.json({
      ...result,
      data: result.data.map(stripHeavyFields)
    });
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar usuários pendentes");
    res.status(errorResponse.status).json(errorResponse);
  }
});

// User/Minister routes
router.get('/api/users', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
  try {
    // Prevent caching of sensitive user data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const status = req.query.status as string | undefined;

    const result = await storage.getUsersPaginated({ limit, offset, status });
    // Strip imageData/passwordHash to avoid massive responses
    res.json({
      ...result,
      data: result.data.map(stripHeavyFields)
    });
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar lista de usuários");
    res.status(errorResponse.status).json(errorResponse);
  }
});

router.get('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), async (req, res) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(stripHeavyFields(user));
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar usuário");
    res.status(errorResponse.status).json(errorResponse);
  }
});

// Rota para servir fotos de perfil
router.get('/api/users/:id/photo', authenticateToken, async (req, res) => {
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

router.post('/api/users', authenticateToken, requireRole(['gestor']), csrfProtection, async (req, res) => {
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

router.put('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
  try {
    const userData = insertUserSchema.partial().parse(req.body);
    
    // Remover campos sensíveis que devem usar rotas específicas
    const { role, status, ...safeUserData } = userData;
    
    const user = await storage.updateUser(req.params.id, safeUserData);
    res.json(stripHeavyFields(user));
  } catch (error) {
    const errorResponse = handleApiError(error, "atualizar usuário");
    res.status(errorResponse.status).json(errorResponse);
  }
});

router.patch('/api/users/:id/status', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
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

router.patch('/api/users/:id/role', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
  try {
    const roleUpdateSchema = z.object({
      role: z.enum(['gestor', 'reitor', 'coordenador', 'coordenador_comunidade', 'coordenador_paroquial', 'ministro'], {
        errorMap: () => ({ message: "Papel deve ser: gestor, reitor, coordenador (comunidade/paroquial) ou ministro" })
      })
    });
    
    const { role } = roleUpdateSchema.parse(req.body);
    
    // Permitir que coordenadores alterem seu próprio perfil, mas com restrições
    if (req.user?.id === req.params.id) {
      // Coordenadores podem se auto-promover ou rebaixar
      if (isCoordinatorRole(req.user?.role)) {
        // Coordenador pode mudar para ministro (rebaixar) ou gestor (promover)
        // Mas não pode mudar para o mesmo perfil
        if (isCoordinatorRole(role)) {
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

router.patch('/api/users/:id/block', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
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
router.get('/api/users/:id/check-usage', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
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

router.delete('/api/users/:id', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req: AuthRequest, res) => {
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
    if (isCoordinatorRole(currentUser?.role) && targetUser.role === 'gestor') {
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

export default router;
