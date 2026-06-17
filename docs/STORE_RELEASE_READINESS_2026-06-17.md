# Store Release Readiness - MESC

Data: 17/06/2026
Dominio validado: https://saojudastadeu.app

## Status

O app esta tecnicamente apto a avancar para preparacao de publicacao nas lojas, com os gates remotos principais aprovados.

## Gates aprovados

- Deploy em producao: OK.
- Health remoto: OK em `/health`, `/health/ready`, `/api/health`, `/api/health/ready`.
- Ambiente de producao: OK.
- Backup do banco atual: OK.
- Restore em staging: OK.
- Restore em banco descartavel: OK.
- Validacao multi-community em staging: OK.
- Login temporario usado na validacao Supabase: revogado.
- Fluxo de exclusao de conta: implementado no app em Configuracoes > Conta.
- URL publica de exclusao de conta: `/account-deletion`.

## Warnings nao bloqueantes

- `DATABASE_URL` recomenda `sslmode=require` explicito quando o provedor suportar.
- `SENTRY_DSN` ainda nao esta configurado; recomendado antes da submissao publica.
- O `pg_dump` disponivel no Replit estava em major 16, enquanto Supabase staging estava em Postgres 17. Para dumps diretos de Supabase 17, usar `pg_dump` 17+.

## Evidencia de dados restaurados

- `users`: 141 rows.
- `questionnaires`: 9 rows.
- `schedules`: 2411 rows.

## Proximo bloco para loja

1. Configurar `SENTRY_DSN` para monitoramento de erros antes de beta externo.
2. Ajustar `DATABASE_URL` com `sslmode=require`, se o Neon/Replit aceitar essa query string.
3. Aplicar migration `0006_account_deletion_compliance.sql` em staging/producao antes do deploy da feature de exclusao.
4. Rodar smoke test manual em iOS Safari e Android Chrome com fluxos de ministro, coordenador e exclusao de conta.
5. Preparar materiais de loja: nome, descricao curta, descricao completa, politica de privacidade, screenshots, icone e categorias.
6. Definir trilha de teste: TestFlight para iOS e Internal testing/Closed testing no Google Play.
7. Validar que o app nao menciona funcionalidades indisponiveis na listagem das lojas.

## Observacao de seguranca

O staging Supabase recebeu copia de dados reais durante a validacao. Manter acesso restrito, pausar/remover o projeto quando nao for mais necessario, ou repetir o clone apenas sob demanda.
