import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../auth";
import { csrfProtection } from "../middleware/csrf";
import { handleApiError } from "../utils/routeHelpers";
import { insertFormationTrackSchema, insertFormationLessonSchema, insertFormationLessonSectionSchema } from "@shared/schema";
import { z } from "zod";
import {
  getFormationOverview as buildFormationOverview,
  getLessonDetail as fetchFormationLessonDetail,
  markLessonCompleted as markFormationLessonCompleted,
  markLessonSectionCompleted as markFormationSectionCompleted,
  upsertLessonProgressEntry as upsertFormationLessonProgress,
  listLessonProgressEntries as listFormationProgressEntries
} from "../services/formationService";

const formationProgressUpdateSchema = z.object({
  lessonId: z.string(),
  isCompleted: z.boolean().optional(),
  timeSpent: z.number().int().min(0).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  completedSections: z.array(z.string()).optional(),
  quizScore: z.number().optional(),
  notes: z.string().optional()
});

const router = Router();

// Formation overview
router.get('/api/formation/overview', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const overview = await buildFormationOverview(req.user?.id);
    res.json(overview);
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar visão geral da formação");
    res.status(errorResponse.status).json(errorResponse);
  }
});

// Formation tracks
router.get('/api/formation/tracks', authenticateToken, async (req, res) => {
  try {
    const tracks = await storage.getFormationTracks();
    res.json(tracks);
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar trilhas de formação");
    res.status(errorResponse.status).json(errorResponse);
  }
});

router.get('/api/formation/tracks/:id', authenticateToken, async (req, res) => {
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
router.get('/api/formation/modules/:trackId', authenticateToken, async (req, res) => {
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
router.get('/api/formation/lessons', authenticateToken, async (req, res) => {
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
router.get('/api/formation/lessons/:trackId/:moduleId', authenticateToken, async (req, res) => {
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

router.get('/api/formation/lessons/:id', authenticateToken, async (req, res) => {
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
router.get('/api/formation/:trackId/:moduleId/:lessonNumber', authenticateToken, async (req, res) => {
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
router.get('/api/formation/lessons/:id/sections', authenticateToken, async (req, res) => {
  try {
    const sections = await storage.getFormationLessonSections(req.params.id);
    res.json(sections);
  } catch (error) {
    const errorResponse = handleApiError(error, "buscar seções da aula");
    res.status(errorResponse.status).json(errorResponse);
  }
});

// Formation progress
router.get('/api/formation/progress', authenticateToken, async (req: AuthRequest, res) => {
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

router.post('/api/formation/progress', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
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
router.post('/api/formation/lessons/:lessonId/sections/:sectionId/complete', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
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
router.post('/api/formation/lessons/:lessonId/complete', authenticateToken, csrfProtection, async (req: AuthRequest, res) => {
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
router.post('/api/formation/tracks', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
  try {
    const trackData = insertFormationTrackSchema.parse(req.body);
    const track = await storage.createFormationTrack(trackData);
    res.status(201).json(track);
  } catch (error) {
    const errorResponse = handleApiError(error, "criar trilha de formação");
    res.status(errorResponse.status).json(errorResponse);
  }
});

router.post('/api/formation/lessons', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
  try {
    const lessonData = insertFormationLessonSchema.parse(req.body);
    const lesson = await storage.createFormationLesson(lessonData);
    res.status(201).json(lesson);
  } catch (error) {
    const errorResponse = handleApiError(error, "criar aula");
    res.status(errorResponse.status).json(errorResponse);
  }
});

router.post('/api/formation/lessons/:id/sections', authenticateToken, requireRole(['gestor', 'coordenador']), csrfProtection, async (req, res) => {
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

export default router;
