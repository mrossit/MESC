import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const excelPath = join(__dirname, '../attached_assets/escalaexemplo.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets['Missas'];

  // Converter para array de arrays
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false
  });

  console.log('📊 ANÁLISE DETALHADA DA ESCALA\n');
  console.log('═'.repeat(80));

  // Encontrar a primeira linha não vazia significativa
  console.log('\n📝 PRIMEIRAS 50 LINHAS COM CONTEÚDO:\n');

  let lineCount = 0;
  for (let i = 0; i < Math.min(data.length, 50); i++) {
    const row = data[i];
    const nonEmptyCells = row.filter(cell => cell && String(cell).trim());

    if (nonEmptyCells.length > 0) {
      lineCount++;
      const preview = nonEmptyCells.slice(0, 15).map(cell => {
        const str = String(cell).trim();
        return str.length > 25 ? str.substring(0, 22) + '...' : str;
      }).join(' | ');

      console.log(`Linha ${i + 1} (${nonEmptyCells.length} células): ${preview}`);

      if (lineCount > 30) break;
    }
  }

  // Análise de padrões horizontais
  console.log('\n' + '═'.repeat(80));
  console.log('\n🔍 ANÁLISE DE PADRÕES:\n');

  // Procurar por datas
  const datePatterns = [];
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i];
    for (let j = 0; j < Math.min(row.length, 50); j++) {
      const cell = row[j];
      if (cell && /\d{1,2}[\/\-]\d{1,2}/.test(String(cell))) {
        datePatterns.push({
          linha: i + 1,
          coluna: j + 1,
          valor: cell
        });
      }
    }
  }

  console.log('📅 Datas encontradas:');
  datePatterns.slice(0, 20).forEach(d => {
    console.log(`  Linha ${d.linha}, Coluna ${d.coluna}: "${d.valor}"`);
  });

  // Procurar por horários
  const timePatterns = [];
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i];
    for (let j = 0; j < Math.min(row.length, 50); j++) {
      const cell = row[j];
      if (cell && /\d{1,2}:\d{2}/.test(String(cell))) {
        timePatterns.push({
          linha: i + 1,
          coluna: j + 1,
          valor: cell
        });
      }
    }
  }

  console.log('\n⏰ Horários encontrados:');
  timePatterns.slice(0, 20).forEach(t => {
    console.log(`  Linha ${t.linha}, Coluna ${t.coluna}: "${t.valor}"`);
  });

  // Exportar as primeiras 20 linhas para JSON para análise
  const sample = data.slice(0, 20).map((row, i) => {
    return {
      linha: i + 1,
      celulas: row.slice(0, 30).filter(c => c && String(c).trim())
    };
  }).filter(r => r.celulas.length > 0);

  const outputPath = join(__dirname, '../attached_assets/escala-sample.json');
  fs.writeFileSync(outputPath, JSON.stringify(sample, null, 2), 'utf8');
  console.log(`\n💾 Sample exportado para: ${outputPath}`);

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Análise concluída!');

} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
