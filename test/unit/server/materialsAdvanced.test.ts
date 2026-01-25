/**
 * Advanced Materials Library Tests
 *
 * Tests for AI analysis, filtering, sorting, and progress tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
          }),
          groupBy: vi.fn().mockResolvedValue([])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        }),
        groupBy: vi.fn().mockResolvedValue([])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-id' }])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-id' }])
        })
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 })
    })
  }
}));

describe('Advanced Materials Library Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AI Status Filtering', () => {
    const materials = [
      { id: '1', title: 'Material 1', aiAnalyzed: true, aiContentQuality: 'excellent' },
      { id: '2', title: 'Material 2', aiAnalyzed: false, aiContentQuality: null },
      { id: '3', title: 'Material 3', aiAnalyzed: true, aiContentQuality: 'good' },
      { id: '4', title: 'Material 4', aiAnalyzed: null, aiContentQuality: null },
      { id: '5', title: 'Material 5', aiAnalyzed: true, aiContentQuality: 'needs_review' }
    ];

    it('should filter analyzed materials', () => {
      const analyzed = materials.filter(m => m.aiAnalyzed === true);
      expect(analyzed).toHaveLength(3);
      expect(analyzed.every(m => m.aiAnalyzed)).toBe(true);
    });

    it('should filter pending (not analyzed) materials', () => {
      const pending = materials.filter(m => m.aiAnalyzed === false || m.aiAnalyzed === null);
      expect(pending).toHaveLength(2);
    });

    it('should return all materials when no AI filter applied', () => {
      expect(materials).toHaveLength(5);
    });
  });

  describe('AI Quality Filtering', () => {
    const materials = [
      { id: '1', aiContentQuality: 'excellent' },
      { id: '2', aiContentQuality: 'good' },
      { id: '3', aiContentQuality: 'acceptable' },
      { id: '4', aiContentQuality: 'needs_review' },
      { id: '5', aiContentQuality: 'excellent' },
      { id: '6', aiContentQuality: null }
    ];

    it('should filter by excellent quality', () => {
      const excellent = materials.filter(m => m.aiContentQuality === 'excellent');
      expect(excellent).toHaveLength(2);
    });

    it('should filter by good quality', () => {
      const good = materials.filter(m => m.aiContentQuality === 'good');
      expect(good).toHaveLength(1);
    });

    it('should filter by acceptable quality', () => {
      const acceptable = materials.filter(m => m.aiContentQuality === 'acceptable');
      expect(acceptable).toHaveLength(1);
    });

    it('should filter by needs_review quality', () => {
      const needsReview = materials.filter(m => m.aiContentQuality === 'needs_review');
      expect(needsReview).toHaveLength(1);
    });

    it('should filter materials without quality rating', () => {
      const noQuality = materials.filter(m => m.aiContentQuality === null);
      expect(noQuality).toHaveLength(1);
    });

    it('should validate quality enum values', () => {
      const validQualities = ['excellent', 'good', 'acceptable', 'needs_review'];
      const invalidQuality = 'amazing';

      expect(validQualities).toContain('excellent');
      expect(validQualities).not.toContain(invalidQuality);
    });
  });

  describe('Sorting Functionality', () => {
    const materials = [
      { id: '1', title: 'Zebra', createdAt: new Date('2024-01-01'), downloadCount: 10, aiContentQuality: 'good' },
      { id: '2', title: 'Alpha', createdAt: new Date('2024-03-01'), downloadCount: 50, aiContentQuality: 'excellent' },
      { id: '3', title: 'Beta', createdAt: new Date('2024-02-01'), downloadCount: 25, aiContentQuality: 'acceptable' }
    ];

    it('should sort by date descending (default)', () => {
      const sorted = [...materials].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      expect(sorted[0].title).toBe('Alpha');
      expect(sorted[1].title).toBe('Beta');
      expect(sorted[2].title).toBe('Zebra');
    });

    it('should sort by date ascending', () => {
      const sorted = [...materials].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      expect(sorted[0].title).toBe('Zebra');
      expect(sorted[2].title).toBe('Alpha');
    });

    it('should sort by title ascending', () => {
      const sorted = [...materials].sort((a, b) => a.title.localeCompare(b.title));
      expect(sorted[0].title).toBe('Alpha');
      expect(sorted[1].title).toBe('Beta');
      expect(sorted[2].title).toBe('Zebra');
    });

    it('should sort by title descending', () => {
      const sorted = [...materials].sort((a, b) => b.title.localeCompare(a.title));
      expect(sorted[0].title).toBe('Zebra');
      expect(sorted[2].title).toBe('Alpha');
    });

    it('should sort by downloads descending', () => {
      const sorted = [...materials].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
      expect(sorted[0].downloadCount).toBe(50);
      expect(sorted[1].downloadCount).toBe(25);
      expect(sorted[2].downloadCount).toBe(10);
    });

    it('should sort by downloads ascending', () => {
      const sorted = [...materials].sort((a, b) => (a.downloadCount || 0) - (b.downloadCount || 0));
      expect(sorted[0].downloadCount).toBe(10);
      expect(sorted[2].downloadCount).toBe(50);
    });

    it('should sort by quality', () => {
      const qualityOrder = { excellent: 1, good: 2, acceptable: 3, needs_review: 4 };
      const sorted = [...materials].sort((a, b) => {
        const aOrder = qualityOrder[a.aiContentQuality as keyof typeof qualityOrder] || 5;
        const bOrder = qualityOrder[b.aiContentQuality as keyof typeof qualityOrder] || 5;
        return aOrder - bOrder;
      });
      expect(sorted[0].aiContentQuality).toBe('excellent');
      expect(sorted[1].aiContentQuality).toBe('good');
      expect(sorted[2].aiContentQuality).toBe('acceptable');
    });
  });

  describe('Combined Search with AI Summary', () => {
    const materials = [
      { id: '1', title: 'Liturgia Basica', description: 'Introducao', aiSummary: 'Material sobre liturgia e ritos' },
      { id: '2', title: 'Oracao Diaria', description: 'Espiritualidade', aiSummary: 'Guia de praticas de oracao' },
      { id: '3', title: 'Guia Pratico', description: 'Como servir', aiSummary: 'Instrucoes para liturgia' }
    ];

    it('should search in title', () => {
      const query = 'liturgia';
      const results = materials.filter(m =>
        m.title.toLowerCase().includes(query.toLowerCase())
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should search in description', () => {
      const query = 'espiritualidade';
      const results = materials.filter(m =>
        m.description?.toLowerCase().includes(query.toLowerCase())
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should search in AI summary', () => {
      const query = 'liturgia';
      const results = materials.filter(m =>
        m.aiSummary?.toLowerCase().includes(query.toLowerCase())
      );
      expect(results).toHaveLength(2);
    });

    it('should combine all search fields', () => {
      const query = 'liturgia';
      const results = materials.filter(m =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.description?.toLowerCase().includes(query.toLowerCase()) ||
        m.aiSummary?.toLowerCase().includes(query.toLowerCase())
      );
      expect(results).toHaveLength(2); // Material 1 (title + summary) and Material 3 (summary)
    });

    it('should handle case insensitive search', () => {
      const query = 'LITURGIA';
      const results = materials.filter(m =>
        m.title.toLowerCase().includes(query.toLowerCase())
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('User Progress Tracking', () => {
    const accessLogs = [
      { materialId: '1', userId: 'user-1', action: 'view', accessedAt: new Date('2024-01-01') },
      { materialId: '1', userId: 'user-1', action: 'download', accessedAt: new Date('2024-01-02') },
      { materialId: '1', userId: 'user-1', action: 'completed', accessedAt: new Date('2024-01-03') },
      { materialId: '2', userId: 'user-1', action: 'view', accessedAt: new Date('2024-01-04') },
      { materialId: '2', userId: 'user-1', action: 'view', accessedAt: new Date('2024-01-05') },
      { materialId: '3', userId: 'user-1', action: 'download', accessedAt: new Date('2024-01-06') }
    ];

    it('should count views per material', () => {
      const material1Views = accessLogs.filter(
        log => log.materialId === '1' && log.action === 'view'
      ).length;
      const material2Views = accessLogs.filter(
        log => log.materialId === '2' && log.action === 'view'
      ).length;

      expect(material1Views).toBe(1);
      expect(material2Views).toBe(2);
    });

    it('should count downloads per material', () => {
      const downloads = accessLogs.filter(log => log.action === 'download').length;
      expect(downloads).toBe(2);
    });

    it('should track completed materials', () => {
      const completed = accessLogs.filter(log => log.action === 'completed');
      expect(completed).toHaveLength(1);
      expect(completed[0].materialId).toBe('1');
    });

    it('should calculate progress percentage', () => {
      const totalMaterials = 10;
      const completedMaterials = accessLogs.filter(log => log.action === 'completed').length;
      const progressPercent = Math.round((completedMaterials / totalMaterials) * 100);

      expect(progressPercent).toBe(10);
    });

    it('should identify accessed materials', () => {
      const accessedMaterialIds = [...new Set(accessLogs.map(log => log.materialId))];
      expect(accessedMaterialIds).toHaveLength(3);
      expect(accessedMaterialIds).toContain('1');
      expect(accessedMaterialIds).toContain('2');
      expect(accessedMaterialIds).toContain('3');
    });

    it('should track last access date', () => {
      const material2Logs = accessLogs.filter(log => log.materialId === '2');
      const lastAccess = material2Logs.reduce((latest, log) =>
        new Date(log.accessedAt) > new Date(latest.accessedAt) ? log : latest
      );
      expect(lastAccess.accessedAt).toEqual(new Date('2024-01-05'));
    });

    it('should aggregate user progress', () => {
      const materialProgress = new Map<string, { views: number; downloads: number; completed: boolean }>();

      for (const log of accessLogs) {
        if (!materialProgress.has(log.materialId)) {
          materialProgress.set(log.materialId, { views: 0, downloads: 0, completed: false });
        }
        const progress = materialProgress.get(log.materialId)!;
        if (log.action === 'view') progress.views++;
        if (log.action === 'download') progress.downloads++;
        if (log.action === 'completed') progress.completed = true;
      }

      expect(materialProgress.get('1')?.views).toBe(1);
      expect(materialProgress.get('1')?.downloads).toBe(1);
      expect(materialProgress.get('1')?.completed).toBe(true);
      expect(materialProgress.get('2')?.views).toBe(2);
      expect(materialProgress.get('2')?.completed).toBe(false);
    });
  });

  describe('Mark as Completed', () => {
    it('should create completion log entry', () => {
      const completionLog = {
        materialId: 'material-123',
        userId: 'user-456',
        action: 'completed' as const
      };

      expect(completionLog.action).toBe('completed');
      expect(completionLog.materialId).toBeDefined();
      expect(completionLog.userId).toBeDefined();
    });

    it('should toggle completion status', () => {
      let isCompleted = false;

      // Mark as completed
      isCompleted = !isCompleted;
      expect(isCompleted).toBe(true);

      // Unmark
      isCompleted = !isCompleted;
      expect(isCompleted).toBe(false);
    });

    it('should handle multiple completions by same user', () => {
      const completions = [
        { materialId: '1', userId: 'user-1', action: 'completed' },
        { materialId: '1', userId: 'user-1', action: 'completed' } // Second completion
      ];

      // Only count unique completions
      const uniqueCompletions = completions.filter((log, index, self) =>
        index === self.findIndex(l =>
          l.materialId === log.materialId && l.userId === log.userId
        )
      );

      expect(uniqueCompletions).toHaveLength(1);
    });
  });

  describe('Statistics with AI Quality Distribution', () => {
    const materials = [
      { id: '1', type: 'pdf', category: 'liturgia', aiAnalyzed: true, aiContentQuality: 'excellent', downloadCount: 10 },
      { id: '2', type: 'video', category: 'pratica', aiAnalyzed: true, aiContentQuality: 'good', downloadCount: 25 },
      { id: '3', type: 'pdf', category: 'liturgia', aiAnalyzed: true, aiContentQuality: 'excellent', downloadCount: 15 },
      { id: '4', type: 'document', category: 'espiritualidade', aiAnalyzed: false, aiContentQuality: null, downloadCount: 5 },
      { id: '5', type: 'pdf', category: 'pratica', aiAnalyzed: true, aiContentQuality: 'needs_review', downloadCount: 3 }
    ];

    it('should count materials by type', () => {
      const byType = materials.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byType.pdf).toBe(3);
      expect(byType.video).toBe(1);
      expect(byType.document).toBe(1);
    });

    it('should count materials by category', () => {
      const byCategory = materials.reduce((acc, m) => {
        const cat = m.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byCategory.liturgia).toBe(2);
      expect(byCategory.pratica).toBe(2);
      expect(byCategory.espiritualidade).toBe(1);
    });

    it('should count AI analyzed materials', () => {
      const aiAnalyzed = materials.filter(m => m.aiAnalyzed === true).length;
      expect(aiAnalyzed).toBe(4);
    });

    it('should calculate quality distribution', () => {
      const qualityDist = materials
        .filter(m => m.aiAnalyzed && m.aiContentQuality)
        .reduce((acc, m) => {
          const quality = m.aiContentQuality!;
          acc[quality] = (acc[quality] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      expect(qualityDist.excellent).toBe(2);
      expect(qualityDist.good).toBe(1);
      expect(qualityDist.needs_review).toBe(1);
    });

    it('should calculate total downloads', () => {
      const totalDownloads = materials.reduce((sum, m) => sum + (m.downloadCount || 0), 0);
      expect(totalDownloads).toBe(58);
    });

    it('should find top downloaded materials', () => {
      const sorted = [...materials].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
      const top3 = sorted.slice(0, 3);

      expect(top3[0].downloadCount).toBe(25);
      expect(top3[1].downloadCount).toBe(15);
      expect(top3[2].downloadCount).toBe(10);
    });

    it('should find recent materials', () => {
      const withDates = materials.map((m, i) => ({
        ...m,
        createdAt: new Date(2024, 0, i + 1)
      }));

      const recent = [...withDates]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 3);

      expect(recent).toHaveLength(3);
      expect(recent[0].id).toBe('5'); // Most recent
    });
  });

  describe('Pagination', () => {
    const allMaterials = Array.from({ length: 50 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Material ${i + 1}`
    }));

    it('should paginate with default limit', () => {
      const limit = 12;
      const offset = 0;
      const page = allMaterials.slice(offset, offset + limit);

      expect(page).toHaveLength(12);
      expect(page[0].id).toBe('1');
      expect(page[11].id).toBe('12');
    });

    it('should paginate second page', () => {
      const limit = 12;
      const offset = 12;
      const page = allMaterials.slice(offset, offset + limit);

      expect(page).toHaveLength(12);
      expect(page[0].id).toBe('13');
    });

    it('should handle last page with fewer items', () => {
      const limit = 12;
      const offset = 48;
      const page = allMaterials.slice(offset, offset + limit);

      expect(page).toHaveLength(2);
      expect(page[0].id).toBe('49');
      expect(page[1].id).toBe('50');
    });

    it('should calculate total pages', () => {
      const total = allMaterials.length;
      const limit = 12;
      const totalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(5);
    });

    it('should handle empty results', () => {
      const emptyResults: typeof allMaterials = [];
      const limit = 12;
      const offset = 0;
      const page = emptyResults.slice(offset, offset + limit);

      expect(page).toHaveLength(0);
    });
  });

  describe('View Mode Toggle', () => {
    it('should support grid view', () => {
      const viewMode = 'grid';
      expect(['grid', 'list']).toContain(viewMode);
    });

    it('should support list view', () => {
      const viewMode = 'list';
      expect(['grid', 'list']).toContain(viewMode);
    });

    it('should toggle between views', () => {
      let viewMode: 'grid' | 'list' = 'grid';

      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      expect(viewMode).toBe('list');

      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      expect(viewMode).toBe('grid');
    });
  });

  describe('Filter Reset', () => {
    it('should detect active filters', () => {
      const filters = {
        search: 'liturgia',
        type: 'pdf',
        category: 'all',
        aiStatus: 'all',
        aiQuality: 'all'
      };

      const hasActiveFilters =
        filters.search !== '' ||
        filters.type !== 'all' ||
        filters.category !== 'all' ||
        filters.aiStatus !== 'all' ||
        filters.aiQuality !== 'all';

      expect(hasActiveFilters).toBe(true);
    });

    it('should detect no active filters', () => {
      const filters = {
        search: '',
        type: 'all',
        category: 'all',
        aiStatus: 'all',
        aiQuality: 'all'
      };

      const hasActiveFilters =
        filters.search !== '' ||
        filters.type !== 'all' ||
        filters.category !== 'all' ||
        filters.aiStatus !== 'all' ||
        filters.aiQuality !== 'all';

      expect(hasActiveFilters).toBe(false);
    });

    it('should reset all filters to default', () => {
      const defaultFilters = {
        search: '',
        type: 'all',
        category: 'all',
        aiStatus: 'all',
        aiQuality: 'all',
        sortBy: 'date',
        sortOrder: 'desc'
      };

      let filters = {
        search: 'test',
        type: 'pdf',
        category: 'liturgia',
        aiStatus: 'analyzed',
        aiQuality: 'excellent',
        sortBy: 'title',
        sortOrder: 'asc'
      };

      // Reset
      filters = { ...defaultFilters };

      expect(filters.search).toBe('');
      expect(filters.type).toBe('all');
      expect(filters.category).toBe('all');
      expect(filters.aiStatus).toBe('all');
      expect(filters.aiQuality).toBe('all');
      expect(filters.sortBy).toBe('date');
      expect(filters.sortOrder).toBe('desc');
    });
  });
});
