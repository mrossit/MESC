import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
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
import scheduleImportExportRoutes from "./routes/scheduleImportExport";
import smartScheduleRoutes from "./routes/smartScheduleGeneration";
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
import dashboardRoutes from "./routes/dashboard";
import pushSubscriptionsRoutes from "./routes/pushSubscriptions";
import certificatesRoutes from "./routes/certificates";
import insightsRoutes from "./routes/insights";
import materialsRoutes from "./routes/materials";
import whatsappApiRoutes from "./routes/whatsapp-api";
import metricsRoutes from "./routes/metrics";
import reliabilityMetricsRoutes from "./routes/reliabilityMetrics";
import cronRoutes from "./routes/cron";
import escalaAlternativaRoutes from "./escala-alternativa/routes/escalaRoutes";
import adorationRoutes from "./routes/adoration";
import activityRoutes from "./routes/activity";
import gamificationRoutes from "./routes/gamification";
import massConfigRoutes from "./routes/massConfig";
import specialEventsRoutes from "./routes/specialEvents";
import questionMappingsRoutes from "./routes/questionMappings";
import learningPatternsRoutes from "./routes/learningPatterns";
import usersRoutes from "./routes/users";
import healthRoutes from "./routes/health";
import massTimesRoutes from "./routes/mass-times";
import formationRoutes from "./routes/formation";
import { insertQuestionnaireSchema, substitutionRequests } from "@shared/schema";
import { z } from "zod";
import { logger } from "./utils/logger";
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { sanitizeUserData, handleApiError } from "./utils/routeHelpers";

export async function registerRoutes(app: Express): Promise<Server> {
  // Cookie parser middleware
  app.use(cookieParser());

  // CRITICAL: No-cache headers for API routes (prevents stale data caching)
  app.use(noCacheHeaders);

  // CSRF token generator - gera token para todas as rotas
  app.use(csrfTokenGenerator);

  // Endpoint para obter token CSRF
  app.get('/api/csrf-token', getCsrfToken);

  // Health check & diagnostic routes
  app.use(healthRoutes);

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

  // Schedule import/export (xlsx) — restrito a admins (rollout faseado)
  app.use('/api/schedules', csrfProtection, scheduleImportExportRoutes);

  // Smart schedule generation routes (advanced algorithm) - com proteção CSRF
  app.use('/api/schedules', csrfProtection, smartScheduleRoutes);

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

  // Dashboard routes (apenas leitura, requer autenticação)
  app.use('/api/dashboard', authenticateToken, dashboardRoutes);
  app.use('/api/schedules/incomplete', authenticateToken, dashboardRoutes);

  // Push notification subscription routes (read endpoints sem CSRF, write endpoints com CSRF)
  app.use('/api/push-subscriptions', pushSubscriptionsRoutes);

  // Formation certificates routes
  app.use('/api/certificates', certificatesRoutes);

  // Predictive insights routes (coordenador/gestor only)
  app.use('/api/insights', insightsRoutes);

  // Formation materials library routes
  app.use('/api/materials', materialsRoutes);

  // Metrics routes (apenas para gestor/coordenador, apenas leitura)
  app.use('/api/metrics', metricsRoutes);

  // 🤖 ADAPTIVE LEARNING - Reliability metrics API (gestor/coordenador only)
  app.use('/api/reliability', csrfProtection, reliabilityMetricsRoutes);

  // 🤖 ADAPTIVE LEARNING - Cron/scheduled tasks (API key protected, no CSRF)
  app.use('/api/cron', cronRoutes);

  // Adoration draw routes (coordenador/gestor only, com proteção CSRF)
  app.use('/api/adoration', csrfProtection, adorationRoutes);

  // Activity logs routes
  app.use('/api/activity', activityRoutes);

  // Gamification routes
  app.use('/api/gamification', gamificationRoutes);

  // Mass Configuration System routes (Dynamic mass settings)
  app.use('/api/mass-config', csrfProtection, authenticateToken, requireRole(['coordenador', 'gestor']), massConfigRoutes);
  app.use('/api/special-events', csrfProtection, authenticateToken, requireRole(['coordenador', 'gestor']), specialEventsRoutes);
  app.use('/api/question-mappings', csrfProtection, authenticateToken, requireRole(['coordenador', 'gestor']), questionMappingsRoutes);
  app.use('/api/learning', csrfProtection, authenticateToken, requireRole(['coordenador', 'gestor']), learningPatternsRoutes);

  // Users routes (CRUD, status, role, block, delete, photo)
  app.use(usersRoutes);

  // Mass times routes (CRUD)
  app.use(massTimesRoutes);

  // Formation routes (overview, tracks, modules, lessons, progress, admin CRUD)
  app.use(formationRoutes);

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

      // 🤖 ADAPTIVE LEARNING: Hide reliability metrics from ministers
      const sanitizedUser = sanitizeUserData(user, req.user?.role);
      res.json(sanitizedUser);
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

      // 🤖 ADAPTIVE LEARNING: Hide reliability metrics from ministers
      const sanitizedUser = sanitizeUserData(user, req.user?.role);
      res.json(sanitizedUser);
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
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      if (errorObj.message === 'Relationship already exists') {
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

  // Dashboard stats
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar estatísticas do dashboard");
      res.status(errorResponse.status).json(errorResponse);
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
      const monthParsed = req.query.month ? parseInt(req.query.month as string) : NaN;
      const yearParsed = req.query.year ? parseInt(req.query.year as string) : NaN;
      const month = isNaN(monthParsed) ? undefined : monthParsed;
      const year = isNaN(yearParsed) ? undefined : yearParsed;

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
        if (!['ministro', 'coordenador', 'coordenador_comunidade', 'coordenador_paroquial', 'gestor', 'reitor'].includes(role)) {
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
        affectedRequests: affectedRequests.map((r: { id: string; createdAt: Date | null }) => ({
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
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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
