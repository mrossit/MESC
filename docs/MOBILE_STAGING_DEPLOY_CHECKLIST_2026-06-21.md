# MESC Native - Checklist Seguro De Staging/Deploy

**Data:** 2026-06-21
**Escopo:** aplicar e validar a fundacao mobile `0007/0008` fora do ambiente local.

---

## 1. Antes De Rodar

- confirmar qual banco sera usado: staging, demo ou producao;
- fazer backup antes de qualquer migration em banco com dados reais;
- confirmar que o deploy atual ja contem o commit com `migrations/0007_mobile_device_sessions.sql` e `migrations/0008_mobile_idempotency_keys.sql`;
- nunca rodar seed demo em producao;
- nunca rodar `drizzle-kit push` para esta etapa.

---

## 2. Aplicar Migrations Mobile

Staging:

```bash
DATABASE_URL="$STAGING_DATABASE_URL" npm run db:migrate:mobile
```

Producao, somente na janela aprovada:

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" npm run db:migrate:mobile
```

O comando aplica apenas as SQLs versionadas `0007` e `0008`.

---

## 3. Validar Tabelas E Indices

```bash
DATABASE_URL="$STAGING_DATABASE_URL" npm run db:validate:mobile
```

Validacoes esperadas:

- `mobile_devices`;
- `mobile_refresh_tokens`;
- `mobile_idempotency_keys`;
- `uq_mobile_devices_user_device`;
- `mobile_refresh_tokens_hash_idx`;
- `mobile_idempotency_keys_user_key_idx`.

---

## 4. Seed Demo Somente Em Ambiente Demo

O seed demo remoto e bloqueado por padrao. Para rodar em banco de demo, a flag explicita e obrigatoria:

```bash
MOBILE_DEMO_SEED=true DATABASE_URL="$DEMO_DATABASE_URL" npm run db:seed:mobile-demo
MOBILE_DEMO_SEED=true DATABASE_URL="$DEMO_DATABASE_URL" npm run db:validate:mobile -- --expect-demo
```

Nao usar `STAGING_DATABASE_URL` ou `PRODUCTION_DATABASE_URL` para demo seed, a menos que o ambiente tenha sido criado especificamente para demonstracao descartavel.

---

## 5. Smoke Manual Esperado

Com a seed demo aplicada em ambiente demo:

1. login mobile com ministro demo;
2. refresh token rotativo;
3. abrir Minha Missao;
4. carregar questionario de julho/2026;
5. enviar resposta com `Idempotency-Key`;
6. confirmar presenca em escala publicada;
7. pedir substituicao em escala futura sem substituicao ativa;
8. reexecutar a mesma mutacao com a mesma `Idempotency-Key` e confirmar replay/sem duplicidade.

Conta demo local:

- email: `mobile.ministro.a@example.test`;
- senha: `MobileDemo123!`;
- comunidade: `Comunidade Matriz`.

---

## 6. Rollback

As migrations criam apenas tabelas mobile novas e indices associados. Em caso de incidente antes do app nativo consumir dados reais:

```sql
DROP TABLE IF EXISTS mobile_idempotency_keys;
DROP TABLE IF EXISTS mobile_refresh_tokens;
DROP TABLE IF EXISTS mobile_devices;
```

Antes de qualquer rollback em ambiente com uso real, exportar as tres tabelas para auditoria.
