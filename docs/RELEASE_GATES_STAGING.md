# Gates de Staging para Publicacao

Data: 15/06/2026

Este runbook valida backend, banco e multi-community antes de promover um build para producao/lojas.

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
