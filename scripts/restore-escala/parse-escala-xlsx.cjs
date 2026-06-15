#!/usr/bin/env node
/* parse-escala-xlsx.cjs — DRY-RUN. Lê o Excel exportado (aba "Escala"), mesmo
 * formato-matriz do HTML. Emite o MESMO shape do parser de HTML, com position
 * = ordinal da coluna após a Hora (fiel ao banco). Não escreve nada.
 * Uso: node parse-escala-xlsx.cjs <arq.xlsx> [--json out.json] [--month 06 --year 2026]
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const MESES = { janeiro:"01",fevereiro:"02","março":"03",marco:"03",abril:"04",maio:"05",junho:"06",julho:"07",agosto:"08",setembro:"09",outubro:"10",novembro:"11",dezembro:"12" };
const args = process.argv.slice(2);
let jsonOut=null, month=null, year=null; const files=[];
for(let i=0;i<args.length;i++){ if(args[i]==="--json")jsonOut=args[++i]; else if(args[i]==="--month")month=String(args[++i]).padStart(2,"0"); else if(args[i]==="--year")year=String(args[++i]); else files.push(args[i]); }
const file=files[0];
if(!file){ console.error("informe o .xlsx"); process.exit(1); }

const wb=XLSX.readFile(file);
const sheet=wb.Sheets[wb.SheetNames.find(n=>/escala/i.test(n))||wb.SheetNames[0]];
const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false}).map(r=>r.map(c=>String(c).trim()));

// mês/ano pelo título ou nome do arquivo
const hay=((rows[0]&&rows[0][0])||"")+" "+path.basename(file);
if(!month){ for(const[n,v] of Object.entries(MESES)) if(hay.toLowerCase().includes(n)){month=v;break;} }
const my=hay.match(/\b(20\d{2})\b/); if(!year&&my)year=my[1];

const isTime=s=>/^\d{1,2}:\d{2}/.test(s);
const isDay=s=>/^\d{1,2}$/.test(s);
const hi=rows.findIndex(r=>r.some(c=>/^data$/i.test(c))&&r.some(c=>/^hora$/i.test(c)));
if(hi<0){ console.error("cabeçalho Data/Hora não encontrado"); process.exit(1); }
const header=rows[hi];
const horaCol=header.findIndex(c=>/^hora$/i.test(c));
// nome de posição por coluna (forward-fill do cabeçalho)
const posNames=[]; let last=""; for(let c=0;c<header.length;c++){ if(header[c])last=header[c]; posNames[c]=last; }

const records=[]; const warnings=[]; let lastDay=null;
for(let i=hi+1;i<rows.length;i++){
  const row=rows[i]; if(!row.length) continue;
  if(isDay(row[0])) lastDay=row[0];
  const time=row[horaCol];
  if(!isTime(time)) continue;
  if(!lastDay){ warnings.push(`linha ${i}: hora ${time} sem dia`); continue; }
  const weekday=row[1]||"";
  for(let c=horaCol+1;c<row.length;c++){
    const minister=(row[c]||"").trim();
    if(!minister) continue;
    const pos=c-horaCol;
    const date= month&&year ? `${year}-${month}-${String(lastDay).padStart(2,"0")}` : `(?)-${lastDay}`;
    records.push({ date, time:time.slice(0,5), weekday, pos, position:posNames[c]||`col${pos}`, minister });
  }
}

const dates=[...new Set(records.map(r=>r.date))].sort();
const ministers=[...new Set(records.map(r=>r.minister))].sort((a,b)=>a.localeCompare(b,"pt"));
console.log(`══════ ${path.basename(file)} ══════`);
console.log(`mês=${month||"?"} ano=${year||"?"} | aba: ${wb.SheetNames.find(n=>/escala/i.test(n))||wb.SheetNames[0]}`);
console.log(`Escalações: ${records.length} | Datas (${dates.length}): ${dates[0]||"-"} … ${dates[dates.length-1]||"-"}`);
console.log(`Ministros distintos (${ministers.length})`);
if(warnings.length) console.log(`⚠️ avisos: ${warnings.length}`);
console.log("Amostra (6):"); records.slice(0,6).forEach(r=>console.log(`   ${r.date} ${r.time} pos${r.pos} | ${r.minister}`));
if(jsonOut){ fs.writeFileSync(jsonOut,JSON.stringify({total:records.length,records},null,2)); console.log(`\n📄 ${jsonOut} (${records.length})`); }
console.log("\n✅ DRY-RUN concluído. Nenhuma escrita em banco.");
