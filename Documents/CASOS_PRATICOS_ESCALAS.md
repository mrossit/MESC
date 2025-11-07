# 📚 Casos Práticos - Geração de Escalas

> **Situações Reais e Como o Algoritmo Resolve**

---

## 🎯 Caso 1: Todos Querem a Mesma Posição

### Situação:
João, Maria e Pedro todos marcaram "Ministro 1" como posição preferencial, mas só precisa de 1 Ministro 1.

### Como o algoritmo decide?

```
PASSO 1: Verificar quem está disponível
✅ João - Disponível
✅ Maria - Disponível
✅ Pedro - Disponível

PASSO 2: Todos têm a mesma preferência, aplicar DESEMPATE:

Critério: Quem serviu MENOS vezes no mês?

Contador de escalas:
- João: 2 escalas
- Maria: 5 escalas
- Pedro: 3 escalas

RESULTADO: João vence (serviu menos)
```

### Escala Final:
```
Ministro 1: João ✅ (preferência + menos escalas)
Ministro 2: Pedro ⚠️ (não era sua 1ª opção)
Leitura 1: Maria ⚠️ (não era sua 1ª opção)
```

### 💡 Explicação para os ministros:
- **João**: "Você foi escalado na sua preferência porque serviu menos vezes este mês"
- **Pedro**: "Embora você quisesse M1, João tinha prioridade por ter servido menos"
- **Maria**: "Mesmo motivo de Pedro. Na próxima vez você pode ter mais chances se servir menos"

---

## 🎯 Caso 2: Ninguém Quer Fazer o Salmo

### Situação:
Precisa de 1 salmista, mas todos os 4 ministros disponíveis têm "Salmo" na lista de evitar.

### Como o algoritmo resolve?

```
MINISTROS DISPONÍVEIS:
- Ana - Evitar: [Salmo, L2]
- Carlos - Evitar: [Salmo]
- Lucia - Evitar: [Salmo, M1]
- Paulo - Evitar: [Salmo, L1]

TENTATIVA NÍVEL 1: Quem tem Salmo nas preferenciais?
❌ Ninguém

TENTATIVA NÍVEL 2: Sistema antigo?
❌ Ninguém

TENTATIVA NÍVEL 3: Quem NÃO tem Salmo em evitar?
❌ TODOS têm Salmo para evitar!

TENTATIVA NÍVEL 4: ÚLTIMO RECURSO
⚠️ Escala quem serviu MENOS, mesmo estando em evitar

Contador:
- Ana: 3 escalas ✅ (MENOR)
- Carlos: 5 escalas
- Lucia: 4 escalas
- Paulo: 6 escalas

RESULTADO: Ana é escalada
```

### Escala Final:
```
Salmo: Ana 🔴 (último recurso - ela queria evitar)
```

### 💡 Como melhorar essa situação:
1. **Para Coordenadores**:
   - Conversar com os ministros sobre a importância do Salmo
   - Oferecer treinamento para quem tem receio
   - Considerar marcar esse ministro como "confirmado" mas conversar antes

2. **Para Ministros**:
   - Se possível, não marque TODAS as posições difíceis para evitar
   - Marque apenas as que você realmente não consegue fazer
   - Lembre que "evitar" não é "nunca fazer", é "preferir não fazer"

---

## 🎯 Caso 3: Casal Quer Servir Junto

### Situação:
João e Maria são casados e marcaram "Preferimos servir juntos" no questionário.

### Como funciona:

```
CONFIGURAÇÃO DO CASAL:
- João (ID: abc123)
- Maria (ID: def456)
- Família ID: familia001
- Preferência: Servir JUNTOS ✅

MISSA: Domingo 09h
Posições necessárias: M1, M2, L1, Salmo

DISPONIBILIDADE:
✅ João está disponível
✅ Maria está disponível

PROCESSO:

1. João é selecionado para M1
   → Marca família "familia001" como PRESENTE na missa

2. Próxima posição: M2
   → Sistema procura ministros
   → Maria também é da "familia001"
   → ✅ PERMITE (porque preferem servir juntos)
   → Maria escalada como M2

RESULTADO:
M1: João ✅
M2: Maria ✅ (casal junto)
```

### Se fosse o contrário (Preferir servir SEPARADOS):

```
CONFIGURAÇÃO DO CASAL:
- João (ID: abc123)
- Maria (ID: def456)
- Família ID: familia001
- Preferência: Servir SEPARADOS ❌

MISSA: Domingo 09h

PROCESSO:

1. João é selecionado para M1
   → Marca família "familia001" como PRESENTE
   → Bloqueia outros da mesma família

2. Próxima posição: M2
   → Sistema procura ministros
   → Maria é da "familia001"
   → ❌ BLOQUEIA (família já presente)
   → Pula Maria e escolhe outro ministro

RESULTADO:
M1: João ✅
M2: Carlos ✅ (outro ministro)
```

---

## 🎯 Caso 4: Festa de São Judas (28/10) com Poucos Disponíveis

### Situação:
É dia 28 de outubro (festa mais importante), mas só 3 ministros marcaram disponibilidade, e precisa de 8.

### Como o algoritmo resolve:

```
MISSA ESPECIAL: 28/10/2025 - 10h
Posições necessárias: 8
Ministros com disponibilidade marcada: 3

⚠️ ALERTA: Evento prioritário com baixa disponibilidade!

AÇÃO ESPECIAL DO ALGORITMO:

1. Usar os 3 que marcaram disponibilidade ✅
   - João
   - Maria
   - Pedro

2. BUSCAR MINISTROS QUE PODEM FAZER SUBSTITUIÇÃO:
   Procurar quem marcou "Posso fazer substituições" no questionário:
   - Ana ✅ (pode substituir)
   - Carlos ✅ (pode substituir)
   - Lucia ✅ (pode substituir)
   - Paulo ❌ (não marcou)
   - Marcos ✅ (pode substituir)
   - Fernanda ❌ (não marcou)

3. Adicionar os substitutos à lista
   Total agora: 3 + 4 = 7 ministros

4. Ainda falta 1 ministro → deixar VACANT

RESULTADO:
M1: João ✅
M2: Maria ✅
M3: Pedro ✅
L1: Ana 🆘 (substituição)
L2: Carlos 🆘 (substituição)
Salmo: Lucia 🆘 (substituição)
Cor 1: Marcos 🆘 (substituição)
Cor 2: VACANT ⚠️ (preencher manualmente)
```

### 💡 Mensagem para coordenador:
```
⚠️ ATENÇÃO: Festa de São Judas (28/10)
- Apenas 3 ministros marcaram disponibilidade
- Sistema incluiu 4 ministros que podem substituir
- 1 posição ficou VACANT
- AÇÃO NECESSÁRIA:
  1. Preencher a posição vazia manualmente
  2. Confirmar com os substitutos convocados
  3. Considere enviar lembretes antes da data
```

---

## 🎯 Caso 5: Ministro Ultrapassou o Limite Mensal

### Situação:
João já serviu 25 vezes no mês (limite máximo). Ainda há missas para escalar.

### Como funciona:

```
VERIFICAÇÃO ANTES DE ESCALAR:

Limite mensal: 25 escalas
João: 25 escalas ✅ (atingiu o limite)

TENTATIVA DE ESCALAR JOÃO:

Missa: Domingo 30/10 - 09h
Posição: M1 (preferência de João)

Checagem:
✅ João está disponível
✅ João tem M1 nas preferenciais
❌ João atingiu limite de 25 escalas

DECISÃO: PULAR João e escolher próximo da fila

Próximo candidato: Maria
- 18 escalas (dentro do limite)
- Tem M1 nas preferenciais
✅ Escalar Maria

RESULTADO:
M1: Maria ✅
(João não foi escalado por limite de serviços)
```

### 💡 Por que existe esse limite?

1. **Distribuição justa**: Evita que sempre as mesmas pessoas sirvam
2. **Prevenir sobrecarga**: Ministros precisam de descanso
3. **Dar oportunidade**: Outros ministros também querem servir

### 💡 E se TODOS atingirem o limite?

```
Cenário raro mas possível:

SE todos ministros disponíveis atingiram 25 escalas
E ainda há missas no mês
ENTÃO:
  Sistema escalará normalmente (ignora o limite)
  ⚠️ Alerta para coordenador revisar
```

---

## 🎯 Caso 6: Domingo com Muitas Missas

### Situação:
Domingo com 5 missas (7h, 9h, 11h, 12h, 19h) - como distribuir 30 ministros de forma justa?

### Como o algoritmo distribui:

```
DOMINGO: 15/10/2025
Missas: 5 (7h, 9h, 11h, 12h, 19h)
Posições por missa: 4
Total de posições: 5 × 4 = 20 posições
Ministros disponíveis: 30

PROCESSO PARA CADA MISSA (em ordem):

───────────────────────────────────────────
MISSA 1: 07h
Ministros disponíveis: 30
Contador de todos: 0 escalas

Seleção:
- João (0 escalas) → M1
- Maria (0 escalas) → M2
- Pedro (0 escalas) → L1
- Ana (0 escalas) → Salmo

Após missa 07h:
- João: 1 escala
- Maria: 1 escala
- Pedro: 1 escala
- Ana: 1 escala

───────────────────────────────────────────
MISSA 2: 09h
Ministros disponíveis: 26 (excluir os 4 da 07h)
Contador: João=1, Maria=1, Pedro=1, Ana=1, Resto=0

Seleção (escolhe quem tem 0 escalas):
- Carlos (0 escalas) → M1
- Lucia (0 escalas) → M2
- Paulo (0 escalas) → L1
- Marcos (0 escalas) → Salmo

───────────────────────────────────────────
MISSA 3: 11h
Similar ao processo acima...

───────────────────────────────────────────

RESULTADO FINAL:
Todos os ministros terão aproximadamente
o MESMO número de escalas no dia!

Distribuição justa: ✅
```

---

## 🎯 Caso 7: Ministro Respondeu Questionário Mas Está Inativo

### Situação:
Maria respondeu o questionário marcando disponibilidade, mas foi marcada como "inativa" no sistema.

### Como o algoritmo trata:

```
VERIFICAÇÃO INICIAL:

Buscar ministros para escala:
1. Buscar TODOS os ministros cadastrados
2. FILTRAR apenas ministros com status = "active"

Maria:
- Status: "inactive" ❌
- Tem questionário: Sim
- Tem disponibilidade: Sim

DECISÃO:
❌ Maria NÃO ENTRA na lista
(filtrada logo no início)

RESULTADO:
Maria não será escalada em nenhuma missa,
mesmo tendo respondido o questionário.
```

### 💡 Como resolver:

**Coordenador deve:**
1. Verificar lista de ministros inativos
2. Se Maria deveria estar ativa:
   - Ir em "Gestão de Usuários"
   - Encontrar Maria
   - Mudar status para "active"
3. Gerar escala novamente

---

## 🎯 Caso 8: Posição Especial Só para Alguns

### Situação:
Coordenador quer que apenas 3 ministros específicos façam "Comentarista". Como garantir?

### Solução Recomendada:

```
CONFIGURAÇÃO DOS MINISTROS:

Ministros que PODEM fazer Comentarista:
├─ João
│  Preferenciais: [Comentarista]
├─ Maria
│  Preferenciais: [Comentarista]
└─ Paulo
   Preferenciais: [Comentarista]

TODOS os outros ministros:
Evitar: [Comentarista]

RESULTADO:
- Sistema SEMPRE priorizará João, Maria ou Paulo
- Outros só farão em ÚLTIMO RECURSO (muito raro)
- 99% das vezes, terá um dos 3 especializados
```

### Configuração Passo a Passo:

1. **Para João, Maria e Paulo:**
   ```
   Posições Preferenciais:
   ☑️ Comentarista
   ```

2. **Para TODOS os outros ministros:**
   ```
   Posições a Evitar:
   ☑️ Comentarista
   ```

3. **Gerar escala**
   - Sistema verá que só João, Maria e Paulo têm Comentarista como preferencial
   - Sempre escolherá um deles primeiro (Nível 1)
   - Só escalaria outro em caso extremo (Nível 4)

---

## 🎯 Caso 9: Ministro Novo (Primeira Vez)

### Situação:
Lucas acabou de ser aprovado e é seu primeiro mês. Como o algoritmo o trata?

### Como funciona:

```
LUCAS:
- Status: active ✅
- Escalas no mês: 0
- Respondeu questionário: Sim
- Preferenciais: [M1, M2]

COMPARAÇÃO COM VETERANOS:

MISSA: Domingo 15/10 - 09h
Posição: M1

Candidatos com M1 nas preferenciais:
├─ João (5 escalas)
├─ Maria (7 escalas)
└─ Lucas (0 escalas) ✅ PRIORIDADE!

DECISÃO:
Lucas tem PRIORIDADE porque:
1. ✅ Tem M1 nas preferenciais (igual aos outros)
2. ✅ Serviu MENOS (0 escalas)

RESULTADO:
M1: Lucas ✅ (primeira escala!)
```

### 💡 Vantagens para novos ministros:

- **Contador zerado** = Mais chances de ser escalado
- **Sistema naturalmente dá oportunidades** para novatos
- **Distribuição justa** entre veteranos e novos

### ⚠️ Atenção Coordenadores:

Novos ministros terão MUITAS escalas no primeiro mês porque:
- Contador sempre será 0 ou baixo
- Sistema prioriza quem serviu menos
- Isso é NORMAL e DESEJADO

Se quiser moderar:
1. Ajuste manualmente algumas escalas
2. Ou deixe o sistema (boa forma de integrar)

---

## 🎯 Caso 10: Festa com Muitos Ministros Querendo Servir

### Situação:
Festa de São Judas (28/10) - 40 ministros marcaram disponibilidade, mas só precisa de 8.

### Como o algoritmo escolhe:

```
MISSA ESPECIAL: 28/10/2025 - 10h
Posições: 8
Disponíveis: 40 ministros

CRITÉRIOS DE SELEÇÃO:

1º - Tem posição nas PREFERENCIAIS?
Filtro: 15 ministros têm preferências que batem

2º - Quem serviu MENOS no mês?
Ordenar por contador:
- Ana: 1 escala ✅
- João: 1 escala ✅
- Maria: 2 escalas ✅
- Pedro: 2 escalas ✅
- Carlos: 3 escalas ✅
- ...

3º - Escolher os 8 primeiros da lista ordenada

RESULTADO:
Os 8 ministros que:
- Têm preferência pela posição
- Serviram menos vezes no mês
```

### 💡 Como garantir que EU seja escolhido:

1. ✅ Responder questionário rapidamente
2. ✅ Marcar preferências corretas no cadastro
3. ✅ Servir menos durante o mês (deixar vaga para a festa)
4. ✅ Ter poucas ausências (boa reputação)

### 💡 Para Coordenadores:

Se MUITOS ministros querem:
- Sistema escolherá automaticamente os mais justos
- Revise se quiser priorizar veteranos
- Considere fazer rodízio anual (ano que vem outros)

---

## 📝 Resumo dos Critérios de Desempate

Quando vários ministros competem pela mesma posição:

```
1️⃣ Posição nas PREFERENCIAIS? (maior peso)
   ✅ Tem = Prioridade máxima
   ❌ Não tem = Desvantagem

2️⃣ Posição no sistema ANTIGO?
   ✅ Tem = Boa prioridade
   ❌ Não tem = Média prioridade

3️⃣ Quantas vezes SERVIU no mês? (distribuição justa)
   🥇 Menos escalas = Maior prioridade
   🥉 Mais escalas = Menor prioridade

4️⃣ Número da POSIÇÃO preferida (desempate final)
   Ex: M1 < M2 < M3 < Salmo < L1
```

---

## 💡 Dicas Finais

### Para Ministros:
1. ✅ Responda o questionário TODO mês
2. ✅ Marque suas preferências no cadastro
3. ✅ Seja honesto sobre posições a evitar
4. ✅ Marque "Pode substituir" se estiver disposto a ajudar
5. ✅ Mantenha seu cadastro atualizado

### Para Coordenadores:
1. ✅ Gere escalas no INÍCIO do mês
2. ✅ REVISE antes de publicar (sistema é uma ajuda, não infalível)
3. ✅ Preencha posições VACANT manualmente
4. ✅ Converse com ministros sobre preferências
5. ✅ Ajuste casos especiais manualmente
6. ✅ Monitore distribuição justa
7. ✅ Treine ministros para posições difíceis

---

**Última atualização:** Outubro 2025
**Versão do Sistema:** 5.4.2
