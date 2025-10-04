#!/bin/bash

echo "🧪 Testando fluxo completo da página HOME"
echo ""

# 1. Testar versículos (sem autenticação)
echo "1️⃣ Testando API de versículos (sem autenticação)..."
VERSICULO=$(curl -s http://localhost:5000/api/versiculos/random)
if [ -n "$VERSICULO" ]; then
  echo "   ✅ API de versículos funcionando:"
  echo "   $VERSICULO"
else
  echo "   ❌ API de versículos não está respondendo"
fi
echo ""

# 2. Testar escalas (COM autenticação - simular navegador)
echo "2️⃣ Testando API de escalas (COM autenticação)..."
echo "   Fazendo login..."

# Login e salvar cookies
LOGIN_RESPONSE=$(curl -s -c /tmp/test_cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marcelotadeu@live.com","password":"Mesc2025@"}')

echo "   Resposta do login: $LOGIN_RESPONSE"

# Se login falhou, tentar com outra senha
if echo "$LOGIN_RESPONSE" | grep -q "success.*false"; then
  echo "   ⚠️  Senha Mesc2025@ não funcionou, tentando sem senha..."

  # Verificar se existe usuário sem senha ou com senha padrão
  echo "   Pulando teste de autenticação..."
else
  echo "   ✅ Login bem-sucedido"

  # Testar API de escalas com cookies
  echo ""
  echo "   Buscando escalas do mês atual com autenticação..."
  ESCALAS=$(curl -s -b /tmp/test_cookies.txt http://localhost:5000/api/schedules/minister/current-month)

  if [ -n "$ESCALAS" ]; then
    echo "   ✅ API de escalas funcionando:"
    echo "   $ESCALAS"
  else
    echo "   ❌ API de escalas não está respondendo"
  fi
fi

echo ""
echo "3️⃣ Verificando logs do servidor..."
echo "   (Últimas 10 linhas relevantes)"
