#!/usr/bin/env node
/* ============================================================================
 * import-escala.cjs — reconstrução de escalas a partir dos HTML exportados.
 * ----------------------------------------------------------------------------
 * DRY-RUN por padrão (não escreve). Com --apply insere na PRODUÇÃO de forma
 * ADITIVA e IDEMPOTENTE (id determinístico uuidv5 por date|time|position →
 * ON CONFLICT (id) DO NOTHING). Trava: recusa --apply se houver QUALQUER
 * ministro não resolvido, ou se o mês alvo já tiver escalas no banco.
 *
 * Uso:
 *   node scripts/restore-escala/import-escala.cjs <arq.html ...>            # dry-run
 *   node scripts/restore-escala/import-escala.cjs --apply <arq.html ...>    # aplica
 * ==========================================================================*/
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { Client } = require("pg");
const { v5: uuidv5 } = require("uuid");

const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // namespace DNS (RFC-4122) p/ ids determinísticos
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const files = args.filter((a) => a !== "--apply");
if (!files.length) { console.error("informe os arquivos .html"); process.exit(1); }

const alias = JSON.parse(fs.readFileSync(path.join(__dirname, "alias-map.json"), "utf8"));
delete alias._doc;

function parse(file) {
  execFileSync("node", [path.join(__dirname, "parse-escala-html.cjs"), "--json", "/tmp/_imp.json", file], { stdio: "ignore" });
  return JSON.parse(fs.readFileSync("/tmp/_imp.json", "utf8")).records;
}

(async () => {
  const c = new Client({ connectionString: process.env.PRODUCTION_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const users = (await c.query("SELECT id,name FROM users WHERE name IS NOT NULL")).rows
    .map((u) => ({ id: u.id, name: u.name, n: norm(u.name), toks: norm(u.name).split(" ") }));
  const byNorm = new Map(users.map((u) => [u.n, u]));
  const community = (await c.query("SELECT id FROM communities WHERE slug='sao-judas'")).rows[0];
  if (!community) throw new Error("comunidade São Judas não encontrada");

  const resolve = (nick) => {
    if (/vacante/i.test(nick)) return { id: null, vacante: true };
    const target = alias[nick] || nick;                 // mapa-verdade / override
    const q = norm(target);
    if (byNorm.has(q)) return { id: byNorm.get(q).id, name: byNorm.get(q).name };
    // fallback (só p/ nomes fora do mapa): cada token do apelido (≥2 letras)
    // deve ser prefixo de algum token do nome completo (≥2 letras). Sem
    // direção inversa nem tokens de 1 letra (evita casar "Marquinhos" com "M").
    const qt = q.split(" ").filter((t) => t.length >= 2);
    let m = qt.length ? users.filter((u) => qt.every((t) => u.toks.some((ut) => ut.length >= 2 && ut.startsWith(t)))) : [];
    if (m.length > 1) { const s = m.filter((u) => u.toks[0].startsWith(qt[0])); if (s.length === 1) m = s; }
    if (m.length === 1) return { id: m[0].id, name: m[0].name, fallback: true };
    return { unresolved: true };
  };

  const rows = [];
  const unresolved = new Set();
  const fallback = new Map();
  const months = new Set();
  for (const f of files) {
    for (const r of parse(f)) {
      const res = resolve(r.minister);
      if (res.unresolved) { unresolved.add(r.minister); continue; }
      if (res.fallback) fallback.set(r.minister, res.name);
      const time = r.time.length === 5 ? r.time + ":00" : r.time;
      const key = `${community.id}|${r.date}|${time}|${r.pos}`;
      months.add(r.date.slice(0, 7));
      rows.push({
        id: uuidv5(key, NS), date: r.date, time, position: r.pos,
        minister_id: res.id, nick: r.minister, who: res.vacante ? "VACANTE" : res.name,
      });
    }
  }

  // relatório
  console.log("Arquivos:", files.map((f) => path.basename(f)).join(", "));
  console.log("Meses:", [...months].sort().join(", "));
  console.log("Linhas a inserir:", rows.length, "| ministros não resolvidos:", unresolved.size);
  const vac = rows.filter((r) => r.minister_id === null).length;
  console.log("VACANTE (minister_id null):", vac);
  console.log("Amostra:");
  rows.slice(0, 6).forEach((r) => console.log(`   ${r.date} ${r.time} pos${r.position} | ${r.nick} -> ${r.who}`));
  if (fallback.size) { console.log("\n⚠️ resolvidos por FALLBACK (fora do mapa-verdade — confira):"); [...fallback].forEach(([n, w]) => console.log(`   ${n} -> ${w}`)); }
  if (unresolved.size) { console.log("\n❌ NÃO RESOLVIDOS:", [...unresolved].join(", ")); }

  if (!APPLY) {
    console.log("\nDRY-RUN: nada gravado. Para aplicar: --apply");
    await c.end(); return;
  }
  if (unresolved.size) { console.error("\n🚫 abortado: resolva os nomes antes de --apply."); await c.end(); process.exit(2); }

  // trava: meses alvo não podem já ter dados
  for (const mes of months) {
    const [y, m] = mes.split("-");
    const n = (await c.query(`SELECT COUNT(*)::int n FROM schedules WHERE date>=$1 AND date<$2 AND NOT is_deleted`,
      [`${y}-${m}-01`, m === "12" ? `${+y + 1}-01-01` : `${y}-${String(+m + 1).padStart(2, "0")}-01`])).rows[0].n;
    if (n > 0) { console.error(`🚫 abortado: ${mes} já tem ${n} escalas no banco (evitando duplicar).`); await c.end(); process.exit(2); }
  }

  console.log("\n=== APLICANDO (aditivo, idempotente) ===");
  await c.query("BEGIN");
  let ins = 0;
  for (const r of rows) {
    const res = await c.query(
      `INSERT INTO schedules (id,status,created_at,date,time,type,location,minister_id,substitute_id,notes,position,on_site_adjustments,deleted_at,is_deleted,community_id)
       VALUES ($1,'published',now(),$2,$3,'missa',NULL,$4,NULL,'Reconstruído via HTML (escala original)',$5,NULL,NULL,false,$6)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.date, r.time, r.minister_id, r.position, community.id]);
    ins += res.rowCount;
  }
  await c.query("COMMIT");
  console.log(`✅ inseridas ${ins} de ${rows.length} (resto já existia).`);
  await c.end();
})().catch((e) => { console.error("ERRO:", e.message); process.exit(2); });
