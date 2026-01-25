/**
 * AI Content Analyzer Service
 *
 * Uses Anthropic's Claude API to analyze and standardize formation content.
 * Automatically extracts metadata, generates summaries, suggests categories,
 * and ensures content quality for training materials.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface ContentAnalysisResult {
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
  quizQuestions?: QuizQuestion[];
  error?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Analyze text content using Claude
 */
export async function analyzeTextContent(
  content: string,
  fileName: string,
  existingTitle?: string
): Promise<ContentAnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured, skipping AI analysis');
    return {
      success: false,
      summary: '',
      suggestedCategory: null,
      suggestedTags: [],
      keyTopics: [],
      targetAudience: 'Ministros da Eucaristia',
      estimatedReadingMinutes: Math.ceil(content.length / 1500),
      contentQuality: 'needs_review',
      qualityNotes: ['Analise automatica nao disponivel - API key nao configurada'],
      error: 'API key not configured'
    };
  }

  try {
    const systemPrompt = `Voce e um especialista em formacao de Ministros Extraordinarios da Sagrada Comunhao (MESC) da Igreja Catolica.
Sua tarefa e analisar materiais de formacao e extrair informacoes estruturadas.

Contexto:
- Os materiais sao para formar ministros que distribuem a Eucaristia
- As categorias sao: "liturgia" (normas, ritos, procedimentos), "espiritualidade" (oracao, vida interior, devocao), "pratica" (como fazer, situacoes praticas)
- O publico sao adultos catolicos leigos que servem na paroquia
- A qualidade do conteudo deve ser avaliada considerando precisao teologica, clareza e utilidade pratica

Responda APENAS em JSON valido, sem texto adicional.`;

    const userPrompt = `Analise o seguinte material de formacao e retorne um JSON com a estrutura exata abaixo:

{
  "summary": "Resumo de 2-3 frases do conteudo",
  "suggestedTitle": "Titulo sugerido se o atual for inadequado, ou null",
  "suggestedDescription": "Descricao de 1-2 frases para exibicao",
  "suggestedCategory": "liturgia" | "espiritualidade" | "pratica",
  "suggestedTags": ["array", "de", "tags", "relevantes"],
  "keyTopics": ["topico1", "topico2", "topico3"],
  "targetAudience": "Descricao do publico-alvo",
  "estimatedReadingMinutes": numero_inteiro,
  "contentQuality": "excellent" | "good" | "acceptable" | "needs_review",
  "qualityNotes": ["Observacoes sobre a qualidade do conteudo"],
  "quizQuestions": [
    {
      "question": "Pergunta sobre o conteudo?",
      "options": ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
      "correctIndex": 0,
      "explanation": "Explicacao da resposta correta"
    }
  ]
}

Nome do arquivo: ${fileName}
${existingTitle ? `Titulo atual: ${existingTitle}` : ''}

Conteudo para analise:
---
${content.slice(0, 15000)}
${content.length > 15000 ? '\n\n[Conteudo truncado - material muito extenso]' : ''}
---`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: systemPrompt
    });

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      summary: analysis.summary || '',
      suggestedTitle: analysis.suggestedTitle || undefined,
      suggestedDescription: analysis.suggestedDescription || undefined,
      suggestedCategory: analysis.suggestedCategory || null,
      suggestedTags: analysis.suggestedTags || [],
      keyTopics: analysis.keyTopics || [],
      targetAudience: analysis.targetAudience || 'Ministros da Eucaristia',
      estimatedReadingMinutes: analysis.estimatedReadingMinutes || 10,
      contentQuality: analysis.contentQuality || 'needs_review',
      qualityNotes: analysis.qualityNotes || [],
      quizQuestions: analysis.quizQuestions || []
    };
  } catch (error) {
    console.error('AI content analysis error:', error);
    return {
      success: false,
      summary: '',
      suggestedCategory: null,
      suggestedTags: [],
      keyTopics: [],
      targetAudience: 'Ministros da Eucaristia',
      estimatedReadingMinutes: Math.ceil(content.length / 1500),
      contentQuality: 'needs_review',
      qualityNotes: ['Erro na analise automatica'],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract text from PDF buffer using basic parsing
 * Note: For production, consider using pdf-parse or similar library
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Basic PDF text extraction - looks for text between stream markers
  const content = buffer.toString('latin1');

  // Try to extract readable text
  const textMatches = content.match(/\(([^)]+)\)/g);
  if (textMatches) {
    const text = textMatches
      .map(m => m.slice(1, -1))
      .filter(t => t.length > 2 && /[a-zA-Z]/.test(t))
      .join(' ');

    if (text.length > 100) {
      return text;
    }
  }

  // If basic extraction fails, return a message
  return '[Conteudo PDF - texto nao extraido automaticamente]';
}

/**
 * Analyze uploaded file based on type
 */
export async function analyzeUploadedContent(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  existingTitle?: string
): Promise<ContentAnalysisResult> {
  let textContent = '';

  // Extract text based on file type
  if (mimeType === 'application/pdf') {
    textContent = await extractTextFromPDF(fileBuffer);
  } else if (
    mimeType.includes('text') ||
    mimeType.includes('document') ||
    mimeType.includes('word')
  ) {
    // For text-based documents, try to extract text
    textContent = fileBuffer.toString('utf-8');

    // Clean up any binary artifacts
    textContent = textContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
  } else if (mimeType.startsWith('image/')) {
    // For images, we can't extract text
    return {
      success: true,
      summary: 'Imagem para formacao',
      suggestedCategory: null,
      suggestedTags: ['imagem', 'visual'],
      keyTopics: [],
      targetAudience: 'Ministros da Eucaristia',
      estimatedReadingMinutes: 1,
      contentQuality: 'acceptable',
      qualityNotes: ['Conteudo visual - analise de texto nao aplicavel']
    };
  } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    // For media files, we can't extract content
    return {
      success: true,
      summary: mimeType.startsWith('video/') ? 'Video de formacao' : 'Audio de formacao',
      suggestedCategory: null,
      suggestedTags: [mimeType.startsWith('video/') ? 'video' : 'audio'],
      keyTopics: [],
      targetAudience: 'Ministros da Eucaristia',
      estimatedReadingMinutes: 0,
      contentQuality: 'acceptable',
      qualityNotes: ['Conteudo multimidia - analise de texto nao aplicavel']
    };
  }

  // If we have text content, analyze it
  if (textContent && textContent.length > 50) {
    return analyzeTextContent(textContent, fileName, existingTitle);
  }

  // Default response for files we couldn't analyze
  return {
    success: false,
    summary: '',
    suggestedCategory: null,
    suggestedTags: [],
    keyTopics: [],
    targetAudience: 'Ministros da Eucaristia',
    estimatedReadingMinutes: 0,
    contentQuality: 'needs_review',
    qualityNotes: ['Nao foi possivel extrair texto para analise'],
    error: 'Could not extract text content'
  };
}

/**
 * Generate a quiz from existing content
 */
export async function generateQuizFromContent(
  content: string,
  numQuestions: number = 5
): Promise<QuizQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return [];
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Gere ${numQuestions} perguntas de quiz sobre o seguinte conteudo de formacao para Ministros da Eucaristia.

Cada pergunta deve ter 4 opcoes, sendo apenas uma correta.
Retorne APENAS um array JSON valido com a estrutura:
[
  {
    "question": "Pergunta?",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Explicacao"
  }
]

Conteudo:
${content.slice(0, 10000)}`
        }
      ],
      system: 'Voce e um especialista em formacao catolica. Gere perguntas claras e relevantes para verificar a compreensao do conteudo.'
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return [];
  }
}

/**
 * Standardize and improve content formatting
 */
export async function standardizeContent(
  content: string,
  title: string
): Promise<{ standardizedContent: string; changes: string[] }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { standardizedContent: content, changes: [] };
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Padronize e melhore a formatacao do seguinte conteudo de formacao, mantendo o significado original.

Regras:
1. Corrija erros ortograficos e gramaticais
2. Organize em secoes claras quando apropriado
3. Use formatacao Markdown (titulos, listas, negrito)
4. Mantenha a precisao teologica
5. Nao adicione informacoes novas, apenas reorganize

Titulo: ${title}

Conteudo original:
${content.slice(0, 12000)}

Responda em JSON:
{
  "standardizedContent": "conteudo formatado em markdown",
  "changes": ["lista de mudancas feitas"]
}`
        }
      ],
      system: 'Voce e um editor especializado em materiais de formacao catolica.'
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { standardizedContent: content, changes: [] };
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { standardizedContent: content, changes: [] };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      standardizedContent: result.standardizedContent || content,
      changes: result.changes || []
    };
  } catch (error) {
    console.error('Content standardization error:', error);
    return { standardizedContent: content, changes: [] };
  }
}
