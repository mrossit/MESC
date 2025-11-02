#!/bin/bash
# Script de build personalizado para resolver problema de deployment
# Adiciona a flag --packages=external para evitar bundling de pacotes com native bindings

echo "🔨 Building server bundle with external packages..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -eq 0 ]; then
  echo "✅ Server bundle created successfully with external packages"
else
  echo "❌ Server build failed"
  exit 1
fi
