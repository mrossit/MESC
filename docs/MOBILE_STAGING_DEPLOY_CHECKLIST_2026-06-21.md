# MESC Native - Checklist Seguro De Staging/Deploy

**Data:** 2026-06-21
**Escopo:** aplicar e validar a fundacao mobile `0007/0008`, o escopo multi-comunidade da escala `0011` e a base nativa de configuracao de missas `0009` fora do ambiente local.

---

## Decisao De Ambiente

- PWA atual: manter em `https://saojudastadeu.replit.app`.
- Novo ambiente nativo: usar `https://saojudastadeu.app`.
- Banco do novo ambiente nativo: separado do banco atual do Replit, preferencialmente em um projeto Supabase proprio.

Nao usar este checklist para reescrever ou substituir o MESC atual no Replit. Ele serve para preparar o ambiente do app nativo.

---

## Status Atual Do Staging Nativo

Projeto Supabase criado:

- nome: `mesc-native-staging`;
- project ref: `sdochgpfjosmhrbztthr`;
- region: `sa-east-1`;
- API URL: `https://sdochgpfjosmhrbztthr.supabase.co`.

Bootstrap remoto aplicado em 2026-06-21:

- schema P0/runtime do app mobile criado para login, sessoes, auditoria, questionario, escalas, substituicoes, notificacoes, dispositivos, refresh token e idempotencia;
- RLS habilitado e policies de deny explicito aplicadas nas 13 tabelas criadas;
- security advisor sem lints;
- seed demo aplicada com 2 comunidades, 4 usuarios, 2 questionarios, 3 escalas, 2 substituicoes e 8 notificacoes;
- configuracao nativa de missas aplicada em 2026-06-24 com `0009_native_mass_configuration_baseline.sql`;
- base nativa de sorteio de adoracao versionada em `0010_native_adoration_draws_baseline.sql`;
- unicidade de escala por comunidade versionada em `0011_scope_schedule_unique_constraint_by_community.sql`;
- seed de horarios/eventos aplicada nas comunidades `mobile-demo-matriz` e `mobile-demo-sao-lucas`, com 12 horarios legados, 15 configuracoes dinamicas e 32 eventos especiais por comunidade;
- avisos de performance restantes sao `unused_index`, esperados enquanto a base nao tem trafego.

Este staging ja responde pela API nativa publicada em `https://saojudastadeu.app`.

---

## 0. Bootstrap De Banco Nativo Novo

Para um Supabase/Postgres novo e vazio:

```bash
CONFIRM_NATIVE_SCHEMA_BOOTSTRAP=true \
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:bootstrap:native
```

O comando aplica o schema atual com protecoes de ambiente e, em seguida, aplica/valida a fundacao mobile. Ele deve ser usado somente em banco novo, antes de importar dados reais ou demo.

---

## 1. Antes De Rodar

- confirmar qual banco sera usado: staging, demo ou producao;
- fazer backup antes de qualquer migration em banco com dados reais;
- confirmar que o deploy atual ja contem o commit com `migrations/0007_mobile_device_sessions.sql`, `migrations/0008_mobile_idempotency_keys.sql` e `migrations/0011_scope_schedule_unique_constraint_by_community.sql`;
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

O comando aplica as SQLs versionadas `0007`, `0008` e `0011`, alem da compatibilidade `0006` quando ainda nao aplicada.

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

## 5. Configuracao Nativa De Missas E Eventos

A migration `0009` cria a base usada pela prontidao da escala e pelo futuro algoritmo nativo:

- `mass_times_config`;
- `mass_configurations`;
- `special_events`;
- `question_mass_mappings`;
- `learned_patterns`.

Aplicar em staging/demo:

```bash
CONFIRM_NATIVE_MASS_CONFIG_MIGRATION=true \
DATABASE_URL="$STAGING_DATABASE_URL" \
npm run db:migrate:native-mass-config
```

Popular horarios e eventos canonicos no banco nativo, por comunidade:

```bash
CONFIRM_NATIVE_MASS_CONFIG_SEED=true \
DATABASE_URL="$STAGING_DATABASE_URL" \
npm run db:seed:native-mass-config -- --write --all-active-communities --year=2026 --years=2
```

Validar:

```bash
DATABASE_URL="$STAGING_DATABASE_URL" \
npm run db:validate:native-schedule -- --community-slug=mobile-demo-matriz --community-slug=mobile-demo-sao-lucas
```

O seed e idempotente: uma segunda execucao deve atualizar os mesmos registros sem duplicar horarios/eventos.

### 5.1. Sorteio De Adoracao Para O Algoritmo

O gerador de escala consulta sorteios de adoracao de segunda-feira quando existirem. Em bancos nativos que foram criados antes dessa baseline, aplicar:

```bash
CONFIRM_NATIVE_ADORATION_MIGRATION=true \
DATABASE_URL="$STAGING_DATABASE_URL" \
npm run db:migrate:native-adoration
```

Validar junto com a fundacao:

```bash
DATABASE_URL="$STAGING_DATABASE_URL" npm run db:validate:mobile
```

---

## 6. Smoke Manual Esperado

Com a seed demo aplicada em ambiente demo:

1. login mobile com ministro demo;
2. refresh token rotativo;
3. abrir Minha Missao;
4. abrir notificacoes, validar contador e marcar aviso como lido;
   - validar que a resposta inclui `eventKey` (`schedule_published` na primeira notificacao demo);
5. carregar questionario de julho/2026;
6. enviar resposta com `Idempotency-Key`;
7. confirmar presenca em escala publicada;
8. pedir substituicao em escala futura sem substituicao ativa;
9. reexecutar a mesma mutacao com a mesma `Idempotency-Key` e confirmar replay/sem duplicidade.

Conta demo local:

- email: `mobile.ministro.a@example.test`;
- senha: `MobileDemo123!`;
- comunidade: `Comunidade Matriz`.

---

## 7. Rollback

As migrations criam apenas tabelas mobile novas e indices associados. Em caso de incidente antes do app nativo consumir dados reais:

```sql
DROP TABLE IF EXISTS mobile_idempotency_keys;
DROP TABLE IF EXISTS mobile_refresh_tokens;
DROP TABLE IF EXISTS mobile_devices;
```

Antes de qualquer rollback em ambiente com uso real, exportar as tres tabelas para auditoria.

Para a configuracao nativa de missas, preferir desativar registros (`is_active=false`) em vez de remover tabelas se ja houver questionarios, respostas ou escalas vinculadas a esse calendario.
