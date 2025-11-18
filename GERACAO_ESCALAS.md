# Como Funciona a Geração Automática de Escalas - MESC

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo do Processo](#fluxo-do-processo)
3. [Algoritmo de Distribuição Justa](#algoritmo-de-distribuição-justa)
4. [Regras de Priorização](#regras-de-priorização)
5. [Tipos de Missas](#tipos-de-missas)
6. [Disponibilidade dos Ministros](#disponibilidade-dos-ministros)
7. [Sistema de Famílias](#sistema-de-famílias)
8. [Validações e Restrições](#validações-e-restrições)
9. [Relatórios e Métricas](#relatórios-e-métricas)

---

## Visão Geral

O sistema MESC possui um **gerador automático de escalas** que distribui ministros extraordinários da comunhão nas missas mensais de forma **justa, equilibrada e inteligente**.

### Objetivos do Algoritmo

✅ **Distribuição Justa**: Nenhum ministro serve muito mais que os outros
✅ **Respeitar Preferências**: Considerar horários preferidos e disponibilidade declarada
✅ **Evitar Sobrecarga**: Limite de 4 serviços dominicais por mês por ministro
✅ **Coordenação Familiar**: Opção de escalar famílias juntas ou separadas
✅ **Priorização Litúrgica**: Dar preferência em datas especiais (ex: santo do nome)
✅ **Cobertura Completa**: Garantir que todas as missas tenham ministros suficientes

---

## Fluxo do Processo

### 1️⃣ Coleta de Dados

O sistema primeiro carrega todas as informações necessárias:

```
┌─────────────────────────────────────────┐
│ 1. Carregar Ministros Ativos           │
│    - Nome, função, preferências         │
│    - Total de serviços anteriores       │
│    - Vínculos familiares                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Carregar Questionários do Mês       │
│    - Domingos disponíveis               │
│    - Horários preferidos                │
│    - Disponibilidade para dias úteis    │
│    - Eventos especiais (novenas, etc.)  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Carregar Configuração de Missas     │
│    - Horários regulares (domingos)      │
│    - Missas diárias (seg-sex 6h30)      │
│    - Eventos litúrgicos especiais       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. Gerar Calendário do Mês             │
│    - Calcular todas as datas            │
│    - Aplicar regras litúrgicas          │
│    - Resolver conflitos de horários     │
└─────────────────────────────────────────┘
```

### 2️⃣ Geração de Calendário de Missas

O sistema cria automaticamente todas as missas do mês seguindo regras litúrgicas:

**Missas Dominicais Regulares:**
- 8h, 10h e 19h todos os domingos
- Número de ministros varia por horário (4-8 ministros)

**Missas Diárias:**
- Segunda a Sexta: 6h30
- Apenas para ministros que declararam disponibilidade

**Missas Especiais:**
- **1º Sábado do Mês**: Imaculado Coração de Maria (8h)
- **1ª Sexta do Mês**: Sagrado Coração de Jesus (19h30)
- **Dia 28**: Missas de São Judas Tadeu (7h, 15h, 19h30)
- **28 de Outubro**: Festa de São Judas (6 missas especiais)
- **19-27 de Outubro**: Novena de São Judas (19h30 todos os dias)
- **20 de Novembro**: Missa PUC - Consciência Negra

### 3️⃣ Seleção de Ministros para Cada Missa

Para cada missa, o sistema segue este processo:

```
Para cada missa do mês:
  │
  ├─> 1. FILTRAR ministros disponíveis
  │     ├─ Responderam ao questionário?
  │     ├─ Marcaram este domingo/dia?
  │     ├─ Disponíveis para este horário?
  │     └─ Disponíveis para eventos especiais?
  │
  ├─> 2. CALCULAR pontuação de cada ministro
  │     ├─ Bônus de horário preferido (+0.3)
  │     ├─ Bônus de santo do nome (+0.5)
  │     ├─ Bônus de poucas escalações (+0.0 a +1.0)
  │     ├─ Penalidade por muitas escalações (-0.2 por cada)
  │     └─ Penalidade se serviu recentemente (-0.1)
  │
  ├─> 3. ORDENAR ministros por pontuação
  │     └─ Do maior para o menor score
  │
  ├─> 4. SELECIONAR os melhores ministros
  │     ├─ Respeitar limite de 4 serviços/mês
  │     ├─ Não escalar 2x no mesmo dia
  │     ├─ Considerar preferências familiares
  │     └─ Preencher até atingir número necessário
  │
  └─> 5. ATRIBUIR posições litúrgicas
        └─ Posições 1, 2, 3, 4... sequencialmente
```

---

## Algoritmo de Distribuição Justa

### Fair Algorithm - Controle de Escalações Mensais

O sistema implementa um **algoritmo de distribuição justa** que garante equilíbrio:

#### Contadores por Ministro

```typescript
ministro {
  monthlyAssignmentCount: 0,  // Quantas vezes foi escalado este mês
  lastAssignedDate: null      // Última data que serviu
}
```

#### Limites e Restrições

| Regra | Limite | Comportamento |
|-------|--------|---------------|
| **Escalações Dominicais** | Máximo 4/mês | Sistema evita escalar mais que 4 domingos |
| **Escalações no Mesmo Dia** | Proibido | Nunca escala o mesmo ministro 2x no dia |
| **Intervalo Mínimo** | Preferencial 7 dias | Dá preferência a quem serviu há mais tempo |
| **Missas Diárias** | Sem limite | Quem se voluntaria serve todos os dias |

#### Sistema de Pontuação

Cada ministro recebe uma pontuação dinâmica para cada missa:

```javascript
score = pontuacaoBase + bônus - penalidades

Onde:
  pontuacaoBase = 0.5 (todos começam iguais)
  
  Bônus:
    + 0.3  se é horário preferido do ministro
    + 0.5  se é santo do nome (ex: Ministro Judas no dia 28)
    + 1.0  se nunca serviu este mês (prioridade máxima)
    + 0.7  se serviu apenas 1 vez
    + 0.4  se serviu 2 vezes
    + 0.2  se serviu 3 vezes
  
  Penalidades:
    - 0.2  para cada escalação já feita este mês
    - 0.1  se serviu nos últimos 7 dias
    - ∞    se já atingiu 4 escalações (bloqueado)
```

**Exemplo Prático:**

```
Ministro João (2 escalações este mês, preferência 10h):
  Para missa 10h do dia 15:
    score = 0.5 (base)
          + 0.3 (horário preferido)
          + 0.4 (serviu 2 vezes = bônus médio)
          - 0.4 (2 escalações × 0.2)
          = 0.8 pontos

Ministro Maria (0 escalações este mês):
  Para mesma missa:
    score = 0.5 (base)
          + 1.0 (nunca serviu = bônus máximo!)
          = 1.5 pontos
    
  → Maria tem prioridade!
```

---

## Regras de Priorização

### 1. Priorização de Domingos por Horário Preferido

Ministros que declaram **horário preferido** têm **prioridade maior** para aquele horário:

```
Ministro com preferência 10h:
  ✅ Alta chance de ser escalado para 10h
  ⚠️  Pode ser escalado para 8h ou 19h se necessário
  ℹ️  Recebe bônus de +0.3 no horário preferido
```

### 2. Bônus de Santo do Nome

O sistema verifica se o **nome do ministro** coincide com algum **santo celebrado na data**:

```
Ministro "Judas Silva":
  28 de Outubro (São Judas Tadeu)
    → Recebe +0.5 de bônus
    → Maior chance de ser escalado!

Ministro "Maria Aparecida":
  12 de Outubro (Nossa Senhora Aparecida)
    → Recebe +0.5 de bônus
```

### 3. Coordenação de Famílias

Casais e famílias podem escolher:

**Opção 1: Servir Juntos** (padrão)
```
Família Silva (João + Maria):
  ✅ Escalados no mesmo domingo
  ✅ Mesmo horário de missa
  ℹ️  Conta como 1 escalação para cada
```

**Opção 2: Servir Separados**
```
Família Santos (Pedro + Ana):
  ✅ Podem ser escalados em domingos diferentes
  ✅ Podem ser escalados em horários diferentes
  ℹ️  Permite mais flexibilidade para cobrir missas
```

---

## Tipos de Missas

### Missas Dominicais

| Horário | Min. Ministros | Max. Ministros | Observações |
|---------|----------------|----------------|-------------|
| 8h | 3-6 | 6 | Missa matutina |
| 10h | 4-8 | 8 | Missa principal |
| 19h | 3-6 | 6 | Missa vespertina |

### Missas Diárias (Segunda a Sexta-feira)

| Horário | Min. Ministros | Regra Especial |
|---------|----------------|----------------|
| 6h30 | 2 | Apenas ministros que se voluntariaram |

**Importante**: Ministros que marcam disponibilidade para dias da semana são escalados em **TODOS os dias** que marcaram (não apenas 1 dia).

```
Exemplo:
  Ministro João marcou: Segunda, Quarta, Sexta
  → Será escalado para 6h30 nas 4 segundas + 4 quartas + 4 sextas
  → Total: ~12 escalações de missas diárias (além das dominicais)
```

### Missas Especiais de São Judas

#### Dia 28 (exceto outubro) - Missa Mensal
- **7h**: 6 ministros
- **15h**: 4 ministros
- **19h30**: 7 ministros

#### 28 de Outubro - Festa de São Judas
- **7h**: 10 ministros
- **10h**: 15 ministros
- **12h**: 10 ministros
- **15h**: 10 ministros
- **17h**: 10 ministros
- **19h30**: 20 ministros

### Novena de São Judas (19-27 de Outubro)

| Data | Horário | Ministros |
|------|---------|-----------|
| 19/10 (Dom) | 19h30 | 10 |
| 20-24/10 | 19h30 | 10 cada |
| 25/10 (Sáb) | 19h00 | 10 |
| 26/10 (Dom) | 19h30 | 10 |
| 27/10 | 19h30 | 10 |

**Regras Especiais da Novena:**
- ❌ SEM missas matutinas nos dias úteis (20-24, 27)
- ❌ SEM missas diárias 6h30 durante a novena
- ✅ Domingos 19 e 26: missas normais + novena extra

### Outras Missas Especiais

#### 1ª Sexta-feira - Sagrado Coração de Jesus
- **19h30**: 8 ministros
- Requer resposta específica no questionário

#### 1º Sábado - Imaculado Coração de Maria
- **8h**: 6 ministros
- Requer resposta específica no questionário

#### Cura e Libertação (1ª Segunda-feira)
- **19h30**: 6 ministros
- Requer resposta específica no questionário

---

## Disponibilidade dos Ministros

### Como o Sistema Lê as Respostas do Questionário

O questionário mensal coleta informações detalhadas:

#### 1. Domingos Disponíveis

Formato v2.0 (atual):
```json
{
  "sundays": {
    "2025-01-05 10:00": "yes",  // Domingo 5/1 às 10h
    "2025-01-05 19:00": "no",   // Domingo 5/1 às 19h (não)
    "2025-01-12 08:00": "yes"   // Domingo 12/1 às 8h
  }
}
```

O ministro escolhe **data + horário específico** para cada domingo.

#### 2. Dias da Semana (Missas Diárias)

```json
{
  "weekdays": {
    "Segunda": true,
    "Quarta": true,
    "Sexta": false
  }
}
```

Se marcar **Segunda**, será escalado para 6h30 em **TODAS as segundas** do mês.

#### 3. Eventos Especiais

```json
{
  "special_events": {
    "saint_judas_feast_10h": "yes",      // Festa 10h
    "saint_judas_feast_19h30": "yes",    // Festa 19h30
    "sacred_heart_mass": "yes",          // Sagrado Coração
    "immaculate_heart_mass": "no",       // Imaculado Coração
    "healing_liberation_mass": "yes"     // Cura e Libertação
  }
}
```

#### 4. Disponibilidade para Substituições

```json
{
  "can_substitute": true
}
```

Indica se o ministro pode ser chamado para substituições de última hora.

### Compatibilidade com Formatos Antigos

O sistema possui uma **camada de compatibilidade** que lê diferentes formatos de questionários:

- ✅ Formato v2.0 (atual): Data + Hora específica
- ✅ Formato Outubro 2025: Array de respostas
- ✅ Formatos legados: Números de domingos (1, 2, 3, 4, 5)

Isso garante que questionários de meses anteriores continuam funcionando.

---

## Sistema de Famílias

### Configuração de Famílias

Casais e famílias são registrados no sistema com:

```
Família Silva:
  ├─ João Silva (id: 123)
  ├─ Maria Silva (id: 456)
  └─ Preferência: Servir Juntos = SIM
```

### Comportamento Durante a Geração

**Se `preferir_servir_juntos = true` (padrão):**

```
1. Sistema detecta que João é da Família Silva
2. Verifica se Maria (esposa) também está disponível
3. Se SIM: escalation ambos na mesma missa
4. Se NÃO: escalation apenas João (ou apenas Maria)
5. Ambos recebem 1 escalação no contador mensal
```

**Se `preferir_servir_juntos = false`:**

```
1. João e Maria são tratados independentemente
2. Podem ser escalados em domingos diferentes
3. Podem ser escalados em horários diferentes
4. Permite maior cobertura de missas
```

### Benefícios

✅ **Conveniência**: Famílias vão juntas à missa de serviço
✅ **Flexibilidade**: Opção de servir separados se preferirem
✅ **Organização**: Sistema leva em conta automaticamente
✅ **Justiça**: Cada pessoa conta individualmente no limite de 4/mês

---

## Validações e Restrições

### Validações Pré-Geração

Antes de gerar as escalas, o sistema verifica:

| Validação | Erro se Falhar | Comportamento |
|-----------|----------------|---------------|
| ✅ Ministros carregados? | SIM | Erro: "Sem ministros no banco" |
| ✅ Questionário existe? | SIM (definitivo) | Erro: "Sem questionário para o mês" |
| ✅ Questionário fechado? | SIM (definitivo) | Erro: "Questionário ainda aberto" |
| ✅ Respostas recebidas? | NÃO (preview) | Warning: "Sem respostas, usando padrão" |
| ✅ Configuração de missas? | SIM | Erro: "Sem config de horários" |

### Restrições Durante a Geração

| Restrição | Como é Aplicada |
|-----------|-----------------|
| **Máximo 4 dominicais/mês** | Sistema bloqueia ministro após 4ª escalação |
| **Não servir 2x no mesmo dia** | Rastreamento diário por ministro |
| **Respeitar disponibilidade** | Filtragem antes da pontuação |
| **Mínimo de ministros** | Sistema alerta se não atingir mínimo |
| **Máximo de ministros** | Sistema limita até o máximo configurado |

### Tratamento de Escalas Incompletas

Se não houver ministros suficientes:

```
Missa 05/01 10:00:
  ✅ Necessário: 4 ministros
  ⚠️  Encontrados: 2 ministros
  → ESCALA INCOMPLETA

Sistema:
  1. Marca como "confiança baixa" (0-50%)
  2. Gera relatório de escalas incompletas
  3. Sugere ações (ex: abrir para substituições)
  4. Permite edição manual posterior
```

---

## Relatórios e Métricas

### Relatório de Geração

Ao final da geração, o sistema exibe:

```
=== GENERATION SUCCESS ===
Month/Year: 1/2025
Total Time: 3847ms (3.85s)
Target: <5000ms | Status: ✅ PASS

📊 DATA SUMMARY:
  Ministers loaded: 45
  Questionnaire responses: 42
  Mass times config: 3
  Monthly masses generated: 68
  Schedules generated: 68
  Incomplete schedules: 3
  Saint bonuses calculated: 2880

🎯 FAIRNESS REPORT:
  Assignment Distribution:
    0 assignments: 8 ministers (17.8%)
    1 assignments: 12 ministers (26.7%)
    2 assignments: 15 ministers (33.3%)
    3 assignments: 7 ministers (15.6%)
    4 assignments: 3 ministers (6.7%)

  Fairness Metrics:
    ✅ Unused ministers: 8/45 (17.8%)
    ✅ Ministers at max (4): 3/45
    ✅ Fairness score: 82.2% (PASS)
```

### Métricas de Justiça

**Fairness Score**: Percentual de ministros que serviram pelo menos uma vez

```
Fairness = (Ministros com ≥ 1 escalação / Total de ministros) × 100%

Excelente: > 80%
Bom: 60-80%
Regular: 40-60%
Ruim: < 40%
```

### Alertas e Avisos

O sistema gera alertas para situações que precisam atenção:

| Alerta | Quando Aparece | Ação Sugerida |
|--------|----------------|---------------|
| ⚠️ Escalas incompletas | Menos ministros que o mínimo | Editar manualmente ou reabrir questionário |
| ⚠️ Fairness < 70% | Muitos ministros sem escalar | Verificar disponibilidade declarada |
| ⚠️ Ministros não responderam | Sem resposta ao questionário | Enviar lembrete para responder |
| ℹ️ Ministros 5+ escalações | Inclui missas diárias | Normal para voluntários de dias úteis |

---

## Fluxo Completo - Exemplo Prático

### Cenário: Gerar Escalas de Janeiro/2025

**Passo 1: Coordenador Cria Questionário**
```
1. Acessa "Questionários" → "Criar Questionário"
2. Seleciona: Janeiro/2025
3. Sistema gera automaticamente domingos e eventos
4. Envia aos ministros
```

**Passo 2: Ministros Respondem**
```
João Silva responde:
  ✅ Domingo 05/01 - 10h
  ✅ Domingo 19/01 - 10h
  ⏭️ Não disponível para dias úteis
  ⏭️ Não para eventos especiais
  
Maria Santos responde:
  ✅ Domingo 05/01 - 8h
  ✅ Domingo 12/01 - 8h
  ✅ Domingo 19/01 - 8h
  ✅ Domingo 26/01 - 8h
  ✅ Disponível: Segunda, Quarta (6h30)
  ✅ Pode substituir: Sim
```

**Passo 3: Coordenador Gera Escala**
```
1. Fecha o questionário
2. Acessa "Escalas" → "Gerar Escala"
3. Seleciona: Janeiro/2025
4. Clica "Gerar Preview" (visualizar antes)
5. Revisa as escalas geradas
6. Clica "Salvar Escala Definitiva"
```

**Passo 4: Sistema Distribui Automaticamente**
```
Domingo 05/01 - 10h (mínimo 4 ministros):
  1. João Silva (score 1.3 - horário preferido + nunca serviu)
  2. Pedro Costa (score 1.0 - nunca serviu)
  3. Ana Lima (score 1.0 - nunca serviu)
  4. Carlos Oliveira (score 0.8 - preferência outro horário)
  
Domingo 05/01 - 8h (mínimo 3 ministros):
  1. Maria Santos (score 1.3 - horário preferido + nunca serviu)
  2. Fernanda Souza (score 1.0 - nunca serviu)
  3. Roberto Alves (score 1.0 - nunca serviu)
```

**Passo 5: Publicação e Notificações**
```
1. Coordenador publica a escala
2. Sistema envia notificações para todos os ministros
3. Ministros visualizam suas escalas no app
4. Podem solicitar substituição se necessário
```

---

## Otimizações de Performance

### Cache de Bônus de Santos

O sistema pré-calcula todos os bônus de santo antes da geração:

```
Pré-cálculo:
  - 45 ministros × 31 datas = 1395 combinações
  - Calculado UMA VEZ antes do loop principal
  - Armazenado em cache em memória
  
Sem cache:
  - 68 missas × 45 ministros = 3060 consultas ao banco
  - Tempo: ~8-12 segundos
  
Com cache:
  - 0 consultas durante a geração
  - Tempo: ~3-4 segundos
  
Ganho: 60-70% mais rápido! ⚡
```

### Tempo de Geração

Meta: **< 5000ms (5 segundos)**

Tempos típicos:
- 45 ministros, 68 missas: **~3.8s** ✅
- 60 ministros, 80 missas: **~4.5s** ✅
- 100 ministros, 100 missas: **~6.2s** ⚠️

---

## Resolução de Problemas

### "Escalas incompletas detectadas"

**Causa**: Poucos ministros disponíveis para determinada missa.

**Soluções**:
1. Verificar respostas do questionário
2. Editar manualmente a escala
3. Adicionar ministros que podem substituir
4. Reabrir questionário para mais respostas

### "Mais de 50% de ministros não escalados"

**Causa**: Muitos ministros sem disponibilidade ou preferências muito restritas.

**Soluções**:
1. Revisar respostas (ministros marcaram poucos domingos?)
2. Verificar configuração de máximo de ministros por missa
3. Considerar aumentar limite de 4 escalações/mês

### "Questionário precisa estar encerrado"

**Causa**: Tentativa de gerar escala definitiva com questionário aberto.

**Solução**:
1. Acessar "Questionários"
2. Selecionar o questionário do mês
3. Clicar em "Encerrar Questionário"
4. Tentar gerar novamente

---

## Conclusão

O sistema de geração automática de escalas do MESC:

✅ **Economiza tempo**: Elimina horas de trabalho manual
✅ **Distribui com justiça**: Algoritmo garante equilíbrio
✅ **Respeita preferências**: Considera horários e famílias
✅ **É inteligente**: Prioriza datas especiais e santos
✅ **É flexível**: Permite edição manual quando necessário
✅ **É transparente**: Gera relatórios detalhados

**O resultado**: Escalas mensais completas, equilibradas e prontas para publicação em segundos!

---

*Documento gerado em Novembro de 2025*
*Sistema MESC - Paróquia São Judas Tadeu*
