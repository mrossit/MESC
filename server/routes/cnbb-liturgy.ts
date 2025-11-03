import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

interface CNBBLiturgyParams {
  ano?: number;
  mes?: number;
  dia?: number;
}

/**
 * Parse liturgy data from CNBB website
 */
function parseLiturgyData(html: string): string[] {
  const $ = cheerio.load(html);
  const readings: string[] = [];
  
  // Find all blog-post divs (where readings are located)
  $('.blog-post').each((_, element) => {
    const text = $(element).text();
    readings.push(text);
  });
  
  // Split by multiple newlines and tabs (indicates new text section)
  const allText = readings.join('');
  const sections = allText
    .split(/\n\n\n\n\t\t\t\t\t\t\t\t/)
    .map(section => section.replace(/\n/g, '').replace(/\t/g, '').trim())
    .filter(section => section.length > 0);
  
  return sections;
}

/**
 * Fetch liturgy from CNBB website
 */
async function fetchCNBBLiturgy(params?: CNBBLiturgyParams): Promise<string[]> {
  let url = 'https://liturgiadiaria.cnbb.org.br/app/user/user/UserView.php';
  
  // Add date parameters if provided
  if (params?.ano && params?.mes && params?.dia) {
    const queryParams = new URLSearchParams({
      ano: params.ano.toString(),
      mes: params.mes.toString(),
      dia: params.dia.toString(),
    });
    url += `?${queryParams.toString()}`;
  }
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  return parseLiturgyData(response.data);
}

/**
 * GET /api/cnbb-liturgy
 * Get today's liturgy from CNBB
 */
router.get('/', async (req, res) => {
  try {
    const readings = await fetchCNBBLiturgy();
    
    res.json({
      success: true,
      data: {
        date: new Date().toISOString(),
        readings,
        source: 'CNBB - Conferência Nacional dos Bispos do Brasil',
      },
    });
  } catch (error) {
    console.error('Error fetching CNBB liturgy:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar liturgia da CNBB',
    });
  }
});

/**
 * POST /api/cnbb-liturgy/date
 * Get liturgy for specific date
 */
router.post('/date', async (req, res) => {
  try {
    const { ano, mes, dia } = req.body;
    
    // Validate parameters
    if (!ano || !mes || !dia) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros ano, mes e dia são obrigatórios',
      });
    }
    
    const readings = await fetchCNBBLiturgy({
      ano: parseInt(ano),
      mes: parseInt(mes),
      dia: parseInt(dia),
    });
    
    res.json({
      success: true,
      data: {
        date: new Date(ano, mes - 1, dia).toISOString(),
        readings,
        source: 'CNBB - Conferência Nacional dos Bispos do Brasil',
      },
    });
  } catch (error) {
    console.error('Error fetching CNBB liturgy:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar liturgia da CNBB',
    });
  }
});

export default router;
