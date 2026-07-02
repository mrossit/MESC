# Ciclo N0.1 — Testes de caracterização do gerador REAL de escalas

## Contexto
Este projeto (MESC) está migrando para um app nativo. O servidor será a fundação.
O coração do sistema é `server/utils/scheduleGenerator.ts` (3722 linhas) — o gerador REAL
de escalas usado em produção — e ele tem ZERO testes. Os testes existentes de "schedule"
testam um gêmeo morto (código duplicado que nada em produção importa). Auditoria também
constatou que a trava de 12h de auto-aprovação de substituição foi removida silenciosamente
do código real — os testes do espelho ainda afirmam o comportamento antigo.

## Objetivo
Criar TESTES DE CARACTERIZAÇÃO para o gerador real: pinar o comportamento ATUAL
(mesmo onde parecer errado), para que qualquer mudança futura (refactor, migração de
schema, cliente nativo) acuse regressão. NÃO é para corrigir bugs do gerador.

## Regras rígidas
1. **NÃO modificar `server/utils/scheduleGenerator.ts`** (nem "só um export"). Teste pela API pública existente. Se algo for intestável sem mudança, documente no relatório em vez de mudar.
2. Não tocar em rotas, schema, migrations, nem em nenhum código de produção.
3. Seguir o padrão dos testes existentes em `test/` (vitest, `test/setup.ts`, fixtures/helpers existentes). Investigue como os testes de integração existentes lidam com DB e siga o mesmo padrão.
4. Se o gerador usa aleatoriedade/data-atual, controle-a pelo mecanismo que os testes existentes já usam (fake timers, seed, injeção) — sem alterar o código de produção.
5. Todos os testes novos DEVEM passar: `npx vitest run test/unit/schedule-generator-characterization*` (ou caminho equivalente que você criar).
6. A suíte completa existente deve continuar verde: `npx vitest run` (rode e confirme).
7. `npm run check` (tsc) deve continuar sem erros.

## Cobertura mínima da caracterização
- Geração básica: dado um conjunto de ministros com disponibilidade (respostas de questionário) e missas de um mês, o gerador produz escala — pinar contagens, distribuição e propriedades invariantes (ninguém escalado sem disponibilidade; capacidade por missa respeitada; etc. — descubra as invariantes reais lendo o código e pine-as).
- Multi-comunidade: ministros/missas de comunidades diferentes não se misturam (ou, se o código atual mistura, PINE o comportamento atual e marque com comentário `// CARACTERIZAÇÃO: comportamento atual, possivelmente indesejado`).
- Casos de borda: mês sem questionário respondido, ministro inativo, missa especial/solenidade se houver tratamento especial no código.
- Determinismo: mesma entrada → mesma saída (se houver aleatoriedade, caracterize via propriedades estáveis).
- Priorize LARGURA (cobrir os caminhos principais do algoritmo) sobre profundidade em um caso só.

## Entregável
1. Arquivo(s) de teste novos em `test/unit/` (e `test/integration/` se necessário).
2. Relatório final em `.lilian/cycle-n0-1-report.md`: o que foi coberto, invariantes descobertas e pinadas, comportamentos suspeitos encontrados (ex.: mistura de comunidades, auto-aprovação sem trava), o que ficou intestável e por quê.
3. NÃO fazer commit — a maestrina (Lilian) verifica e commita.
