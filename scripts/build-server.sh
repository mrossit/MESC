#!/bin/bash
# Script de build personalizado para resolver problema de deployment
# Remove a flag --packages=external para incluir todas as dependências no bundle

echo "🔨 Building server bundle..."
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist

if [ $? -eq 0 ]; then
  echo "✅ Server bundle created successfully"
else
  echo "❌ Server build failed"
  exit 1
fi
