# MESC — Lessons Learned

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
