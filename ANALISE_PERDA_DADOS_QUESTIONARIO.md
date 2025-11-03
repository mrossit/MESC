# Análise de Perda de Dados - Questionário Novembro 2025

## 🔍 Problema Identificado

A pergunta **"Você pode conduzir o terço da nossa adoração - Segunda-feira 22h?"** (`adoration_monday`) estava presente no questionário de novembro/2025 mas **nenhuma resposta foi salva** no banco de dados.

## 📊 Dados da Investigação

### Questionário
- **ID**: `3524fdec-aa9d-46af-933b-40c9e53d7e71`
- **Mês/Ano**: Novembro 2025 (11/2025)
- **Total de respostas**: 124 ministros
- **Pergunta**: ID `adoration_monday` (categoria: special_event)

### Respostas Encontradas
- **Respostas com adoration_monday**: ❌ 0 (zero)
- **Respostas em unmapped_responses**: 124 (todas!)
- **Status**: A pergunta não foi respondida por NINGUÉM

## 🎯 Causa Raiz

### 1. **Filtragem no Frontend**
No arquivo `client/src/pages/QuestionnaireUnified.tsx` (linhas 649-660), respostas vazias são removidas antes de enviar:

```typescript
const formattedResponses = Object.entries(responses)
  .filter(([_, answer]) => {
    // Remove empty responses to reduce payload size
    if (typeof answer === 'string') return answer.trim() !== '';
    // ...
  })
```

**Resultado**: Se alguém deixa a pergunta em branco, ela não é enviada ao servidor.

### 2. **Falta de Mapeamento no Backend**
O arquivo `server/services/questionnaireService.ts` NÃO tinha mapeamento para `adoration_monday`, então mesmo que a resposta chegasse ao backend, seria salva em `unmappedResponses`.

## ✅ Correção Aplicada

Adicionei o mapeamento no `QuestionnaireService.ts` (linha 225-229):

```typescript
// Map Adoration Monday (Rosary at 22h)
else if (questionId === 'adoration_monday') {
  standardized.special_events.adoration_monday = this.normalizeValue(answer);
  processedQuestionIds.add(questionId);
}
```

## 📋 Conclusão sobre Novembro 2025

**NÃO houve perda de dados real** porque:
1. Nenhum ministro respondeu a pergunta (todos deixaram em branco)
2. O frontend filtrou respostas vazias corretamente
3. Nada foi enviado ao servidor para ser perdido

## 🔧 Ações Necessárias para Dezembro 2025

### 1. ✅ Correção já aplicada
- Mapeamento de `adoration_monday` adicionado ao backend (linha 225-229 de `questionnaireService.ts`)
- A pergunta agora será salva corretamente quando respondida

### 2. ✅ Investigação Concluída
**RESULTADO**: Todas as 124 respostas têm `unmapped_responses = {}` (objeto vazio).

**Conclusão**: 
- ✅ **NÃO há perda de dados** - nenhuma pergunta está sendo perdida
- ✅ Todos os campos foram mapeados corretamente
- ✅ Os objetos vazios `{}` indicam que não houve respostas não reconhecidas
- ✅ Sistema de fallback funcionando corretamente

### 3. 📝 Recomendação para Questionários Futuros

Para evitar que perguntas importantes sejam perdidas:

**Opção A**: Tornar a pergunta obrigatória no questionário
```json
{
  "id": "adoration_monday",
  "required": true,  // ← Adicionar esta linha
  "type": "multiple_choice",
  // ...
}
```

**Opção B**: Definir valor padrão no frontend para que sempre seja enviado
```typescript
// No QuestionnaireUnified.tsx, ao inicializar respostas:
initialResponses['adoration_monday'] = 'Não posso conduzir'; // valor padrão
```

## 📌 Status Atual

| Item | Status |
|------|--------|
| Pergunta existe no questionário Nov/2025 | ✅ Sim |
| Respostas foram salvas | ❌ Não (ninguém respondeu) |
| Mapeamento no backend | ✅ Corrigido |
| Pronto para Dez/2025 | ✅ Sim |
| Outras perguntas perdidas | ✅ Não (verificado) |
| Sistema de fallback funcionando | ✅ Sim |

## ✅ Verificação Completa Realizada

Verificamos o conteúdo de `unmapped_responses` para todas as 124 respostas:

```sql
-- Resultado da verificação
SELECT jsonb_typeof(unmapped_responses) as data_type, COUNT(*) as count
FROM questionnaire_responses
WHERE questionnaire_id = '3524fdec-aa9d-46af-933b-40c9e53d7e71'
GROUP BY jsonb_typeof(unmapped_responses);

-- Resultado: 
-- data_type | count
-- object    | 124  (todos = {})
```

**Confirmado**: Nenhuma pergunta está sendo perdida! 🎉

## 📝 Resumo Final

### Para Novembro/2025:
- ✅ Questionário funcionou corretamente
- ✅ Todas as perguntas foram mapeadas (exceto adoration_monday que ninguém respondeu)
- ✅ Nenhum dado foi perdido

### Para Dezembro/2025 e futuros:
- ✅ Mapeamento de `adoration_monday` adicionado
- ✅ Sistema pronto para funcionar corretamente
- 📋 Recomendação: Tornar a pergunta **obrigatória** se for importante ter essa informação

```json
{
  "id": "adoration_monday",
  "required": true,  // ← Adicionar para obrigar resposta
  "type": "multiple_choice",
  "question": "Você pode conduzir o terço da nossa adoração - Segunda-feira 22h?",
  "options": ["Sim, posso conduzir", "Não posso conduzir"]
}
```
