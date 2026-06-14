#!/usr/bin/env node
/* ============================================================================
 * parse-escala-html.cjs — DRY-RUN (somente leitura, NÃO escreve no banco)
 * ----------------------------------------------------------------------------
 * Extrai escalas a partir dos HTML exportados pelo MESC (mesmo formato do
 * "Escala_<Mês>_<Ano>.html"). Serve para reconstruir Mar–Jun/2026 perdidos.
 *
 * Uso:
 *   node scripts/restore-escala/parse-escala-html.cjs <arquivo1.html> [arquivo2.html ...]
 *   node scripts/restore-escala/parse-escala-html.cjs --json saida.json <arquivos...>
 *
 * Saída: resumo (datas, ministros, posições, contagens) + opcional JSON
 * normalizado para a próxima etapa (reconciliação de ministros e import em
 * staging). NENHUMA conexão com banco é feita aqui.
 * ==========================================================================*/
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const MESES = {
  janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04",
  maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
  outubro: "10", novembro: "11", dezembro: "12",
};

function inferMonthYear(title, filename) {
  const hay = `${title} ${filename}`.toLowerCase();
  let month = null, year = null;
  for (const [nome, num] of Object.entries(MESES)) {
    if (hay.includes(nome)) { month = num; break; }
  }
  const my = hay.match(/\b(20\d{2})\b/);
  if (my) year = my[1];
  // formato Mês/Ano numérico (ex: 03/2026)
  if (!month) { const m = hay.match(/\b(0?[1-9]|1[0-2])[/-](20\d{2})\b/); if (m) { month = m[1].padStart(2, "0"); year = m[2]; } }
  return { month, year };
}

function expandRow($, tr) {
  const out = [];
  $(tr).find("th,td").each((_, c) => {
    const txt = $(c).text().trim().replace(/\s+/g, " ");
    const cs = parseInt($(c).attr("colspan") || "1", 10);
    for (let k = 0; k < cs; k++) out.push(txt);
  });
  return out;
}

const isTime = (s) => /^\d{1,2}:\d{2}$/.test((s || "").trim());
const isDay = (s) => /^\d{1,2}$/.test((s || "").trim());

function parseFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const $ = cheerio.load(html);
  const title = $("h1").first().text() || $("title").text() || "";
  const { month, year } = inferMonthYear(title, path.basename(file));

  const trs = $("table tr").toArray();
  const headerIdx = trs.findIndex(
    (tr) => /\bData\b/i.test($(tr).text()) && /\bHora\b/i.test($(tr).text())
  );
  if (headerIdx < 0) throw new Error("cabeçalho (Data/Dia/Hora) não encontrado");
  const header = expandRow($, trs[headerIdx]);

  const records = [];
  const warnings = [];
  let lastDay = null;

  for (let i = headerIdx + 1; i < trs.length; i++) {
    const row = expandRow($, trs[i]);
    if (row.length < 4) continue;
    // linha de numeração (1,2,3,...) → ignorar
    if (row.slice(0, 5).every((c) => isDay(c) || c === "")) continue;

    let day = row[0], time = row[2];
    if (isDay(day)) lastDay = day; else day = lastDay; // rowspan/continuação
    if (!isTime(time)) continue;                       // não é linha de missa
    if (!day) { warnings.push(`linha ${i}: hora ${time} sem dia`); continue; }

    const weekday = row[1] || "";
    for (let c = 3; c < row.length; c++) {
      const minister = (row[c] || "").trim();
      if (!minister) continue;
      const date = month && year ? `${year}-${month}-${String(day).padStart(2, "0")}` : `(?)-${day}`;
      records.push({
        date, time, weekday,
        position: header[c] || `col${c}`,
        minister,
      });
    }
  }
  return { file: path.basename(file), title: title.trim(), month, year, records, warnings };
}

// ---- main ----
const argv = process.argv.slice(2);
let jsonOut = null;
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--json") jsonOut = argv[++i];
  else files.push(argv[i]);
}
if (!files.length) {
  console.error("Uso: node scripts/restore-escala/parse-escala-html.cjs [--json saida.json] <arquivo.html ...>");
  process.exit(1);
}

const all = [];
for (const f of files) {
  try {
    const r = parseFile(f);
    all.push(r);
    const dates = [...new Set(r.records.map((x) => x.date))].sort();
    const ministers = [...new Set(r.records.map((x) => x.minister))].sort((a, b) => a.localeCompare(b, "pt"));
    const positions = [...new Set(r.records.map((x) => x.position))];
    console.log(`\n══════ ${r.file} ══════`);
    console.log(`Título: ${r.title || "(sem título)"}   →  mês=${r.month || "?"} ano=${r.year || "?"}`);
    console.log(`Escalações extraídas: ${r.records.length}`);
    console.log(`Datas (${dates.length}): ${dates[0] || "-"} … ${dates[dates.length - 1] || "-"}`);
    console.log(`Posições (${positions.length}): ${positions.join(", ")}`);
    console.log(`Ministros distintos (${ministers.length}): ${ministers.join(", ")}`);
    if (r.warnings.length) console.log(`⚠️  avisos: ${r.warnings.length} (ex: ${r.warnings[0]})`);
    console.log("Amostra (5):");
    r.records.slice(0, 5).forEach((x) => console.log(`   ${x.date} ${x.time} | ${x.position} | ${x.minister}`));
  } catch (e) {
    console.error(`\n❌ ${path.basename(f)}: ${e.message}`);
  }
}

if (jsonOut) {
  const flat = all.flatMap((r) => r.records.map((x) => ({ ...x, source: r.file })));
  fs.writeFileSync(jsonOut, JSON.stringify({ generatedFrom: files.map((f) => path.basename(f)), total: flat.length, records: flat }, null, 2));
  console.log(`\n📄 JSON normalizado escrito em: ${jsonOut} (${all.reduce((n, r) => n + r.records.length, 0)} registros) — NADA foi gravado em banco.`);
}
console.log("\n✅ DRY-RUN concluído. Nenhuma escrita em banco.");
