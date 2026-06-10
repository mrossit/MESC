#!/usr/bin/env bash
#
# neon-pitr-recover.sh
# -----------------------------------------------------------------------------
# Recuperação 100% automática das escalas apagadas em 2026-06-10.
# Faz TUDO: cria um branch PITR do Neon (estado ANTES do deploy), obtém a
# connection string dele e copia de volta para produção só as escalas
# perdidas (>= data de corte), reaproveitando recover-escala-from-branch.sh.
#
# A ÚNICA coisa que você precisa fornecer é uma NEON_API_KEY:
#   Neon Console -> Account settings -> API keys -> Generate new API key
#
# Uso:
#   NEON_API_KEY="napi_xxx" bash scripts/neon-pitr-recover.sh            # dry-run
#   NEON_API_KEY="napi_xxx" bash scripts/neon-pitr-recover.sh --apply    # aplica
#
# Variáveis opcionais (têm defaults sensatos):
#   PITR_TIMESTAMP   (default 2026-06-09T23:00:00Z — antes do deploy de 10/06)
#   CUTOFF           (default 2026-03-01 — escalas a recuperar)
#   PROD_HOST_MATCH  (default ep-lingering-firefly — identifica o projeto)
# -----------------------------------------------------------------------------
set -euo pipefail

API="https://console.neon.tech/api/v2"
PITR_TIMESTAMP="${PITR_TIMESTAMP:-2026-06-09T23:00:00Z}"
CUTOFF="${CUTOFF:-2026-03-01}"
PROD_HOST_MATCH="${PROD_HOST_MATCH:-ep-lingering-firefly}"
APPLY_FLAG="${1:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [[ -z "${NEON_API_KEY:-}" ]]; then
  echo "ERRO: defina NEON_API_KEY (Neon Console -> Account settings -> API keys)." >&2
  exit 1
fi
PROD_URL="${PROD_URL:-$(grep -E '^DATABASE_URL_PRODUCTION=' "$HERE/../.env.databases" | cut -d= -f2-)}"
auth=(-H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json")

echo "==> Descobrindo o projeto Neon (host contém '$PROD_HOST_MATCH')..."
PROJECT_ID="$(curl -fsS "${auth[@]}" "$API/projects" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((p['id'] for p in d.get('projects',[]) if '$PROD_HOST_MATCH' in (p.get('proxy_host','')+p.get('id',''))), d['projects'][0]['id']))")"
echo "    project_id = $PROJECT_ID"

echo "==> Criando branch PITR em $PITR_TIMESTAMP ..."
RESP="$(curl -fsS -X POST "${auth[@]}" "$API/projects/$PROJECT_ID/branches" -d "{
  \"branch\": { \"name\": \"pitr-recover-escala\", \"parent_timestamp\": \"$PITR_TIMESTAMP\" },
  \"endpoints\": [ { \"type\": \"read_write\" } ]
}")"
BRANCH_URL="$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['connection_uris'][0]['connection_uri'])")"
BRANCH_ID="$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['branch']['id'])")"
echo "    branch_id = $BRANCH_ID  (lembre de removê-lo no console depois)"
echo "    connection obtida (host: $(echo "$BRANCH_URL" | sed -E 's#.*@([^/]+)/.*#\1#'))"

echo "==> Rodando recuperação ($([[ "$APPLY_FLAG" == "--apply" ]] && echo APLICAR || echo dry-run))..."
BRANCH_URL="$BRANCH_URL" PROD_URL="$PROD_URL" CUTOFF="$CUTOFF" \
  bash "$HERE/recover-escala-from-branch.sh" $APPLY_FLAG

echo
echo "Pronto. Se ainda não aplicou, rode de novo com --apply."
echo "Depois de confirmar, apague o branch '$BRANCH_ID' no console do Neon para não gerar custo."
