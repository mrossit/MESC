# MESC Native - Separacao De Ambiente E Dominio

**Data:** 2026-06-21
**Decisao:** manter o MESC atual no Replit e usar `https://saojudastadeu.app` para o novo ambiente nativo.

---

## Objetivo

Separar o teste do MVP nativo do ambiente atual usado pelos ministros no PWA.

O MESC atual continua funcionando no Replit, sem reescrita e sem troca de banco imediata. O app nativo passa a apontar para um novo ambiente controlado, com banco proprio, API propria e ciclo de validacao separado.

## Mapa De Dominios

| Uso | URL | Observacao |
| --- | --- | --- |
| PWA atual / legado | `https://saojudastadeu.replit.app` | Mantem o MESC atual para uso dos ministros durante a transicao. |
| Novo MESC nativo | `https://saojudastadeu.app` | Deve apontar para a API/web shell do ambiente nativo quando o novo deploy estiver pronto. |

Hoje, os dois dominios ainda respondem pela mesma instancia Replit. A troca deve acontecer somente depois que o novo ambiente nativo estiver publicado e validado.

## Impacto No Build Nativo

O codigo mobile ja esta preparado para essa separacao:

- no PWA/browser, chamadas `/api` continuam relativas ao dominio atual;
- no runtime nativo Capacitor, chamadas `/api` sao reescritas para `https://saojudastadeu.app`;
- o build TestFlight `5.4.3 (50415)` ja foi gerado apontando para `https://saojudastadeu.app`.

Isso significa que o build `50415` pode ser usado para validar o novo ambiente quando o dominio `saojudastadeu.app` deixar de apontar para o Replit atual e passar a apontar para a nova API.

## Ambiente Novo Recomendado

- Editor/desenvolvimento: Cursor, Codex ou outro editor local, usando o repositorio Git.
- Banco: novo projeto Supabase, por exemplo `mesc-native-staging`.
- API: novo deploy fora do Replit atual.
- Dominio: `https://saojudastadeu.app`.
- PWA atual: permanece em `https://saojudastadeu.replit.app`.

## Supabase Nativo

Projeto criado em 2026-06-21:

- Nome: `mesc-native-staging`
- Organizacao: `Rossit`
- Project ref: `sdochgpfjosmhrbztthr`
- Region: `sa-east-1`
- API URL: `https://sdochgpfjosmhrbztthr.supabase.co`
- Status inicial: `ACTIVE_HEALTHY`
- Schema `public`: vazio antes do bootstrap

O projeto antigo `mesc-staging` foi removido/pausado antes da criacao deste ambiente para liberar o limite de projetos ativos.

## Variaveis Do Novo Ambiente

No ambiente nativo novo:

```bash
NODE_ENV=production
APP_URL=https://saojudastadeu.app
DATABASE_URL=<postgres do novo ambiente>
ALLOWED_ORIGINS=https://saojudastadeu.app,capacitor://localhost,https://localhost
```

Se o ambiente novo servir apenas API, ainda assim `APP_URL` deve usar `https://saojudastadeu.app` para links de email, suporte e politicas.

## Ordem Segura De Implantacao

1. Criar o banco novo.
2. Confirmar que o schema `public` do banco novo esta vazio.
3. Rodar o bootstrap protegido do banco nativo.
4. Validar tabelas mobile.
5. Rodar seed demo somente no banco novo de staging/demo.
6. Publicar a nova API em uma URL temporaria ou direto no dominio final.
7. Apontar `https://saojudastadeu.app` para o novo ambiente.
8. Validar pelo TestFlight `5.4.3 (50415)`.
9. Manter `https://saojudastadeu.replit.app` como PWA atual ate a migracao final.

Bootstrap do banco nativo novo:

```bash
CONFIRM_NATIVE_SCHEMA_BOOTSTRAP=true \
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:bootstrap:native
```

O comando recusa rodar dentro do deployment Replit atual, recusa o host conhecido do banco atual e recusa qualquer banco que ja tenha tabelas no schema `public`.

Seed demo apenas em banco descartavel:

```bash
MOBILE_DEMO_SEED=true DATABASE_URL="$DEMO_DATABASE_URL" npm run db:seed:mobile-demo
MOBILE_DEMO_SEED=true DATABASE_URL="$DEMO_DATABASE_URL" npm run db:validate:mobile -- --expect-demo
```

## Smoke Fidedigno Esperado

Depois que `https://saojudastadeu.app` estiver no ambiente novo:

1. `GET /health/ready` retorna `200`.
2. `POST /api/mobile/v1/auth/login` nao retorna `404`.
3. Login mobile com usuario demo ou conta real autorizada.
4. Refresh token rotativo.
5. Minha Missao.
6. Notificacoes com `eventKey`.
7. Questionario atual.
8. Confirmar presenca em escala.
9. Pedir substituicao.
10. Repetir uma mutacao com a mesma `Idempotency-Key` e confirmar replay sem duplicidade.

## Fora Do Escopo Desta Separacao

- Reescrever o MESC atual no Replit.
- Migrar ministros reais automaticamente para o novo banco.
- Desativar `saojudastadeu.replit.app`.
- Rodar seed demo no banco de producao atual.

Esses passos devem ser tratados como uma fase posterior, depois da validacao do MVP nativo.
