#!/bin/bash

# Script para iniciar o servidor no Replit em produção

echo "🚀 Iniciando servidor MESC..."

# Caminho do Node no Replit
NODE=/nix/store/lz7iav1hd92jbv44zf2rdd7b2mj23536-nodejs-20.19.3/bin/node

# Ir para o diretório do projeto
cd /home/runner/workspace

echo "🏗️ Building aplicação para produção..."
npm run build

echo "📦 Iniciando servidor em produção na porta 5000..."
npm start