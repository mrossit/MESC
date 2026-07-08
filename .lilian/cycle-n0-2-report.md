# Ciclo N0.2 — Relatório

## Implementado
- Criado `server/utils/questionnaireSanitization.ts`.
- Aplicada sanitização antes da persistência/padronização v2 em:
  - `server/routes/questionnaires.ts` (`POST /responses`)
  - `server/routes/mobile.ts` (`POST /questionnaires/:id/response`)
- Criado `test/unit/questionnaire-sanitization.test.ts`.

## Semântica replicada do cliente
- Visibilidade condicional usa `metadata.dependsOn`.
- O valor comparado extrai `answer` quando a resposta é objeto do tipo `yes_no_with_options`.
- Condição esperada usa `metadata.enabledWhen ?? metadata.showIf`.
- `enabledWhen/showIf` aceitam valor simples ou array.
- Quando a condição principal falha, `alternativeDependsOn` + `alternativeShowIf` funciona como OR.
- Perguntas invisíveis são removidas do payload antes de passar pelo `QuestionnaireService`.
- A remoção é recursiva/iterativa: dependentes de perguntas removidas também deixam de ser aplicáveis.
- Normalização de perguntas customizadas segue o cliente: `category: 'custom'` sem `dependsOn` passa a depender de `monthly_availability = Sim` com alternativa `alternative_availability = Sim`.
- Perguntas que dependem de `monthly_availability = Sim` recebem alternativa `alternative_availability = Sim`, exceto `main_service_time`, `available_sundays` e `other_times_available`, como no cliente.
- `filterMode: 'exclude'` foi tratado como opção não aplicável: se um cliente nativo enviar uma opção que a web não exibiria em `selectedOptions`/array, essa opção é descartada.

## Decisões de paridade
- A sanitização acontece antes de `QuestionnaireService.standardizeResponseWithTracking`, para que `responses`, campos derivados, `unmappedResponses` e `processingWarnings` reflitam o payload já limpo.
- O formato das respostas das APIs não foi alterado.
- O cliente web não foi alterado.
- `server/utils/scheduleGenerator.ts` não foi alterado.

## Comportamentos caracterizados
- Payload v2 já padronizado (`format_version: '2.0'`) é mantido intacto pelo sanitizador, porque não carrega respostas por `questionId` suficientes para reaplicar a lógica condicional do formulário. Os endpoints atuais continuam validando arrays de respostas antes da padronização.
- O cliente só filtra `filterMode: 'exclude'` na renderização das opções; no servidor isso foi caracterizado como remoção das opções não exibíveis, sem remover a pergunta inteira.

## Validações executadas
- `npx vitest run test/unit/questionnaire-sanitization*` — passou: 1 arquivo, 6 testes.
- `npm run check` — passou.
- `npx vitest run` — passou: 46 arquivos, 845 testes, 55 skipped.

## Observações
- Não foi iniciado servidor de dev.
- Não foi feito commit.
