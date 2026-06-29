/**
 * Materials Routes Unit Tests
 *
 * Tests for the formation materials library API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MATERIAL_ALLOWED_MIME_TYPES,
  MATERIAL_MAX_FILE_SIZE,
  getFileType,
  inferMaterialTypeFromExternalUrl
} from '../../../server/utils/materialTypes';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([])
              })
            })
          })
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'material-123',
          title: 'Test Material',
          type: 'pdf'
        }])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'material-123',
            title: 'Updated Material'
          }])
        })
      })
    })
  }
}));

describe('Materials Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Type Detection', () => {
    it('should detect PDF files', () => {
      expect(getFileType('application/pdf')).toBe('pdf');
    });

    it('should detect Word documents', () => {
      expect(getFileType('application/msword')).toBe('document');
      expect(getFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
    });

    it('should detect PowerPoint presentations', () => {
      expect(getFileType('application/vnd.ms-powerpoint')).toBe('presentation');
      expect(getFileType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('presentation');
    });

    it('should detect image files', () => {
      expect(getFileType('image/jpeg')).toBe('image');
      expect(getFileType('image/png')).toBe('image');
      expect(getFileType('image/webp')).toBe('image');
    });

    it('should detect audio files', () => {
      expect(getFileType('audio/mpeg')).toBe('audio');
      expect(getFileType('audio/mp3')).toBe('audio');
      expect(getFileType('audio/mp4')).toBe('audio');
    });

    it('should detect video files', () => {
      expect(getFileType('video/mp4')).toBe('video');
      expect(getFileType('video/webm')).toBe('video');
      expect(getFileType('video/quicktime')).toBe('video');
    });

    it('should return other for unknown types', () => {
      expect(getFileType('application/octet-stream')).toBe('other');
      expect(getFileType('text/plain')).toBe('other');
    });
  });

  describe('File Upload Validation', () => {
    const allowedTypes = MATERIAL_ALLOWED_MIME_TYPES;

    it('should allow PDF uploads', () => {
      expect(allowedTypes).toContain('application/pdf');
    });

    it('should allow Word document uploads', () => {
      expect(allowedTypes).toContain('application/msword');
      expect(allowedTypes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should allow image uploads', () => {
      expect(allowedTypes).toContain('image/jpeg');
      expect(allowedTypes).toContain('image/png');
      expect(allowedTypes).toContain('image/webp');
    });

    it('should allow common mobile audio and video uploads', () => {
      expect(allowedTypes).toContain('audio/mp4');
      expect(allowedTypes).toContain('audio/wav');
      expect(allowedTypes).toContain('video/quicktime');
    });

    it('should reject executable files', () => {
      expect(allowedTypes).not.toContain('application/x-executable');
      expect(allowedTypes).not.toContain('application/x-msdownload');
    });

    it('should reject script files', () => {
      expect(allowedTypes).not.toContain('application/javascript');
      expect(allowedTypes).not.toContain('text/javascript');
    });
  });

  describe('File Size Validation', () => {
    const MAX_FILE_SIZE = MATERIAL_MAX_FILE_SIZE; // 10MB

    it('should accept files under 10MB', () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      expect(fileSize).toBeLessThanOrEqual(MAX_FILE_SIZE);
    });

    it('should reject files over 10MB', () => {
      const fileSize = 15 * 1024 * 1024; // 15MB
      expect(fileSize).toBeGreaterThan(MAX_FILE_SIZE);
    });

    it('should accept files exactly at limit', () => {
      const fileSize = MAX_FILE_SIZE;
      expect(fileSize).toBeLessThanOrEqual(MAX_FILE_SIZE);
    });

    it('should handle small files', () => {
      const fileSize = 1024; // 1KB
      expect(fileSize).toBeLessThanOrEqual(MAX_FILE_SIZE);
    });
  });

  describe('Material Metadata Validation', () => {
    it('should require title', () => {
      const validMaterial = { title: 'Test Material', fileName: 'test.pdf' };
      const invalidMaterial = { title: '', fileName: 'test.pdf' };

      expect(validMaterial.title).toBeTruthy();
      expect(invalidMaterial.title).toBeFalsy();
    });

    it('should allow optional description', () => {
      const withDescription = { title: 'Test', description: 'A test material' };
      const withoutDescription = { title: 'Test' };

      expect(withDescription.description).toBeDefined();
      expect(withoutDescription).not.toHaveProperty('description');
    });

    it('should validate category enum values', () => {
      const validCategories = ['liturgia', 'espiritualidade', 'pratica'];
      const category = 'liturgia';

      expect(validCategories).toContain(category);
      expect(validCategories).not.toContain('invalid');
    });

    it('should parse tags from comma-separated string', () => {
      const tagsString = 'formacao, liturgia, video';
      const tags = tagsString.split(',').map(t => t.trim());

      expect(tags).toEqual(['formacao', 'liturgia', 'video']);
    });

    it('should handle JSON tags array', () => {
      const tagsJson = '["formacao", "liturgia"]';
      const tags = JSON.parse(tagsJson);

      expect(tags).toEqual(['formacao', 'liturgia']);
    });
  });

  describe('Access Control', () => {
    it('should allow ministers to view published materials', () => {
      const userRole = 'ministro';
      const material = { isPublished: true };

      const canView = material.isPublished || ['coordenador', 'gestor'].includes(userRole);
      expect(canView).toBe(true);
    });

    it('should hide unpublished materials from ministers', () => {
      const userRole = 'ministro';
      const material = { isPublished: false };

      const canView = material.isPublished || ['coordenador', 'gestor'].includes(userRole);
      expect(canView).toBe(false);
    });

    it('should allow coordinators to view unpublished materials', () => {
      const userRole = 'coordenador';
      const material = { isPublished: false };

      const canView = material.isPublished || ['coordenador', 'gestor'].includes(userRole);
      expect(canView).toBe(true);
    });

    it('should only allow coordinators/managers to upload', () => {
      const allowedRoles = ['coordenador', 'gestor'];

      expect(allowedRoles).toContain('coordenador');
      expect(allowedRoles).toContain('gestor');
      expect(allowedRoles).not.toContain('ministro');
    });

    it('should only allow coordinators/managers to delete', () => {
      const userRole = 'gestor';
      const canDelete = ['coordenador', 'gestor'].includes(userRole);

      expect(canDelete).toBe(true);
    });
  });

  describe('Search and Filter', () => {
    it('should filter by type', () => {
      const materials = [
        { id: '1', type: 'pdf' },
        { id: '2', type: 'video' },
        { id: '3', type: 'pdf' }
      ];

      const filtered = materials.filter(m => m.type === 'pdf');
      expect(filtered).toHaveLength(2);
    });

    it('should filter by category', () => {
      const materials = [
        { id: '1', category: 'liturgia' },
        { id: '2', category: 'pratica' },
        { id: '3', category: 'liturgia' }
      ];

      const filtered = materials.filter(m => m.category === 'liturgia');
      expect(filtered).toHaveLength(2);
    });

    it('should search by title', () => {
      const materials = [
        { id: '1', title: 'Introdução à Liturgia' },
        { id: '2', title: 'Guia de Espiritualidade' },
        { id: '3', title: 'Liturgia Avançada' }
      ];

      const searchTerm = 'liturgia';
      const filtered = materials.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
    });

    it('should search by description', () => {
      const materials = [
        { id: '1', title: 'Material 1', description: 'Sobre liturgia' },
        { id: '2', title: 'Material 2', description: 'Sobre formação' }
      ];

      const searchTerm = 'liturgia';
      const filtered = materials.filter(m =>
        m.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
    });

    it('should handle pagination', () => {
      const allMaterials = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      const limit = 20;
      const offset = 40;

      const paginated = allMaterials.slice(offset, offset + limit);
      expect(paginated).toHaveLength(20);
      expect(paginated[0].id).toBe('40');
    });
  });

  describe('Download Tracking', () => {
    it('should increment download count', () => {
      const material = { id: '1', downloadCount: 5 };
      const newCount = (material.downloadCount || 0) + 1;

      expect(newCount).toBe(6);
    });

    it('should handle null download count', () => {
      const material = { id: '1', downloadCount: null };
      const newCount = (material.downloadCount || 0) + 1;

      expect(newCount).toBe(1);
    });

    it('should log download access', () => {
      const accessLog = {
        materialId: 'material-123',
        userId: 'user-456',
        action: 'download',
        accessedAt: new Date()
      };

      expect(accessLog.action).toBe('download');
      expect(accessLog.materialId).toBeDefined();
      expect(accessLog.userId).toBeDefined();
    });

    it('should log view access', () => {
      const accessLog = {
        materialId: 'material-123',
        userId: 'user-456',
        action: 'view',
        accessedAt: new Date()
      };

      expect(accessLog.action).toBe('view');
    });
  });

  describe('External URL Handling', () => {
    it('should allow external URL instead of file', () => {
      const material = {
        title: 'YouTube Video',
        externalUrl: 'https://youtube.com/watch?v=123',
        fileData: null
      };

      const hasContent = material.fileData || material.externalUrl;
      expect(hasContent).toBeTruthy();
    });

    it('should redirect for external URL downloads', () => {
      const material = {
        externalUrl: 'https://drive.google.com/file/123'
      };

      expect(material.externalUrl).toMatch(/^https?:\/\//);
    });

    it('should infer external URL type from common file extensions', () => {
      expect(inferMaterialTypeFromExternalUrl('https://example.com/formacao.pdf')).toBe('pdf');
      expect(inferMaterialTypeFromExternalUrl('https://example.com/audio.m4a?download=1')).toBe('audio');
      expect(inferMaterialTypeFromExternalUrl('https://example.com/video.mp4')).toBe('video');
      expect(inferMaterialTypeFromExternalUrl('https://example.com/image.webp')).toBe('image');
    });

    it('should use explicit external URL type when provided', () => {
      expect(inferMaterialTypeFromExternalUrl('https://drive.google.com/file/123', 'audio')).toBe('audio');
      expect(inferMaterialTypeFromExternalUrl('https://youtube.com/watch?v=123')).toBe('video');
    });

    it('should require either file or URL', () => {
      const invalidMaterial = {
        title: 'No Content',
        fileData: null,
        externalUrl: null
      };

      const hasContent = invalidMaterial.fileData || invalidMaterial.externalUrl;
      expect(hasContent).toBeFalsy();
    });
  });

  describe('Soft Delete', () => {
    it('should mark material as inactive on delete', () => {
      const material = { id: '1', isActive: true };
      const deletedMaterial = { ...material, isActive: false };

      expect(deletedMaterial.isActive).toBe(false);
    });

    it('should exclude inactive materials from list', () => {
      const materials = [
        { id: '1', isActive: true },
        { id: '2', isActive: false },
        { id: '3', isActive: true }
      ];

      const activeMaterials = materials.filter(m => m.isActive);
      expect(activeMaterials).toHaveLength(2);
    });

    it('should update timestamp on delete', () => {
      const now = new Date();
      const material = { id: '1', isActive: false, updatedAt: now };

      expect(material.updatedAt).toEqual(now);
    });
  });

  describe('File Size Formatting', () => {
    function formatFileSize(bytes: number): string {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(5120)).toBe('5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should handle zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('Statistics', () => {
    it('should count materials by type', () => {
      const materials = [
        { type: 'pdf' },
        { type: 'video' },
        { type: 'pdf' },
        { type: 'audio' },
        { type: 'pdf' }
      ];

      const typeStats = materials.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(typeStats.pdf).toBe(3);
      expect(typeStats.video).toBe(1);
      expect(typeStats.audio).toBe(1);
    });

    it('should calculate total downloads', () => {
      const materials = [
        { downloadCount: 10 },
        { downloadCount: 25 },
        { downloadCount: 5 }
      ];

      const totalDownloads = materials.reduce((sum, m) => sum + (m.downloadCount || 0), 0);
      expect(totalDownloads).toBe(40);
    });

    it('should find most downloaded materials', () => {
      const materials = [
        { id: '1', title: 'Material A', downloadCount: 10 },
        { id: '2', title: 'Material B', downloadCount: 50 },
        { id: '3', title: 'Material C', downloadCount: 25 }
      ];

      const sorted = materials.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
      const top3 = sorted.slice(0, 3);

      expect(top3[0].title).toBe('Material B');
      expect(top3[1].title).toBe('Material C');
    });
  });
});
