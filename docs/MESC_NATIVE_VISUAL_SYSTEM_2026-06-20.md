# MESC Native - Sistema Visual

**Data:** 2026-06-20
**Status:** direcao visual para a futura interface nativa iOS/Android
**Base:** briefing visual fornecido pelo produto e PRD v3 do MESC Native
**Uso:** referencia obrigatoria antes de criar telas SwiftUI, Jetpack Compose ou assets nativos.

---

## 1. Principio Visual

O MESC Native deve parecer liturgico, sobrio, classico e nativo, sem ficar rigido ou antigo.

A interface deve priorizar:

- clareza de escala, datas, horarios e acoes;
- serenidade pastoral;
- alto contraste e leitura confortavel;
- identidade Sao Judas Tadeu/MESC sem excesso promocional;
- uso moderado de vidro/liquid glass como camada nativa, nao como decoracao.

Evitar:

- neon, gradientes chamativos e visual de produto financeiro/fitness;
- excesso de cards empilhados;
- cantos totalmente quadrados;
- cantos em pilula como padrao principal;
- vidro em todos os elementos;
- textos longos explicando como usar a tela.

---

## 2. Paleta De Cores

| Papel | Nome | Hex | Uso |
|------|------|-----|-----|
| Primaria | Vermelho Liturgico | `#8B0000` | botoes principais, estados ativos, destaques fortes. |
| Primaria Alternativa | Vinho | `#722F37` | header, barras, fundos escuros de marca. |
| Secundaria | Ouro Velho | `#C5A059` | icones especiais, bordas finas, detalhes discretos. |
| Secundaria Alternativa | Dourado Antigo | `#B38F4D` | estados secundarias, divisores e realces menores. |
| Fundo Claro | Marfim | `#FDFBF7` | fundo principal light, substituindo branco puro. |
| Fundo Escuro | Grafite | `#1A1A1A` | fundo principal dark. |
| Texto Principal | Grafite Escuro | `#2C2C2C` | texto primario em modo claro. |
| Texto Sobre Escuro | Branco | `#FFFFFF` | texto sobre vidro/fundo escuro. |

### 2.1 Tokens Recomendados

```text
mesc.color.primary.red = #8B0000
mesc.color.primary.wine = #722F37
mesc.color.accent.gold = #C5A059
mesc.color.accent.goldMuted = #B38F4D
mesc.color.background.light = #FDFBF7
mesc.color.background.dark = #1A1A1A
mesc.color.text.primary = #2C2C2C
mesc.color.text.inverse = #FFFFFF
```

### 2.2 Regras De Uso

- Usar vermelho/vinho para acoes primarias e orientacao de navegacao.
- Usar dourado como detalhe, nao como grande bloco de cor.
- Usar marfim como fundo claro padrao para aquecer a experiencia.
- Usar grafite no modo escuro em vez de preto absoluto.
- Validar contraste em textos pequenos, principalmente dourado sobre marfim ou grafite.

---

## 3. Logo E Identidade

O logo principal nao deve ser alterado.

### 3.1 Versao Principal

Uso:

- splash;
- login;
- onboarding curto, se existir;
- telas institucionais.

Aplicacao:

- centralizado;
- fundo marfim no modo claro;
- fundo grafite no modo escuro;
- sem sombra pesada;
- manter area de respiro ao redor.

### 3.2 Versao Monocromatica

Uso:

- navigation bar;
- tab bar quando houver espaco;
- pequenos selos de marca.

Aplicacao:

- renderizar em dourado ou branco;
- usar como silhouette/minimal;
- nao competir com o titulo da tela.

### 3.3 Icone Do App

Se o logo completo ficar complexo em tamanhos pequenos, criar uma versao reduzida:

- isolar elemento central mais forte: cruz, calice ou hostia, conforme o desenho original permitir;
- fundo solido vinho ou couro/grafite escuro;
- evitar detalhes finos que somem em 60px.

---

## 4. Liquid Glass / Glassmorphism

O efeito deve evocar vitral, vidro fosco e vasos sagrados, com moderacao.

### 4.1 Onde Aplicar

- Cards de escala diaria ou proxima missao.
- Bottom tab bar.
- Navigation bar em telas com rolagem.
- Modais de confirmacao, especialmente confirmar presenca.
- Sheets de acoes curtas.

### 4.2 Regras

1. Usar blur nativo quando disponivel.
2. Usar borda fina branca ou dourada com 10% a 15% de opacidade.
3. Manter texto sempre em alto contraste.
4. Respeitar Reduce Transparency, Increase Contrast e configuracoes equivalentes no Android.
5. Usar fallback opaco elegante quando blur nao for apropriado.
6. Nao usar vidro em listas longas inteiras; usar em barras, sheets e destaques.

### 4.3 Tokens Recomendados

```text
mesc.glass.border.light = rgba(255, 255, 255, 0.15)
mesc.glass.border.gold = rgba(197, 160, 89, 0.15)
mesc.glass.tint.light = rgba(253, 251, 247, 0.72)
mesc.glass.tint.dark = rgba(26, 26, 26, 0.72)
mesc.glass.blur = platform-native-material
```

---

## 5. Tipografia

### 5.1 Titulos

Usar fonte serifada leve para dar peso de tradicao:

- iOS: Georgia ou serif nativa equivalente; avaliar Cinzel se licenciada/embarcada com cuidado.
- Android: Georgia se disponivel via asset, ou serif equivalente; evitar fonte decorativa demais.

Uso:

- titulos de primeira hierarquia;
- login;
- chamadas de "Minha Missao";
- datas especiais.

### 5.2 Texto Operacional

Usar fonte nativa do sistema para leitura:

- iOS: San Francisco;
- Android: Roboto;
- alternativa compartilhada: Inter, se houver decisao futura.

Uso:

- escalas;
- listas de nomes;
- horarios;
- formularios;
- mensagens de erro;
- diretorio de ministros.

### 5.3 Acessibilidade

- Suportar Dynamic Type/font scale.
- Nao fixar tamanho de texto sem respeitar escala do sistema.
- Evitar textos pequenos em dourado.
- Nomes longos devem quebrar linha sem sobrepor horarios ou botoes.

---

## 6. Componentes

### 6.1 Cantos

Padrao:

- cards: 8dp a 12dp;
- botoes: 8dp a 12dp;
- sheets/modais: conforme plataforma, sem exagerar em cantos redondos.

Evitar:

- cantos 0dp como padrao;
- botoes em pilula para todas as acoes.

### 6.2 Botoes

Primario:

- fundo vinho/vermelho liturgico;
- texto branco;
- estados pressed/disabled claros.

Secundario:

- borda vinho ou dourada discreta;
- fundo transparente ou marfim/grafite.

Destrutivo:

- texto claro;
- confirmar exclusao com friccao e linguagem direta.

### 6.3 Cards De Escala

Devem priorizar:

- data;
- horario;
- comunidade/local;
- posicao/funcao;
- status: confirmada, pendente, substituicao em andamento.

O card de proxima missao pode usar glass. Listas longas de escala devem ser mais simples e densas.

### 6.4 Modais

Confirmar presenca:

- fundo com glass/dim;
- acao primaria evidente;
- texto curto;
- alternativa de pedir substituicao quando aplicavel.

---

## 7. Tela Piloto Para UX

Quando a interface comecar, a primeira tela piloto deve ser:

**Minha Missao / Escala Do Dia**

Motivo:

- e a tela central do ministro;
- valida paleta, logo reduzido, card glass, tipografia e acoes criticas;
- permite testar clareza de data/horario antes de telas densas;
- conecta diretamente com os endpoints mobile ja criados.

Elementos esperados:

- navigation bar discreta com logo monocromatico;
- fundo marfim/grafite;
- card de proxima missao com glass moderado;
- acoes: confirmar presenca, pedir substituicao, ver detalhes;
- secoes compactas de pendencias e avisos;
- estados vazio/offline/erro com linguagem humana.

---

## 8. Criterios De Aceite Visual

- O ministro identifica a proxima missao em ate 10 segundos.
- Datas e horarios permanecem legiveis com font scale alto.
- Modo claro e escuro mantem contraste aceitavel.
- Glass nao reduz legibilidade.
- Dourado aparece como detalhe, nao como cor de texto principal em corpo pequeno.
- Nenhum texto importante fica sobreposto em nomes longos.
- Bottom tab/navigation respeita safe area em iOS e Android.
- A tela parece pastoral e operacional, nao marketing nem dashboard administrativo.
