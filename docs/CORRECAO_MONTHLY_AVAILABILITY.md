# Correção: Respeitar Flag monthly_availability

## 🐛 Problema Identificado

### Situação Anterior
O sistema estava processando **TODOS os campos de disponibilidade**, mesmo quando o ministro respondia explicitamente que **NÃO tinha disponibilidade no mês**.

**Exemplo (Ana Laura):**
- Ministro respondia: `monthly_availability: "Não"`
- Ministro marcava: `available_sundays: ["Domingo 19/10", "Domingo 26/10"]`
- Ministro marcava: `saint_judas_novena: ["Quarta 21/10", "Sexta 23/10"]`
- **Sistema registrava (ERRADO)**: Domingos 19/10 e 26/10 + Novena 21/10 e 23/10 ❌
- **Deveria registrar (CERTO)**: Apenas Novena 21/10 e 23/10 ✅

### Causa Raiz

O campo `monthly_availability` indica se o ministro tem **disponibilidade geral** para missas regulares no mês. Quando a resposta é "Não", o sistema deveria:

✅ **PROCESSAR**: Disponibilidades específicas (novena, festa São Judas, eventos especiais)
❌ **IGNORAR**: Disponibilidades gerais (domingos, dias de semana)

**Problema**: O código processava `available_sundays` e `daily_mass_availability` **incondicionalmente**, ignorando a flag `monthly_availability`.

---

## ✅ Correção Aplicada

### Mudanças no Código

Arquivo: `/server/services/responseCompiler.ts`

#### 1. Primeira Passada: Detectar Flag monthly_availability

Adicionado loop para detectar o `monthly_availability` ANTES de processar disponibilidades:

```typescript
// PRIMEIRA PASSADA: Verificar disponibilidade geral no mês
let hasMonthlyAvailability = true; // Default: assume que tem disponibilidade
for (const item of data) {
  if (item.questionId === 'monthly_availability') {
    hasMonthlyAvailability = (item.answer === 'Sim');
    if (!hasMonthlyAvailability) {
      console.log(`      ⚠️  Ministro SEM disponibilidade regular no mês`);
      console.log(`      → Processando apenas disponibilidades ESPECÍFICAS (novena, festas, eventos)`);
    }
    break;
  }
}
```

#### 2. Condicional no Processamento de Domingos

Adicionado verificação `hasMonthlyAvailability` ao processar domingos:

```typescript
// ANTES (linha 301)
else if (questionId === 'available_sundays' && Array.isArray(answer)) {

// DEPOIS
else if (questionId === 'available_sundays' && Array.isArray(answer) && hasMonthlyAvailability) {
```

#### 3. Condicional no Processamento de Missas Diárias

Adicionado verificação `hasMonthlyAvailability` ao processar missas diárias:

```typescript
// ANTES (linha 319)
else if (questionId === 'daily_mass_availability') {

// DEPOIS
else if (questionId === 'daily_mass_availability' && hasMonthlyAvailability) {
```

#### 4. Eventos Especiais (SEM mudança)

Eventos especiais (novena, festa, missas especiais) são processados **sempre**, independente da flag:

```typescript
// SEMPRE processado (não depende de hasMonthlyAvailability)
else if (questionId === 'saint_judas_novena' && Array.isArray(answer)) {
  // ... processar novena
}

// SEMPRE processado
else if (questionId?.startsWith('saint_judas_feast_')) {
  // ... processar festa
}
```

---

## 📊 Resultados Após Correção

### Caso Ana Laura (Exemplo Real)

**Resposta no banco:**
```json
{
  "monthly_availability": "Não",
  "available_sundays": ["Domingo 26/10", "Domingo 19/10"],
  "saint_judas_novena": ["Sexta 23/10 às 19h30", "Quarta 21/10 às 19h30"]
}
```

**Antes da correção:**
```
Disponibilidades detectadas:
- 2025-10-19 às 19:00 (Domingo) ❌
- 2025-10-26 às 19:00 (Domingo) ❌
- 2025-10-21 às 19:30 (Novena) ✅
- 2025-10-23 às 19:30 (Novena) ✅

Total: 4 disponibilidades
```

**Depois da correção:**
```
⚠️  Ministro SEM disponibilidade regular no mês
→ Processando apenas disponibilidades ESPECÍFICAS (novena, festas, eventos)

Disponibilidades detectadas:
- 2025-10-21 às 19:30 (Novena) ✅
- 2025-10-23 às 19:30 (Novena) ✅

Total: 2 disponibilidades ✅
```

### Estatísticas Gerais

**Impacto no sistema:**
- Total de missas detectadas: 52
- Missas com cobertura completa: 19 (37%)
- Total de disponibilidades: 605
- Média por missa: 12 ministros

**Distribuição por tipo:**
- Missa Regular (Domingos): 19 ministros/missa em média ✅
- Novena São Judas: 28 ministros/missa em média ✅
- Festa São Judas: 19 ministros/missa em média ✅
- Missas Diárias: 2 ministros/missa em média ⚠️

---

## 🔍 Como Funciona Agora

### Fluxo de Processamento

1. **Sistema detecta flag `monthly_availability`:**
   ```typescript
   monthly_availability: "Não" → hasMonthlyAvailability = false
   ```

2. **Sistema processa APENAS eventos específicos:**
   ```typescript
   // ✅ PROCESSADO
   saint_judas_novena: ["Quarta 21/10", "Sexta 23/10"]
   saint_judas_feast_7h: "Sim"
   healing_liberation_mass: "Sim"

   // ❌ IGNORADO (porque hasMonthlyAvailability = false)
   available_sundays: ["Domingo 19/10", "Domingo 26/10"]
   daily_mass_availability: ["Segunda", "Quarta"]
   ```

3. **Resultado compilado:**
   ```json
   {
     "availability": {
       "dates": {
         "2025-10-21": { "times": { "19:30": true } },
         "2025-10-23": { "times": { "19:30": true } }
       },
       "weekdays": {
         // Todos false
       }
     }
   }
   ```

### Lógica de Decisão

```
monthly_availability === "Sim"
  → Processar TUDO (domingos + dias de semana + eventos especiais)

monthly_availability === "Não"
  → Processar APENAS eventos específicos:
     - Novena São Judas
     - Festa São Judas (horários específicos)
     - Missas especiais (Cura, Sagrado Coração, etc)
  → IGNORAR disponibilidades gerais:
     - available_sundays
     - daily_mass_availability
```

---

## 🧪 Testes Realizados

### Script de Teste
```bash
npx tsx scripts/deep-dive-single-response.ts
```

### Resultados
```
🔬 ANÁLISE PROFUNDA DE RESPOSTA INDIVIDUAL

EXEMPLO: Ana Laura Anhaia do Carmo

1️⃣  DADOS BRUTOS DO BANCO:
- monthly_availability: "Não"
- available_sundays: ["Domingo 26/10", "Domingo 19/10"]
- saint_judas_novena: ["Sexta 23/10 às 19h30", "Quarta 21/10 às 19h30"]

2️⃣  O QUE O SISTEMA DETECTOU:
⚠️  Ministro SEM disponibilidade regular no mês
→ Processando apenas disponibilidades ESPECÍFICAS (novena, festas, eventos)

Disponibilidades detectadas:
  2025-10-23: 19:30 ✅
  2025-10-21: 19:30 ✅

Dias da semana: Nenhum ✅
Eventos especiais: Nenhum ✅
```

---

## 📝 Arquivos Modificados

### `/server/services/responseCompiler.ts`

**Linhas alteradas:**
- 241-252: Primeira passada para detectar `monthly_availability`
- 301: Adiciona condição `&& hasMonthlyAvailability` ao processar `available_sundays`
- 319: Adiciona condição `&& hasMonthlyAvailability` ao processar `daily_mass_availability`

**Commit:**
```
fix: Respect monthly_availability flag when parsing responses

- Add first pass to detect monthly_availability flag
- Skip available_sundays processing when flag is "Não"
- Skip daily_mass_availability processing when flag is "Não"
- Always process specific events (novena, feast, special masses)

Fixes issue where ministers with no general availability were being
assigned to regular Sunday and weekday masses incorrectly.

Example: Ana Laura marked "Não" for monthly availability but was
still being detected for Sundays 19/10 and 26/10. Now correctly
shows only her specific novena availabilities (21/10 and 23/10).
```

---

## 🎯 Impacto

### Positivo
✅ Disponibilidades detectadas corretamente
✅ Ministros sem disponibilidade geral não aparecem em missas regulares
✅ Eventos específicos ainda são processados corretamente
✅ Lógica mais clara e alinhada com intenção do usuário

### Nota Importante
⚠️  **Para outubro:** Esta correção é retroativa - funciona com dados existentes

⚠️  **Para novembro+:** Recomendado usar [Formato V2.0](/docs/QUESTIONNAIRE_FORMAT_V2.md) que elimina essa ambiguidade

---

## 🔗 Documentação Relacionada

- [Correção: Leitura de Horários de Domingo](/docs/CORRECAO_LEITURA_DOMINGOS.md)
- [Formato V2.0](/docs/QUESTIONNAIRE_FORMAT_V2.0.md)
- [Response Compiler Service](/docs/RESPONSE_COMPILER_SERVICE.md)

---

## 🚀 Próximos Passos

### Para Outubro (Resolvido)
- [x] Correção aplicada
- [x] Testado com caso real (Ana Laura)
- [x] Disponibilidades detectadas corretamente
- [x] Sistema pronto para uso

### Para Novembro+ (Recomendado)
- [ ] Implementar Formato V2.0
- [ ] Questionário com estrutura mais clara
- [ ] Eliminar campos condicionais que geram ambiguidade
- [ ] Perguntar apenas o que será usado

---

**Data da correção:** 2025-10-14
**Status:** ✅ Aplicado e Testado
**Versão:** ResponseCompiler v1.2
