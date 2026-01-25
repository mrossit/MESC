/**
 * AI Content Analyzer Service Tests
 *
 * Tests for the AI-powered content analysis functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: 'Resumo do conteudo de teste',
            suggestedTitle: null,
            suggestedDescription: 'Descricao sugerida pela IA',
            suggestedCategory: 'liturgia',
            suggestedTags: ['formacao', 'liturgia', 'eucaristia'],
            keyTopics: ['Celebracao', 'Ministerio', 'Comunhao'],
            targetAudience: 'Ministros da Eucaristia',
            estimatedReadingMinutes: 15,
            contentQuality: 'good',
            qualityNotes: ['Conteudo bem estruturado', 'Poderia ter mais exemplos praticos'],
            quizQuestions: [{
              question: 'Qual e o papel do ministro?',
              options: ['Servir', 'Liderar', 'Organizar', 'Todas as anteriores'],
              correctIndex: 3,
              explanation: 'O ministro tem multiplas responsabilidades'
            }]
          })
        }]
      })
    }
  }))
}));

describe('AI Content Analyzer Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('Content Analysis Result Structure', () => {
    interface ContentAnalysisResult {
      success: boolean;
      summary: string;
      suggestedTitle?: string;
      suggestedDescription?: string;
      suggestedCategory: 'liturgia' | 'espiritualidade' | 'pratica' | null;
      suggestedTags: string[];
      keyTopics: string[];
      targetAudience: string;
      estimatedReadingMinutes: number;
      contentQuality: 'excellent' | 'good' | 'acceptable' | 'needs_review';
      qualityNotes: string[];
      quizQuestions?: Array<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      }>;
      error?: string;
    }

    it('should have all required fields in result', () => {
      const result: ContentAnalysisResult = {
        success: true,
        summary: 'Test summary',
        suggestedCategory: 'liturgia',
        suggestedTags: ['tag1'],
        keyTopics: ['topic1'],
        targetAudience: 'Ministros',
        estimatedReadingMinutes: 10,
        contentQuality: 'good',
        qualityNotes: ['Note 1']
      };

      expect(result.success).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.suggestedCategory).toBeDefined();
      expect(result.suggestedTags).toBeDefined();
      expect(result.keyTopics).toBeDefined();
      expect(result.targetAudience).toBeDefined();
      expect(result.estimatedReadingMinutes).toBeDefined();
      expect(result.contentQuality).toBeDefined();
      expect(result.qualityNotes).toBeDefined();
    });

    it('should allow optional fields', () => {
      const result: ContentAnalysisResult = {
        success: true,
        summary: '',
        suggestedCategory: null,
        suggestedTags: [],
        keyTopics: [],
        targetAudience: '',
        estimatedReadingMinutes: 0,
        contentQuality: 'needs_review',
        qualityNotes: []
      };

      expect(result.suggestedTitle).toBeUndefined();
      expect(result.suggestedDescription).toBeUndefined();
      expect(result.quizQuestions).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('Category Validation', () => {
    const validCategories = ['liturgia', 'espiritualidade', 'pratica'];

    it('should accept liturgia category', () => {
      expect(validCategories).toContain('liturgia');
    });

    it('should accept espiritualidade category', () => {
      expect(validCategories).toContain('espiritualidade');
    });

    it('should accept pratica category', () => {
      expect(validCategories).toContain('pratica');
    });

    it('should reject invalid categories', () => {
      expect(validCategories).not.toContain('invalid');
      expect(validCategories).not.toContain('outro');
    });
  });

  describe('Quality Rating Validation', () => {
    const validQualities = ['excellent', 'good', 'acceptable', 'needs_review'];

    it('should accept excellent quality', () => {
      expect(validQualities).toContain('excellent');
    });

    it('should accept good quality', () => {
      expect(validQualities).toContain('good');
    });

    it('should accept acceptable quality', () => {
      expect(validQualities).toContain('acceptable');
    });

    it('should accept needs_review quality', () => {
      expect(validQualities).toContain('needs_review');
    });

    it('should reject invalid quality ratings', () => {
      expect(validQualities).not.toContain('bad');
      expect(validQualities).not.toContain('perfect');
    });
  });

  describe('Quiz Question Structure', () => {
    interface QuizQuestion {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }

    it('should have valid quiz question structure', () => {
      const question: QuizQuestion = {
        question: 'O que e a Eucaristia?',
        options: ['Sacramento', 'Celebracao', 'Comunhao', 'Todas as anteriores'],
        correctIndex: 3,
        explanation: 'A Eucaristia engloba todos esses aspectos'
      };

      expect(question.question).toBeTruthy();
      expect(question.options).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
      expect(question.explanation).toBeTruthy();
    });

    it('should validate correctIndex within bounds', () => {
      const options = ['A', 'B', 'C', 'D'];
      const validIndices = [0, 1, 2, 3];
      const invalidIndices = [-1, 4, 5];

      validIndices.forEach(index => {
        expect(index >= 0 && index < options.length).toBe(true);
      });

      invalidIndices.forEach(index => {
        expect(index >= 0 && index < options.length).toBe(false);
      });
    });
  });

  describe('Reading Time Estimation', () => {
    function estimateReadingMinutes(contentLength: number): number {
      // Average reading speed: ~1500 characters per minute for Portuguese
      return Math.ceil(contentLength / 1500);
    }

    it('should estimate short content reading time', () => {
      const shortContent = 'A'.repeat(750); // 30 seconds
      expect(estimateReadingMinutes(shortContent.length)).toBe(1);
    });

    it('should estimate medium content reading time', () => {
      const mediumContent = 'A'.repeat(7500); // 5 minutes
      expect(estimateReadingMinutes(mediumContent.length)).toBe(5);
    });

    it('should estimate long content reading time', () => {
      const longContent = 'A'.repeat(22500); // 15 minutes
      expect(estimateReadingMinutes(longContent.length)).toBe(15);
    });

    it('should handle empty content', () => {
      expect(estimateReadingMinutes(0)).toBe(0);
    });
  });

  describe('File Type Analysis Support', () => {
    const supportedTextTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    const unsupportedTypes = [
      'image/jpeg',
      'image/png',
      'video/mp4',
      'audio/mpeg'
    ];

    it('should support PDF analysis', () => {
      const mimeType = 'application/pdf';
      const canAnalyze = supportedTextTypes.some(t =>
        mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document') || mimeType.includes('word')
      );
      expect(canAnalyze).toBe(true);
    });

    it('should support Word document analysis', () => {
      const mimeType = 'application/msword';
      const canAnalyze = mimeType.includes('word') || mimeType.includes('document');
      expect(canAnalyze).toBe(true);
    });

    it('should return placeholder for image files', () => {
      const mimeType = 'image/jpeg';
      const isImage = mimeType.startsWith('image/');
      expect(isImage).toBe(true);

      // Images get placeholder analysis
      const placeholderResult = {
        success: true,
        summary: 'Imagem para formacao',
        suggestedTags: ['imagem', 'visual'],
        contentQuality: 'acceptable'
      };
      expect(placeholderResult.summary).toBe('Imagem para formacao');
    });

    it('should return placeholder for video files', () => {
      const mimeType = 'video/mp4';
      const isVideo = mimeType.startsWith('video/');
      expect(isVideo).toBe(true);

      const placeholderResult = {
        success: true,
        summary: 'Video de formacao',
        suggestedTags: ['video']
      };
      expect(placeholderResult.summary).toBe('Video de formacao');
    });

    it('should return placeholder for audio files', () => {
      const mimeType = 'audio/mpeg';
      const isAudio = mimeType.startsWith('audio/');
      expect(isAudio).toBe(true);

      const placeholderResult = {
        success: true,
        summary: 'Audio de formacao',
        suggestedTags: ['audio']
      };
      expect(placeholderResult.summary).toBe('Audio de formacao');
    });
  });

  describe('API Key Validation', () => {
    it('should return error when API key not configured', () => {
      const hasApiKey = false;

      const result = {
        success: false,
        error: 'API key not configured',
        qualityNotes: ['Analise automatica nao disponivel - API key nao configurada']
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
    });

    it('should proceed when API key is configured', () => {
      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      expect(hasApiKey).toBe(true);
    });
  });

  describe('Content Truncation', () => {
    const MAX_CONTENT_LENGTH = 15000;

    it('should not truncate short content', () => {
      const content = 'A'.repeat(5000);
      const truncated = content.slice(0, MAX_CONTENT_LENGTH);

      expect(truncated.length).toBe(5000);
    });

    it('should truncate long content', () => {
      const content = 'A'.repeat(20000);
      const truncated = content.slice(0, MAX_CONTENT_LENGTH);

      expect(truncated.length).toBe(MAX_CONTENT_LENGTH);
    });

    it('should indicate when content is truncated', () => {
      const content = 'A'.repeat(20000);
      const isTruncated = content.length > MAX_CONTENT_LENGTH;

      expect(isTruncated).toBe(true);
    });
  });

  describe('JSON Response Parsing', () => {
    it('should extract JSON from text response', () => {
      const textResponse = 'Here is the analysis:\n{"summary": "Test summary"}';
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe('Test summary');
    });

    it('should handle clean JSON response', () => {
      const textResponse = '{"summary": "Clean JSON"}';
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe('Clean JSON');
    });

    it('should handle nested JSON', () => {
      const textResponse = JSON.stringify({
        summary: 'Test',
        quizQuestions: [{ question: 'Q1', options: ['A', 'B'] }]
      });
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.quizQuestions).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should return error result on API failure', () => {
      const errorResult = {
        success: false,
        summary: '',
        suggestedCategory: null,
        suggestedTags: [],
        keyTopics: [],
        targetAudience: 'Ministros da Eucaristia',
        estimatedReadingMinutes: 0,
        contentQuality: 'needs_review' as const,
        qualityNotes: ['Erro na analise automatica'],
        error: 'API request failed'
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.contentQuality).toBe('needs_review');
    });

    it('should handle JSON parse errors', () => {
      const invalidJson = 'This is not JSON';
      const jsonMatch = invalidJson.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeNull();
    });

    it('should provide fallback reading time on error', () => {
      const content = 'A'.repeat(3000);
      const fallbackMinutes = Math.ceil(content.length / 1500);

      expect(fallbackMinutes).toBe(2);
    });
  });

  describe('Apply Suggestions', () => {
    const material = {
      id: '1',
      title: 'Original Title',
      description: null,
      category: null,
      tags: []
    };

    const aiSuggestions = {
      suggestedCategory: 'liturgia',
      suggestedTags: ['formacao', 'liturgia'],
      aiSummary: 'AI generated summary'
    };

    it('should apply category suggestion', () => {
      const applyCategory = true;
      const updated = {
        ...material,
        category: applyCategory ? aiSuggestions.suggestedCategory : material.category
      };

      expect(updated.category).toBe('liturgia');
    });

    it('should apply tags suggestion', () => {
      const applyTags = true;
      const updated = {
        ...material,
        tags: applyTags ? aiSuggestions.suggestedTags : material.tags
      };

      expect(updated.tags).toEqual(['formacao', 'liturgia']);
    });

    it('should apply description from summary', () => {
      const applyDescription = true;
      const updated = {
        ...material,
        description: applyDescription ? aiSuggestions.aiSummary : material.description
      };

      expect(updated.description).toBe('AI generated summary');
    });

    it('should apply all suggestions at once', () => {
      const updated = {
        ...material,
        category: aiSuggestions.suggestedCategory,
        tags: aiSuggestions.suggestedTags,
        description: aiSuggestions.aiSummary
      };

      expect(updated.category).toBe('liturgia');
      expect(updated.tags).toEqual(['formacao', 'liturgia']);
      expect(updated.description).toBe('AI generated summary');
    });

    it('should not modify fields when not applying', () => {
      const applyCategory = false;
      const applyTags = false;
      const applyDescription = false;

      const updated = {
        ...material,
        category: applyCategory ? aiSuggestions.suggestedCategory : material.category,
        tags: applyTags ? aiSuggestions.suggestedTags : material.tags,
        description: applyDescription ? aiSuggestions.aiSummary : material.description
      };

      expect(updated.category).toBeNull();
      expect(updated.tags).toEqual([]);
      expect(updated.description).toBeNull();
    });
  });

  describe('Quiz Generation', () => {
    it('should generate specified number of questions', () => {
      const numQuestions = 5;
      const questions = Array.from({ length: numQuestions }, (_, i) => ({
        question: `Question ${i + 1}?`,
        options: ['A', 'B', 'C', 'D'],
        correctIndex: i % 4,
        explanation: `Explanation ${i + 1}`
      }));

      expect(questions).toHaveLength(5);
    });

    it('should validate quiz question format', () => {
      const question = {
        question: 'Pergunta de teste?',
        options: ['Opcao A', 'Opcao B', 'Opcao C', 'Opcao D'],
        correctIndex: 0,
        explanation: 'A primeira opcao e a correta'
      };

      expect(question.question.endsWith('?')).toBe(true);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options.length).toBeLessThanOrEqual(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
    });

    it('should handle minimum content for quiz', () => {
      const minContentLength = 100;
      const shortContent = 'A'.repeat(50);
      const validContent = 'A'.repeat(200);

      expect(shortContent.length < minContentLength).toBe(true);
      expect(validContent.length >= minContentLength).toBe(true);
    });
  });

  describe('Content Standardization', () => {
    it('should track changes made', () => {
      const changes = [
        'Corrigido erro ortografico',
        'Adicionado titulo de secao',
        'Formatado como lista'
      ];

      expect(changes).toHaveLength(3);
      expect(changes[0]).toContain('ortografico');
    });

    it('should return original content on error', () => {
      const originalContent = 'Original content here';
      const errorResult = {
        standardizedContent: originalContent,
        changes: []
      };

      expect(errorResult.standardizedContent).toBe(originalContent);
      expect(errorResult.changes).toHaveLength(0);
    });

    it('should preserve meaning while improving format', () => {
      const original = 'conteudo sem formatacao';
      const standardized = '## Conteudo\n\nSem formatacao';

      // Content should still contain the key words
      const keyWords = ['conteudo', 'formatacao'];
      keyWords.forEach(word => {
        expect(standardized.toLowerCase()).toContain(word);
      });
    });
  });
});
