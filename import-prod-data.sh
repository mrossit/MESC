#!/bin/bash
# Script para importar dados de produção para desenvolvimento

echo "📥 Importando dados de produção para desenvolvimento..."
export NODE_ENV=development
npx tsx scripts/sync-production-data.ts import --import-force
echo "✅ Importação concluída!"
