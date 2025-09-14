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
import { insertUserSchema, insertQuestionnaireSchema, insertMassTimeSchema } from "@shared/schema";
import { z } from "zod";
import { logger } from "./utils/logger";

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
        confirmationDate: req.body.confirmationDate,
        marriageDate: req.body.marriageDate,
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

  // Family routes placeholder
  app.get('/api/profile/family', authenticateToken, async (req: AuthRequest, res) => {
    // Por enquanto retorna array vazio
    res.json([]);
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
  app.get('/api/users', authenticateToken, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar lista de usuários");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.get('/api/users/:id', authenticateToken, async (req, res) => {
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

  app.post('/api/users', authenticateToken, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar usuário");
      res.status(errorResponse.status).json(errorResponse);
    }
  });

  app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Notification routes
  app.get('/api/notifications', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user?.id || '0');
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Endpoint temporário para seeding - REMOVER APÓS USO
  app.post('/api/admin/seed', async (req, res) => {
    try {
      const { hashPassword } = await import("./auth");
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      
      console.log('🔐 Executando seeding via API...');
      
      // Dados do administrador master
      const adminData = {
        email: 'rossit@icloud.com',
        password: '123Pegou$&@',
        name: 'Marco Rossit',
        role: 'gestor' as const,
      };
      
      // Hash da senha
      const passwordHash = await hashPassword(adminData.password);
      
      // Cria o usuário admin
      const [admin] = await db
        .insert(users)
        .values({
          email: adminData.email,
          passwordHash,
          name: adminData.name,
          role: adminData.role,
          status: 'active',
          requiresPasswordChange: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoNothing()
        .returning();
      
      if (admin) {
        console.log('✅ Usuário administrador criado com sucesso!');
        res.json({
          success: true,
          message: 'Usuário administrador criado com sucesso!',
          user: {
            email: adminData.email,
            name: adminData.name,
            role: adminData.role
          }
        });
      } else {
        console.log('ℹ️  Usuário administrador já existe.');
        res.json({
          success: true,
          message: 'Usuário administrador já existe.',
          user: {
            email: adminData.email,
            name: adminData.name,
            role: adminData.role
          }
        });
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário via API:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar usuário administrador',
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
