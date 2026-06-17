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
- Migration de exclusao de conta em staging: OK (`user_status=deleted`).
- Login temporario usado na validacao Supabase: revogado.
- Fluxo de exclusao de conta: implementado no app em Configuracoes > Conta.
- URL publica de exclusao de conta: `/account-deletion`.
- Suite local de release: OK (`npm run check`, `npm run build`, `npm run test:run`).
- Comando unico de release candidate: `npm run release:check:local`.

## Preview Replit

A versao desta branch pode ser testada no Preview do Replit como release candidate web/PWA depois de puxar o ultimo commit:

```bash
git pull --ff-only
npm run release:check:local
```

Esse preview valida UX mobile, login, questionarios, escalas, exclusao de conta e comportamento PWA no navegador. Ele nao substitui o empacotamento nativo para App Store/Google Play; ainda falta criar/validar o wrapper nativo (Capacitor ou alternativa definida), com app id, icones, splash, permissoes e build iOS/Android.

## Warnings nao bloqueantes

- `DATABASE_URL` recomenda `sslmode=require` explicito quando o provedor suportar.
- Sentry esta integrado no backend/frontend, mas ainda exige `SENTRY_DSN` e `VITE_SENTRY_DSN` reais antes da submissao publica.
- O `pg_dump` disponivel no Replit estava em major 16, enquanto Supabase staging estava em Postgres 17. Para dumps diretos de Supabase 17, usar `pg_dump` 17+.

## Evidencia de dados restaurados

- `users`: 141 rows.
- `questionnaires`: 9 rows.
- `schedules`: 2411 rows.

## Proximo bloco para loja

1. Configurar `SENTRY_DSN` e `VITE_SENTRY_DSN` para monitoramento de erros antes de beta externo.
2. Ajustar `DATABASE_URL` com `sslmode=require`, se o Neon/Replit aceitar essa query string.
3. Aplicar migration `0006_account_deletion_compliance.sql` em producao antes do deploy da feature de exclusao.
4. Rodar smoke test manual em iOS Safari e Android Chrome com fluxos de ministro, coordenador e exclusao de conta.
5. Preparar materiais de loja: nome, descricao curta, descricao completa, politica de privacidade, screenshots, icone e categorias.
6. Definir trilha de teste: TestFlight para iOS e Internal testing/Closed testing no Google Play.
7. Validar que o app nao menciona funcionalidades indisponiveis na listagem das lojas.
8. Definir e criar o wrapper nativo iOS/Android antes da submissao oficial.

## Observacao de seguranca

O staging Supabase recebeu copia de dados reais durante a validacao. Manter acesso restrito, pausar/remover o projeto quando nao for mais necessario, ou repetir o clone apenas sob demanda.
