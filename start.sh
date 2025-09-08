#!/bin/bash

# Script para iniciar o servidor no Replit sem npm

echo "🚀 Iniciando servidor MESC..."

# Caminho do Node no Replit
NODE=/nix/store/lz7iav1hd92jbv44zf2rdd7b2mj23536-nodejs-20.19.3/bin/node

# Iniciar servidor backend e frontend
cd /home/runner/workspace

echo "📦 Iniciando backend na porta 5000..."
NODE_ENV=development $NODE node_modules/.bin/tsx server/index.ts

# O Vite será iniciado automaticamente pelo servidor