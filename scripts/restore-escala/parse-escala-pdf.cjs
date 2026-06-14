#!/usr/bin/env node
/* ============================================================================
 * parse-escala-pdf.cjs — DRY-RUN. Extrai escalas do PDF de Junho/2026 usando
 * coordenadas (pdftotext -bbox-layout), religando nomes quebrados em 2 linhas.
 * ----------------------------------------------------------------------------
 * ⚠️ A `position` é APROXIMADA (o layout do PDF não permite derivar o inteiro
 * exato como no HTML). date+time+ministro saem fiéis. Saída no MESMO formato
 * do parser de HTML, para alimentar o mesmo importador.
 *
 * Uso: node scripts/restore-escala/parse-escala-pdf.cjs <arquivo.pdf> [--json out.json] [--month 06 --year 2026]
 * ==========================================================================*/
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const args = process.argv.slice(2);
let jsonOut = null, month = "06", year = "2026";
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") jsonOut = args[++i];
  else if (args[i] === "--month") month = String(args[++i]).padStart(2, "0");
  else if (args[i] === "--year") year = String(args[++i]);
  else files.push(args[i]);
}
const pdf = files[0];
if (!pdf) { console.error("informe o PDF"); process.exit(1); }

// 1) extrai palavras com coordenadas
const xml = execFileSync("pdftotext", ["-bbox-layout", pdf, "-"], { encoding: "utf8" });
const words = [];
const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
let m;
while ((m = re.exec(xml))) {
  const t = m[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  if (t) words.push({ x: +m[1], y: +m[2], x2: +m[3], y2: +m[4], t });
}

const isTime = (t) => /^\d{1,2}h\d{0,2}$/.test(t);
const timeNorm = (t) => { const [h, mm] = t.replace("h", ":").split(":"); return `${h.padStart(2, "0")}:${(mm || "00").padEnd(2, "0")}`; };
const DATA_X = 45, HORA_X1 = 105, HORA_X2 = 165, MIN_X = 165; // faixas de coluna

// 2) marcadores de missa: palavras-hora na coluna Hora
const masses = words.filter((w) => isTime(w.t) && w.x >= HORA_X1 && w.x < HORA_X2 + 60)
  .map((w) => ({ y: w.y, time: timeNorm(w.t) })).sort((a, b) => a.y - b.y);

// data corrente por y: números 1-2 dígitos na coluna Data
const dateMarks = words.filter((w) => w.x < DATA_X && /^\d{1,2}$/.test(w.t) && +w.t >= 1 && +w.t <= 31)
  .map((w) => ({ y: w.y, day: +w.t })).sort((a, b) => a.y - b.y);
const dayAt = (y) => { let d = null; for (const dm of dateMarks) { if (dm.y <= y + 6) d = dm.day; } return d; };

const minWords = words.filter((w) => w.x >= MIN_X && !/^\d+$/.test(w.t));

// 3) dicionário de nomes conhecidos (chaves do alias-map = apelidos dos exports)
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const aliasMap = JSON.parse(fs.readFileSync(path.join(__dirname, "alias-map.json"), "utf8"));
delete aliasMap._doc;
const dict = new Set(Object.keys(aliasMap).map(norm));
const MAXK = 3;

// 4) por missa: ordem de leitura (linha→x) + segmentação gulosa por dicionário
const records = [];
const warnings = [];
const unmatched = new Set();
for (let i = 0; i < masses.length; i++) {
  const y0 = masses[i].y - 4, y1 = i + 1 < masses.length ? masses[i + 1].y - 4 : 1e9;
  const time = masses[i].time;
  const day = dayAt(masses[i].y);
  if (!day) { warnings.push(`missa em y=${masses[i].y} (${time}) sem data`); continue; }
  const date = `${year}-${month}-${String(day).padStart(2, "0")}`;

  // stream em ordem de leitura: agrupa em linhas por y (gap<10), cada linha L→R
  const band = minWords.filter((w) => w.y >= y0 && w.y < y1).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const w of band) { const last = lines[lines.length - 1]; if (last && Math.abs(w.y - last.y) < 8) last.ws.push(w); else lines.push({ y: w.y, ws: [w] }); }
  const toks = lines.flatMap((l) => l.ws.sort((a, b) => a.x - b.x).map((w) => w.t));

  let pos = 0;
  for (let j = 0; j < toks.length;) {
    let matched = null, used = 1;
    for (let k = Math.min(MAXK, toks.length - j); k >= 1; k--) {
      const cand = toks.slice(j, j + k).join(" ");
      if (dict.has(norm(cand))) { matched = cand; used = k; break; }
    }
    if (matched) { records.push({ date, time, weekday: "", pos: ++pos, position: "pdf", minister: matched }); j += used; }
    else { unmatched.add(toks[j]); j += 1; }
  }
}

// 5) saída
const dates = [...new Set(records.map((r) => r.date))].sort();
const ministers = [...new Set(records.map((r) => r.minister))].sort((a, b) => a.localeCompare(b, "pt"));
console.log(`══════ ${path.basename(pdf)} ══════`);
console.log(`Mês ${month}/${year}`);
console.log(`Missas: ${masses.length} | Escalações reconhecidas: ${records.length}`);
console.log(`Datas (${dates.length}): ${dates.join(", ")}`);
console.log(`Ministros distintos (${ministers.length}): ${ministers.join(", ")}`);
if (unmatched.size) console.log(`\n❌ TOKENS NÃO RECONHECIDOS (${unmatched.size}) — apelidos de junho a confirmar:\n   ${[...unmatched].sort((a, b) => a.localeCompare(b, "pt")).join(", ")}`);
if (warnings.length) console.log(`⚠️ avisos: ${warnings.length} — ${warnings.slice(0, 3).join(" ; ")}`);
console.log("Amostra (10):");
records.slice(0, 10).forEach((r) => console.log(`   ${r.date} ${r.time} pos${r.pos} | ${r.minister}`));

if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify({ total: records.length, records }, null, 2)); console.log(`\n📄 ${jsonOut} (${records.length} registros). ⚠️ position aproximada.`); }
console.log("\n✅ DRY-RUN concluído. Nenhuma escrita em banco.");
