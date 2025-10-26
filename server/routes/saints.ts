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
 * Returns saint(s) of the day from Canção Nova website
 */
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const feastDay = `${month}-${day}`;

    console.log(`[SAINTS API] Buscando santo do dia: ${day}/${month}`);

    // Primeiro: tentar buscar do banco de dados local
    const saintsToday = await db
      .select()
      .from(saints)
      .where(eq(saints.feastDay, feastDay))
      .orderBy(saints.rank);

    if (saintsToday.length > 0) {
      console.log(`[SAINTS API] Encontrados ${saintsToday.length} santos no banco local`);
      return res.json({
        success: true,
        data: {
          date: today.toISOString().split('T')[0],
          feastDay,
          saints: saintsToday,
          source: 'database'
        },
      });
    }

    console.log('[SAINTS API] Nenhum santo encontrado no banco, tentando Canção Nova...');

    // Segundo: tentar buscar do site Canção Nova
    try {
      const cancaoNovaUrl = `https://santo.cancaonova.com/`;
      console.log(`[SAINTS API] Fazendo fetch de ${cancaoNovaUrl}`);

      const response = await fetch(cancaoNovaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`[SAINTS API] HTML recebido, tamanho: ${html.length} caracteres`);

      // Tentar múltiplos padrões de parsing
      let saintName = null;
      let biography = '';

      // Padrão 1: h1 com class entry-title
      let match = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
      if (match) {
        saintName = match[1].trim();
        console.log(`[SAINTS API] Santo encontrado (padrão 1): ${saintName}`);
      }

      // Padrão 2: h1 com itemprop="headline"
      if (!saintName) {
        match = html.match(/<h1[^>]*itemprop="headline"[^>]*>([^<]+)<\/h1>/i);
        if (match) {
          saintName = match[1].trim();
          console.log(`[SAINTS API] Santo encontrado (padrão 2): ${saintName}`);
        }
      }

      // Padrão 3: qualquer h1
      if (!saintName) {
        match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (match) {
          saintName = match[1].trim();
          console.log(`[SAINTS API] Santo encontrado (padrão 3): ${saintName}`);
        }
      }

      // Extrair biografia
      const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]{0,5000})<\/div>/i);
      if (contentMatch) {
        const paragraphs = contentMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        if (paragraphs && paragraphs.length > 0) {
          biography = paragraphs
            .slice(0, 3)
            .map(p => p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
            .filter(p => p.length > 20) // Filtrar parágrafos muito curtos
            .join('\n\n');
        }
      }

      if (saintName) {
        // Limpar o nome (remover possíveis tags HTML residuais)
        saintName = saintName.replace(/<[^>]+>/g, '').trim();

        const cancaoNovaSaint = {
          id: `cancao-nova-${day}-${month}`,
          name: saintName,
          feastDay: `${month}-${day}`,
          biography: biography || `Celebração do dia ${day}/${month}. Mais informações em santo.cancaonova.com`,
          isBrazilian: saintName.toLowerCase().includes('frei galvão') ||
                       saintName.toLowerCase().includes('santo antônio de santana galvão'),
          rank: 'MEMORIAL' as const,
          liturgicalColor: 'white' as const,
          title: undefined,
          patronOf: undefined,
          collectPrayer: undefined,
          firstReading: undefined,
          responsorialPsalm: undefined,
          gospel: undefined,
          attributes: undefined,
          quotes: undefined,
        };

        console.log(`[SAINTS API] Retornando santo do Canção Nova: ${saintName}`);
        return res.json({
          success: true,
          data: {
            date: today.toISOString().split('T')[0],
            feastDay: `${month}-${day}`,
            saints: [cancaoNovaSaint],
            source: 'cancaonova'
          },
        });
      } else {
        console.log('[SAINTS API] Nenhum santo encontrado no HTML do Canção Nova');
      }
    } catch (cancaoNovaError) {
      console.error('[SAINTS API] Erro ao buscar do Canção Nova:', cancaoNovaError);
    }

    // Terceiro: fallback para santos padrão baseados na data
    const defaultSaints: Record<string, any> = {
      '10-25': {
        id: 'default-10-25',
        name: 'Santo Antônio de Santana Galvão (Frei Galvão)',
        feastDay: '10-25',
        biography: 'Frei Galvão (1739-1822) foi o primeiro santo brasileiro canonizado pela Igreja Católica. Nascido em Guaratinguetá, São Paulo, foi ordenado sacerdote franciscano e fundou o Recolhimento de Santa Clara. É conhecido por sua humildade, caridade e pelos milagres atribuídos a ele, especialmente relacionados às "pílulas de Frei Galvão", que ajudavam mulheres em trabalho de parto.',
        isBrazilian: true,
        rank: 'MEMORIAL' as const,
        liturgicalColor: 'white' as const,
        title: 'Sacerdote Franciscano',
        patronOf: 'Arquidiocese de Aparecida, mulheres grávidas',
      },
      '10-26': {
        id: 'default-10-26',
        name: 'Santo Evaristo',
        feastDay: '10-26',
        biography: 'Santo Evaristo foi Papa e mártir da Igreja Católica. Governou a Igreja de Roma durante o período de perseguições, aproximadamente entre os anos 97 e 105. É venerado como santo e mártir pela Igreja Católica.',
        isBrazilian: false,
        rank: 'OPTIONAL_MEMORIAL' as const,
        liturgicalColor: 'red' as const,
        title: 'Papa e Mártir',
        patronOf: undefined,
      },
      '10-12': {
        id: 'default-10-12',
        name: 'Nossa Senhora Aparecida',
        feastDay: '10-12',
        biography: 'Nossa Senhora Aparecida é a padroeira do Brasil. Sua imagem foi encontrada por pescadores no Rio Paraíba do Sul em 1717. É venerada no Santuário Nacional de Aparecida, um dos maiores santuários marianos do mundo.',
        isBrazilian: true,
        rank: 'SOLEMNITY' as const,
        liturgicalColor: 'white' as const,
        title: 'Padroeira do Brasil',
        patronOf: 'Brasil',
      }
    };

    const defaultSaint = defaultSaints[feastDay];
    if (defaultSaint) {
      console.log(`[SAINTS API] Usando santo padrão: ${defaultSaint.name}`);
      return res.json({
        success: true,
        data: {
          date: today.toISOString().split('T')[0],
          feastDay,
          saints: [defaultSaint],
          source: 'default'
        },
      });
    }

    // Último recurso: santo genérico para o dia
    console.log('[SAINTS API] Usando santo genérico');
    const genericSaint = {
      id: `generic-${feastDay}`,
      name: `Santo do Dia ${day}/${month}`,
      feastDay,
      biography: `Hoje, dia ${day} de ${getMonthName(parseInt(month))}, a Igreja celebra a memória dos santos e santas deste dia. Consulte o calendário litúrgico ou visite santo.cancaonova.com para mais informações sobre as celebrações litúrgicas de hoje.`,
      isBrazilian: false,
      rank: 'OPTIONAL_MEMORIAL' as const,
      liturgicalColor: 'white' as const,
      title: undefined,
      patronOf: undefined,
    };

    res.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        feastDay,
        saints: [genericSaint],
        source: 'generic'
      },
    });
  } catch (error) {
    console.error('[SAINTS API] Error fetching saints of the day:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar santos do dia',
    });
  }
});

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
