import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const excelPath = join(__dirname, '../attached_assets/escalaexemplo.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);

  console.log('📊 ANÁLISE DO ARQUIVO EXCEL DE ESCALA\n');
  console.log('═'.repeat(60));

  console.log('\n📋 PLANILHAS ENCONTRADAS:');
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`  ${index + 1}. ${sheetName}`);
  });

  // Analisar cada planilha
  workbook.SheetNames.forEach((sheetName) => {
    console.log('\n' + '═'.repeat(60));
    console.log(`\n📄 PLANILHA: "${sheetName}"\n`);

    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    console.log(`📐 Dimensões: ${range.e.r + 1} linhas x ${range.e.c + 1} colunas`);
    console.log(`📍 Range: ${worksheet['!ref']}`);

    // Converter para JSON para análise
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log('\n📝 PRIMEIRAS 20 LINHAS:\n');
    data.slice(0, 20).forEach((row, index) => {
      const rowData = row.map(cell => {
        const cellStr = String(cell || '').trim();
        return cellStr.length > 30 ? cellStr.substring(0, 27) + '...' : cellStr;
      });
      console.log(`  Linha ${index + 1}: [${rowData.join(' | ')}]`);
    });

    // Análise de estrutura
    console.log('\n🔍 ANÁLISE DE ESTRUTURA:\n');

    // Procurar headers
    const possibleHeaders = data.slice(0, 10);
    possibleHeaders.forEach((row, index) => {
      const nonEmptyCells = row.filter(cell => cell && String(cell).trim());
      if (nonEmptyCells.length > 3) {
        console.log(`  Possível cabeçalho na linha ${index + 1}:`);
        console.log(`    ${nonEmptyCells.join(' | ')}`);
      }
    });

    // Procurar padrões de data
    const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    const timePattern = /\d{1,2}:\d{2}/;

    console.log('\n📅 CÉLULAS COM DATAS/HORÁRIOS:');
    let dateCount = 0;
    for (let r = 0; r <= Math.min(range.e.r, 50); r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v);
          if (datePattern.test(cellValue) || timePattern.test(cellValue)) {
            if (dateCount < 10) {
              console.log(`  ${cellAddress}: ${cellValue} (tipo: ${cell.t})`);
            }
            dateCount++;
          }
        }
      }
    }
    console.log(`  Total: ${dateCount} células com datas/horários`);

    // Procurar células mescladas
    if (worksheet['!merges']) {
      console.log('\n🔗 CÉLULAS MESCLADAS:');
      worksheet['!merges'].slice(0, 10).forEach((merge, index) => {
        const startCell = XLSX.utils.encode_cell(merge.s);
        const endCell = XLSX.utils.encode_cell(merge.e);
        const value = worksheet[startCell]?.v || '';
        console.log(`  ${index + 1}. ${startCell}:${endCell} = "${value}"`);
      });
      if (worksheet['!merges'].length > 10) {
        console.log(`  ... e mais ${worksheet['!merges'].length - 10} células mescladas`);
      }
    }
  });

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Análise concluída!');

} catch (error) {
  console.error('❌ Erro ao ler arquivo:', error.message);
  process.exit(1);
}
