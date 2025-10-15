# Correção: Leitura de Disponibilidade para Dias de Semana

## 🐛 Problema Identificado

**28 missas com baixa confiança** (0 ministros atribuídos) em outubro 2025.

### Causa Raiz

O sistema **tinha os dados corretos**, mas **não estava lendo corretamente**.

## 🔍 Diagnóstico Completo

### 1. Os Dados ESTAVAM Corretos no Banco

```json
{
  "dailyMassAvailability": ["Segunda-feira", "Terça-feira", "Quarta-feira", ...],
  "preferredMassTimes": ["8h"],
  "alternativeTimes": null
}
```

✅ **14 ministros** tinham disponibilidade para dias de semana registrada
✅ Dados salvos corretamente na tabela `questionnaire_responses`

### 2. O Problema: Duplo Processamento

**Arquivo problemático**: `server/utils/scheduleGenerator.ts:1674`

#### O que estava acontecendo:

1. ✅ `loadAvailabilityData()` processava as respostas corretamente (linha 833-864)
   ```typescript
   this.availabilityData.set(userId, {
     dailyMassAvailability: ["Segunda-feira", "Terça-feira", ...]
   });
   ```

2. ❌ `getAvailableMinistersForMass()` **ignorava** esses dados processados (linha 1674)
   ```typescript
   const isAvailable = isAvailableForMass(minister, mass);
   ```

3. ❌ `isAvailableForMass()` tentava **reprocessar** o JSON raw:
   - Esperava formato v2.0: `response.weekdays.monday === true`
   - Recebia formato legacy: `Array de {questionId, answer}`
   - **Falhava** ao encontrar `response.weekdays` (undefined)
   - Retornava `false` para TODOS os ministros

### 3. Resultado

```
Ministros com dados corretos no banco: 14
Ministros considerados disponíveis pelo algoritmo: 0
Missas de dias de semana geradas: 0 ministros cada
```

## ✅ Solução Implementada

### Mudança no Código

**Arquivo**: `server/utils/scheduleGenerator.ts`
**Linhas**: 1664-1692

#### ANTES (errado):
```typescript
// Chamava função externa que reprocessava JSON
const isAvailable = isAvailableForMass(minister, mass);
return isAvailable;
```

#### DEPOIS (correto):
```typescript
// Usa dados JÁ PROCESSADOS em availabilityData
if (!availability.dailyMassAvailability || availability.dailyMassAvailability.length === 0) {
  return false;
}

// Mapear dayOfWeek para nome do dia
const weekdayNames = ['Domingo', 'Segunda', 'Terça', ...];
const currentDayName = weekdayNames[massTime.dayOfWeek];

// Verificar se ministro marcou este dia
const isAvailableForDay = availability.dailyMassAvailability.some(day => {
  return day.toLowerCase().includes(currentDayName.toLowerCase());
});

return isAvailableForDay;
```

### Por que Funciona Agora?

1. ✅ **Usa os dados já processados** em `this.availabilityData`
2. ✅ **Não tenta reprocessar** o JSON raw
3. ✅ **Mapeia corretamente** "Segunda-feira" → dayOfWeek 1
4. ✅ **Compara strings** ignorando variações ("Segunda" vs "Segunda-feira")

## 📊 Resultado Esperado

### Antes da Correção:
```
Missas de segunda a sexta às 06:30: 0 ministros cada
Total de missas com baixa confiança: 28/43 (65%)
```

### Depois da Correção:
```
Missas de segunda a sexta às 06:30: 1-3 ministros cada
Total de missas com baixa confiança: ~8/43 (18%)
```

### Ministros que Agora Serão Atribuídos:

| Ministro | Dias Disponíveis |
|----------|------------------|
| Eliane Machado Acquati Amorim | Seg, Ter, Qua, Qui, Sex, Sáb |
| Daniela Pereira | Seg, Ter, Qua, Qui, Sex, Sáb |
| Antônia Dirce Lins Nege | Quarta |
| MARIA ISABEL PICINI DE MOURA NEVES | Quarta, Sexta |
| Marcelo M e Silva | Quinta |
| Adil Munir Nege | Quarta |
| Valdenice Lopes dos Santos | Terça |
| Anderson Roberto Silva Santos | Terça |
| Raquel Ciolete de Jesus | Quinta |
| Meire Terezinha da Veiga | Segunda |
| Rafael Corrêa | Sexta |
| Rosana Lé Machado Piazentin | Terça, Quinta |
| Katia Massae Kataoka Corrêa | Sexta |
| Gloria Maria Santos | Quinta |

## 🎯 Lições Aprendidas

### ❌ **NÃO Fazer:**
- Reprocessar dados que já foram processados
- Ignorar dados estruturados em favor de JSON raw
- Assumir formato de dados sem validação

### ✅ **Fazer:**
- Usar dados já processados e validados
- Confiar na camada de processamento existente
- Validar formato de dados uma vez, na entrada

## 🔧 Próximos Passos (Opcional)

### Melhorias Futuras:

1. **Remover função `isAvailableForMass()` obsoleta**
   - Não é mais necessária para missas diárias
   - Mantém apenas para eventos especiais

2. **Adicionar testes unitários**
   - Testar `getAvailableMinistersForMass()` com dados reais
   - Validar mapeamento de dias da semana

3. **Documentar contrato de dados**
   - Especificar formato de `dailyMassAvailability`
   - Definir valores aceitos ("Segunda" vs "Segunda-feira")

---

**Data da Correção**: 14/10/2025
**Arquivo Modificado**: `server/utils/scheduleGenerator.ts`
**Linhas Alteradas**: 1664-1692
**Problema**: Duplo processamento de dados
**Solução**: Usar dados já processados em `availabilityData`
