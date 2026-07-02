# Relatório Ciclo N0.1 — Caracterização do gerador real de escalas

## Arquivos criados
- `test/unit/schedule-generator-characterization.test.ts`

## API exercitada
- `generateAutomaticSchedule(year, month, isPreview, { communityId })`
- Nenhuma alteração foi feita em `server/utils/scheduleGenerator.ts` ou em código de produção.

## Cobertura adicionada
- Geração básica com respostas v2 de questionário fechado para março/2026.
- Escopo multi-comunidade usando `communityId`.
- Casos de borda:
  - ministro inativo com resposta não entra na escala;
  - preview sem respostas inclui ministros ativos por padrão;
  - geração definitiva com questionário fechado sem respostas lança erro.
- Missa especial/customizada vinda de `questions` do questionário com `metadata.eventDate/eventTime`.
- Determinismo: duas execuções com a mesma entrada produzem o mesmo digest de datas, horários, tipos, ministros, backups e confiança.

## Invariantes pinadas
- Março/2026 gera 42 horários no modo hardcoded atual.
- Domingo 2026-03-01 às 08:00 tem `minMinisters = 15`; com apenas 3 ministros disponíveis, retorna exatamente esses 3, sem backup, e confiança limitada a `<= 0.5`.
- Domingo 2026-03-01 às 10:00 seleciona somente ministros que marcaram aquele slot específico no questionário v2.
- Missa diária de segunda-feira 2026-03-02 às 06:30 seleciona ministros com disponibilidade de `monday`.
- Nenhum slot retorna mais ministros do que `maxMinisters`.
- Não há ministro duplicado dentro do mesmo slot.
- Com `communityId`, ministros/respostas de outra comunidade não entram na geração.
- Missa custom `custom_retiro_quaresmal` em 2026-03-14 09:30 usa capacidade padrão atual de 7 ministros e seleciona apenas respostas positivas no `special_events`.

## Comportamentos suspeitos caracterizados
- `// CARACTERIZAÇÃO: comportamento atual, possivelmente indesejado`: em preview sem nenhuma resposta de questionário, o gerador trata todos os ministros ativos da comunidade como disponíveis.
- Capacidades hardcoded de domingos são altas (15/20/20), então fixtures pequenas geram escalas incompletas por desenho. O teste pina esse comportamento atual em vez de corrigir.

## O que ficou intestável neste ciclo
- A trava de 12h de auto-aprovação de substituição não pertence ao gerador real (`server/utils/scheduleGenerator.ts`) e não foi exercitada aqui.
- Caminhos privados internos do gerador não foram exportados nem acessados diretamente, por regra do ciclo. A caracterização foi feita só pela API pública.
- A suíte usa seeds diretos em `local.db` via `better-sqlite3` porque o `server/db.ts` local usa schema PostgreSQL sobre SQLite; inserts Drizzle de fixture acionam defaults/mapeadores PostgreSQL (`now()`, timestamp/jsonb) incompatíveis com SQLite. A execução do gerador continua passando pelo `db` real do app.

## Validação
- `npx vitest run test/unit/schedule-generator-characterization*` passou.
- `npx vitest run` passou: 45 arquivos, 839 testes passados, 55 skipped.
- `npm run check` passou.
