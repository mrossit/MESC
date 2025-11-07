# 📋 Como Funciona o Algoritmo de Geração de Escalas

> **Documento criado para revisão - Linguagem não-técnica**
>
> Este documento explica PASSO A PASSO como o sistema gera as escalas automaticamente.

---

## 🎯 O que o algoritmo faz?

O algoritmo é como um "coordenador automático" que:
1. Olha todos os ministros disponíveis
2. Verifica quem respondeu o questionário de disponibilidade
3. Distribui os ministros nas missas do mês de forma justa e inteligente

---

## 📊 ETAPA 1: Coleta de Informações

### O que o sistema busca sobre cada ministro:

#### ✅ Disponibilidade (do questionário):
- **Missas de Domingo**: Em quais domingos a pessoa pode servir
- **Missas de Dia de Semana**: Segunda, terça, quarta, quinta, sexta
- **Eventos Especiais**: Festa de São Judas (28/10), Natal, Páscoa, etc.
- **Pode fazer substituição?**: Se a pessoa pode ser chamada em emergências

#### ✅ Preferências de Posições (do cadastro):
- **Posições Preferenciais** (até 5): Posições que a pessoa PREFERE fazer
  - Exemplo: João marcou "Ministro 1" e "Ministro 3" como preferidas

- **Posições a Evitar** (até 5): Posições que a pessoa PREFERE NÃO fazer
  - Exemplo: Maria marcou "Salmo" e "Leitura 2" para evitar

#### ✅ Informações de Família:
- Se a pessoa é casada com outro ministro
- Se preferem servir juntos ou separados

---

## 🔄 ETAPA 2: Ordenação das Missas

O sistema organiza as missas POR PRIORIDADE:

### 🥇 Prioridade MÁXIMA:
- **28 de Outubro** (Festa de São Judas Tadeu)

### 🥈 Prioridade ALTA:
- Outros eventos especiais (Natal, Páscoa, etc.)

### 🥉 Prioridade NORMAL:
- Missas regulares de domingo e dia de semana

**Por que essa ordem?**
> As festas mais importantes são escaladas primeiro, garantindo que teremos ministros suficientes nas celebrações principais.

---

## 👥 ETAPA 3: Seleção de Ministros para Cada Missa

Para cada missa, o sistema segue este processo:

### Passo 1: FILTRAR ministros disponíveis

O sistema verifica QUEM PODE servir naquela missa:

```
✅ Ministro PODE ser escalado se:
  - Marcou disponibilidade para aquele dia/horário no questionário
  - Não ultrapassou o limite de 25 escalas no mês
  - Não está na mesma missa que seu cônjuge (se marcou preferir servir separado)

❌ Ministro NÃO PODE ser escalado se:
  - Não marcou disponibilidade para aquele dia/horário
  - Já serviu muitas vezes no mês (mais de 25 vezes)
  - Já foi escalado em outra posição na mesma missa
```

### Passo 2: ORDENAR ministros por prioridade

O sistema cria uma "FILA DE PRIORIDADE" seguindo estas regras:

#### 🥇 Primeira Prioridade:
**Ministros que têm a posição necessária em "Posições Preferenciais"**

Exemplo:
- A missa precisa de um "Ministro 1"
- João tem "Ministro 1" nas suas posições preferenciais
- **João vai para o topo da fila!**

#### 🥈 Segunda Prioridade:
**Ministros que escolheram a posição no campo antigo** (sistema legado)

#### 🥉 Terceira Prioridade:
**Quem serviu MENOS vezes no mês** (distribuição justa)

Exemplo:
- Maria serviu 2 vezes
- Pedro serviu 5 vezes
- **Maria fica na frente de Pedro na fila**

---

## 🎲 ETAPA 4: Atribuição de Posições

Para cada posição necessária na missa (Ministro 1, Ministro 2, etc.), o sistema tenta encontrar o melhor ministro em 4 NÍVEIS:

### 🟢 NÍVEL 1 (Melhor opção):
**Procura ministro que TEM essa posição em "Posições Preferenciais"**

```
Exemplo:
Precisa: Ministro 3
João tem: [Ministro 1, Ministro 3, Ministro 5] nas preferenciais
✅ ENCONTROU! João é escalado
```

### 🟡 NÍVEL 2 (Boa opção):
**Procura ministro com essa posição marcada no sistema antigo**

Se não encontrou no Nível 1, procura no campo legado.

### 🟠 NÍVEL 3 (Opção aceitável):
**Procura qualquer ministro que NÃO tem essa posição em "Evitar"**

```
Exemplo:
Precisa: Salmo
Maria tem: [Salmo, Leitura 2] nas posições a evitar
❌ Maria é IGNORADA neste nível
Pedro NÃO tem "Salmo" para evitar
✅ ENCONTROU! Pedro é escalado
```

### 🔴 NÍVEL 4 (Último recurso):
**Escala QUALQUER ministro disponível, mesmo que esteja em "Evitar"**

```
Exemplo:
Precisa: Leitura 1
Só sobrou Maria, que tem "Leitura 1" para evitar
✅ Maria é escalada (melhor que deixar vago)
```

---

## 🚨 Regras Especiais

### 1️⃣ Casais/Famílias
```
SE João e Maria são casados:
  E marcaram "Preferimos servir separados"
ENTÃO:
  ❌ Nunca escalar os dois na mesma missa
  ✅ Sempre escalar em missas diferentes
```

### 2️⃣ Festa de São Judas (28/10)
```
SE faltam ministros para o dia 28/10:
ENTÃO:
  Incluir ministros que marcaram "Pode fazer substituição"
  ⚠️  Mesmo que não tenham marcado disponibilidade para aquele dia
```

### 3️⃣ Limite mensal
```
Cada ministro pode servir ATÉ 25 vezes por mês
Após 25 vezes, não será mais escalado (para distribuir melhor)
```

### 4️⃣ Posições vazias
```
SE não encontrou NINGUÉM em nenhum dos 4 níveis:
ENTÃO:
  Deixar a posição como "VACANT" (vago)
  ⚠️  Coordenador precisa preencher manualmente
```

---

## 📈 Exemplo Prático

### Cenário: Missa Domingo 09h - Precisa de 3 ministros

#### Ministros Disponíveis:
1. **João** - 2 escalas no mês
   - Preferenciais: [Ministro 1, Ministro 3]
   - Evitar: [Salmo]

2. **Maria** - 5 escalas no mês
   - Preferenciais: [Leitura 1, Ministro 2]
   - Evitar: []

3. **Pedro** - 3 escalas no mês
   - Preferenciais: [Salmo]
   - Evitar: [Leitura 2]

#### Posições necessárias: Ministro 1, Ministro 2, Salmo

### Passo a Passo da Atribuição:

#### 🔹 Posição 1: Ministro 1
1. **Nível 1**: Procura quem tem "Ministro 1" nas preferenciais
   - ✅ **JOÃO tem!** → João escalado como Ministro 1

#### 🔹 Posição 2: Ministro 2
1. **Nível 1**: Procura quem tem "Ministro 2" nas preferenciais (exceto João)
   - ✅ **MARIA tem!** → Maria escalada como Ministro 2

#### 🔹 Posição 3: Salmo
1. **Nível 1**: Procura quem tem "Salmo" nas preferenciais (exceto João e Maria)
   - ✅ **PEDRO tem!** → Pedro escalado como Salmo

### Resultado Final:
```
Domingo 09h:
├─ Ministro 1: João ✅ (preferência dele)
├─ Ministro 2: Maria ✅ (preferência dela)
└─ Salmo: Pedro ✅ (preferência dele)
```

**Todos ficaram felizes! 🎉**

---

## 📊 Exemplo: Quando usa "Evitar"

### Cenário: Missa Terça 19h - Precisa de 2 ministros

#### Ministros Disponíveis:
1. **Ana** - 1 escala
   - Preferenciais: []
   - Evitar: [Salmo, Leitura 1]

2. **Carlos** - 2 escalas
   - Preferenciais: []
   - Evitar: []

#### Posições necessárias: Leitura 1, Salmo

### Passo a Passo:

#### 🔹 Posição 1: Leitura 1
1. **Nível 1**: Ninguém tem nas preferenciais
2. **Nível 2**: Ninguém no sistema legado
3. **Nível 3**: Procura quem NÃO tem "Leitura 1" para evitar
   - Ana tem "Leitura 1" para evitar → ❌ ignorada
   - ✅ **CARLOS não tem para evitar** → Carlos escalado

#### 🔹 Posição 2: Salmo
1. **Nível 1**: Ninguém tem nas preferenciais (exceto Carlos)
2. **Nível 2**: Ninguém
3. **Nível 3**: Procura quem NÃO tem "Salmo" para evitar
   - Ana tem "Salmo" para evitar → ❌ ignorada
   - Não sobrou ninguém
4. **Nível 4**: ÚLTIMO RECURSO - escala Ana mesmo sendo para evitar
   - ✅ **ANA escalada** (melhor que deixar vago)

### Resultado Final:
```
Terça 19h:
├─ Leitura 1: Carlos ✅ (posição neutra para ele)
└─ Salmo: Ana ⚠️ (ela preferia evitar, mas foi necessário)
```

---

## 🎯 Resumo das Prioridades

### Ao escalar um ministro, o sistema SEMPRE prefere:

1. ✅ **MELHOR**: Ministro tem a posição nas "Preferenciais"
2. ✅ **BOM**: Ministro escolheu a posição (sistema antigo)
3. ⚠️ **ACEITÁVEL**: Ministro NÃO tem a posição em "Evitar"
4. ❌ **ÚLTIMO RECURSO**: Escala mesmo estando em "Evitar"

### Distribuição justa:
- Quem serviu menos no mês tem prioridade
- Limite de 25 serviços por mês por ministro

---

## ❓ Perguntas Frequentes

### 1. Por que fui escalado numa posição que marquei para evitar?
**R:** Isso só acontece em ÚLTIMO RECURSO, quando:
- Não há nenhum outro ministro disponível
- É melhor escalar você do que deixar a posição vazia

### 2. Por que não fui escalado se estava disponível?
**R:** Possíveis motivos:
- Outro ministro tinha aquela posição como "preferencial"
- Você já serviu muitas vezes no mês (limite de 25)
- Outro ministro serviu menos que você (distribuição justa)

### 3. Como o sistema sabe minha disponibilidade?
**R:** Pelo questionário de disponibilidade que você responde mensalmente.

### 4. Posso ser escalado mais de uma vez na mesma missa?
**R:** Não! Cada ministro só é escalado UMA VEZ por missa.

---

## 🔧 O que os Coordenadores Podem Fazer

Após o sistema gerar a escala automaticamente, os coordenadores podem:

1. ✏️ **Editar manualmente** qualquer atribuição
2. 🔄 **Substituir** ministros
3. ➕ **Preencher** posições vazias (VACANT)
4. 🗑️ **Remover** ministros se necessário
5. 📋 **Copiar** escalas de meses anteriores

---

## 💡 Dicas para Melhores Resultados

### Para Ministros:
1. ✅ Responda o questionário todo mês
2. ✅ Marque suas posições preferenciais no cadastro
3. ✅ Marque posições que quer evitar (se houver)
4. ✅ Indique se pode fazer substituições

### Para Coordenadores:
1. ✅ Verifique se todos responderam o questionário antes de gerar
2. ✅ Gere a escala no início do mês
3. ✅ Revise as posições VACANT e preencha manualmente
4. ✅ Ajuste conforme necessário (o sistema é uma AJUDA, não uma regra absoluta)

---

## 📞 Legendas do Sistema

Ao gerar escalas, você verá estas mensagens:

- ✅ **Posição preenchida**: Ministro escalado com sucesso
- ⚠️ **VACANT**: Nenhum ministro disponível, precisa preencher manualmente
- 📊 **X/Y posições preenchidas**: Quantas das posições necessárias foram preenchidas
- 🆘 **Baixa disponibilidade**: Poucos ministros disponíveis para aquela missa

---

**Última atualização:** Outubro 2025
**Versão:** 5.4.2
