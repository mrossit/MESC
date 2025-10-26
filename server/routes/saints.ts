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

    // Buscar liturgia do Padre Paulo Ricardo
    try {
      const liturgyUrl = 'https://padrepauloricardo.org/liturgia';
      console.log(`[LITURGY API] Fazendo fetch de ${liturgyUrl}`);

      const response = await fetch(liturgyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`[LITURGY API] HTML recebido, tamanho: ${html.length} caracteres`);

      // Extrair informações da liturgia
      let liturgyTitle = null;
      let liturgyColor = 'white';
      let firstReading = null;
      let gospel = null;
      let psalm = null;

      // Extrair título da liturgia (ex: "Sábado da 29ª Semana do Tempo Comum")
      const titleMatch = html.match(/<h1[^>]*class="[^"]*liturgy-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                        html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

      if (titleMatch) {
        liturgyTitle = titleMatch[1].trim().replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '');
      }

      // Extrair cor litúrgica
      const colorMatch = html.match(/cor[^>]*litúrgica[^>]*:\s*([a-záéíóúâêôãõç]+)/i);
      if (colorMatch) {
        const colorMap: Record<string, string> = {
          'verde': 'green',
          'branco': 'white',
          'vermelho': 'red',
          'roxo': 'purple',
          'rosa': 'rose'
        };
        liturgyColor = colorMap[colorMatch[1].toLowerCase()] || 'white';
      }

      // Extrair primeira leitura
      const firstReadingMatch = html.match(/1[ªa]?\s*Leitura[^<]*<[^>]*>([^<]+)/i);
      if (firstReadingMatch) {
        firstReading = firstReadingMatch[1].trim();
      }

      // Extrair evangelho
      const gospelMatch = html.match(/Evangelho[^<]*<[^>]*>([^<]+)/i);
      if (gospelMatch) {
        gospel = gospelMatch[1].trim();
      }

      // Extrair salmo
      const psalmMatch = html.match(/Salmo[^<]*<[^>]*>([^<]+)/i);
      if (psalmMatch) {
        psalm = psalmMatch[1].trim();
      }

      if (liturgyTitle || firstReading || gospel) {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');

        const liturgyData = {
          id: `liturgy-${day}-${month}`,
          name: liturgyTitle || `Liturgia do dia ${day}/${month}`,
          feastDay: `${month}-${day}`,
          biography: createLiturgyDescription(firstReading, psalm, gospel),
          isBrazilian: false,
          rank: 'MEMORIAL' as const,
          liturgicalColor: liturgyColor as any,
          title: 'Liturgia Diária',
          patronOf: undefined,
          collectPrayer: undefined,
          firstReading: firstReading ? { reference: firstReading } : undefined,
          responsorialPsalm: psalm ? { reference: psalm } : undefined,
          gospel: gospel ? { reference: gospel } : undefined,
          attributes: undefined,
          quotes: undefined,
        };

        console.log(`[LITURGY API] Liturgia encontrada: ${liturgyData.name}`);

        return res.json({
          success: true,
          data: {
            date: today.toISOString().split('T')[0],
            feastDay: `${month}-${day}`,
            saints: [liturgyData],
            source: 'padrepauloricardo'
          },
        });
      }
    } catch (liturgyError) {
      console.error('[LITURGY API] Erro ao buscar liturgia do Padre Paulo Ricardo:', liturgyError);
    }

    // Fallback: liturgia genérica
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const feastDay = `${month}-${day}`;

    console.log('[LITURGY API] Usando liturgia genérica');

    const genericLiturgy = {
      id: `generic-${feastDay}`,
      name: `Liturgia do Dia ${day}/${month}`,
      feastDay,
      biography: `Liturgia do dia ${day} de ${getMonthName(parseInt(month))}. Visite padrepauloricardo.org/liturgia para ler as leituras completas e reflexões do dia.`,
      isBrazilian: false,
      rank: 'MEMORIAL' as const,
      liturgicalColor: 'green' as const,
      title: 'Liturgia Diária',
      patronOf: undefined,
      collectPrayer: undefined,
      firstReading: undefined,
      responsorialPsalm: undefined,
      gospel: undefined,
      attributes: undefined,
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

// Helper function to create liturgy description
function createLiturgyDescription(firstReading?: string, psalm?: string, gospel?: string): string {
  const parts = [];

  if (firstReading) {
    parts.push(`📖 Primeira Leitura: ${firstReading}`);
  }

  if (psalm) {
    parts.push(`🎵 Salmo: ${psalm}`);
  }

  if (gospel) {
    parts.push(`✝️ Evangelho: ${gospel}`);
  }

  if (parts.length > 0) {
    return parts.join('\n\n') + '\n\nVisite padrepauloricardo.org/liturgia para ler as leituras completas e reflexões.';
  }

  return 'Consulte padrepauloricardo.org/liturgia para as leituras do dia.';
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
