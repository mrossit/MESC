# Gates de Staging para Publicacao

Data: 17/06/2026

Este runbook valida backend, banco e multi-community antes de promover um build para producao/lojas.

## 0. Release candidate no Replit Preview

No Replit, garanta que a branch esteja atualizada e rode o gate local em comando unico:

```bash
git pull --ff-only
npm run release:check:local
```

Resultado esperado:
- TypeScript sem erros.
- Build de producao gerado.
- Suite Vitest aprovada.

Use o Preview do Replit para smoke test web/PWA: login, logout, painel do ministro, resposta de questionario, visualizacao de escala, pedido de substituicao e exclusao de conta com usuario descartavel.

Observacao: o Preview do Replit nao valida binario nativo iOS/Android. As plataformas Capacitor ja existem em `ios/` e `android/`, mas ainda e necessario validar assinatura, icones, splash e dispositivo real antes de enviar para App Store/Google Play.

Gate nativo inicial:

```bash
npm run mobile:sync
npx cap doctor
```

## 1. Ambiente

```bash
NODE_ENV=production npm run release:check:env
```

Resultado esperado: `Release environment check passed.`

## 2. Health remoto

```bash
PRODUCTION_BASE_URL=https://saojudastadeu.app npm run release:check:health
```

O comando valida:
- `/health`
- `/health/ready`
- `/api/health`
- `/api/health/ready`

Os endpoints `ready` consultam o banco e devem retornar `200`. Se o banco falhar, retornam `503`.

## 3. Backup verificavel

```bash
DATABASE_URL="$STAGING_DATABASE_URL" npm run release:check:backup
```

O comando exige `pg_dump` e `pg_restore`, cria um dump custom-format e valida a estrutura do arquivo com `pg_restore --list`.

Notas operacionais:
- `pg_dump` deve ter a mesma versao major do PostgreSQL alvo ou uma versao mais nova. Exemplo: Supabase Postgres 17 exige `pg_dump` 17+ para criar dumps diretamente dele.
- Em ambientes IPv4-only, a conexao direta do Supabase (`db.<ref>.supabase.co`) pode falhar. Use o Session Pooler (`<pooler>.pooler.supabase.com:5432`) quando necessario.
- Se um dump ja foi criado e verificado, o restore pode ser validado sem novo dump:

```bash
RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
ALLOW_DESTRUCTIVE_RESTORE=true \
npm run release:check:backup -- \
--restore \
--backup-file=/caminho/backup-release.dump
```

## 4. Restore em banco descartavel

Nunca rode restore destrutivo contra producao.

```bash
DATABASE_URL="$STAGING_DATABASE_URL" \
RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
ALLOW_DESTRUCTIVE_RESTORE=true \
npm run release:check:backup -- --restore
```

O comando recusa executar se `RESTORE_DATABASE_URL` for igual a `DATABASE_URL`.

## 5. Migration multi-community em staging

Validacao somente leitura:

```bash
STAGING_DATABASE_URL="$STAGING_DATABASE_URL" npm run release:check:multi-parish
```

Aplicar migration e validar:

```bash
STAGING_DATABASE_URL="$STAGING_DATABASE_URL" \
CONFIRM_STAGING_MIGRATION=true \
npm run release:check:multi-parish -- --apply
```

O validador confere:
- tabela `communities`
- colunas `home_community_id` e `community_id`
- indices principais da migration `0005_multi_community_phase1.sql`
- comunidade matriz e comunidade `sao-judas`
- backfill de usuarios, questionarios, escalas, configuracoes, eventos e respostas

## Gate de saida

- Todos os comandos acima passam.
- O restore foi feito em banco descartavel e validou tabelas principais.
- A migration multi-community passou em staging antes de qualquer aplicacao em producao.

## Evidencia 17/06/2026

- Health producao (`https://saojudastadeu.app`): OK em `/health`, `/health/ready`, `/api/health`, `/api/health/ready`.
- Ambiente producao: OK. Warnings restantes: `DATABASE_URL` sem `sslmode=require` explicito e `SENTRY_DSN` ausente.
- Backup do banco Replit/Neon: OK, dump custom-format verificado (`3.56 MB`).
- Restore em Supabase staging: OK (`users=141`, `questionnaires=9`, `schedules=2411`).
- Restore em banco descartavel: OK (`users=141`, `questionnaires=9`, `schedules=2411`).
- Multi-community em staging: OK, incluindo comunidades, indices, colunas e backfill.
- Migration `0006_account_deletion_compliance.sql` em staging: OK (`user_status` inclui `deleted`).
- Acesso temporario `mesc_release` usado na validacao Supabase foi revogado apos os testes.
