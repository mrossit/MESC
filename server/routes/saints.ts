/**
 * Saints Calendar API Routes
 * Endpoints for accessing saints data and feast days
 */

import { Router } from 'express';
import { db } from '../db';
import { saints } from '../../shared/schema';
import { eq, sql, like, or } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/saints/debug-cnbb
 * Debug endpoint to see raw CNBB API response
 */
router.get('/debug-cnbb', async (req, res) => {
  try {
    const response = await fetch('https://liturgia.cnbb.org.br/api/liturgia-diaria');
    const data = await response.json();
    res.json({
      success: true,
      rawData: data,
      fields: Object.keys(data),
      firstReadingFields: data['1leitura'] ? Object.keys(data['1leitura']) :
                          data.primeiraLeitura ? Object.keys(data.primeiraLeitura) :
                          data.primeira_leitura ? Object.keys(data.primeira_leitura) : [],
      salmoFields: data.salmo ? Object.keys(data.salmo) : [],
      evangelhoFields: data.evangelho ? Object.keys(data.evangelho) : []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
 * Returns daily liturgy from CNBB official API
 */
router.get('/today', async (req, res) => {
  try {
    console.log('[LITURGY API] Buscando liturgia do dia da API oficial da CNBB...');

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const feastDay = `${month}-${day}`;

    // Buscar liturgia da API oficial da CNBB
    try {
      const liturgyUrl = 'https://liturgia.cnbb.org.br/api/liturgia-diaria';
      console.log(`[LITURGY API] Fazendo fetch de ${liturgyUrl}`);

      const response = await fetch(liturgyUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log(`[LITURGY API] Dados recebidos da API CNBB`);
      console.log(`[LITURGY API] Estrutura completa:`, JSON.stringify(apiData, null, 2));

      // Extrair informações da API baseado na estrutura: data.data, data.evangelho, data.salmo
      const liturgyTitle = apiData.data || apiData.titulo || apiData.title || 'Liturgia do Dia';
      const liturgyColor = mapColorFromCNBB(apiData.cor || 'verde');
      const liturgyRank = getRankFromTitle(typeof liturgyTitle === 'string' ? liturgyTitle : 'FERIAL');

      console.log(`[LITURGY API] Título extraído:`, liturgyTitle);
      console.log(`[LITURGY API] Campos disponíveis:`, Object.keys(apiData));

      // Primeira leitura - tentar múltiplas variações de nomes
      let firstReading = { reference: '', text: '' };
      if (apiData['1leitura']) {
        firstReading = {
          reference: apiData['1leitura'].referencia || apiData['1leitura'].titulo || '',
          text: apiData['1leitura'].texto || apiData['1leitura'].text || ''
        };
      } else if (apiData.primeiraLeitura) {
        firstReading = {
          reference: apiData.primeiraLeitura.referencia || apiData.primeiraLeitura.titulo || '',
          text: apiData.primeiraLeitura.texto || apiData.primeiraLeitura.text || ''
        };
      } else if (apiData.primeira_leitura) {
        firstReading = {
          reference: apiData.primeira_leitura.referencia || apiData.primeira_leitura.titulo || '',
          text: apiData.primeira_leitura.texto || apiData.primeira_leitura.text || ''
        };
      }

      console.log(`[LITURGY API] Primeira leitura:`, firstReading);

      // Segunda leitura (se houver)
      let secondReading = { reference: '', text: '' };
      if (apiData['2leitura']) {
        secondReading = {
          reference: apiData['2leitura'].referencia || apiData['2leitura'].titulo || '',
          text: apiData['2leitura'].texto || apiData['2leitura'].text || ''
        };
      } else if (apiData.segundaLeitura) {
        secondReading = {
          reference: apiData.segundaLeitura.referencia || apiData.segundaLeitura.titulo || '',
          text: apiData.segundaLeitura.texto || apiData.segundaLeitura.text || ''
        };
      } else if (apiData.segunda_leitura) {
        secondReading = {
          reference: apiData.segunda_leitura.referencia || apiData.segunda_leitura.titulo || '',
          text: apiData.segunda_leitura.texto || apiData.segunda_leitura.text || ''
        };
      }

      console.log(`[LITURGY API] Segunda leitura:`, secondReading);

      // Salmo
      let psalm = { reference: '', response: '', text: '' };
      if (apiData.salmo) {
        psalm = {
          reference: apiData.salmo.referencia || apiData.salmo.titulo || apiData.salmo.refrao || '',
          response: apiData.salmo.refrao || apiData.salmo.response || '',
          text: apiData.salmo.texto || apiData.salmo.text || ''
        };
      }

      console.log(`[LITURGY API] Salmo:`, psalm);

      // Evangelho
      let gospel = { reference: '', text: '' };
      if (apiData.evangelho) {
        gospel = {
          reference: apiData.evangelho.referencia || apiData.evangelho.titulo || '',
          text: apiData.evangelho.texto || apiData.evangelho.text || ''
        };
      }

      console.log(`[LITURGY API] Evangelho:`, gospel);

      // Se conseguiu extrair alguma informação útil
      if (liturgyTitle || firstReading.reference || gospel.reference) {
        const liturgyData = {
          id: `liturgy-${day}-${month}`,
          name: liturgyTitle,
          feastDay,
          biography: createRichLiturgyDescription(
            firstReading,
            secondReading,
            psalm,
            gospel,
            ''
          ),
          isBrazilian: false,
          rank: liturgyRank as any,
          liturgicalColor: liturgyColor as any,
          title: getRankLabel(liturgyRank),
          patronOf: undefined,
          collectPrayer: undefined,
          firstReading: firstReading.reference ? firstReading : undefined,
          secondReading: secondReading.reference ? secondReading : undefined,
          responsorialPsalm: psalm.reference ? psalm : undefined,
          gospel: gospel.reference ? gospel : undefined,
          attributes: undefined,
          quotes: undefined,
        };

        console.log(`[LITURGY API] Liturgia encontrada: ${liturgyData.name}`);
        console.log(`[LITURGY API] Leituras: 1ª=${firstReading.reference}, 2ª=${secondReading.reference || 'N/A'}, Salmo=${psalm.reference}, Ev=${gospel.reference}`);

        return res.json({
          success: true,
          data: {
            date: today.toISOString().split('T')[0],
            feastDay,
            saints: [liturgyData],
            source: 'cnbb'
          },
        });
      }
    } catch (liturgyError) {
      console.error('[LITURGY API] Erro ao buscar liturgia da CNBB:', liturgyError);
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
                `Para acessar as leituras completas e reflexões do dia, ` +
                `visite: https://liturgia.cnbb.org.br/\n\n` +
                `Lá você encontrará:\n` +
                `• Primeira e Segunda Leituras\n` +
                `• Salmo Responsorial\n` +
                `• Evangelho do dia\n` +
                `• Meditação e reflexões`,
      isBrazilian: false,
      rank: 'FERIAL' as const,
      liturgicalColor: 'green' as const,
      title: 'Liturgia Diária',
      patronOf: undefined,
      collectPrayer: undefined,
      firstReading: undefined,
      responsorialPsalm: undefined,
      gospel: undefined,
      attributes: ['Liturgia Diária', 'CNBB'],
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

// Helper function to map CNBB color to internal format
function mapColorFromCNBB(cnbbColor: string): string {
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
  return colorMap[cnbbColor.toLowerCase()] || 'green';
}

// Helper function to determine rank from title
function getRankFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('solenidade')) {
    return 'SOLEMNITY';
  } else if (titleLower.includes('festa')) {
    return 'FEAST';
  } else if (titleLower.includes('memória obrigatória')) {
    return 'MEMORIAL';
  } else if (titleLower.includes('memória')) {
    return 'OPTIONAL_MEMORIAL';
  }
  return 'FERIAL';
}

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
  meditation?: string
): string {
  const parts = [];

  if (firstReading.reference) {
    let firstText = `📖 **Primeira Leitura**\n${firstReading.reference}`;
    if (firstReading.text) {
      firstText += `\n\n${firstReading.text}`;
    }
    parts.push(firstText);
  }

  if (secondReading.reference) {
    let secondText = `📖 **Segunda Leitura**\n${secondReading.reference}`;
    if (secondReading.text) {
      secondText += `\n\n${secondReading.text}`;
    }
    parts.push(secondText);
  }

  if (psalm.reference) {
    let psalmText = `🎵 **Salmo Responsorial**\n${psalm.reference}`;
    if (psalm.response) {
      psalmText += `\n\n_Refrão: "${psalm.response}"_`;
    }
    parts.push(psalmText);
  }

  if (gospel.reference) {
    let gospelText = `✝️ **Evangelho**\n${gospel.reference}`;
    if (gospel.text) {
      gospelText += `\n\n${gospel.text}`;
    }
    parts.push(gospelText);
  }

  if (meditation) {
    parts.push(`\n💬 **Meditação**\n${meditation}...`);
  }

  if (parts.length > 0) {
    parts.push(`\n🔗 **Fonte oficial:**\nhttps://liturgia.cnbb.org.br/`);
    return parts.join('\n\n');
  }

  return 'Consulte liturgia.cnbb.org.br para as leituras completas e reflexões do dia.';
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
