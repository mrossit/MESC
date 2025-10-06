#!/bin/bash

# Script para atualizar versão do MESC
# Uso: ./scripts/update-version.sh 1.0.1

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${RED}❌ Erro: Versão não especificada${NC}"
  echo -e "Uso: $0 <versão>"
  echo -e "Exemplo: $0 1.0.1"
  exit 1
fi

NEW_VERSION=$1

echo -e "${YELLOW}🔄 Atualizando versão para: ${NEW_VERSION}${NC}"

# Validar formato de versão (semver)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}❌ Formato de versão inválido${NC}"
  echo -e "Use formato: MAJOR.MINOR.PATCH (ex: 1.0.1)"
  exit 1
fi

# Arquivo 1: client/src/lib/version.ts
FILE1="client/src/lib/version.ts"
if [ -f "$FILE1" ]; then
  sed -i "s/export const APP_VERSION = '.*';/export const APP_VERSION = '$NEW_VERSION';/" "$FILE1"
  echo -e "${GREEN}✅ Atualizado: $FILE1${NC}"
else
  echo -e "${RED}❌ Arquivo não encontrado: $FILE1${NC}"
  exit 1
fi

# Arquivo 2: server/routes.ts
FILE2="server/routes.ts"
if [ -f "$FILE2" ]; then
  sed -i "s/version: '.*', \/\/ Atualizar manualmente a cada deploy/version: '$NEW_VERSION', \/\/ Atualizar manualmente a cada deploy/" "$FILE2"
  echo -e "${GREEN}✅ Atualizado: $FILE2${NC}"
else
  echo -e "${RED}❌ Arquivo não encontrado: $FILE2${NC}"
  exit 1
fi

# Verificar se as versões estão iguais
VERSION_CLIENT=$(grep "export const APP_VERSION" "$FILE1" | sed -n "s/.*'\(.*\)'.*/\1/p")
VERSION_SERVER=$(grep "version:" "$FILE2" | grep "Atualizar manualmente" | sed -n "s/.*'\(.*\)',.*/\1/p")

if [ "$VERSION_CLIENT" != "$VERSION_SERVER" ]; then
  echo -e "${RED}❌ ERRO: Versões não estão iguais!${NC}"
  echo -e "  Client: $VERSION_CLIENT"
  echo -e "  Server: $VERSION_SERVER"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Versão atualizada com sucesso!${NC}"
echo -e "📦 Nova versão: ${GREEN}${NEW_VERSION}${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "  1. Verificar mudanças: ${YELLOW}git diff${NC}"
echo -e "  2. Testar localmente: ${YELLOW}npm run dev${NC}"
echo -e "  3. Build de produção: ${YELLOW}npm run build${NC}"
echo -e "  4. Commit: ${YELLOW}git commit -m 'chore: bump version to ${NEW_VERSION}'${NC}"
echo -e "  5. Deploy para produção"
echo ""
