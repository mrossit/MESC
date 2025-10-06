import { Router } from 'express';
import { db } from '../db';
import {
  formationTracks,
  formationModules,
  formationLessons,
  formationLessonSections,
  type InsertFormationTrack,
  type InsertFormationLesson,
  type InsertFormationLessonSection
} from '@shared/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { authenticateToken } from '../auth';

const router = Router();

// Middleware to check if user is gestor or coordenador
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || (req.user.role !== 'gestor' && req.user.role !== 'coordenador')) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Apenas gestores e coordenadores podem acessar esta funcionalidade'
    });
  }
  next();
}

// Apply authentication and admin check to all routes
router.use(authenticateToken, requireAdmin);

// ========================================
// FORMATION TRACKS
// ========================================

// Get all tracks
router.get('/tracks', async (req, res) => {
  try {
    const tracks = await db
      .select()
      .from(formationTracks)
      .orderBy(asc(formationTracks.orderIndex));

    res.json({ tracks });
  } catch (error: any) {
    console.error('Error fetching formation tracks:', error);
    res.status(500).json({
      error: 'Erro ao buscar trilhas de formação',
      message: error.message
    });
  }
});

// Get single track
router.get('/tracks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const track = await db
      .select()
      .from(formationTracks)
      .where(eq(formationTracks.id, id))
      .limit(1);

    if (track.length === 0) {
      return res.status(404).json({
        error: 'Trilha não encontrada',
        message: `Trilha com ID ${id} não encontrada`
      });
    }

    res.json({ track: track[0] });
  } catch (error: any) {
    console.error('Error fetching formation track:', error);
    res.status(500).json({
      error: 'Erro ao buscar trilha de formação',
      message: error.message
    });
  }
});

// Create new track
router.post('/tracks', async (req, res) => {
  try {
    const trackData: InsertFormationTrack = req.body;

    const newTrack = await db
      .insert(formationTracks)
      .values(trackData)
      .returning();

    res.status(201).json({
      message: 'Trilha criada com sucesso',
      track: newTrack[0]
    });
  } catch (error: any) {
    console.error('Error creating formation track:', error);
    res.status(500).json({
      error: 'Erro ao criar trilha de formação',
      message: error.message
    });
  }
});

// Update track
router.patch('/tracks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db
      .update(formationTracks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(formationTracks.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({
        error: 'Trilha não encontrada',
        message: `Trilha com ID ${id} não encontrada`
      });
    }

    res.json({
      message: 'Trilha atualizada com sucesso',
      track: updated[0]
    });
  } catch (error: any) {
    console.error('Error updating formation track:', error);
    res.status(500).json({
      error: 'Erro ao atualizar trilha de formação',
      message: error.message
    });
  }
});

// Delete track
router.delete('/tracks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if track has modules
    const modules = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.trackId, id));

    if (modules.length > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar',
        message: 'Esta trilha possui módulos. Delete os módulos primeiro ou desative a trilha.'
      });
    }

    const deleted = await db
      .delete(formationTracks)
      .where(eq(formationTracks.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        error: 'Trilha não encontrada',
        message: `Trilha com ID ${id} não encontrada`
      });
    }

    res.json({
      message: 'Trilha deletada com sucesso',
      track: deleted[0]
    });
  } catch (error: any) {
    console.error('Error deleting formation track:', error);
    res.status(500).json({
      error: 'Erro ao deletar trilha de formação',
      message: error.message
    });
  }
});

// ========================================
// FORMATION MODULES
// ========================================

// Get modules by track
router.get('/tracks/:trackId/modules', async (req, res) => {
  try {
    const { trackId } = req.params;

    const modules = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.trackId, trackId))
      .orderBy(asc(formationModules.orderIndex));

    res.json({ modules });
  } catch (error: any) {
    console.error('Error fetching formation modules:', error);
    res.status(500).json({
      error: 'Erro ao buscar módulos',
      message: error.message
    });
  }
});

// Get single module
router.get('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const module = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.id, id))
      .limit(1);

    if (module.length === 0) {
      return res.status(404).json({
        error: 'Módulo não encontrado',
        message: `Módulo com ID ${id} não encontrado`
      });
    }

    res.json({ module: module[0] });
  } catch (error: any) {
    console.error('Error fetching formation module:', error);
    res.status(500).json({
      error: 'Erro ao buscar módulo',
      message: error.message
    });
  }
});

// Create new module
router.post('/modules', async (req, res) => {
  try {
    const moduleData = req.body;

    const newModule = await db
      .insert(formationModules)
      .values(moduleData)
      .returning();

    res.status(201).json({
      message: 'Módulo criado com sucesso',
      module: newModule[0]
    });
  } catch (error: any) {
    console.error('Error creating formation module:', error);
    res.status(500).json({
      error: 'Erro ao criar módulo',
      message: error.message
    });
  }
});

// Update module
router.patch('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db
      .update(formationModules)
      .set(updates)
      .where(eq(formationModules.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({
        error: 'Módulo não encontrado',
        message: `Módulo com ID ${id} não encontrado`
      });
    }

    res.json({
      message: 'Módulo atualizado com sucesso',
      module: updated[0]
    });
  } catch (error: any) {
    console.error('Error updating formation module:', error);
    res.status(500).json({
      error: 'Erro ao atualizar módulo',
      message: error.message
    });
  }
});

// Delete module
router.delete('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if module has lessons
    const lessons = await db
      .select()
      .from(formationLessons)
      .where(eq(formationLessons.moduleId, id));

    if (lessons.length > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar',
        message: 'Este módulo possui lições. Delete as lições primeiro.'
      });
    }

    const deleted = await db
      .delete(formationModules)
      .where(eq(formationModules.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        error: 'Módulo não encontrado',
        message: `Módulo com ID ${id} não encontrado`
      });
    }

    res.json({
      message: 'Módulo deletado com sucesso',
      module: deleted[0]
    });
  } catch (error: any) {
    console.error('Error deleting formation module:', error);
    res.status(500).json({
      error: 'Erro ao deletar módulo',
      message: error.message
    });
  }
});

// ========================================
// FORMATION LESSONS
// ========================================

// Get lessons by module
router.get('/modules/:moduleId/lessons', async (req, res) => {
  try {
    const { moduleId } = req.params;

    const lessons = await db
      .select()
      .from(formationLessons)
      .where(eq(formationLessons.moduleId, moduleId))
      .orderBy(asc(formationLessons.orderIndex));

    res.json({ lessons });
  } catch (error: any) {
    console.error('Error fetching formation lessons:', error);
    res.status(500).json({
      error: 'Erro ao buscar lições',
      message: error.message
    });
  }
});

// Get single lesson
router.get('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await db
      .select()
      .from(formationLessons)
      .where(eq(formationLessons.id, id))
      .limit(1);

    if (lesson.length === 0) {
      return res.status(404).json({
        error: 'Lição não encontrada',
        message: `Lição com ID ${id} não encontrada`
      });
    }

    res.json({ lesson: lesson[0] });
  } catch (error: any) {
    console.error('Error fetching formation lesson:', error);
    res.status(500).json({
      error: 'Erro ao buscar lição',
      message: error.message
    });
  }
});

// Create new lesson
router.post('/lessons', async (req, res) => {
  try {
    const lessonData: InsertFormationLesson = req.body;

    const newLesson = await db
      .insert(formationLessons)
      .values(lessonData)
      .returning();

    res.status(201).json({
      message: 'Lição criada com sucesso',
      lesson: newLesson[0]
    });
  } catch (error: any) {
    console.error('Error creating formation lesson:', error);
    res.status(500).json({
      error: 'Erro ao criar lição',
      message: error.message
    });
  }
});

// Update lesson
router.patch('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db
      .update(formationLessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(formationLessons.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({
        error: 'Lição não encontrada',
        message: `Lição com ID ${id} não encontrada`
      });
    }

    res.json({
      message: 'Lição atualizada com sucesso',
      lesson: updated[0]
    });
  } catch (error: any) {
    console.error('Error updating formation lesson:', error);
    res.status(500).json({
      error: 'Erro ao atualizar lição',
      message: error.message
    });
  }
});

// Delete lesson
router.delete('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if lesson has sections
    const sections = await db
      .select()
      .from(formationLessonSections)
      .where(eq(formationLessonSections.lessonId, id));

    if (sections.length > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar',
        message: 'Esta lição possui seções. Delete as seções primeiro.'
      });
    }

    const deleted = await db
      .delete(formationLessons)
      .where(eq(formationLessons.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        error: 'Lição não encontrada',
        message: `Lição com ID ${id} não encontrada`
      });
    }

    res.json({
      message: 'Lição deletada com sucesso',
      lesson: deleted[0]
    });
  } catch (error: any) {
    console.error('Error deleting formation lesson:', error);
    res.status(500).json({
      error: 'Erro ao deletar lição',
      message: error.message
    });
  }
});

// ========================================
// FORMATION LESSON SECTIONS
// ========================================

// Get sections by lesson
router.get('/lessons/:lessonId/sections', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const sections = await db
      .select()
      .from(formationLessonSections)
      .where(eq(formationLessonSections.lessonId, lessonId))
      .orderBy(asc(formationLessonSections.orderIndex));

    res.json({ sections });
  } catch (error: any) {
    console.error('Error fetching lesson sections:', error);
    res.status(500).json({
      error: 'Erro ao buscar seções',
      message: error.message
    });
  }
});

// Get single section
router.get('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const section = await db
      .select()
      .from(formationLessonSections)
      .where(eq(formationLessonSections.id, id))
      .limit(1);

    if (section.length === 0) {
      return res.status(404).json({
        error: 'Seção não encontrada',
        message: `Seção com ID ${id} não encontrada`
      });
    }

    res.json({ section: section[0] });
  } catch (error: any) {
    console.error('Error fetching lesson section:', error);
    res.status(500).json({
      error: 'Erro ao buscar seção',
      message: error.message
    });
  }
});

// Create new section
router.post('/sections', async (req, res) => {
  try {
    const sectionData: InsertFormationLessonSection = req.body;

    const newSection = await db
      .insert(formationLessonSections)
      .values(sectionData)
      .returning();

    res.status(201).json({
      message: 'Seção criada com sucesso',
      section: newSection[0]
    });
  } catch (error: any) {
    console.error('Error creating lesson section:', error);
    res.status(500).json({
      error: 'Erro ao criar seção',
      message: error.message
    });
  }
});

// Update section
router.patch('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db
      .update(formationLessonSections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(formationLessonSections.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({
        error: 'Seção não encontrada',
        message: `Seção com ID ${id} não encontrada`
      });
    }

    res.json({
      message: 'Seção atualizada com sucesso',
      section: updated[0]
    });
  } catch (error: any) {
    console.error('Error updating lesson section:', error);
    res.status(500).json({
      error: 'Erro ao atualizar seção',
      message: error.message
    });
  }
});

// Delete section
router.delete('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(formationLessonSections)
      .where(eq(formationLessonSections.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        error: 'Seção não encontrada',
        message: `Seção com ID ${id} não encontrada`
      });
    }

    res.json({
      message: 'Seção deletada com sucesso',
      section: deleted[0]
    });
  } catch (error: any) {
    console.error('Error deleting lesson section:', error);
    res.status(500).json({
      error: 'Erro ao deletar seção',
      message: error.message
    });
  }
});

// Reorder sections
router.post('/lessons/:lessonId/sections/reorder', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { sectionIds } = req.body; // Array of section IDs in new order

    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'sectionIds deve ser um array'
      });
    }

    // Update order index for each section
    const updates = sectionIds.map((id, index) =>
      db
        .update(formationLessonSections)
        .set({ orderIndex: index })
        .where(eq(formationLessonSections.id, id))
    );

    await Promise.all(updates);

    res.json({
      message: 'Ordem das seções atualizada com sucesso'
    });
  } catch (error: any) {
    console.error('Error reordering sections:', error);
    res.status(500).json({
      error: 'Erro ao reordenar seções',
      message: error.message
    });
  }
});

export default router;
