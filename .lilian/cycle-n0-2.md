# Ciclo N0.2 — Sanitização condicional do questionário no SERVIDOR

## Contexto
A lógica de perguntas condicionais (`metadata.dependsOn`, `filterMode`, visibilidade) e a limpeza de respostas de perguntas ocultas existe HOJE apenas no cliente web (`client/src/pages/QuestionnaireUnified.tsx` — ver ~linhas 792, 882, 1310). O servidor aceita respostas cruas. Um cliente nativo que poste respostas sem essa sanitização grava disponibilidade que a web teria descartado, corrompendo o insumo do gerador de escalas.

## Objetivo
Tornar o SERVIDOR a autoridade da sanitização, sem mudar o comportamento do cliente web.

## Escopo (faça exatamente isto)
1. **Estude primeiro** a lógica no cliente: `QuestionnaireUnified.tsx` — como `dependsOn` resolve visibilidade (incl. `monthly_availability`, `filterMode: 'exclude'`) e quando respostas dependentes são limpas/descartadas.
2. Crie um módulo compartilhado `server/utils/questionnaireSanitization.ts` que, dado o template (questions + metadata) e o payload de respostas, retorna o payload sanitizado (respostas de perguntas invisíveis/não aplicáveis removidas). Replique FIELMENTE a semântica do cliente — este ciclo é de paridade, não de melhoria.
3. Aplique a sanitização nos DOIS pontos de entrada de escrita:
   - `server/routes/questionnaires.ts` → `POST /responses` (linha ~316)
   - `server/routes/mobile.ts` → `POST /questionnaires/:id/response` (linha ~1590)
   Sanitize ANTES de persistir. Não altere o formato de resposta da API.
4. Testes unitários em `test/unit/questionnaire-sanitization.test.ts` cobrindo: pergunta dependente visível (mantida), oculta (removida), `filterMode: 'exclude'`, dependência `monthly_availability`, payload sem metadata condicional (passa intacto), e formato v2 (`format_version: '2.0'`).
5. Se a semântica do cliente tiver ambiguidade/bug aparente, NÃO corrija: replique e documente no relatório como "comportamento caracterizado".

## Regras rígidas
- NÃO altere o cliente web.
- NÃO altere `server/utils/scheduleGenerator.ts`.
- NÃO faça commit — a verificação e o commit são da Lilian.
- Suíte inteira deve continuar verde: `npx vitest run` (não suba servidor de dev).
- `npm run check` (tsc) deve passar.
- Rode os testes novos com `npx vitest run test/unit/questionnaire-sanitization*`.

## Entregáveis
- `server/utils/questionnaireSanitization.ts`
- Alterações mínimas nos 2 endpoints
- `test/unit/questionnaire-sanitization.test.ts`
- Relatório `.lilian/cycle-n0-2-report.md`: o que foi replicado, decisões de paridade, comportamentos suspeitos caracterizados, validações executadas.
