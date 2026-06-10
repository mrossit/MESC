# MESC — Lessons Learned

## 2026-06-10 — Incidente de login + Multi-Community Phase 2 (fundação)

**Context:** Após o último deploy, NENHUM usuário autenticava. Causa-raiz: o código da Phase 1 (commit `3bdce63`, schema.ts com `home_community_id`/`community_id` + enum novo) foi publicado, mas a **migration `0005` nunca foi aplicada em produção**. O `db.select().from(users)` do login referenciava `home_community_id`, coluna inexistente → erro `column does not exist` antes de checar a senha → login quebrado para todos.

**O que quebrou (e o conserto aplicado em prod nesta sessão):**
1. **Login** — `0005` aplicada em prod (tabela `communities` + colunas + backfill → São Judas). Transação-segura: `ALTER TYPE ADD VALUE` commitado antes de ser usado nas promoções.
2. **Escritas** — `0005` deixou as 8 colunas `NOT NULL` SEM default; como o código não setava community_id, geração de escala/cadastro/substituições/questionários quebrariam na escrita. Conserto: `DEFAULT` = matriz (São Judas) nas 8 colunas (`0006`).
3. **Roles** — a migration promovia Marco/Priscila/Lisboa a `coordenador_paroquial`, mas o código deployado **só entendia `'coordenador'`** (zero ocorrências do vocabulário novo). Promoções revertidas em prod até o deploy do código novo.

**Fase 2 (fundação) — implementada nesta sessão:**
- `shared/roles.ts` — fonte única: grupos (`ADMIN_ROLES`, `PARISH_WIDE_ROLES`), predicados (`isAdmin`/`isCoordinator`/`isManager`), `expandRoles` (rota que permite `'coordenador'` aceita as variantes), e escopo (`getUserScope`/`canEditCommunity`).
- `requireRole` passou a usar `expandRoles` → ~95 rotas reconhecem os roles novos sem editar cada call site.
- `homeCommunityId` propagado no JWT/`req.user`/`/me` (tokens antigos seguem válidos — comunidade vem fresca do banco).
- Escritas do app setam `community_id` explicitamente (`server/utils/communityContext.ts`); default do banco cobre o resto.
- Client reconhece roles novos (tipos + guards role-aware via `expandRoles`).
- Migrations: `0006` (defaults, seguro a qualquer hora) + `0007` (promoções, aplicar em prod **só junto do deploy**).

**Gotchas reforçados:**
- **esbuild não type-checa** — o `npm run build` (vite+esbuild) transpila sem checar tipos, por isso o schema quebrado passou no deploy. `tsc --noEmit` revela os problemas (e revelou as 4 tabelas-fantasma).
- Schema deployado SEM a migration correspondente é a falha de processo central. Deploy do MESC deve aplicar migrations pendentes ANTES de publicar.
- `users.role` em prod é **`text`**, não o enum — `ALTER TYPE RENAME VALUE` NÃO migra os dados das linhas; promoções precisam de `UPDATE` explícito.

**Fronteira Fase 2 → Fase 3 (pendente):** read-scoping nos ~100+ sites de leitura, pool de ministros por comunidade na geração de escala, visão read-only entre comunidades, e UI (badges cromáticos + seleção de comunidade). Sem efeito visível hoje (só São Judas tem dados).

**Tags:** incident, login, drizzle, migration, multi-tenant, roles, mesc, phase2

## 2026-06-07 — Multi-Community Phase 1 Migration

**Context:** Adicionando suporte multi-comunidade ao MESC (schema + migration + seed)

**What went well:**
- Enum rename (`coordenador` → `coordenador_comunidade`) e ADD VALUE funcionam via DO block idempotente
- BEGIN/ROLLBACK como "staging simulado" antes do COMMIT real é eficaz para validar SQL sem ambiente separado
- Backfill sequencial (tabelas diretas primeiro, depois herdadas via JOIN) evita NULLs residuais

**Gotchas:**
- `ALTER TYPE ... ADD VALUE` e `RENAME VALUE` devem rodar FORA da transação principal no PostgreSQL < 14; no Neon (PG 15+) funciona dentro de transação, mas o valor adicionado fica disponível só após COMMIT
- 4 tabelas no schema.ts (mass_execution_logs, standby_ministers, minister_check_ins, schedule_confirmations) ainda não existem no banco — community_id foi adicionado ao schema.ts mas o ALTER TABLE ficará para quando essas tabelas forem criadas
- `.gitignore` bloqueia `*.sql` no projeto MESC — usar `git add -f` para commitar migration files
- `reitor` existe no enum do banco mas não estava no schema.ts — necessário adicionar para consistência
- Nome real dos usuários: "Ana Lisboa" = "Ana Paula Soares Lisboa", "Natalie Paola" = "Natalie Paola Nazareth de Oliveira"

**Root cause (enum gotcha):**
PostgreSQL permite `ALTER TYPE ADD VALUE IF NOT EXISTS` mas sem `IF NOT EXISTS` em `RENAME VALUE` — usar DO block com check em `pg_enum` para idempotência.

**How to avoid:**
Sempre checar enum values atuais no banco antes de escrever migration (`SELECT unnest(enum_range(NULL::user_role))::text`).
Sempre fazer dry-run em BEGIN/ROLLBACK antes do COMMIT em produção.

**Tags:** drizzle, postgresql, migration, enum, multi-tenant, florence, mesc
