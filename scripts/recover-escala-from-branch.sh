#!/usr/bin/env bash
#
# recover-escala-from-branch.sh
# -----------------------------------------------------------------------------
# Recupera as escalas (e respectivos pedidos de substituição) que foram
# apagadas em 2026-06-10 pelo bug de delete-sem-transação do gerador.
#
# Estratégia: copiar do BRANCH PITR do Neon (estado ANTES do deploy de 10/06)
# apenas as linhas a partir de uma data de corte, de volta para a PRODUÇÃO.
# É ADITIVO e IDEMPOTENTE (ON CONFLICT DO NOTHING) — não toca em nada que já
# exista hoje em produção e pode ser rodado mais de uma vez sem duplicar.
#
# Uso:
#   BRANCH_URL="postgresql://...neon-branch..." \
#   PROD_URL="postgresql://...ep-lingering-firefly..." \
#   CUTOFF="2026-03-01" \
#   bash scripts/recover-escala-from-branch.sh [--apply]
#
# Sem --apply roda em modo DRY-RUN: apenas mostra quantas linhas seriam
# recuperadas, sem escrever em produção.
# -----------------------------------------------------------------------------
set -euo pipefail

CUTOFF="${CUTOFF:-2026-03-01}"
APPLY="no"
[[ "${1:-}" == "--apply" ]] && APPLY="yes"

if [[ -z "${BRANCH_URL:-}" || -z "${PROD_URL:-}" ]]; then
  echo "ERRO: defina BRANCH_URL (branch PITR do Neon) e PROD_URL (produção)." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SCHED_CSV="$TMP/schedules.csv"
SUBS_CSV="$TMP/substitution_requests.csv"

echo "==> Corte de data: escalas com date >= $CUTOFF"
echo "==> Origem (branch PITR): $(echo "$BRANCH_URL" | sed -E 's#//[^@]+@#//***@#')"
echo "==> Destino (produção):   $(echo "$PROD_URL"   | sed -E 's#//[^@]+@#//***@#')"
echo

# 1) Conferência: o que existe no branch x o que existe hoje em produção
echo "=== CONTAGENS ==="
echo -n "Branch  - escalas >= $CUTOFF: "
psql "$BRANCH_URL" -tAc "SELECT count(*) FROM schedules WHERE date >= '$CUTOFF';"
echo -n "Produção- escalas >= $CUTOFF (antes): "
psql "$PROD_URL"   -tAc "SELECT count(*) FROM schedules WHERE date >= '$CUTOFF';"
echo

# 2) Exporta do branch (somente leitura) as escalas a recuperar + substituições
psql "$BRANCH_URL" -c "\copy (SELECT * FROM schedules WHERE date >= '$CUTOFF') TO '$SCHED_CSV' WITH (FORMAT csv, HEADER true)"
psql "$BRANCH_URL" -c "\copy (SELECT s.* FROM substitution_requests s JOIN schedules e ON e.id = s.schedule_id WHERE e.date >= '$CUTOFF') TO '$SUBS_CSV' WITH (FORMAT csv, HEADER true)"
echo "Exportadas $(($(wc -l < "$SCHED_CSV")-1)) escalas e $(($(wc -l < "$SUBS_CSV")-1)) substituições do branch."
echo

if [[ "$APPLY" != "yes" ]]; then
  echo "DRY-RUN concluído. Nada foi escrito em produção."
  echo "Para aplicar de verdade, rode novamente com --apply"
  exit 0
fi

# 3) Importa em produção via tabela temporária + INSERT ON CONFLICT DO NOTHING
echo "=== APLICANDO EM PRODUÇÃO (aditivo, idempotente) ==="
psql "$PROD_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
CREATE TEMP TABLE _rec_schedules (LIKE schedules INCLUDING DEFAULTS) ON COMMIT DROP;
\copy _rec_schedules FROM '$SCHED_CSV' WITH (FORMAT csv, HEADER true)
INSERT INTO schedules SELECT * FROM _rec_schedules ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _rec_subs (LIKE substitution_requests INCLUDING DEFAULTS) ON COMMIT DROP;
\copy _rec_subs FROM '$SUBS_CSV' WITH (FORMAT csv, HEADER true)
INSERT INTO substitution_requests SELECT * FROM _rec_subs ON CONFLICT (id) DO NOTHING;
COMMIT;
SQL

echo
echo -n "Produção- escalas >= $CUTOFF (depois): "
psql "$PROD_URL" -tAc "SELECT count(*) FROM schedules WHERE date >= '$CUTOFF';"
echo "Recuperação concluída."
