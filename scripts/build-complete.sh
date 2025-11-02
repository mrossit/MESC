#!/bin/bash
# Script de build completo para deployment
# Executa todos os passos necessários para fazer o build da aplicação

set -e

echo "🚀 Starting complete build process..."

# Passo 1: Inject version
echo "📝 Injecting version..."
node scripts/inject-version.js

# Passo 2: Build frontend com Vite
echo "⚛️  Building frontend with Vite..."
vite build

# Passo 3: Build backend com esbuild (com packages=external para evitar native bindings)
echo "🔨 Building server bundle with external packages..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Complete build finished successfully!"
