# MESC Native - Runbook Da Fundacao Tecnica

**Data:** 2026-06-21
**Escopo:** fundacao tecnica P0 da API mobile nativa.
**Status:** pronto para validacao local e preparado para deploy por migrations.

---

## 1. O Que Esta Coberto

- migrations mobile versionadas: `0007_mobile_device_sessions.sql` e `0008_mobile_idempotency_keys.sql`;
- migration nativa de configuracao de missas: `0009_native_mass_configuration_baseline.sql`;
- registro de dispositivos nativos;
- refresh token rotativo;
- idempotencia persistida por 24h para mutacoes criticas;
- OpenAPI `/api/mobile/v1` alinhado com as rotas implementadas;
- fixtures/demo P0 com duas comunidades, notificacoes, questionarios, escalas e substituicoes;
- eventos minimos de notificacao mobile versionados no contrato (`eventKey`);
- teste de integracao anti-vazamento multi-comunidade;
- seed local para exercitar MVP tecnico sem depender da UI nativa.
- seed idempotente de horarios/eventos para prontidao da escala nativa.

---

## 2. Migrations

Aplicar localmente:

```bash
npm run db:migrate:mobile
```

Com `DATABASE_URL` configurado, o mesmo comando aplica as SQLs Postgres `0007` e `0008`.

Sem `DATABASE_URL`, o comando cria as tabelas equivalentes em `local.db`:

- `mobile_devices`;
- `mobile_refresh_tokens`;
- `mobile_idempotency_keys`.

Nao usar `drizzle-kit push` em producao. O projeto ja contem guard contra esse fluxo.

Validar tabelas e indices:

```bash
npm run db:validate:mobile
```

Aplicar a base de missas/algoritmo em banco nativo:

```bash
CONFIRM_NATIVE_MASS_CONFIG_MIGRATION=true \
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:migrate:native-mass-config
```

O aplicador tem guard explicito e recusa o host do MESC/Replit atual, salvo com `ALLOW_CURRENT_MESC_DB=true`.

---

## 3. Demo P0 E Calendario De Missas

Carregar fixtures/demo:

```bash
npm run db:seed:mobile-demo
```

Com `DATABASE_URL`, o seed demo e bloqueado por padrao. Em ambiente demo descartavel, usar:

```bash
MOBILE_DEMO_SEED=true DATABASE_URL="$DEMO_DATABASE_URL" npm run db:seed:mobile-demo
MOBILE_DEMO_SEED=true DATABASE_URL="$DEMO_DATABASE_URL" npm run db:validate:mobile -- --expect-demo
```

Dados criados:

- 2 comunidades;
- 1 ministro na comunidade A;
- 1 ministro na comunidade B;
- 1 coordenador de comunidade A;
- 1 coordenador paroquial;
- 2 questionarios publicados;
- 3 escalas publicadas;
- 2 pedidos de substituicao;
- 8 notificacoes demo cobrindo novo questionario, aviso de coordenador, encerramento de questionario, escala publicada, pedido de substituicao, substituto aceitou, novo treinamento e lembrete de escalacao.

Credencial demo local:

- email: `mobile.ministro.a@example.test`;
- senha: `MobileDemo123!`.

Arquivo base: `test/fixtures/mobileP0DemoData.ts`.

Depois da seed demo, popular a base de missas/eventos no ambiente nativo:

```bash
CONFIRM_NATIVE_MASS_CONFIG_SEED=true \
DATABASE_URL="$DEMO_DATABASE_URL" \
npm run db:seed:native-mass-config -- --write --all-active-communities --year=2026 --years=2
```

Validar a prontidao minima da escala:

```bash
DATABASE_URL="$DEMO_DATABASE_URL" \
npm run db:validate:native-schedule -- --community-slug=mobile-demo-matriz --community-slug=mobile-demo-sao-lucas
```

No staging Supabase `mesc-native-staging`, a validacao esperada depois do seed e:

- 12 registros ativos em `mass_times_config` por comunidade;
- 15 registros ativos em `mass_configurations` por comunidade;
- 32 registros ativos em `special_events` por comunidade para 2026/2027.

---

## 4. Testes Principais

Contrato e services mobile:

```bash
npm run test:run -- test/unit/server/mobileContractService.test.ts test/unit/server/mobileSessionService.test.ts test/unit/server/mobileIdempotencyService.test.ts test/unit/server/mobileOpenApiContract.test.ts --reporter=dot
```

Anti-vazamento multi-comunidade:

```bash
npm run test:run -- test/integration/mobileApiCommunityScope.test.ts --reporter=dot
```

Smoke MVP mobile:

```bash
npm run test:run -- test/integration/mobileApiSmoke.test.ts --reporter=dot
```

Build e tipos:

```bash
npm run check -- --pretty false
npm run build
```

---

## 5. Garantias

- ministro scoped por comunidade nao consulta outra comunidade via `X-Community-Id`;
- coordenador de comunidade nao consulta outra comunidade;
- coordenador paroquial consegue alternar comunidade explicitamente;
- questionario atual respeita comunidade ativa;
- substituicoes nao vazam entre comunidades;
- notificacoes retornam contador total de nao lidas e nao vazam entre usuarios;
- notificacoes mobile expõem `eventKey` para os oito eventos P0 sem depender de texto do titulo;
- mutacoes criticas exigem `Idempotency-Key`;
- retries identicos recebem replay da resposta concluida;
- reuse da mesma chave com outro payload retorna `409`;
- OpenAPI falha em teste se uma rota implementada nao estiver documentada.

---

## 6. Fora Do Escopo Deste Bloco

- UI nativa iOS/Android;
- push real APNs/FCM;
- upload nativo de foto;
- aplicacao automatica em producao;
- substituicao do admin web.

Esses pontos continuam no PRD/briefing como proximas frentes, nao como parte deste fechamento de fundacao.
