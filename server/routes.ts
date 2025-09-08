import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { authenticateToken, requireRole, AuthRequest } from "./auth";
import authRoutes from "./authRoutes";
import { passwordResetRoutes } from "./passwordResetRoutes";
import questionnaireAdminRoutes from "./routes/questionnaireAdmin";
import { insertUserSchema, insertQuestionnaireSchema, insertMassTimeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Cookie parser middleware
  app.use(cookieParser());
  
  // Auth routes (nosso sistema próprio)
  app.use('/api/auth', authRoutes);
  
  // Password reset routes
  app.use('/api/password-reset', passwordResetRoutes);
  
  // Questionnaire admin routes
  app.use('/api/questionnaires/admin', questionnaireAdminRoutes);
  

  // Get current user (compatível com novo sistema)
  app.get('/api/auth/user', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User/Minister routes
  app.get('/api/users', authenticateToken, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/users', authenticateToken, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
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
        createdById: req.user?.id
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

  const httpServer = createServer(app);
  return httpServer;
}
