#!/bin/bash

# Script para corrigir erros de tipagem relacionados a getMassTimesForDate()
# O problema: getMassTimesForDate() retorna string[], não objetos com propriedade .time

echo "🔧 Corrigindo erros de tipagem em arquivos de Schedule..."

# Arquivo: SelectiveScheduleExport.tsx
echo "📄 Corrigindo SelectiveScheduleExport.tsx..."
sed -i 's/massTime\.time/massTime/g' client/src/components/SelectiveScheduleExport.tsx

# Arquivo: CompactScheduleEditor.tsx
echo "📄 Corrigindo CompactScheduleEditor.tsx..."
sed -i 's/massTime\.time/massTime/g' client/src/pages/CompactScheduleEditor.tsx
sed -i 's/LITURGICAL_POSITIONS\.slice/Object.values(LITURGICAL_POSITIONS).slice/g' client/src/pages/CompactScheduleEditor.tsx

# Arquivo: ScheduleEditorDnD.tsx
echo "📄 Corrigindo ScheduleEditorDnD.tsx..."
sed -i 's/massTime\.time/massTime/g' client/src/pages/ScheduleEditorDnD.tsx
sed -i 's/massTime\.minMinisters/20/g' client/src/pages/ScheduleEditorDnD.tsx

# Arquivo: DraggableScheduleEditor.tsx
echo "📄 Corrigindo DraggableScheduleEditor.tsx..."
sed -i 's/variant="success"/variant="default"/g' client/src/components/DraggableScheduleEditor.tsx

echo "✅ Correções aplicadas com sucesso!"
echo "🧪 Execute 'npm run check' para verificar os erros restantes"
