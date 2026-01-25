/**
 * Formation Materials Library Routes
 *
 * Handles file uploads, downloads, and management for training materials.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { csrfProtection } from '../middleware/csrf';
import { db } from '../db';
import { formationMaterials, materialAccessLogs, formationTracks, users } from '@shared/schema';
import { eq, desc, and, ilike, or, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Configure multer for file uploads (memory storage for base64 conversion)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'audio/mpeg',
      'audio/mp3',
      'video/mp4',
      'video/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  }
});

// Get file type from mime type
function getFileType(mimeType: string): 'pdf' | 'document' | 'video' | 'audio' | 'image' | 'presentation' | 'other' {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/materials
 * List all materials with optional filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { category, trackId, type, search, limit = '50', offset = '0' } = req.query;

    let query = db
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
        uploaderName: users.name
      })
      .from(formationMaterials)
      .leftJoin(users, eq(formationMaterials.uploadedBy, users.id))
      .where(eq(formationMaterials.isActive, true))
      .orderBy(desc(formationMaterials.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Apply filters
    const conditions = [eq(formationMaterials.isActive, true)];

    if (category && category !== 'all') {
      conditions.push(eq(formationMaterials.category, category as any));
    }

    if (trackId) {
      conditions.push(eq(formationMaterials.trackId, trackId as string));
    }

    if (type && type !== 'all') {
      conditions.push(eq(formationMaterials.type, type as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(formationMaterials.title, `%${search}%`),
          ilike(formationMaterials.description, `%${search}%`)
        )!
      );
    }

    // Only show unpublished to coordinators/managers
    const userRole = req.user?.role;
    if (userRole !== 'coordenador' && userRole !== 'gestor') {
      conditions.push(eq(formationMaterials.isPublished, true));
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
        uploaderName: users.name
      })
      .from(formationMaterials)
      .leftJoin(users, eq(formationMaterials.uploadedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(formationMaterials.createdAt))
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
router.get('/:id', async (req: AuthRequest, res: Response) => {
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
router.get('/:id/download', async (req: AuthRequest, res: Response) => {
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
    const { title, description, category, trackId, tags, externalUrl, isPublished } = req.body;

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
    let fileType: 'pdf' | 'document' | 'video' | 'audio' | 'image' | 'presentation' | 'other' = 'other';

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
      fileType = 'other'; // Could try to detect from URL
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

    res.status(201).json({
      id: material.id,
      title: material.title,
      type: material.type,
      fileName: material.fileName,
      fileSize: material.fileSize,
      createdAt: material.createdAt
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
router.put('/:id', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, trackId, tags, isPublished } = req.body;

    const updateData: Record<string, any> = {
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
router.delete('/:id', requireRole(['coordenador', 'gestor']), csrfProtection, async (req: AuthRequest, res: Response) => {
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
 * Get material usage statistics (coordinators/managers only)
 */
router.get('/stats/overview', requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
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

    // Total downloads
    const [downloadResult] = await db
      .select({ total: sql<number>`coalesce(sum(download_count), 0)` })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true));

    // Most downloaded materials
    const topMaterials = await db
      .select({
        id: formationMaterials.id,
        title: formationMaterials.title,
        downloadCount: formationMaterials.downloadCount
      })
      .from(formationMaterials)
      .where(eq(formationMaterials.isActive, true))
      .orderBy(desc(formationMaterials.downloadCount))
      .limit(5);

    res.json({
      totalMaterials: totalResult?.count || 0,
      totalDownloads: downloadResult?.total || 0,
      byType: typeStats,
      topMaterials
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;
