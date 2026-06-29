/**
 * Formation Materials Library Routes
 *
 * Handles file uploads, downloads, and management for training materials.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { isAdmin as isAdminRole } from '@shared/roles';
import { csrfProtection } from '../middleware/csrf';
import { db } from '../db';
import { formationMaterials, materialAccessLogs, formationTracks, users } from '@shared/schema';
import { eq, desc, and, ilike, or, sql, inArray } from 'drizzle-orm';
import { analyzeUploadedContent, generateQuizFromContent } from '../services/aiContentAnalyzer';
import {
  MATERIAL_ALLOWED_MIME_TYPES,
  MATERIAL_MAX_FILE_SIZE,
  type MaterialType,
  getFileType,
  inferMaterialTypeFromExternalUrl
} from '../utils/materialTypes';

const router = Router();

// Configure multer for file uploads (memory storage for base64 conversion)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MATERIAL_MAX_FILE_SIZE, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if ((MATERIAL_ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/materials
 * List all materials with optional filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      trackId,
      type,
      search,
      aiStatus,
      aiQuality,
      sortBy = 'date',
      sortOrder = 'desc',
      limit = '50',
      offset = '0'
    } = req.query;

    // Apply filters
    const conditions = [eq(formationMaterials.isActive, true)];

    if (category && category !== 'all') {
      conditions.push(eq(formationMaterials.category, category as 'liturgia' | 'espiritualidade' | 'pratica'));
    }

    if (trackId) {
      conditions.push(eq(formationMaterials.trackId, trackId as string));
    }

    if (type && type !== 'all') {
      conditions.push(eq(formationMaterials.type, type as 'pdf' | 'document' | 'video' | 'audio' | 'image' | 'presentation' | 'other'));
    }

    // AI status filter
    if (aiStatus === 'analyzed') {
      conditions.push(eq(formationMaterials.aiAnalyzed, true));
    } else if (aiStatus === 'pending') {
      conditions.push(or(
        eq(formationMaterials.aiAnalyzed, false),
        sql`${formationMaterials.aiAnalyzed} IS NULL`
      )!);
    }

    // AI quality filter
    if (aiQuality && aiQuality !== 'all') {
      conditions.push(eq(formationMaterials.aiContentQuality, aiQuality as string));
    }

    if (search) {
      conditions.push(
        or(
          ilike(formationMaterials.title, `%${search}%`),
          ilike(formationMaterials.description, `%${search}%`),
          ilike(formationMaterials.aiSummary, `%${search}%`)
        )!
      );
    }

    // Only show unpublished to coordinators/managers
    const userRole = req.user?.role;
    if (!isAdminRole(userRole)) {
      conditions.push(eq(formationMaterials.isPublished, true));
    }

    // Build order by clause
    let orderByClause;
    const isDesc = sortOrder === 'desc';
    switch (sortBy) {
      case 'title':
        orderByClause = isDesc ? desc(formationMaterials.title) : formationMaterials.title;
        break;
      case 'downloads':
        orderByClause = isDesc ? desc(formationMaterials.downloadCount) : formationMaterials.downloadCount;
        break;
      case 'quality':
        orderByClause = isDesc ? desc(formationMaterials.aiContentQuality) : formationMaterials.aiContentQuality;
        break;
      case 'date':
      default:
        orderByClause = isDesc ? desc(formationMaterials.createdAt) : formationMaterials.createdAt;
    }

    const materials = await db
      .select({
        id: formationMaterials.id,
        title: formationMaterials.title,
        description: formationMaterials.description,
        type: formationMaterials.type,
        category: formationMaterials.category,
        trackId: formationMaterials.trackId,
        fileName: formationMaterials.fileName,
        fileSize: formationMaterials.fileSize,
        mimeType: formationMaterials.mimeType,
        tags: formationMaterials.tags,
        downloadCount: formationMaterials.downloadCount,
        isPublished: formationMaterials.isPublished,
        createdAt: formationMaterials.createdAt,
        uploaderName: users.name,
        aiAnalyzed: formationMaterials.aiAnalyzed,
        aiContentQuality: formationMaterials.aiContentQuality,
        aiSummary: formationMaterials.aiSummary,
        aiKeyTopics: formationMaterials.aiKeyTopics
      })
      .from(formationMaterials)
      .leftJoin(users, eq(formationMaterials.uploadedBy, users.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formationMaterials)
      .where(and(...conditions));

    res.json({
      materials,
      total: countResult?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
});

/**
 * GET /api/materials/categories
 * Get available categories with material counts
 */
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const tracks = await db
      .select({
        id: formationTracks.id,
        title: formationTracks.title,
        category: formationTracks.category
      })
      .from(formationTracks)
      .where(eq(formationTracks.isActive, true));

    res.json({ tracks });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

/**
 * GET /api/materials/:id
 * Get material details (without file data)
 */
router.get('/:id([0-9a-fA-F-]{36})', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [material] = await db
      .select({
        id: formationMaterials.id,
        title: formationMaterials.title,
        description: formationMaterials.description,
        type: formationMaterials.type,
        category: formationMaterials.category,
        trackId: formationMaterials.trackId,
        fileName: formationMaterials.fileName,
        fileSize: formationMaterials.fileSize,
        mimeType: formationMaterials.mimeType,
        externalUrl: formationMaterials.externalUrl,
        tags: formationMaterials.tags,
        downloadCount: formationMaterials.downloadCount,
        isPublished: formationMaterials.isPublished,
        createdAt: formationMaterials.createdAt,
        uploaderName: users.name
      })
      .from(formationMaterials)
      .leftJoin(users, eq(formationMaterials.uploadedBy, users.id))
      .where(and(
        eq(formationMaterials.id, id),
        eq(formationMaterials.isActive, true)
      ));

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Log view access
    if (req.user?.id) {
      await db.insert(materialAccessLogs).values({
        materialId: id,
        userId: req.user.id,
        action: 'view'
      });
    }

    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Erro ao buscar material' });
  }
});

/**
 * GET /api/materials/:id/download
 * Download material file
 */
router.get('/:id([0-9a-fA-F-]{36})/download', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [material] = await db
      .select()
      .from(formationMaterials)
      .where(and(
        eq(formationMaterials.id, id),
        eq(formationMaterials.isActive, true)
      ));

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Check if it's an external URL
    if (material.externalUrl) {
      // Log download and redirect
      if (req.user?.id) {
        await db.insert(materialAccessLogs).values({
          materialId: id,
          userId: req.user.id,
          action: 'download'
        });

        await db.update(formationMaterials)
          .set({ downloadCount: (material.downloadCount || 0) + 1 })
          .where(eq(formationMaterials.id, id));
      }

      return res.redirect(material.externalUrl);
    }

    // For base64 stored files
    if (!material.fileData) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Log download
    if (req.user?.id) {
      await db.insert(materialAccessLogs).values({
        materialId: id,
        userId: req.user.id,
        action: 'download'
      });

      await db.update(formationMaterials)
        .set({ downloadCount: (material.downloadCount || 0) + 1 })
        .where(eq(formationMaterials.id, id));
    }

    // Convert base64 to buffer and send
    const fileBuffer = Buffer.from(material.fileData, 'base64');

    res.set({
      'Content-Type': material.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(material.fileName)}"`,
      'Content-Length': fileBuffer.length.toString()
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading material:', error);
    res.status(500).json({ error: 'Erro ao baixar material' });
  }
});

/**
 * POST /api/materials
 * Upload a new material (coordinators/managers only)
 */
router.post('/', requireRole(['coordenador', 'gestor']), csrfProtection, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, trackId, tags, externalUrl, isPublished, type } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    // Either file or external URL is required
    if (!req.file && !externalUrl) {
      return res.status(400).json({ error: 'Arquivo ou URL externa é obrigatório' });
    }

    let fileData: string | undefined;
    let fileName = 'external-link';
    let fileSize = 0;
    let mimeType = 'text/html';
    let fileType: MaterialType = 'other';

    if (req.file) {
      // Process uploaded file
      fileData = req.file.buffer.toString('base64');
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
      fileType = getFileType(mimeType);
    } else if (externalUrl) {
      // External URL
      fileName = title;
      fileType = inferMaterialTypeFromExternalUrl(externalUrl, type);
    }

    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);

    const [material] = await db.insert(formationMaterials).values({
      title,
      description: description || null,
      type: fileType,
      category: category || null,
      trackId: trackId || null,
      fileName,
      fileSize,
      mimeType,
      fileData: fileData || null,
      externalUrl: externalUrl || null,
      tags: parsedTags,
      uploadedBy: req.user!.id,
      isPublished: isPublished === 'true' || isPublished === true
    }).returning();

    // Trigger AI analysis in background (don't wait for it)
    if (req.file && process.env.ANTHROPIC_API_KEY) {
      analyzeUploadedContent(req.file.buffer, fileName, mimeType, title)
        .then(async (analysis) => {
          if (analysis.success) {
            await db.update(formationMaterials)
              .set({
                aiAnalyzed: true,
                aiSummary: analysis.summary,
                aiSuggestedCategory: analysis.suggestedCategory,
                aiSuggestedTags: analysis.suggestedTags,
                aiKeyTopics: analysis.keyTopics,
                aiContentQuality: analysis.contentQuality,
                aiQualityNotes: analysis.qualityNotes,
                aiQuizQuestions: analysis.quizQuestions,
                aiAnalyzedAt: new Date(),
                // Auto-apply suggestions if no category was set
                category: category || analysis.suggestedCategory,
                tags: parsedTags.length > 0 ? parsedTags : analysis.suggestedTags,
                description: description || analysis.suggestedDescription || analysis.summary
              })
              .where(eq(formationMaterials.id, material.id));
            console.log(`AI analysis completed for material ${material.id}`);
          }
        })
        .catch((err) => {
          console.error(`AI analysis failed for material ${material.id}:`, err);
        });
    }

    res.status(201).json({
      id: material.id,
      title: material.title,
      type: material.type,
      fileName: material.fileName,
      fileSize: material.fileSize,
      createdAt: material.createdAt,
      aiAnalysisPending: !!req.file && !!process.env.ANTHROPIC_API_KEY
    });
  } catch (error) {
    console.error('Error uploading material:', error);
    res.status(500).json({ error: 'Erro ao enviar material' });
  }
});

/**
 * PUT /api/materials/:id
 * Update material metadata (coordinators/managers only)
 */
router.put('/:id([0-9a-fA-F-]{36})', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, trackId, tags, isPublished } = req.body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category || null;
    if (trackId !== undefined) updateData.trackId = trackId || null;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const [material] = await db.update(formationMaterials)
      .set(updateData)
      .where(eq(formationMaterials.id, id))
      .returning();

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

/**
 * DELETE /api/materials/:id
 * Soft delete a material (coordinators/managers only)
 */
router.delete('/:id([0-9a-fA-F-]{36})', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [material] = await db.update(formationMaterials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(formationMaterials.id, id))
      .returning();

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    res.json({ message: 'Material removido com sucesso' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Erro ao remover material' });
  }
});

/**
 * GET /api/materials/stats
 * Get material usage statistics
 */
router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  try {
    // Total materials
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true));

    // Materials by type
    const typeStats = await db
      .select({
        type: formationMaterials.type,
        count: sql<number>`count(*)`
      })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true))
      .groupBy(formationMaterials.type);

    // Materials by category
    const categoryStats = await db
      .select({
        category: formationMaterials.category,
        count: sql<number>`count(*)`
      })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true))
      .groupBy(formationMaterials.category);

    // AI analyzed count
    const [aiAnalyzedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formationMaterials)
      .where(and(
        eq(formationMaterials.isActive, true),
        eq(formationMaterials.aiAnalyzed, true)
      ));

    // AI quality distribution
    const qualityStats = await db
      .select({
        quality: formationMaterials.aiContentQuality,
        count: sql<number>`count(*)`
      })
      .from(formationMaterials)
      .where(and(
        eq(formationMaterials.isActive, true),
        eq(formationMaterials.aiAnalyzed, true)
      ))
      .groupBy(formationMaterials.aiContentQuality);

    // Total downloads
    const [downloadResult] = await db
      .select({ total: sql<number>`coalesce(sum(download_count), 0)` })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true));

    // Total file size
    const [sizeResult] = await db
      .select({ total: sql<number>`coalesce(sum(file_size), 0)` })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true));

    // Most downloaded materials
    const topMaterials = await db
      .select({
        id: formationMaterials.id,
        title: formationMaterials.title,
        type: formationMaterials.type,
        category: formationMaterials.category,
        downloadCount: formationMaterials.downloadCount,
        aiContentQuality: formationMaterials.aiContentQuality
      })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true))
      .orderBy(desc(formationMaterials.downloadCount))
      .limit(5);

    // Recent materials
    const recentMaterials = await db
      .select({
        id: formationMaterials.id,
        title: formationMaterials.title,
        type: formationMaterials.type,
        category: formationMaterials.category,
        createdAt: formationMaterials.createdAt,
        aiContentQuality: formationMaterials.aiContentQuality
      })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true))
      .orderBy(desc(formationMaterials.createdAt))
      .limit(5);

    res.json({
      totalMaterials: totalResult?.count || 0,
      totalDownloads: downloadResult?.total || 0,
      totalSize: sizeResult?.total || 0,
      aiAnalyzed: aiAnalyzedResult?.count || 0,
      byType: typeStats,
      byCategory: categoryStats,
      byQuality: qualityStats,
      topMaterials,
      recentMaterials
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

/**
 * POST /api/materials/:id/analyze
 * Manually trigger AI analysis for a material (coordinators/managers only)
 */
router.post('/:id([0-9a-fA-F-]{36})/analyze', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Servico de IA nao configurado' });
    }

    const [material] = await db
      .select()
      .from(formationMaterials)
      .where(eq(formationMaterials.id, id));

    if (!material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    if (!material.fileData) {
      return res.status(400).json({ error: 'Material nao possui arquivo para analise' });
    }

    // Perform AI analysis
    const fileBuffer = Buffer.from(material.fileData, 'base64');
    const analysis = await analyzeUploadedContent(
      fileBuffer,
      material.fileName,
      material.mimeType,
      material.title
    );

    if (!analysis.success) {
      return res.status(500).json({ error: analysis.error || 'Falha na analise' });
    }

    // Update material with analysis results
    await db.update(formationMaterials)
      .set({
        aiAnalyzed: true,
        aiSummary: analysis.summary,
        aiSuggestedCategory: analysis.suggestedCategory,
        aiSuggestedTags: analysis.suggestedTags,
        aiKeyTopics: analysis.keyTopics,
        aiContentQuality: analysis.contentQuality,
        aiQualityNotes: analysis.qualityNotes,
        aiQuizQuestions: analysis.quizQuestions,
        aiAnalyzedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(formationMaterials.id, id));

    res.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        suggestedCategory: analysis.suggestedCategory,
        suggestedTags: analysis.suggestedTags,
        keyTopics: analysis.keyTopics,
        contentQuality: analysis.contentQuality,
        qualityNotes: analysis.qualityNotes,
        quizQuestions: analysis.quizQuestions?.length || 0
      }
    });
  } catch (error) {
    console.error('Error analyzing material:', error);
    res.status(500).json({ error: 'Erro ao analisar material' });
  }
});

/**
 * GET /api/materials/:id/analysis
 * Get AI analysis results for a material
 */
router.get('/:id([0-9a-fA-F-]{36})/analysis', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [material] = await db
      .select({
        id: formationMaterials.id,
        title: formationMaterials.title,
        aiAnalyzed: formationMaterials.aiAnalyzed,
        aiSummary: formationMaterials.aiSummary,
        aiSuggestedCategory: formationMaterials.aiSuggestedCategory,
        aiSuggestedTags: formationMaterials.aiSuggestedTags,
        aiKeyTopics: formationMaterials.aiKeyTopics,
        aiContentQuality: formationMaterials.aiContentQuality,
        aiQualityNotes: formationMaterials.aiQualityNotes,
        aiQuizQuestions: formationMaterials.aiQuizQuestions,
        aiAnalyzedAt: formationMaterials.aiAnalyzedAt
      })
      .from(formationMaterials)
      .where(eq(formationMaterials.id, id));

    if (!material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    if (!material.aiAnalyzed) {
      return res.json({
        analyzed: false,
        message: 'Material ainda nao foi analisado pela IA'
      });
    }

    res.json({
      analyzed: true,
      summary: material.aiSummary,
      suggestedCategory: material.aiSuggestedCategory,
      suggestedTags: material.aiSuggestedTags,
      keyTopics: material.aiKeyTopics,
      contentQuality: material.aiContentQuality,
      qualityNotes: material.aiQualityNotes,
      quizQuestions: material.aiQuizQuestions,
      analyzedAt: material.aiAnalyzedAt
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Erro ao buscar analise' });
  }
});

/**
 * POST /api/materials/:id/apply-suggestions
 * Apply AI suggestions to material metadata (coordinators/managers only)
 */
router.post('/:id([0-9a-fA-F-]{36})/apply-suggestions', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { applyCategory, applyTags, applyDescription } = req.body;

    const [material] = await db
      .select()
      .from(formationMaterials)
      .where(eq(formationMaterials.id, id));

    if (!material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    if (!material.aiAnalyzed) {
      return res.status(400).json({ error: 'Material ainda nao foi analisado' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (applyCategory && material.aiSuggestedCategory) {
      updates.category = material.aiSuggestedCategory;
    }

    if (applyTags && material.aiSuggestedTags) {
      updates.tags = material.aiSuggestedTags;
    }

    if (applyDescription && material.aiSummary) {
      updates.description = material.aiSummary;
    }

    await db.update(formationMaterials)
      .set(updates)
      .where(eq(formationMaterials.id, id));

    res.json({ success: true, appliedUpdates: Object.keys(updates).filter(k => k !== 'updatedAt') });
  } catch (error) {
    console.error('Error applying suggestions:', error);
    res.status(500).json({ error: 'Erro ao aplicar sugestoes' });
  }
});

/**
 * POST /api/materials/:id/generate-quiz
 * Generate quiz questions from material content (coordinators/managers only)
 */
router.post('/:id([0-9a-fA-F-]{36})/generate-quiz', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { numQuestions = 5 } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Servico de IA nao configurado' });
    }

    const [material] = await db
      .select()
      .from(formationMaterials)
      .where(eq(formationMaterials.id, id));

    if (!material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    if (!material.fileData) {
      return res.status(400).json({ error: 'Material nao possui conteudo para gerar quiz' });
    }

    // Extract text content
    const fileBuffer = Buffer.from(material.fileData, 'base64');
    const textContent = fileBuffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');

    if (textContent.length < 100) {
      return res.status(400).json({ error: 'Conteudo insuficiente para gerar quiz' });
    }

    const questions = await generateQuizFromContent(textContent, numQuestions);

    if (questions.length === 0) {
      return res.status(500).json({ error: 'Nao foi possivel gerar perguntas' });
    }

    // Save quiz questions to material
    await db.update(formationMaterials)
      .set({
        aiQuizQuestions: questions,
        updatedAt: new Date()
      })
      .where(eq(formationMaterials.id, id));

    res.json({
      success: true,
      questionsGenerated: questions.length,
      questions
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Erro ao gerar quiz' });
  }
});

/**
 * GET /api/materials/my-progress
 * Get user's reading/study progress
 */
router.get('/my-progress', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    // Get materials user has accessed
    const accessedMaterials = await db
      .select({
        materialId: materialAccessLogs.materialId,
        action: materialAccessLogs.action,
        accessedAt: materialAccessLogs.accessedAt
      })
      .from(materialAccessLogs)
      .where(eq(materialAccessLogs.userId, userId))
      .orderBy(desc(materialAccessLogs.accessedAt));

    // Group by material and get unique materials
    const materialAccess = new Map<string, { views: number; downloads: number; completed: boolean; lastAccess: Date }>();

    for (const log of accessedMaterials) {
      if (!materialAccess.has(log.materialId)) {
        materialAccess.set(log.materialId, { views: 0, downloads: 0, completed: false, lastAccess: log.accessedAt! });
      }
      const access = materialAccess.get(log.materialId)!;
      if (log.action === 'view') access.views++;
      if (log.action === 'download') access.downloads++;
      if (log.action === 'completed') access.completed = true;
    }

    // Get total materials count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formationMaterials)
      .where(and(
        eq(formationMaterials.isActive, true),
        eq(formationMaterials.isPublished, true)
      ));

    const totalMaterials = totalResult?.count || 0;
    const accessedCount = materialAccess.size;
    const completedCount = Array.from(materialAccess.values()).filter(a => a.completed).length;

    res.json({
      totalMaterials,
      accessed: accessedCount,
      completed: completedCount,
      progressPercent: totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0,
      materials: Object.fromEntries(materialAccess)
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

/**
 * POST /api/materials/:id/mark-completed
 * Mark a material as completed/studied by the user
 */
router.post('/:id([0-9a-fA-F-]{36})/mark-completed', csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    // Verify material exists
    const [material] = await db
      .select({ id: formationMaterials.id })
      .from(formationMaterials)
      .where(eq(formationMaterials.id, id));

    if (!material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    // Log completion
    await db.insert(materialAccessLogs).values({
      materialId: id,
      userId,
      action: 'completed'
    });

    res.json({ success: true, message: 'Material marcado como concluido' });
  } catch (error) {
    console.error('Error marking completed:', error);
    res.status(500).json({ error: 'Erro ao marcar como concluido' });
  }
});

/**
 * DELETE /api/materials/:id/mark-completed
 * Remove completed status from a material
 */
router.delete('/:id([0-9a-fA-F-]{36})/mark-completed', csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    // Remove completion logs for this user/material
    await db.delete(materialAccessLogs)
      .where(and(
        eq(materialAccessLogs.materialId, id),
        eq(materialAccessLogs.userId, userId),
        eq(materialAccessLogs.action, 'completed')
      ));

    res.json({ success: true, message: 'Marcacao removida' });
  } catch (error) {
    console.error('Error removing completion:', error);
    res.status(500).json({ error: 'Erro ao remover marcacao' });
  }
});

export default router;
