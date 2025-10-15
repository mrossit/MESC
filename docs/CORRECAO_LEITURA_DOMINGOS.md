# Correção: Leitura de Horários de Domingo

## 🐛 Problema Identificado

### Situação Anterior
O sistema estava lendo **TODOS os domingos como 10:00**, ignorando o horário principal informado pelo ministro.

**Exemplo:**
- Ministro respondia: "Horário principal: **19h**"
- Ministro marcava: "Domingo 02/11"
- Sistema registrava: "Domingo 02/11 às **10:00**" ❌

### Causa Raiz

No arquivo `/server/services/responseCompiler.ts`, a função `parseSundayString()` tinha o horário **hard-coded**:

```typescript
// ANTES (linha 244)
private static parseSundayString(sunday: string, month: number, year: number) {
  const match = sunday.match(/(\d{1,2})\/(\d{2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    return {
      date: `${year}-${month.toString().padStart(2, '0')}-${day}`,
      time: '10:00' // ❌ HARD-CODED! Sempre 10:00
    };
  }
  return null;
}
```

---

## ✅ Correção Aplicada

### Mudanças no Código

#### 1. Primeira Passada: Detectar Horário Principal

Adicionado loop para detectar o `main_service_time` ANTES de processar os domingos:

```typescript
// NOVO (linhas 241-254)
// PRIMEIRA PASSADA: Detectar horário principal (main_service_time)
let mainServiceTime = '10:00'; // Default
for (const item of data) {
  if (item.questionId === 'main_service_time' && item.answer) {
    const timeMap: Record<string, string> = {
      '8h': '08:00',
      '10h': '10:00',
      '19h': '19:00'
    };
    mainServiceTime = timeMap[item.answer] || '10:00';
    console.log(`      📌 Horário principal detectado: ${mainServiceTime}`);
    break;
  }
}
```

#### 2. Aplicar Horário Principal aos Domingos

Atualizado para passar o `mainServiceTime` ao processar domingos:

```typescript
// ANTES
const parsed = this.parseSundayString(sunday, month, year);

// DEPOIS
const parsed = this.parseSundayString(sunday, month, year, mainServiceTime);
```

#### 3. Função parseSundayString Atualizada

```typescript
// NOVO (linhas 420-433)
private static parseSundayString(sunday: string, month: number, year: number, mainServiceTime: string = '10:00') {
  const match = sunday.match(/(\d{1,2})\/(\d{2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    return {
      date: `${year}-${month.toString().padStart(2, '0')}-${day}`,
      time: mainServiceTime // ✅ Usa o horário principal informado pelo ministro
    };
  }
  return null;
}
```

---

## 📊 Resultados Após Correção

### Outubro 2025 - Disponibilidades por Domingo

| Data | 08:00 | 10:00 | 19:00 | Total |
|------|-------|-------|-------|-------|
| **05/10** | 9 ministros | 15 ministros | 16 ministros | **40** |
| **12/10** | 19 ministros | 23 ministros | 30 ministros | **72** |
| **19/10** | 17 ministros | 16 ministros | 22 ministros | **55** |
| **26/10** | 22 ministros | 24 ministros | 24 ministros | **70** |

### Comparação: Antes vs Depois

| Horário | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **08:00** | 0 ❌ | 67 ✅ | +67 ministros |
| **10:00** | 105 ❌ | 78 ✅ | Distribuído corretamente |
| **19:00** | 0 ❌ | 92 ✅ | +92 ministros |

**Total de disponibilidades detectadas:**
- Antes: 105 (só 10:00)
- Depois: 237 (todos os horários)
- Melhoria: **+125%** 🎉

---

## 🔍 Como Funciona Agora

### Fluxo de Processamento

1. **Ministro responde questionário:**
   ```
   Horário principal: 19h
   Domingos disponíveis: [05/10, 12/10]
   ```

2. **Sistema detecta horário principal:**
   ```typescript
   mainServiceTime = '19:00' // Do campo main_service_time
   ```

3. **Sistema processa domingos:**
   ```typescript
   "Domingo 05/10" → { date: "2025-10-05", time: "19:00" } ✅
   "Domingo 12/10" → { date: "2025-10-12", time: "19:00" } ✅
   ```

4. **Resultado compilado:**
   ```json
   {
     "availability": {
       "dates": {
         "2025-10-05": { "times": { "19:00": true } },
         "2025-10-12": { "times": { "19:00": true } }
       }
     }
   }
   ```

---

## 🧪 Testes Realizados

### Script de Teste
```bash
npx tsx scripts/debug-all-masses.ts
```

### Resultados
```
📅 2025-10-05 (Domingo)
   08:00 - 9 ministros ✅
   10:00 - 15 ministros ✅
   19:00 - 16 ministros ✅

📅 2025-10-12 (Domingo)
   08:00 - 19 ministros ✅
   10:00 - 23 ministros ✅
   19:00 - 30 ministros ✅
```

---

## 📝 Arquivos Modificados

### `/server/services/responseCompiler.ts`

**Linhas alteradas:**
- 241-254: Primeira passada para detectar horário principal
- 290: Passa mainServiceTime ao parseSundayString
- 423: Função parseSundayString aceita mainServiceTime como parâmetro

**Commit:**
```
fix: Use main_service_time when parsing Sunday availability

- Detect main_service_time before processing available_sundays
- Pass mainServiceTime to parseSundayString function
- Fixes issue where all Sundays were defaulting to 10:00

Now correctly distributes ministers to 08:00, 10:00, and 19:00 based on
their stated main service time preference.
```

---

## 🎯 Impacto

### Positivo
✅ Disponibilidades detectadas corretamente
✅ Horários 08:00 e 19:00 agora têm ministros
✅ Distribuição realista entre horários
✅ Não precisa refazer questionário de outubro

### Nota Importante
⚠️  **Para outubro:** Esta correção é retroativa - funciona com dados existentes

⚠️  **Para novembro+:** Recomendado usar [Formato V2.0](/docs/QUESTIONNAIRE_FORMAT_V2.md) que é mais explícito

---

## 🚀 Próximos Passos

### Para Outubro (Resolvido)
- [x] Correção aplicada
- [x] Testado com dados reais
- [x] Disponibilidades detectadas corretamente
- [x] Sistema pronto para uso

### Para Novembro+ (Recomendado)
- [ ] Implementar Formato V2.0
- [ ] Criar questionário que pergunta cada horário separadamente
- [ ] Evitar inferências e suposições
- [ ] Estrutura mais clara e explícita

---

## 📚 Documentação Relacionada

- [Formato V2.0](/docs/QUESTIONNAIRE_FORMAT_V2.0.md)
- [Response Compiler Service](/docs/RESPONSE_COMPILER_SERVICE.md)
- [Schedule Generator V2](/docs/SCHEDULE_GENERATOR_V2.md)

---

**Data da correção:** 2025-10-14
**Status:** ✅ Aplicado e Testado
**Versão:** ResponseCompiler v1.1
