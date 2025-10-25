#!/bin/bash

# Script de limpeza de logs desnecessários
# Remove console.log de debug mas mantém console.error

echo "🧹 Limpeza de Logs - MESC"
echo "=========================="

# Contador
removed_count=0

# Função para processar arquivos
process_file() {
    local file=$1
    local temp_file=$(mktemp)

    # Remove linhas com console.log que são claramente debug
    # Mas mantém console.error, console.warn importantes

    sed -E '
        # Remove console.log simples de debug
        /console\.log\(\s*\[.*DEBUG.*\]/d
        /console\.log\(\s*\[.*DEV.*\]/d
        /console\.log\(\s*['\''"]DEBUG/d
        /console\.log\(\s*['\''"]🔍/d
        /console\.log\(\s*['\''"]✅/d
        /console\.log\(\s*['\''"]📝/d

        # Remove console.log dentro de condições if (process.env.NODE_ENV === development)
        # que já foram removidos em arquivos principais
    ' "$file" > "$temp_file"

    # Se houve mudanças, substitui o arquivo
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        ((removed_count++))
        echo "  ✓ Limpo: $file"
    else
        rm "$temp_file"
    fi
}

echo ""
echo "Limpando arquivos TypeScript do servidor..."

# Processa arquivos .ts no servidor (exceto testes e seeds)
find /home/user/MESC/server -name "*.ts" \
    ! -path "*/tests/*" \
    ! -path "*/seeds/*" \
    ! -path "*/migrations/*" \
    -type f | while read file; do
    process_file "$file"
done

echo ""
echo "📊 Resumo:"
echo "  Arquivos processados: $removed_count"
echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "💡 Próximos passos:"
echo "  1. Executar 'npm run check' para verificar erros TypeScript"
echo "  2. Testar a aplicação em desenvolvimento"
echo "  3. Revisar mudanças com 'git diff'"
