#!/usr/bin/env node
/* Reconcilia apelidos do HTML -> users do banco (READ ONLY). Gera lista para
 * confirmação manual. NÃO escreve nada. Uso:
 *   node scripts/restore-escala/reconcile-ministers.cjs <arq1.html> [arq2.html ...]
 */
const { Client } = require("pg");
const { execFileSync } = require("child_process");
const path = require("path");

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// usa o parser existente p/ extrair nomes de cada arquivo
function namesFrom(file) {
  const out = execFileSync("node", [path.join(__dirname, "parse-escala-html.cjs"), "--json", "/tmp/_recon.json", file], { encoding: "utf8" });
  const recs = JSON.parse(require("fs").readFileSync("/tmp/_recon.json", "utf8")).records;
  return recs.map((r) => r.minister);
}

(async () => {
  const files = process.argv.slice(2);
  const htNames = [...new Set(files.flatMap(namesFrom))]
    .filter((n) => n && !/vacante/i.test(n))
    .sort((a, b) => a.localeCompare(b, "pt"));

  const URL = process.env.PRODUCTION_DATABASE_URL;
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
  await c.connect(); await c.query("BEGIN TRANSACTION READ ONLY");
  const users = (await c.query(`SELECT id, name FROM users WHERE name IS NOT NULL`)).rows
    .map((u) => ({ id: u.id, name: u.name, tokens: norm(u.name).split(" ") }));
  await c.query("COMMIT"); await c.end();

  const matchScore = (htTokens, u) => {
    // cada token do HTML deve ser prefixo de ALGUM token do nome completo
    let hit = 0;
    for (const t of htTokens) {
      if (u.tokens.some((ut) => ut.startsWith(t) || t.startsWith(ut))) hit++;
    }
    if (hit < htTokens.length) return 0;       // todos precisam casar
    // bônus se o 1º token casa o 1º nome
    const firstBonus = u.tokens[0] && htTokens[0] && (u.tokens[0].startsWith(htTokens[0]) || htTokens[0].startsWith(u.tokens[0])) ? 0.5 : 0;
    return hit + firstBonus;
  };

  const auto = [], ambiguous = [], nomatch = [];
  for (const name of htNames) {
    const ht = norm(name).split(" ");
    const scored = users.map((u) => ({ u, s: matchScore(ht, u) })).filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    if (!scored.length) { nomatch.push(name); continue; }
    const top = scored[0].s;
    const tied = scored.filter((x) => x.s === top);
    if (tied.length === 1) auto.push([name, scored[0].u.name]);
    else ambiguous.push([name, tied.map((x) => x.u.name)]);
  }

  console.log(`Nomes distintos no HTML: ${htNames.length}`);
  console.log(`✅ match único: ${auto.length}  |  ⚠️ ambíguos: ${ambiguous.length}  |  ❌ sem match: ${nomatch.length}\n`);
  console.log("===== ❌ SEM MATCH (apelido puro — você diz quem é) =====");
  console.log(nomatch.join(", ") || "(nenhum)");
  console.log("\n===== ⚠️ AMBÍGUOS (escolha 1) =====");
  ambiguous.forEach(([n, opts]) => console.log(`  ${n}  ->  ${opts.join("  |  ")}`));
  console.log("\n===== ✅ MATCH AUTOMÁTICO (confira por amostragem) =====");
  auto.slice(0, 30).forEach(([n, full]) => console.log(`  ${n}  ->  ${full}`));
  if (auto.length > 30) console.log(`  … +${auto.length - 30}`);
})().catch((e) => { console.error("ERRO:", e.message); process.exit(2); });
