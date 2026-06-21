# MESC Native - Runbook Da Fundacao Tecnica

**Data:** 2026-06-21
**Escopo:** fundacao tecnica P0 da API mobile nativa.
**Status:** pronto para validacao local e preparado para deploy por migrations.

---

## 1. O Que Esta Coberto

- migrations mobile versionadas: `0007_mobile_device_sessions.sql` e `0008_mobile_idempotency_keys.sql`;
- registro de dispositivos nativos;
- refresh token rotativo;
- idempotencia persistida por 24h para mutacoes criticas;
- OpenAPI `/api/mobile/v1` alinhado com as rotas implementadas;
- fixtures/demo P0 com duas comunidades;
- teste de integracao anti-vazamento multi-comunidade;
- seed local para exercitar MVP tecnico sem depender da UI nativa.

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

---

## 3. Demo P0

Carregar fixtures/demo:

```bash
npm run db:seed:mobile-demo
```

Dados criados:

- 2 comunidades;
- 1 ministro na comunidade A;
- 1 ministro na comunidade B;
- 1 coordenador de comunidade A;
- 1 coordenador paroquial;
- 2 questionarios publicados;
- 2 escalas publicadas;
- 2 pedidos de substituicao.

Arquivo base: `test/fixtures/mobileP0DemoData.ts`.

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
