# DIAGNÓSTICO: Problema com Escalas Vazias

## Resumo do Problema

**As escalas estão sendo geradas, MAS:**
- ✅ Domingos: **OK** (40+ ministros disponíveis por missa)
- ❌ Dias de semana (06:30): **APENAS 2 ministros** (Eliane e Daniela)
- ❌ Algumas missas do dia 28: **VAZIAS** ou com poucos ministros

## Causa Raiz Identificada

### 1. Dias de Semana (06:30)

**Problema**: Apenas 2 ministros responderam estar disponíveis para missas de dias de semana.

**Dados do Banco**:
```
- Total de respostas: 106
- Ministros disponíveis para DOMINGOS: 102
- Ministros disponíveis para DIAS DE SEMANA: 2 ← AQUI ESTÁ O PROBLEMA
```

**O que os ministros responderam**:
- 104 ministros: NÃO marcaram disponibilidade para dias de semana
- 2 ministros (Eliane e Daniela): Marcaram disponibilidade

**Formato dos dados** (já corrigido):
- Campo: `dailyMassAvailability`
- Formato esperado: `["Segunda-feira", "Terça-feira", ...]`
- Formato atual: Correto, mas **vazio** para 104 ministros

### 2. Missas do Dia 28/10 (São Judas)

**Problema**: Algumas missas estão vazias porque os ministros não marcaram esses horários específicos.

**Dados do Banco**:
- 07:00: 9 ministros disponíveis ✅
- 10:00: 4 ministros disponíveis ⚠️
- 12:00: 0 ministros disponíveis ❌
- 15:00: 5 ministros disponíveis ⚠️
- 17:00: 0 ministros disponíveis ❌
- 19:30: ~50+ ministros disponíveis ✅

**O que os ministros responderam**:
- Muitos marcaram apenas 19:30 (noite)
- Poucos marcaram os horários de 12:00 e 17:00

## Código Atual: STATUS

### ✅ JÁ CORRIGIDO

1. **Leitura de questionários v2.0**: ✅ Funcionando
2. **Formato de `availableSundays`**: ✅ Corrigido para incluir horário
3. **Verificação de disponibilidade para domingos**: ✅ Funcionando
4. **Verificação de eventos especiais**: ✅ Funcionando

### ⚠️ LIMITAÇÕES DO SISTEMA (NÃO É BUG)

1. **Sistema não pode inventar disponibilidade**: Se o ministro não marcou que está disponível, o sistema não pode escalá-lo
2. **Dias de semana vazios = respostas vazias**: Os ministros não responderam estar disponíveis
3. **Algoritmo está funcionando corretamente**: Ele está respeitando as respostas dos questionários

## Soluções Possíveis

### Solução 1: ATUALIZAR QUESTIONÁRIO (Recomendado)

**Pedir para os ministros responderem novamente** marcando:
- Disponibilidade para dias de semana (campo `weekdays` no JSON)
- Mais horários no dia 28/10 (especialmente 12:00 e 17:00)

### Solução 2: IMPORTAR DADOS ANTIGOS

Se existe um sistema anterior com disponibilidades, importar esses dados.

### Solução 3: PERMITIR ESCALAÇÃO MANUAL

Adicionar funcionalidade para o gestor **manualmente** atribuir ministros em missas vazias, mesmo que eles não tenham marcado disponibilidade (com aviso ao ministro).

### Solução 4: MODO "FLEXÍVEL" (Não recomendado)

Criar um modo onde o sistema escala ministros mesmo sem disponibilidade explícita, usando heurísticas:
- "Se está disponível domingo à noite, talvez possa servir terça à noite"
- "Se serviu mês passado, talvez possa servir este mês"

**Riscos**: Pode gerar conflitos e escalações indevidas.

## Recomendação Final

**A melhor solução é a #1**: Pedir aos ministros para **responderem novamente o questionário** com:

1. ✅ Marcar disponibilidade para dias de semana (se puderem)
2. ✅ Marcar mais horários no dia 28/10
3. ✅ Revisar suas respostas

**OU**

Implementar a **Solução #3**: Permitir que o gestor **manualmente** complete as escalas vazias, escolhendo ministros e notificando-os.

## Exemplo de Como Ficaria com Mais Respostas

Se 20 ministros marcassem disponibilidade para dias de semana:
```
Segunda 06:30: 5-8 ministros
Terça 06:30: 5-8 ministros
Quarta 06:30: 5-8 ministros
Quinta 06:30: 5-8 ministros
Sexta 06:30: 5-8 ministros
```

Se 15 ministros marcassem disponibilidade para 12:00 e 17:00 no dia 28:
```
28/10 12:00: 8-10 ministros ✅
28/10 17:00: 8-10 ministros ✅
```

## Conclusão

**O sistema está funcionando corretamente!** Ele está respeitando fielmente as respostas dos questionários.

O problema não é técnico, é de **coleta de dados**: precisamos de mais ministros respondendo estar disponíveis para:
1. Missas de dias de semana (segunda a sexta, 06:30)
2. Horários específicos do dia 28/10 (12:00 e 17:00)

---

**Data**: ${new Date().toISOString()}
**Status**: Sistema funcionando conforme esperado
