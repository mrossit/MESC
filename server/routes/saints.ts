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

    // Buscar liturgia da API oficial da CNBB
    try {
      const liturgyUrl = 'https://liturgia.cnbb.org.br/api/liturgia-diaria';
      console.log(`[LITURGY API] Fazendo fetch da API CNBB: ${liturgyUrl}`);

      const response = await fetch(liturgyUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MESC-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log(`[LITURGY API] Dados recebidos da CNBB`);

      // Processar dados da API CNBB
      let liturgyTitle = apiData.data || 'Liturgia do Dia';
      let liturgyColor = 'green';
      let liturgyRank = 'FERIAL';
      let firstReading = { reference: '', text: '' };
      let secondReading = { reference: '', text: '' };
      let gospel = { reference: '', text: '' };
      let psalm = { reference: '', response: '', text: '' };
      let homily = '';

      // Extrair cor litúrgica
      if (apiData.cor) {
        const colorMap: Record<string, string> = {
          'verde': 'green',
          'branco': 'white',
          'branca': 'white',
          'vermelho': 'red',
          'vermelha': 'red',
          'roxo': 'purple',
          'roxa': 'purple',
          'violeta': 'purple',
          'rosa': 'rose',
          'preto': 'black'
        };
        liturgyColor = colorMap[apiData.cor.toLowerCase()] || 'green';
      }

      // Extrair título/data
      if (apiData.liturgia) {
        liturgyTitle = apiData.liturgia;
      } else if (apiData.titulo) {
        liturgyTitle = apiData.titulo;
      }

      // Extrair primeira leitura
      if (apiData.primeiraLeitura || apiData.primeira_leitura || apiData['1leitura']) {
        const reading = apiData.primeiraLeitura || apiData.primeira_leitura || apiData['1leitura'];
        firstReading.reference = reading.referencia || reading.ref || '';
        firstReading.text = reading.texto || reading.text || '';
      }

      // Extrair segunda leitura
      if (apiData.segundaLeitura || apiData.segunda_leitura || apiData['2leitura']) {
        const reading = apiData.segundaLeitura || apiData.segunda_leitura || apiData['2leitura'];
        secondReading.reference = reading.referencia || reading.ref || '';
        secondReading.text = reading.texto || reading.text || '';
      }

      // Extrair salmo
      if (apiData.salmo || apiData.salmoResponsorial) {
        const salmoData = apiData.salmo || apiData.salmoResponsorial;
        psalm.reference = salmoData.referencia || salmoData.ref || '';
        psalm.response = salmoData.refrao || salmoData.response || '';
        psalm.text = salmoData.texto || salmoData.text || '';
      }

      // Extrair evangelho
      if (apiData.evangelho) {
        gospel.reference = apiData.evangelho.referencia || apiData.evangelho.ref || '';
        gospel.text = apiData.evangelho.texto || apiData.evangelho.text || '';
      }

      // Extrair meditação/reflexão
      if (apiData.comentario || apiData.meditacao || apiData.reflexao) {
        homily = apiData.comentario || apiData.meditacao || apiData.reflexao;
      }

      // Extrair rank litúrgico
      if (apiData.celebracao) {
        const celebracao = apiData.celebracao.toLowerCase();
        if (celebracao.includes('solenidade')) {
          liturgyRank = 'SOLEMNITY';
        } else if (celebracao.includes('festa')) {
          liturgyRank = 'FEAST';
        } else if (celebracao.includes('memória obrigatória')) {
          liturgyRank = 'MEMORIAL';
        } else if (celebracao.includes('memória')) {
          liturgyRank = 'OPTIONAL_MEMORIAL';
        } else {
          liturgyRank = 'FERIAL';
        }
      }

      // Verificar se conseguimos extrair dados da API
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
            homily
          ),
          isBrazilian: false,
          rank: liturgyRank as any,
          liturgicalColor: liturgyColor as any,
          title: getRankLabel(liturgyRank),
          patronOf: undefined,
          collectPrayer: homily || undefined,
          firstReading: firstReading.reference ? firstReading : undefined,
          secondReading: secondReading.reference ? secondReading : undefined,
          responsorialPsalm: psalm.reference ? psalm : undefined,
          gospel: gospel.reference ? gospel : undefined,
          attributes: undefined,
          quotes: homily ? [homily.substring(0, 250)] : undefined,
        };

        console.log(`[LITURGY API] Liturgia encontrada: ${liturgyData.name}`);
        console.log(`[LITURGY API] Leituras extraídas:`);
        console.log(`  - 1ª Leitura: ${firstReading.reference} (${firstReading.text ? firstReading.text.length + ' chars' : 'sem texto'})`);
        if (secondReading.reference) {
          console.log(`  - 2ª Leitura: ${secondReading.reference} (${secondReading.text ? secondReading.text.length + ' chars' : 'sem texto'})`);
        }
        console.log(`  - Salmo: ${psalm.reference} (${psalm.text ? psalm.text.length + ' chars' : 'sem texto'})`);
        console.log(`  - Evangelho: ${gospel.reference} (${gospel.text ? gospel.text.length + ' chars' : 'sem texto'})`);
        if (homily) {
          console.log(`  - Meditação: ${homily.length} chars`);
        }

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
  psalm: { reference: string; response?: string; text?: string },
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
    if (psalm.text) {
      psalmText += `\n\n${psalm.text}`;
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
    parts.push(`\n💬 **Meditação**\n${meditation}`);
  }

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  return 'Liturgia do dia. Para mais informações, visite: https://liturgia.cnbb.org.br/';
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
