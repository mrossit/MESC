# CLAUDE.md — Briefing de integração do conteúdo MESC

> Este arquivo orienta o Claude Code a integrar o conteúdo de formação dos
> **Ministros Extraordinários da Sagrada Comunhão (MESC) — Santuário São Judas Tadeu**
> ao app MESC (stack **Capacitor**). Coloque esta pasta no repositório do app e
> mantenha este arquivo no diretório que o agente lê (raiz do repo ou raiz desta pasta).

## Regras inegociáveis

1. **Os arquivos `dados/*.json` e `conteudo/*.md` são a ÚNICA fonte de verdade do conteúdo.**
   Não copie texto litúrgico, funções, orações ou checklists para dentro do código.
   O app carrega esses arquivos; mudou o conteúdo, mudou o arquivo.
2. **Não invente nem complete dados.** Itens marcados no texto como "confirmar com a
   coordenação" (nomes da coordenação, chave PIX/valor, quantidades por missa) só mudam
   por edição manual de quem mantém o conteúdo. Nunca preencha por conta própria.
3. **Respeite o esquema.** Os dados seguem `dados/schema/mesc.schema.json` e os tipos
   `types/mesc.d.ts`. Ao ler/transformar, valide contra o schema; não altere o formato
   sem atualizar schema **e** tipos juntos.
4. **Fidelidade litúrgica.** É material religioso de uma paróquia real. Não parafrasear
   orações nem reescrever instruções de rito; preservar o texto como está.

## O que tem aqui

```
MESC-Renovado/
├── CLAUDE.md                 ← este briefing
├── README.md                 ← visão geral para humanos
├── index.html                ← protótipo navegável = REFERÊNCIA DE UX a reproduzir
├── conteudo/*.md             ← conteúdo de leitura por módulo (texto + front-matter YAML)
├── dados/*.json              ← dados estruturados (fonte de verdade das telas de dados)
├── dados/schema/mesc.schema.json  ← JSON Schema (draft-07) dos dados
├── types/mesc.d.ts           ← tipos TypeScript correspondentes
└── assets/*.png              ← imagens (mapas de posição da igreja)
```

- **`dados/manifest.json`** é o índice: lista os módulos (id, ícone, resumo, caminho do
  `.md`, dados consumidos, seções). **É a fonte da navegação do app.**
- Cada `.md` começa com front-matter YAML (`modulo`, `titulo`, às vezes `fonte`/`dados`).
  Ao renderizar, **remova o front-matter** (bloco entre as primeiras linhas `---`/`---`).

## Mapa de dados → tela (o que cada arquivo alimenta)

| Arquivo | Tipo (em `types/mesc.d.ts`) | Tela / componente sugerido |
|---|---|---|
| `manifest.json` | `Manifest` | Navegação / lista de módulos |
| `funcoes_escala.json` | `FuncoesEscala` | Cards das funções 1–16, com filtro por fase |
| `missas_e_particulas.json` | `MissasEParticulas` | Tabela de missas, horários, calculadora de partículas |
| `checklists.json` | `Checklists` | Checklists marcáveis (uniforme, recolher, purificar…) |
| `oracoes.json` | `Oracoes` | Cards de orações/jaculatórias |
| `cores_e_tempos.json` | `CoresETempos` | Cores litúrgicas com amostra de cor |
| `glossario_liturgico.json` | `GlossarioLiturgico` | Glossário pesquisável + montagem do cálice |

## Notas específicas de Capacitor

- **Bundle offline:** empacote `conteudo/`, `dados/` e `assets/` como assets estáticos do
  app (ex.: `src/assets/mesc/`) para funcionar sem rede. Não dependa de `fetch` em
  `file://` — importe os JSON no build (`import data from '.../funcoes_escala.json'`) ou
  copie via `capacitor.config` e leia com `Filesystem`/`CapacitorHttp` conforme a abordagem.
- **Persistência de checklist:** NÃO use `localStorage` para o estado do usuário no app
  mobile (volátil/limpável). Use **`@capacitor/preferences`** (chave por `checklist.id`).
  O protótipo usa `localStorage` apenas por ser uma página web de demonstração.
- **Imagens:** referencie via os caminhos de `assets/` resolvidos para o bundle do app.
- **Markdown:** renderize com uma lib (ex.: `marked`) **sanitizada** (`DOMPurify`), ou
  pré-compile os `.md` para HTML no build. Suporte mínimo necessário: títulos, listas,
  tabelas, citações, negrito/itálico, código inline e links.

## Tarefas de integração (com critério de aceite)

1. **Loader de conteúdo** — função única que carrega os 7 JSON e expõe um objeto `MescData`
   (ver `types/mesc.d.ts`). *Aceite:* tipado, validado contra o schema em dev, sem dados hardcoded.
2. **Navegação a partir do manifest** — gerar a lista de módulos e rotas lendo `manifest.json`.
   *Aceite:* adicionar/remover um módulo no manifest reflete no app sem mudar código.
3. **Renderizador de módulo** — carrega o `.md` do módulo, remove o front-matter, renderiza.
   *Aceite:* tabelas e citações dos `.md` aparecem corretamente; nenhum `---`/`modulo:` vaza na tela.
4. **Tela de Funções** — cards de `funcoes_escala.json` com filtro por fase (preparação/durante/encerramento).
   *Aceite:* filtro funciona; conteúdo vem 100% do JSON.
5. **Checklists com persistência** — replicar os checklists usando `@capacitor/preferences`.
   *Aceite:* estado persiste ao fechar/reabrir o app; "limpar" reseta por checklist.
6. **Calculadora de partículas** — usar `capacidade_igreja` e a regra de `missas_e_particulas.json`.
   *Aceite:* resultado orientativo; deixa claro que os Auxiliares 1 e 2 definem o número final.
7. **Glossário pesquisável** — busca tolerante a acento/caixa sobre `glossario_liturgico.json`.
   *Aceite:* "ambula"/"âmbula" encontram o mesmo termo.

> Use `index.html` como referência viva de UX e comportamento — reproduza a estrutura e
> as interações, adaptando ao framework e às convenções do app.

## Validação (rodar antes de abrir PR)

```bash
# valida os JSON contra o schema (Python + jsonschema)
python3 - <<'PY'
import json, jsonschema, glob, os
s=json.load(open('dados/schema/mesc.schema.json')); mp=s['_mapaArquivos']
for path,ref in mp.items():
    jsonschema.validate(json.load(open(path)), {"$defs":s["$defs"],"$ref":ref})
    print("ok", path)
PY
```
