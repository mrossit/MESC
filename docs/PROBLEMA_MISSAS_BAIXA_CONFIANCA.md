# Problema: 28 Escalas com Baixa Confiança em Outubro 2025

## 🔴 Resumo do Problema

Das 43 missas geradas para outubro 2025, **28 têm baixa confiança** (15-35%), principalmente missas de dias de semana às **06:30**. Essas missas ficaram SEM MINISTROS atribuídos.

## 📊 Análise Completa

### 1. **Distribuição das Missas Problemáticas**

#### Missas com 0 ministros (Baixa 15%):
- **Segunda a Sexta-feira às 06:30** (todas as semanas)
- **Sábados às 06:30**
- **Algumas missas especiais (28/10 dia de São Judas)**

#### Missas com poucos ministros (Baixa 21-35%):
- Algumas missas noturnas de dias de semana (19:30)
- Missas especiais com pouca adesão

### 2. **Dados de Disponibilidade dos Ministros**

#### Ministros totais: 134
#### Respostas ao questionário: 108

#### Disponibilidade para dias de semana:
- ✅ **14 ministros** podem servir em dias de semana (13%)
- ❌ **94 ministros** marcaram "Não posso" para todos os dias (87%)

#### Os 14 ministros disponíveis para dias de semana:

| # | Ministro | Dias Disponíveis | Horários Preferidos | Horários Alternativos |
|---|----------|------------------|---------------------|----------------------|
| 1 | Eliane Machado Acquati Amorim | Seg, Ter, Qua, Qui, Sex, Sáb | 8h | - |
| 2 | Antônia Dirce Lins Nege | Quarta | 8h | - |
| 3 | MARIA ISABEL PICINI DE MOURA NEVES | Quarta, Sexta | 19h | 8h, 10h |
| 4 | Marcelo M e Silva | Quinta | 8h | - |
| 5 | Adil Munir Nege | Quarta | 8h | - |
| 6 | Valdenice Lopes dos Santos | Terça | 10h | - |
| 7 | Daniela Pereira | Seg, Ter, Qua, Qui, Sex, Sáb | 8h | 8h |
| 8 | Anderson Roberto Silva Santos | Terça | 10h | - |
| 9 | Raquel Ciolete de Jesus | Quinta | 10h | 8h |
| 10 | Meire Terezinha da Veiga | Segunda | 8h | - |
| 11 | Rafael Corrêa | Sexta | 19h | - |
| 12 | Rosana Lé Machado Piazentin | Terça, Quinta | 8h | - |
| 13 | Katia Massae Kataoka Corrêa | Sexta | 19h | - |
| 14 | Gloria Maria Santos | Quinta | 8h | - |

### 3. **Horários Marcados pelos Ministros**

Dos 14 ministros disponíveis para dias de semana, a distribuição de horários preferidos é:

- **8h**: 11 ministros
- **10h**: 4 ministros
- **19h**: 3 ministros
- **06:30**: **0 ministros** ❌

## 🐛 Causa Raiz do Problema

### Problema Identificado no Código

**Arquivo**: `server/utils/ministerAvailabilityChecker.ts`
**Função**: `checkV2Availability()` (linhas 80-97)

```typescript
// Check weekday masses (for daily mass at 6:30)
if ((mass.type === 'daily' || mass.type === 'missa_diaria') && timeKey === '06:30') {
  const dayOfWeek = new Date(dateKey).getDay();
  const weekdayMap = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday'
  };

  const weekday = weekdayMap[dayOfWeek];
  if (weekday && response.weekdays?.[weekday] === true) {
    return true;  // ✅ Considera disponível
  }
}
```

### O Problema:

A função **APENAS** verifica:
1. ✅ Se o tipo de missa é `missa_diaria`
2. ✅ Se o horário é `06:30`
3. ✅ Se o ministro marcou aquele DIA da semana como disponível

Mas **NÃO** verifica:
- ❌ Se o ministro marcou `06:30` como horário preferido ou alternativo

### Consequência:

Mesmo que 14 ministros tenham marcado disponibilidade para dias de semana, NENHUM deles marcou `06:30` como horário preferido. Eles marcaram:
- `8h`, `10h`, `19h`

Portanto, **nenhum ministro é considerado disponível** para as missas das 06:30.

## 💡 Soluções Propostas

### **Solução 1: Remover Missas das 06:30 (Recomendada)**

Se nenhum ministro pode/quer servir às 06:30, a solução mais simples é remover essas missas da configuração.

**Vantagens:**
- Não há ministros disponíveis para esse horário
- Reduz a complexidade da geração de escalas
- Elimina 20+ missas com baixa confiança

**Como fazer:**
1. Ir em "Configurações > Horários de Missa"
2. Remover ou desativar as missas de segunda a sexta às 06:30

### **Solução 2: Atualizar o Questionário**

Adicionar "06:30" como opção de horário no questionário para que ministros possam selecionar esse horário.

**Vantagens:**
- Captura a disponibilidade real dos ministros para esse horário
- Permite que ministros que acordam cedo possam se voluntariar

**Desvantagens:**
- Requer novo questionário
- Ministros precisam responder novamente

### **Solução 3: Ajustar o Algoritmo (Não Recomendada)**

Modificar o código para considerar ministros com "8h" como disponíveis para "06:30".

**Desvantagens:**
- Atribuiria ministros que NÃO querem servir às 06:30
- Criaria escalas incorretas
- Geraria reclamações dos ministros

## 📋 Outras Missas com Baixa Cobertura

### Missas do Dia 28/10 (São Judas Tadeu)

Algumas missas do dia de São Judas também têm baixa cobertura:

- **12:00**: 0 ministros (Baixa 15%)
- **17:00**: 0 ministros (Baixa 15%)
- **15:00**: 4 ministros (Baixa 27%)

**Causa**: Poucos ministros marcaram disponibilidade para esses horários específicos no questionário.

**Solução**: Verificar se esses horários foram oferecidos como opção no questionário. Se não, adicionar no próximo questionário.

## ✅ Recomendação Final

1. **Curto prazo**: Remover as missas de dias de semana às 06:30 da configuração (Solução 1)
2. **Médio prazo**: Para o próximo questionário (Novembro/Dezembro), incluir 06:30 como opção de horário
3. **Longo prazo**: Considerar criar um sistema de "atualização de disponibilidade" para que ministros possam atualizar seus horários sem responder todo o questionário novamente

## 📊 Estatísticas Finais

- **Total de missas**: 43
- **Missas com boa cobertura (75%)**: 15 (missas de domingo)
- **Missas com baixa cobertura**: 28
  - 20 missas às 06:30 (0 ministros)
  - 8 missas com poucos ministros

**Taxa de sucesso atual**: 35% das missas têm boa cobertura

**Taxa de sucesso após remover 06:30**: 65% das missas teriam boa cobertura (15 de 23)

---

**Relatório gerado em**: 14/10/2025
**Mês analisado**: Outubro 2025
**Ministros totais**: 134
**Ministros que responderam**: 108
**Ministros disponíveis para dias de semana**: 14 (13%)
