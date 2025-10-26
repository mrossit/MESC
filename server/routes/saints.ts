/**
 * Saints Calendar API Routes
 * Endpoints for accessing saints data and feast days
 */

import { Router } from 'express';
import { db } from '../db';
import { saints } from '../../shared/schema';
import { eq, sql, like, or } from 'drizzle-orm';

const router = Router();

// Helper function to get month name in Portuguese
function getMonthName(month: number): string {
  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return monthNames[month - 1] || 'desconhecido';
}

/**
 * GET /api/saints/today
 * Returns daily liturgy from Padre Paulo Ricardo website
 */
router.get('/today', async (req, res) => {
  try {
    console.log('[LITURGY API] Buscando liturgia do dia...');

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const feastDay = `${month}-${day}`;

    // Buscar liturgia do Padre Paulo Ricardo
    try {
      const liturgyUrl = 'https://padrepauloricardo.org/liturgia';
      console.log(`[LITURGY API] Fazendo fetch de ${liturgyUrl}`);

      const response = await fetch(liturgyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`[LITURGY API] HTML recebido, tamanho: ${html.length} caracteres`);

      // Extrair informações da liturgia com regex mais precisos
      let liturgyTitle = 'Liturgia do Dia';
      let liturgyColor = 'green';
      let liturgyRank = 'MEMORIAL';
      let firstReading = { reference: '', text: '' };
      let secondReading = { reference: '', text: '' };
      let gospel = { reference: '', text: '' };
      let psalm = { reference: '', response: '' };
      let homily = '';

      // Extrair título da celebração
      const titleMatches = [
        html.match(/<h1[^>]*class="[^"]*celebration-title[^"]*"[^>]*>([^<]+)<\/h1>/i),
        html.match(/<h2[^>]*class="[^"]*liturgy-title[^"]*"[^>]*>([^<]+)<\/h2>/i),
        html.match(/<title>([^<]+Liturgia[^<]*)<\/title>/i)
      ];

      for (const match of titleMatches) {
        if (match) {
          liturgyTitle = match[1]
            .trim()
            .replace(/&nbsp;/g, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .replace(/Liturgia Diária - /i, '')
            .replace(/Padre Paulo Ricardo/i, '')
            .trim();
          if (liturgyTitle.length > 10) break;
        }
      }

      // Extrair cor litúrgica
      const colorPatterns = [
        /cor\s+lit[uú]rgica\s*:\s*([a-záéíóúâêôãõç]+)/i,
        /lit[uú]rgica\s*:\s*([a-záéíóúâêôãõç]+)/i,
        /color[^>]*>([a-záéíóúâêôãõç]+)</i
      ];

      for (const pattern of colorPatterns) {
        const match = html.match(pattern);
        if (match) {
          const colorMap: Record<string, string> = {
            'verde': 'green',
            'branco': 'white',
            'branca': 'white',
            'vermelho': 'red',
            'vermelha': 'red',
            'roxo': 'purple',
            'roxa': 'purple',
            'violeta': 'purple',
            'rosa': 'rose'
          };
          liturgyColor = colorMap[match[1].toLowerCase()] || 'green';
          break;
        }
      }

      // Extrair rank litúrgico
      if (html.match(/solenidade/i)) {
        liturgyRank = 'SOLEMNITY';
      } else if (html.match(/festa/i)) {
        liturgyRank = 'FEAST';
      } else if (html.match(/mem[oó]ria\s+obrigat[oó]ria/i)) {
        liturgyRank = 'MEMORIAL';
      } else if (html.match(/mem[oó]ria/i)) {
        liturgyRank = 'OPTIONAL_MEMORIAL';
      } else {
        liturgyRank = 'FERIAL';
      }

      // Extrair primeira leitura
      const firstReadingMatch = html.match(/(?:1[ªa°]?\s*Leitura|Primeira\s+Leitura)[^<]*<[^>]*>([^<]+)/i);
      if (firstReadingMatch) {
        firstReading.reference = firstReadingMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extrair segunda leitura (se houver)
      const secondReadingMatch = html.match(/(?:2[ªa°]?\s*Leitura|Segunda\s+Leitura)[^<]*<[^>]*>([^<]+)/i);
      if (secondReadingMatch) {
        secondReading.reference = secondReadingMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extrair salmo com resposta
      const psalmRefMatch = html.match(/(?:Salmo\s+Responsorial|Salmo)[^<]*<[^>]*>([^<]+)/i);
      if (psalmRefMatch) {
        psalm.reference = psalmRefMatch[1].trim().replace(/\s+/g, ' ');
      }

      const psalmResponseMatch = html.match(/(?:Respons[oó]rio|Refrão)[^<]*<[^>]*>([^<]+)/i);
      if (psalmResponseMatch) {
        psalm.response = psalmResponseMatch[1].trim().replace(/\s+/g, ' ').replace(/\.$/, '');
      }

      // Extrair evangelho
      const gospelMatch = html.match(/Evangelho[^<]*<[^>]*>([^<]+)/i);
      if (gospelMatch) {
        gospel.reference = gospelMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extrair homilia (preview)
      const homilyMatches = [
        html.match(/<div[^>]*class="[^"]*homily[^"]*"[^>]*>([\s\S]{0,500})<\/div>/i),
        html.match(/<article[^>]*class="[^"]*reflection[^"]*"[^>]*>([\s\S]{0,500})<\/article>/i),
        html.match(/<p[^>]*class="[^"]*commentary[^"]*"[^>]*>([^<]{50,300})<\/p>/i)
      ];

      for (const match of homilyMatches) {
        if (match) {
          homily = match[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 300);
          if (homily.length > 50) break;
        }
      }

      // Se conseguiu extrair alguma informação útil
      if (liturgyTitle.length > 10 || firstReading.reference || gospel.reference) {
        const liturgyData = {
          id: `liturgy-${day}-${month}`,
          name: liturgyTitle,
          feastDay,
          biography: createRichLiturgyDescription(
            firstReading,
            secondReading,
            psalm,
            gospel,
            homily
          ),
          isBrazilian: false,
          rank: liturgyRank as any,
          liturgicalColor: liturgyColor as any,
          title: getRankLabel(liturgyRank),
          patronOf: undefined,
          collectPrayer: homily || undefined,
          firstReading: firstReading.reference ? firstReading : undefined,
          responsorialPsalm: psalm.reference ? psalm : undefined,
          gospel: gospel.reference ? gospel : undefined,
          attributes: undefined,
          quotes: homily ? [homily.substring(0, 200) + '...'] : undefined,
        };

        console.log(`[LITURGY API] Liturgia encontrada: ${liturgyData.name}`);
        console.log(`[LITURGY API] Leituras: 1ª=${firstReading.reference}, Salmo=${psalm.reference}, Ev=${gospel.reference}`);

        return res.json({
          success: true,
          data: {
            date: today.toISOString().split('T')[0],
            feastDay,
            saints: [liturgyData],
            source: 'padrepauloricardo'
          },
        });
      }
    } catch (liturgyError) {
      console.error('[LITURGY API] Erro ao buscar liturgia do Padre Paulo Ricardo:', liturgyError);
    }

    // Fallback: liturgia genérica com informações úteis
    console.log('[LITURGY API] Usando liturgia genérica');

    const weekday = today.toLocaleDateString('pt-BR', { weekday: 'long' });
    const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);

    const genericLiturgy = {
      id: `generic-${feastDay}`,
      name: `${weekdayCapitalized}, ${day} de ${getMonthName(parseInt(month))}`,
      feastDay,
      biography: `📖 Liturgia do dia ${day} de ${getMonthName(parseInt(month))} de ${today.getFullYear()}.\n\n` +
                `Para acessar as leituras completas, reflexões e homilia do dia, ` +
                `visite: https://padrepauloricardo.org/liturgia\n\n` +
                `Lá você encontrará:\n` +
                `• Primeira e Segunda Leituras\n` +
                `• Salmo Responsorial\n` +
                `• Evangelho do dia\n` +
                `• Reflexão e comentários\n` +
                `• Homilia em áudio e vídeo`,
      isBrazilian: false,
      rank: 'FERIAL' as const,
      liturgicalColor: 'green' as const,
      title: 'Liturgia Diária',
      patronOf: undefined,
      collectPrayer: undefined,
      firstReading: undefined,
      responsorialPsalm: undefined,
      gospel: undefined,
      attributes: ['Liturgia Diária', 'Padre Paulo Ricardo'],
      quotes: undefined,
    };

    res.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        feastDay,
        saints: [genericLiturgy],
        source: 'generic'
      },
    });
  } catch (error) {
    console.error('[LITURGY API] Error fetching liturgy:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar liturgia do dia',
    });
  }
});

// Helper function to get rank label in Portuguese
function getRankLabel(rank: string): string {
  const labels: Record<string, string> = {
    'SOLEMNITY': 'Solenidade',
    'FEAST': 'Festa',
    'MEMORIAL': 'Memória',
    'OPTIONAL_MEMORIAL': 'Memória Facultativa',
    'FERIAL': 'Feria do Tempo Comum'
  };
  return labels[rank] || 'Liturgia Diária';
}

// Helper function to create rich liturgy description
function createRichLiturgyDescription(
  firstReading: { reference: string; text?: string },
  secondReading: { reference: string; text?: string },
  psalm: { reference: string; response?: string },
  gospel: { reference: string; text?: string },
  homily?: string
): string {
  const parts = [];

  if (firstReading.reference) {
    parts.push(`📖 **Primeira Leitura**\n${firstReading.reference}`);
  }

  if (secondReading.reference) {
    parts.push(`📖 **Segunda Leitura**\n${secondReading.reference}`);
  }

  if (psalm.reference) {
    let psalmText = `🎵 **Salmo Responsorial**\n${psalm.reference}`;
    if (psalm.response) {
      psalmText += `\n_"${psalm.response}"_`;
    }
    parts.push(psalmText);
  }

  if (gospel.reference) {
    parts.push(`✝️ **Evangelho**\n${gospel.reference}`);
  }

  if (homily) {
    parts.push(`\n💬 **Reflexão**\n${homily}...`);
  }

  if (parts.length > 0) {
    parts.push(`\n🔗 **Acesse o conteúdo completo:**\nhttps://padrepauloricardo.org/liturgia`);
    return parts.join('\n\n');
  }

  return 'Consulte padrepauloricardo.org/liturgia para as leituras completas e reflexões do dia.';
}

/**
 * GET /api/saints/date/:date
 * Returns saint(s) for a specific date
 */
router.get('/date/:date', async (req, res) => {
  try {
    const dateStr = req.params.date; // YYYY-MM-DD format
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const feastDay = `${month}-${day}`;

    const saintsOnDate = await db
      .select()
      .from(saints)
      .where(eq(saints.feastDay, feastDay))
      .orderBy(saints.rank);

    res.json({
      success: true,
      data: {
        date: dateStr,
        feastDay,
        saints: saintsOnDate,
      },
    });
  } catch (error) {
    console.error('Error fetching saints for date:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santos da data',
    });
  }
});

/**
 * GET /api/saints/month/:month
 * Returns all saints for a specific month
 */
router.get('/month/:month', async (req, res) => {
  try {
    const month = String(req.params.month).padStart(2, '0');

    const monthSaints = await db
      .select()
      .from(saints)
      .where(like(saints.feastDay, `${month}-%`))
      .orderBy(saints.feastDay);

    res.json({
      success: true,
      data: {
        month: parseInt(month),
        saints: monthSaints,
      },
    });
  } catch (error) {
    console.error('Error fetching saints for month:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santos do mês',
    });
  }
});

/**
 * GET /api/saints/brazilian
 * Returns all Brazilian saints
 */
router.get('/brazilian', async (req, res) => {
  try {
    const brazilianSaints = await db
      .select()
      .from(saints)
      .where(eq(saints.isBrazilian, true))
      .orderBy(saints.feastDay);

    res.json({
      success: true,
      data: brazilianSaints,
    });
  } catch (error) {
    console.error('Error fetching Brazilian saints:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santos brasileiros',
    });
  }
});

/**
 * GET /api/saints/:id
 * Returns detailed information about a specific saint
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [saint] = await db
      .select()
      .from(saints)
      .where(eq(saints.id, id))
      .limit(1);

    if (!saint) {
      return res.status(404).json({
        success: false,
        message: 'Santo não encontrado',
      });
    }

    res.json({
      success: true,
      data: saint,
    });
  } catch (error) {
    console.error('Error fetching saint:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santo',
    });
  }
});

/**
 * GET /api/saints/search/:query
 * Search saints by name
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    const searchResults = await db
      .select()
      .from(saints)
      .where(
        or(
          like(saints.name, `%${query}%`),
          like(saints.title, `%${query}%`),
          like(saints.patronOf, `%${query}%`)
        )
      )
      .orderBy(saints.feastDay);

    res.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error('Error searching saints:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santos',
    });
  }
});

/**
 * GET /api/saints/name-match/:name
 * Find saints whose name matches a given minister's name
 * Used for scheduling preference
 */
router.get('/name-match/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Split the name into parts and search for each
    const nameParts = name.toLowerCase().split(' ');

    const matchingSaints = await db
      .select()
      .from(saints)
      .where(
        sql`LOWER(${saints.name}) LIKE ANY(ARRAY[${sql.join(
          nameParts.map(part => sql`${'%' + part + '%'}`),
          sql`, `
        )}])`
      )
      .orderBy(saints.rank);

    // Calculate match score
    const saintsWithScore = matchingSaints.map(saint => {
      const saintNameLower = saint.name.toLowerCase();
      let score = 0;

      nameParts.forEach(part => {
        if (saintNameLower.includes(part)) {
          score += part.length; // Longer matches get higher scores
        }
      });

      return {
        ...saint,
        matchScore: score,
      };
    });

    // Sort by score descending
    saintsWithScore.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      data: {
        ministerName: name,
        matches: saintsWithScore,
      },
    });
  } catch (error) {
    console.error('Error matching saint names:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar correspondência de nomes',
    });
  }
});

/**
 * GET /api/saints/readings/:id
 * Get liturgical readings for a saint's feast day
 */
router.get('/readings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [saint] = await db
      .select({
        name: saints.name,
        feastDay: saints.feastDay,
        rank: saints.rank,
        liturgicalColor: saints.liturgicalColor,
        collectPrayer: saints.collectPrayer,
        firstReading: saints.firstReading,
        responsorialPsalm: saints.responsorialPsalm,
        gospel: saints.gospel,
        prayerOfTheFaithful: saints.prayerOfTheFaithful,
        communionAntiphon: saints.communionAntiphon,
      })
      .from(saints)
      .where(eq(saints.id, id))
      .limit(1);

    if (!saint) {
      return res.status(404).json({
        success: false,
        message: 'Santo não encontrado',
      });
    }

    res.json({
      success: true,
      data: saint,
    });
  } catch (error) {
    console.error('Error fetching saint readings:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar leituras do santo',
    });
  }
});

/**
 * GET /api/saints
 * List all saints (with optional filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { rank, brazilian } = req.query;

    let query = db.select().from(saints);

    if (rank) {
      query = query.where(eq(saints.rank, rank as any));
    }

    if (brazilian === 'true') {
      query = query.where(eq(saints.isBrazilian, true));
    }

    const allSaints = await query.orderBy(saints.feastDay);

    res.json({
      success: true,
      data: allSaints,
    });
  } catch (error) {
    console.error('Error fetching all saints:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santos',
    });
  }
});

export default router;
