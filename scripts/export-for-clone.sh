#!/bin/bash

# ============================================
# Script de Exportação do MESC para Clone
# ============================================
# Este script exporta o banco de dados e arquivos
# necessários para criar um clone do MESC.
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   MESC - Exportação para Clone${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Diretório de saída
EXPORT_DIR="./mesc-export-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo -e "${YELLOW}Criando diretório de exportação: $EXPORT_DIR${NC}"
echo ""

# ============================================
# 1. Exportar estrutura do banco (schema)
# ============================================
echo -e "${GREEN}[1/5] Exportando schema do banco de dados...${NC}"

# Copiar schema.ts
cp ./shared/schema.ts "$EXPORT_DIR/schema.ts"
echo "  ✓ schema.ts copiado"

# Gerar SQL do schema (se possível)
if command -v npx &> /dev/null; then
    echo "  Gerando SQL a partir do Drizzle..."
    npx drizzle-kit generate 2>/dev/null || echo "  (Drizzle generate ignorado)"
fi

# ============================================
# 2. Exportar dados do banco
# ============================================
echo ""
echo -e "${GREEN}[2/5] Exportando dados do banco...${NC}"

# Verificar se DATABASE_URL está definido
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}  ⚠ DATABASE_URL não definida. Tentando usar .env...${NC}"
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
fi

if [ -n "$DATABASE_URL" ]; then
    # Extrair credenciais da URL
    # postgresql://user:password@host:port/database

    echo "  Exportando backup completo..."

    # Backup completo (estrutura + dados)
    pg_dump "$DATABASE_URL" -F c -f "$EXPORT_DIR/mesc_full_backup.dump" 2>/dev/null && \
        echo "  ✓ Backup completo: mesc_full_backup.dump" || \
        echo -e "${RED}  ✗ Falha no backup completo${NC}"

    # Backup apenas dados (SQL)
    pg_dump "$DATABASE_URL" --data-only -f "$EXPORT_DIR/mesc_data_only.sql" 2>/dev/null && \
        echo "  ✓ Dados apenas: mesc_data_only.sql" || \
        echo -e "${RED}  ✗ Falha no backup de dados${NC}"

    # Backup da estrutura (sem dados)
    pg_dump "$DATABASE_URL" --schema-only -f "$EXPORT_DIR/mesc_schema_only.sql" 2>/dev/null && \
        echo "  ✓ Schema apenas: mesc_schema_only.sql" || \
        echo -e "${RED}  ✗ Falha no backup do schema${NC}"

else
    echo -e "${RED}  ✗ DATABASE_URL não encontrada. Pule esta etapa ou configure manualmente.${NC}"
    echo ""
    echo "  Para exportar manualmente, execute:"
    echo "  pg_dump \$DATABASE_URL -F c -f backup.dump"
fi

# ============================================
# 3. Copiar PRD e documentação
# ============================================
echo ""
echo -e "${GREEN}[3/5] Copiando documentação...${NC}"

cp ./docs/PRD-MESC-APP-NATIVO.md "$EXPORT_DIR/" 2>/dev/null && \
    echo "  ✓ PRD copiado" || \
    echo "  - PRD não encontrado"

# ============================================
# 4. Criar arquivo de exemplo de env
# ============================================
echo ""
echo -e "${GREEN}[4/5] Criando template de variáveis de ambiente...${NC}"

cat > "$EXPORT_DIR/.env.example" << 'EOF'
# ============================================
# Variáveis de Ambiente - MESC Clone
# ============================================

# Database PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/mesc_clone

# JWT Secret (gere uma chave única!)
JWT_SECRET=sua-chave-jwt-super-secreta-minimo-32-caracteres

# VAPID Keys para Push Notifications
# Gere com: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:seu@email.com

# WhatsApp Z-API (opcional)
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_SECURITY_TOKEN=

# Ambiente
NODE_ENV=development
PORT=5000
EOF

echo "  ✓ .env.example criado"

# ============================================
# 5. Criar README de instruções
# ============================================
echo ""
echo -e "${GREEN}[5/5] Criando README de instruções...${NC}"

cat > "$EXPORT_DIR/README.md" << 'EOF'
# MESC Clone - Arquivos de Exportação

## Conteúdo deste diretório

- `PRD-MESC-APP-NATIVO.md` - Documento completo de requisitos
- `schema.ts` - Schema do banco de dados (Drizzle ORM)
- `mesc_full_backup.dump` - Backup completo do banco (pg_dump format)
- `mesc_data_only.sql` - Apenas dados (SQL)
- `mesc_schema_only.sql` - Apenas estrutura (SQL)
- `.env.example` - Template de variáveis de ambiente

## Como usar

### 1. Criar novo banco de dados

```bash
createdb mesc_clone
```

### 2. Restaurar backup

**Opção A: Restaurar backup completo**
```bash
pg_restore -d mesc_clone mesc_full_backup.dump
```

**Opção B: Restaurar estrutura + dados separadamente**
```bash
psql -d mesc_clone -f mesc_schema_only.sql
psql -d mesc_clone -f mesc_data_only.sql
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 4. Iniciar desenvolvimento

Siga o PRD para implementar o app nativo usando:
- React Native + Expo (recomendado)
- ou Flutter

## Estrutura do Banco

O schema completo está em `schema.ts` e documentado no PRD.

### Tabelas principais:
- users
- schedules
- schedule_confirmations
- substitution_requests
- questionnaires
- questionnaire_responses
- formation_tracks/modules/lessons
- badges/user_badges/user_points
- notifications
- activity_logs

## Suporte

Este export foi gerado automaticamente pelo MESC.
Consulte o PRD para documentação detalhada.
EOF

echo "  ✓ README.md criado"

# ============================================
# Finalização
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Exportação concluída!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Arquivos exportados para: $EXPORT_DIR"
echo ""
echo "Próximos passos:"
echo "1. Copie a pasta $EXPORT_DIR para seu novo projeto"
echo "2. Restaure o banco de dados no novo ambiente"
echo "3. Use o PRD como guia para desenvolvimento"
echo ""

# Listar arquivos criados
echo "Arquivos criados:"
ls -la "$EXPORT_DIR"
