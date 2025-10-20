# 🔄 Diagrama de Fluxo - Geração de Escalas

> **Versão Visual do Algoritmo**

---

## 📋 Fluxo Principal

```
┌─────────────────────────────────────┐
│  INÍCIO: Gerar Escalas do Mês      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  1. COLETAR DADOS                   │
│  ├─ Buscar todos os ministros       │
│  ├─ Buscar questionários            │
│  └─ Processar disponibilidades      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. LISTAR MISSAS DO MÊS            │
│  ├─ Domingos                        │
│  ├─ Dias de semana                  │
│  └─ Eventos especiais               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. ORDENAR MISSAS POR PRIORIDADE   │
│  ├─ 1º: Festa São Judas (28/10)     │
│  ├─ 2º: Outros eventos especiais    │
│  └─ 3º: Missas regulares            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. PARA CADA MISSA:                │
│     Atribuir Ministros              │
│     (ver detalhes abaixo)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. GERAR ESCALA FINAL              │
│  └─ Retornar para visualização      │
└──────────────┬──────────────────────┘
               │
               ▼
         [ FIM ]
```

---

## 👥 Fluxo: Atribuir Ministros a uma Missa

```
┌─────────────────────────────────────────────┐
│  PARA CADA MISSA                            │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Passo 1: FILTRAR Ministros Disponíveis    │
│                                             │
│  Para cada ministro, verificar:            │
│  ┌───────────────────────────────────┐     │
│  │ ✓ Está disponível neste dia?      │     │
│  │ ✓ Não ultrapassou limite mensal?  │     │
│  │ ✓ Não conflita com cônjuge?       │     │
│  └───────────────────────────────────┘     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Encontrou ministros disponíveis?          │
└──────┬────────────────────────┬─────────────┘
       │ SIM                    │ NÃO
       │                        │
       ▼                        ▼
┌──────────────────┐    ┌──────────────────────┐
│ Continuar        │    │ É Festa São Judas?   │
│                  │    └──────┬───────┬───────┘
│                  │           │ SIM   │ NÃO
│                  │           │       │
│                  │           ▼       ▼
│                  │    ┌──────────┐  ┌─────────┐
│                  │    │ Incluir  │  │ Preencher│
│                  │    │ Substitut│  │ com VACANT│
│                  │    │ os       │  └─────────┘
│                  │    └──────────┘
└──────┬───────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Passo 2: ORDENAR por Prioridade           │
│                                             │
│  Critérios (em ordem):                     │
│  ┌───────────────────────────────────┐     │
│  │ 1. Tem posição nas preferenciais? │     │
│  │ 2. Tem posição no sistema antigo? │     │
│  │ 3. Serviu menos vezes?            │     │
│  │ 4. Número da posição preferida    │     │
│  └───────────────────────────────────┘     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Passo 3: PARA CADA POSIÇÃO NECESSÁRIA     │
│           Atribuir Ministro                │
│           (ver próximo diagrama)            │
└──────────────┬──────────────────────────────┘
               │
               ▼
         [ ESCALA DA MISSA COMPLETA ]
```

---

## 🎯 Fluxo: Atribuir Ministro a uma Posição

```
┌──────────────────────────────────────────┐
│  PARA CADA POSIÇÃO (ex: Ministro 1)     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  NÍVEL 1: Posição nas PREFERENCIAIS?    │
│                                          │
│  Procurar ministro que:                 │
│  ├─ TEM essa posição nas preferenciais  │
│  ├─ Ainda não foi escalado nesta missa  │
│  └─ Não conflita com família            │
└──────┬────────────────────┬──────────────┘
       │ ENCONTROU          │ NÃO ENCONTROU
       │                    │
       ▼                    ▼
┌─────────────┐   ┌────────────────────────────┐
│ ESCALAR!    │   │ NÍVEL 2: Sistema Antigo?   │
│ ✅ Perfeito │   │                            │
└─────────────┘   │ Procurar ministro que:     │
                  │ ├─ Tem essa posição no     │
                  │ │  campo legado             │
                  │ ├─ Ainda não escalado      │
                  │ └─ Não conflita            │
                  └──────┬─────────────┬────────┘
                         │ ENCONTROU   │ NÃO
                         │             │
                         ▼             ▼
                  ┌─────────────┐   ┌────────────────────────┐
                  │ ESCALAR!    │   │ NÍVEL 3: NÃO está em   │
                  │ ✅ Bom      │   │          EVITAR?        │
                  └─────────────┘   │                        │
                                    │ Procurar ministro que: │
                                    │ ├─ NÃO tem essa posição│
                                    │ │  em "evitar"          │
                                    │ ├─ Ainda não escalado  │
                                    │ └─ Não conflita        │
                                    └──────┬────────┬─────────┘
                                           │ ACHA   │ NÃO
                                           │        │
                                           ▼        ▼
                                    ┌──────────┐  ┌────────────────┐
                                    │ ESCALAR! │  │ NÍVEL 4:       │
                                    │ ⚠️ OK    │  │ ÚLTIMO RECURSO │
                                    └──────────┘  │                │
                                                  │ Procurar       │
                                                  │ QUALQUER       │
                                                  │ ministro       │
                                                  │ disponível     │
                                                  └────┬──────┬────┘
                                                       │ ACHA │ NÃO
                                                       │      │
                                                       ▼      ▼
                                                  ┌─────────┐ ┌────────┐
                                                  │ ESCALAR!│ │VACANT  │
                                                  │ 🔴 Ruim │ │⚠️ Vazio│
                                                  └─────────┘ └────────┘
```

---

## 🔢 Exemplo Visual: Escala de uma Missa

### Entrada:
```
MISSA: Domingo 15/10/2025 - 09h
POSIÇÕES NECESSÁRIAS: 4
├─ Ministro 1
├─ Ministro 2
├─ Leitura 1
└─ Salmo

MINISTROS DISPONÍVEIS: 6
├─ João (2 escalas)    - Preferenciais: [M1, M3]     - Evitar: []
├─ Maria (3 escalas)   - Preferenciais: [L1]         - Evitar: [Salmo]
├─ Pedro (1 escala)    - Preferenciais: [Salmo, M2]  - Evitar: []
├─ Ana (5 escalas)     - Preferenciais: []           - Evitar: [L1]
├─ Carlos (2 escalas)  - Preferenciais: [M2]         - Evitar: []
└─ Lucia (4 escalas)   - Preferenciais: []           - Evitar: []
```

### Processo:

```
┌─ POSIÇÃO 1: Ministro 1 ────────────────────────────────────┐
│                                                             │
│  NÍVEL 1: Quem tem M1 nas preferenciais?                   │
│  ✅ JOÃO tem! → Escalar João                               │
│                                                             │
│  RESULTADO: Ministro 1 = João ✅                           │
└─────────────────────────────────────────────────────────────┘

┌─ POSIÇÃO 2: Ministro 2 ────────────────────────────────────┐
│                                                             │
│  (Excluir: João já escalado)                               │
│                                                             │
│  NÍVEL 1: Quem tem M2 nas preferenciais?                   │
│  - Pedro tem! Mas...                                       │
│  - Carlos também tem!                                      │
│                                                             │
│  Desempate: Quem serviu menos?                             │
│  - Pedro: 1 escala                                         │
│  - Carlos: 2 escalas                                       │
│  ✅ PEDRO serviu menos → Escalar Pedro                     │
│                                                             │
│  RESULTADO: Ministro 2 = Pedro ✅                          │
└─────────────────────────────────────────────────────────────┘

┌─ POSIÇÃO 3: Leitura 1 ─────────────────────────────────────┐
│                                                             │
│  (Excluir: João, Pedro já escalados)                       │
│                                                             │
│  NÍVEL 1: Quem tem L1 nas preferenciais?                   │
│  ✅ MARIA tem! → Escalar Maria                             │
│                                                             │
│  RESULTADO: Leitura 1 = Maria ✅                           │
└─────────────────────────────────────────────────────────────┘

┌─ POSIÇÃO 4: Salmo ─────────────────────────────────────────┐
│                                                             │
│  (Excluir: João, Pedro, Maria já escalados)                │
│  (Disponíveis: Ana, Carlos, Lucia)                         │
│                                                             │
│  NÍVEL 1: Quem tem Salmo nas preferenciais?                │
│  ❌ Ninguém (Pedro tinha, mas já está escalado)            │
│                                                             │
│  NÍVEL 2: Sistema antigo?                                  │
│  ❌ Ninguém                                                 │
│                                                             │
│  NÍVEL 3: Quem NÃO tem Salmo em evitar?                    │
│  - Ana: Sem Salmo em evitar ✅                             │
│  - Carlos: Sem Salmo em evitar ✅                          │
│  - Lucia: Sem Salmo em evitar ✅                           │
│                                                             │
│  Desempate: Quem serviu menos?                             │
│  - Carlos: 2 escalas ✅ (MENOR)                            │
│  - Lucia: 4 escalas                                        │
│  - Ana: 5 escalas                                          │
│                                                             │
│  ✅ CARLOS serviu menos → Escalar Carlos                   │
│                                                             │
│  RESULTADO: Salmo = Carlos ⚠️ (não era preferência)        │
└─────────────────────────────────────────────────────────────┘
```

### Saída:
```
╔═══════════════════════════════════════════════════════════╗
║  ESCALA: Domingo 15/10/2025 - 09h                        ║
╠═══════════════════════════════════════════════════════════╣
║  Ministro 1  │  João      │  ✅ Preferência dele         ║
║  Ministro 2  │  Pedro     │  ✅ Preferência dele         ║
║  Leitura 1   │  Maria     │  ✅ Preferência dela         ║
║  Salmo       │  Carlos    │  ⚠️  Posição neutra          ║
╠═══════════════════════════════════════════════════════════╣
║  ESTATÍSTICAS:                                           ║
║  ├─ 4/4 posições preenchidas (100%)                      ║
║  ├─ 3 ministros em suas posições preferidas (75%)        ║
║  └─ 0 posições vazias (VACANT)                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 📊 Exemplo 2: Situação Difícil

### Entrada:
```
MISSA: Terça 17/10/2025 - 19h (Dia de semana)
POSIÇÕES NECESSÁRIAS: 2
├─ Leitura 1
└─ Ministro 1

MINISTROS DISPONÍVEIS: 2 (poucos!)
├─ Ana (12 escalas)  - Preferenciais: []  - Evitar: [L1, M1]
└─ Lucas (8 escalas) - Preferenciais: []  - Evitar: []
```

### Processo:

```
┌─ POSIÇÃO 1: Leitura 1 ─────────────────────────────────────┐
│                                                             │
│  NÍVEL 1: Preferenciais? ❌ Ninguém                        │
│  NÍVEL 2: Sistema antigo? ❌ Ninguém                        │
│  NÍVEL 3: Quem NÃO tem L1 em evitar?                       │
│  - Ana: TEM L1 em evitar ❌                                │
│  - Lucas: NÃO tem L1 em evitar ✅                          │
│                                                             │
│  ✅ LUCAS → Escalar Lucas                                  │
│                                                             │
│  RESULTADO: Leitura 1 = Lucas ⚠️                           │
└─────────────────────────────────────────────────────────────┘

┌─ POSIÇÃO 2: Ministro 1 ────────────────────────────────────┐
│                                                             │
│  (Excluir: Lucas já escalado)                              │
│  (Disponível: apenas Ana)                                  │
│                                                             │
│  NÍVEL 1: Preferenciais? ❌                                 │
│  NÍVEL 2: Sistema antigo? ❌                                │
│  NÍVEL 3: Ana NÃO tem M1 em evitar?                        │
│  ❌ Ana TEM M1 na lista de evitar!                         │
│                                                             │
│  NÍVEL 4: ÚLTIMO RECURSO                                   │
│  ⚠️  Só tem Ana disponível                                 │
│  ✅ Escalar Ana (melhor que deixar vazio)                  │
│                                                             │
│  RESULTADO: Ministro 1 = Ana 🔴 (ela queria evitar)        │
└─────────────────────────────────────────────────────────────┘
```

### Saída:
```
╔═══════════════════════════════════════════════════════════╗
║  ESCALA: Terça 17/10/2025 - 19h                          ║
╠═══════════════════════════════════════════════════════════╣
║  Leitura 1   │  Lucas     │  ⚠️  Posição neutra          ║
║  Ministro 1  │  Ana       │  🔴 Posição que ela evita    ║
╠═══════════════════════════════════════════════════════════╣
║  ATENÇÃO:                                                ║
║  ⚠️  Ana foi escalada em posição que ela marcou          ║
║      para evitar (último recurso)                        ║
║  💡 Considere:                                            ║
║     - Convidar mais ministros para dia de semana         ║
║     - Ajustar manualmente se necessário                  ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🎯 Resumo Visual das Prioridades

```
         MELHOR CENÁRIO
              ↓
    ┌──────────────────────┐
    │  NÍVEL 1             │
    │  Posição está nas    │
    │  PREFERENCIAIS       │
    │  ✅✅✅              │
    └──────────────────────┘
              ↓
    ┌──────────────────────┐
    │  NÍVEL 2             │
    │  Sistema Antigo      │
    │  (campo legado)      │
    │  ✅✅               │
    └──────────────────────┘
              ↓
    ┌──────────────────────┐
    │  NÍVEL 3             │
    │  NÃO está em         │
    │  EVITAR              │
    │  ⚠️✅               │
    └──────────────────────┘
              ↓
    ┌──────────────────────┐
    │  NÍVEL 4             │
    │  Qualquer ministro   │
    │  (ÚLTIMO RECURSO)    │
    │  🔴⚠️               │
    └──────────────────────┘
              ↓
         PIOR CENÁRIO
```

---

## 🔧 Legenda de Símbolos

- ✅ = Ótimo / Preferência atendida
- ⚠️ = Aceitável / Posição neutra
- 🔴 = Não ideal / Último recurso
- ❌ = Não disponível / Bloqueado
- 💡 = Dica / Sugestão
- 🆘 = Alerta / Atenção necessária

---

**Documento criado para facilitar a compreensão do algoritmo**
**Última atualização:** Outubro 2025
