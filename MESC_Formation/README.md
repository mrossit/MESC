# MESC — Material Renovado (substrato para o app)

Material de formação dos **Ministros Extraordinários da Sagrada Comunhão** do **Santuário São Judas Tadeu**, reorganizado, atualizado e estruturado para servir de base ao app MESC.

## Como abrir

Abra **`index.html`** com um duplo clique (qualquer navegador). É um handbook navegável, com menu, busca, checklists interativos, calculadora de partículas e os mapas da igreja. Funciona offline e não depende de internet.

## Estrutura das pastas

```
MESC-Renovado/
├── index.html              → protótipo navegável (UX de referência do app)
├── manifest... (em dados/) → mapa de módulos e navegação
├── conteudo/               → conteúdo em Markdown, por módulo
│   ├── 00-identidade.md
│   ├── 01-formacao-teologica.md
│   ├── 02-postura-do-ministro.md
│   ├── 03-servico-na-missa.md
│   ├── 04-santissimo.md
│   ├── 05-referencia-liturgica.md
│   └── 06-enfermos-e-grupo.md
├── dados/                  → dados estruturados (JSON) para o app
│   ├── manifest.json           (módulos, seções, navegação)
│   ├── funcoes_escala.json     (funções 1–16 e responsabilidades)
│   ├── missas_e_particulas.json(horários, escala por missa, cálculo)
│   ├── checklists.json         (uniforme, recolher, purificação, credência)
│   ├── oracoes.json            (jaculatórias e orações da Capela)
│   ├── cores_e_tempos.json     (cores litúrgicas)
│   └── glossario_liturgico.json(espaço, vestes, objetos, montagem do cálice)
└── assets/                 → imagens (mapas de posição da igreja)
    ├── mapa-missa-domingo.png
    └── mapa-missa-cura.png
```

## Como o app consome isto

- **Conteúdo de leitura** → arquivos Markdown em `conteudo/` (texto limpo, com front-matter).
- **Telas de dados** (cards de funções, checklists marcáveis, calculadora, glossário pesquisável) → JSON em `dados/`. Cada arquivo tem um esquema simples e estável.
- **Navegação** → `dados/manifest.json` descreve módulos, ícones, resumos e seções; é a fonte para o menu do app.
- O `index.html` já demonstra todos esses consumos numa única tela — serve de referência de UX e de teste dos dados.

## Origem do conteúdo

Consolidado e atualizado a partir de: *Formação dos Ministros 2025* (PPTX), *Reunião de Ministros 2023* (PPTX), *Formação 2021* (PDF), as 3 apostilas da *Escola de Liturgia* (Prof. Michel Pagiossi) e *Materiais Litúrgicos*.

## Pontos a confirmar com a coordenação (marcados no texto)

- Nomes e funções da coordenação (mudam com o tempo).
- Chave PIX / valor da contribuição.
- Quantidades de ministros/partículas por missa, se houver ajuste recente.
- Itens da pandemia foram removidos (máscaras); confirmar a forma atual de ministrar (voltou a ser na boca, com "O Corpo de Cristo").
