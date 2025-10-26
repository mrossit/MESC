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

    // Buscar liturgia da Paulus
    try {
      const liturgyUrl = 'https://www.paulus.com.br/portal/liturgia-diaria/';
      console.log(`[LITURGY API] Fazendo fetch de ${liturgyUrl}`);

      const response = await fetch(liturgyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
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

      // Extrair título da celebração (padrões para Paulus)
      const titleMatches = [
        html.match(/<h1[^>]*>([^<]*(?:domingo|segunda|terça|quarta|quinta|sexta|sábado)[^<]*)<\/h1>/i),
        html.match(/<h2[^>]*class="[^"]*titulo[^"]*"[^>]*>([^<]+)<\/h2>/i),
        html.match(/<div[^>]*class="[^"]*celebracao[^"]*"[^>]*>([^<]+)<\/div>/i),
        html.match(/<span[^>]*class="[^"]*celebracao[^"]*"[^>]*>([^<]+)<\/span>/i),
        html.match(/<title>([^<]*Liturgia[^<]*)<\/title>/i)
      ];

      for (const match of titleMatches) {
        if (match) {
          liturgyTitle = match[1]
            .trim()
            .replace(/&nbsp;/g, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .replace(/Liturgia Diária/i, '')
            .replace(/Liturgia de hoje/i, '')
            .replace(/Paulus/i, '')
            .replace(/[-–—]/g, '')
            .trim();
          if (liturgyTitle.length > 5) break;
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

      // Extrair primeira leitura com padrões mais robustos
      const firstReadingPatterns = [
        /(?:1[ªa°]?\s*Leitura|Primeira\s+Leitura)[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>(?:1[ªa°]?\s*Leitura|Primeira\s+Leitura)<\/h[2-4]>\s*<[^>]*>([^<]+)/i,
        /class="[^"]*primeira[^"]*leitura[^"]*"[^>]*>([^<]+)/i
      ];

      for (const pattern of firstReadingPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          firstReading.reference = match[1].trim().replace(/\s+/g, ' ').replace(/[()]/g, '');
          break;
        }
      }

      // Extrair texto COMPLETO da primeira leitura (sem limite)
      if (firstReading.reference) {
        const escapedRef = firstReading.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Tenta múltiplos padrões para pegar o texto completo
        const firstTextPatterns = [
          new RegExp(escapedRef + '[\\s\\S]{0,100}?<[^>]*>([\\s\\S]{100,15000}?)(?:<h[2-4]|Salmo|2[ªa°]?\\s*Leitura|Evangelho)', 'i'),
          new RegExp('Primeira\\s+Leitura[\\s\\S]{0,150}?' + escapedRef + '[\\s\\S]{0,100}?<[^>]*>([\\s\\S]{100,15000}?)(?:<h[2-4]|Salmo)', 'i'),
          new RegExp('<div[^>]*primeira[^>]*leitura[^>]*>([\\s\\S]{100,15000}?)(?:<\\/div>.*?<h[2-4]|Salmo)', 'i')
        ];

        for (const pattern of firstTextPatterns) {
          const match = html.match(pattern);
          if (match && match[1].length > 50) {
            firstReading.text = match[1]
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&quot;/g, '"')
              .replace(/&ldquo;/g, '"')
              .replace(/&rdquo;/g, '"')
              .replace(/&mdash;/g, '—')
              .replace(/&ndash;/g, '–')
              .replace(/\s+/g, ' ')
              .trim();
            if (firstReading.text.length > 100) break;
          }
        }
      }

      // Extrair segunda leitura (se houver)
      const secondReadingPatterns = [
        /(?:2[ªa°]?\s*Leitura|Segunda\s+Leitura)[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>(?:2[ªa°]?\s*Leitura|Segunda\s+Leitura)<\/h[2-4]>\s*<[^>]*>([^<]+)/i
      ];

      for (const pattern of secondReadingPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          secondReading.reference = match[1].trim().replace(/\s+/g, ' ').replace(/[()]/g, '');

          // Extrair texto COMPLETO da segunda leitura
          const escapedRef = secondReading.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const secondTextPatterns = [
            new RegExp(escapedRef + '[\\s\\S]{0,100}?<[^>]*>([\\s\\S]{100,15000}?)(?:<h[2-4]|Evangelho|Salmo)', 'i'),
            new RegExp('Segunda\\s+Leitura[\\s\\S]{0,150}?' + escapedRef + '[\\s\\S]{0,100}?<[^>]*>([\\s\\S]{100,15000}?)(?:<h[2-4]|Evangelho)', 'i')
          ];

          for (const pattern of secondTextPatterns) {
            const match = html.match(pattern);
            if (match && match[1].length > 50) {
              secondReading.text = match[1]
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&quot;/g, '"')
                .replace(/&ldquo;/g, '"')
                .replace(/&rdquo;/g, '"')
                .replace(/&mdash;/g, '—')
                .replace(/&ndash;/g, '–')
                .replace(/\s+/g, ' ')
                .trim();
              if (secondReading.text.length > 100) break;
            }
          }
          break;
        }
      }

      // Extrair salmo responsorial com resposta
      const psalmPatterns = [
        /(?:Salmo\s+Responsorial|Salmo)[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>Salmo[^<]*<\/h[2-4]>\s*<[^>]*>([^<]+)/i,
        /class="[^"]*salmo[^"]*"[^>]*>([^<]+)/i
      ];

      for (const pattern of psalmPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          psalm.reference = match[1].trim().replace(/\s+/g, ' ').replace(/[()]/g, '');
          break;
        }
      }

      // Extrair resposta/refrão do salmo
      const psalmResponsePatterns = [
        /(?:Respons[oó]rio|Refr[ãa]o)[:\s]*[–—-]?\s*([^<\n.]+)/i,
        /<[^>]*class="[^"]*respons[^"]*"[^>]*>([^<]+)/i,
        /<em>([^<]{10,200})<\/em>/i,
        /R\.\s*([^<\n]{10,200})/i
      ];

      for (const pattern of psalmResponsePatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 8) {
          psalm.response = match[1].trim().replace(/\s+/g, ' ').replace(/[."]/g, '');
          break;
        }
      }

      // Extrair texto COMPLETO do salmo
      if (psalm.reference) {
        const escapedRef = psalm.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const psalmTextPatterns = [
          new RegExp(escapedRef + '[\\s\\S]{0,200}?(?:Respons|Refr)[\\s\\S]{0,150}?<[^>]*>([\\s\\S]{100,10000}?)(?:<h[2-4]|Evangelho|2[ªa°]?\\s*Leitura)', 'i'),
          new RegExp('Salmo[\\s\\S]{0,150}?' + escapedRef + '[\\s\\S]{0,200}?<[^>]*>([\\s\\S]{100,10000}?)(?:<h[2-4]|Evangelho)', 'i'),
          new RegExp('<div[^>]*salmo[^>]*>([\\s\\S]{100,10000}?)(?:<\\/div>.*?<h[2-4]|Evangelho)', 'i')
        ];

        for (const pattern of psalmTextPatterns) {
          const match = html.match(pattern);
          if (match && match[1].length > 50) {
            const psalmText = match[1]
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&quot;/g, '"')
              .replace(/&ldquo;/g, '"')
              .replace(/&rdquo;/g, '"')
              .replace(/&mdash;/g, '—')
              .replace(/&ndash;/g, '–')
              .replace(/\s+/g, ' ')
              .trim();

            if (psalmText.length > 100) {
              psalm.text = psalmText;
              break;
            }
          }
        }
      }

      // Extrair evangelho
      const gospelPatterns = [
        /Evangelho[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>Evangelho<\/h[2-4]>\s*<[^>]*>([^<]+)/i,
        /class="[^"]*evangelho[^"]*"[^>]*>([^<]+)/i
      ];

      for (const pattern of gospelPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          gospel.reference = match[1].trim().replace(/\s+/g, ' ').replace(/[()]/g, '');

          // Extrair texto COMPLETO do evangelho
          const escapedRef = gospel.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const gospelTextPatterns = [
            new RegExp(escapedRef + '[\\s\\S]{0,100}?<[^>]*>([\\s\\S]{100,20000}?)(?:<h[2-4]|Medita|Reflex|Ora[çc][ãa]o)', 'i'),
            new RegExp('Evangelho[\\s\\S]{0,150}?' + escapedRef + '[\\s\\S]{0,100}?<[^>]*>([\\s\\S]{100,20000}?)(?:<h[2-4]|Medita)', 'i'),
            new RegExp('<div[^>]*evangelho[^>]*>([\\s\\S]{100,20000}?)(?:<\\/div>.*?<h[2-4]|Medita)', 'i')
          ];

          for (const pattern of gospelTextPatterns) {
            const match = html.match(pattern);
            if (match && match[1].length > 50) {
              gospel.text = match[1]
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&quot;/g, '"')
                .replace(/&ldquo;/g, '"')
                .replace(/&rdquo;/g, '"')
                .replace(/&mdash;/g, '—')
                .replace(/&ndash;/g, '–')
                .replace(/\s+/g, ' ')
                .trim();
              if (gospel.text.length > 100) break;
            }
          }
          break;
        }
      }

      // Extrair meditação/reflexão COMPLETA (sem limites)
      const meditationPatterns = [
        /<div[^>]*class="[^"]*medita[çc][ãa]o[^"]*"[^>]*>([\s\S]{100,50000}?)<\/div>/i,
        /<div[^>]*class="[^"]*reflex[ãa]o[^"]*"[^>]*>([\s\S]{100,50000}?)<\/div>/i,
        /<article[^>]*class="[^"]*contempla[^"]*"[^>]*>([\s\S]{100,50000}?)<\/article>/i,
        /<div[^>]*class="[^"]*texto[^"]*medita[^"]*"[^>]*>([\s\S]{100,50000}?)<\/div>/i,
        /(?:Medita[çc][ãa]o|Reflex[ãa]o|Ora[çc][ãa]o)[:\s]*<[^>]*>([\s\S]{100,50000}?)(?:<\/article>|<\/section>|<div[^>]*class="[^"]*rodape)/i,
        /<h[2-4][^>]*>(?:Medita[çc][ãa]o|Reflex[ãa]o)<\/h[2-4]>([\s\S]{100,50000}?)(?:<h[2-4]|<\/article>|<\/section>|<footer)/i
      ];

      for (const pattern of meditationPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 50) {
          homily = match[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&[a-z]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (homily.length > 100) break;
        }
      }

      // Se conseguiu extrair alguma informação útil
      if (liturgyTitle.length > 5 || firstReading.reference || gospel.reference) {
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
            source: 'paulus'
          },
        });
      }
    } catch (liturgyError) {
      console.error('[LITURGY API] Erro ao buscar liturgia da Paulus:', liturgyError);
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
                `visite: https://www.paulus.com.br/portal/liturgia-diaria/\n\n` +
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
      attributes: ['Liturgia Diária', 'Paulus'],
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

  return 'Liturgia do dia. Para mais informações, visite: https://www.paulus.com.br/portal/liturgia-diaria/';
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
