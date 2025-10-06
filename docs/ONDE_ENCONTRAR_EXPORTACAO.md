# 📍 Onde Encontrar a Exportação de Escalas

## 🎯 Localização Principal

### Editor de Escalas Drag & Drop

**URL:** `/schedule-editor-dnd`

**Como acessar:**
1. Faça login no sistema
2. No menu lateral, clique em **"Editor de Escalas (Drag & Drop)"**
3. Ou acesse diretamente: `https://seu-dominio.com/schedule-editor-dnd`

**Onde está o botão:**
```
┌─────────────────────────────────────────────────────────┐
│ Editor de Escalas (Drag & Drop)                        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ← Outubro 2025 →                                    ││
│ │ Status: Publicada                                   ││
│ │                                                     ││
│ │ [📊 Exportar Escalas] [🔄 Recarregar] [💾 Salvar] ││ ← AQUI!
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Dica de uso do drag & drop]                          │
│                                                         │
│ [Grid de escalas...]                                   │
└─────────────────────────────────────────────────────────┘
```

**Requisitos:**
- ✅ Estar logado como Gestor ou Coordenador
- ✅ Ter uma escala criada para o mês
- ✅ Estar na visão geral do mês (não em modo de edição de horário específico)

## 📁 Arquivos de Componentes

### Componentes Criados

1. **`/client/src/components/SelectiveScheduleExport.tsx`**
   - Componente principal usado no ScheduleEditorDnD
   - Interface completa com seleção de missas
   - 3 abas: Selecionar, Formato, Resumo
   - 3 formatos de exportação

2. **`/client/src/components/MonthlyScheduleExport.tsx`**
   - Versão simplificada (exportação direta)
   - Sem seleção de missas
   - Formato horizontal fixo

3. **`/client/src/components/EnhancedScheduleExport.tsx`**
   - Versão intermediária
   - Com preview mas sem seleção granular

### Componente Existente (Diferente)

**`/client/src/components/ScheduleExport.tsx`**
- ⚠️ Este exporta apenas **um dia específico**
- Usado na página `/schedule` (Schedules.tsx)
- Formatos: CSV, Text, HTML
- **NÃO é o componente do mês completo**

## 🔍 Como Verificar se Está Funcionando

### Passo 1: Verificar Import

Abra `/client/src/pages/ScheduleEditorDnD.tsx` e verifique a linha 43:

```typescript
import { SelectiveScheduleExport } from '../components/SelectiveScheduleExport';
```

✅ Se esta linha existe, o import está correto.

### Passo 2: Verificar Uso no Componente

No mesmo arquivo, procure por volta da linha 491-497:

```typescript
{schedule && !selectedDate && !selectedTime && (
  <SelectiveScheduleExport
    scheduleId={schedule.id}
    month={currentMonth.getMonth() + 1}
    year={currentMonth.getFullYear()}
    assignments={assignments}
  />
)}
```

✅ Se este código existe, o componente está sendo renderizado.

### Passo 3: Verificar Build

Execute:
```bash
npm run build
```

✅ Se compilar sem erros, está tudo OK.

### Passo 4: Testar no Navegador

1. Inicie o servidor: `npm run dev`
2. Acesse: `http://localhost:5000/schedule-editor-dnd`
3. Procure o botão azul "Exportar Escalas" no canto superior direito

## 🐛 Troubleshooting

### Botão Não Aparece

**Possíveis causas:**

1. **Não há escala criada para o mês**
   ```
   Solução: Crie uma escala primeiro em "Gerar Escalas"
   ```

2. **Você está em modo de edição de horário específico**
   ```
   Solução: Clique em "Voltar para Visão Geral"
   URL deve ser: /schedule-editor-dnd (sem parâmetros)
   ```

3. **Você não é Gestor ou Coordenador**
   ```
   Solução: Faça login com uma conta de gestor/coordenador
   ```

4. **Componente não foi importado**
   ```
   Solução: Verifique o import no ScheduleEditorDnD.tsx
   ```

### Erro ao Exportar

**Se aparecer erro ao clicar em "Exportar":**

1. **Abra o Console do Navegador** (F12)
2. Procure por erros em vermelho
3. Verifique se a biblioteca `xlsx` está instalada:
   ```bash
   npm list xlsx
   ```
   Se não estiver, instale:
   ```bash
   npm install xlsx
   ```

### Arquivo Não Baixa

1. **Verifique permissões do navegador**
   - Alguns navegadores bloqueiam downloads automáticos
   - Permita downloads do site

2. **Verifique se há missas selecionadas**
   - Pelo menos uma missa deve estar marcada

3. **Tente outro formato**
   - Se Excel não funcionar, teste CSV

## 📊 Diferenças Entre os Componentes

| Componente | Onde Usa | O Que Exporta | Seleção |
|------------|----------|---------------|---------|
| **SelectiveScheduleExport** | ScheduleEditorDnD | Mês completo | ✅ Sim, por missa |
| **MonthlyScheduleExport** | Não usado ainda | Mês completo | ❌ Não, tudo |
| **EnhancedScheduleExport** | Não usado ainda | Mês completo | ❌ Não, com preview |
| **ScheduleExport** | Schedules.tsx | Dia específico | ✅ Sim, por horário |

## 🚀 Para Usar em Outras Páginas

Se quiser adicionar em outra página:

```typescript
// 1. Import
import { SelectiveScheduleExport } from '@/components/SelectiveScheduleExport';

// 2. No JSX
<SelectiveScheduleExport
  scheduleId={schedule.id}
  month={currentMonth.getMonth() + 1}
  year={currentMonth.getFullYear()}
  assignments={assignments}
/>
```

## 📸 Screenshots (Como Deve Aparecer)

### Botão no Header
```
┌──────────────────────────────────────────────┐
│ outubro 2025                  [Exportar]    │
│ Status: Publicada             [Recarregar]  │
│                                [Salvar Tudo] │
└──────────────────────────────────────────────┘
          ↑
     Deve aparecer aqui
```

### Modal de Exportação
```
┌────────────────────────────────────────────────┐
│ 📊 Exportar Escalas Selecionadas              │
│ Outubro/2025 - 12 missas selecionadas        │
├────────────────────────────────────────────────┤
│ [Selecionar Missas] [Formato] [Resumo]       │
│                                                │
│ ┌────────────────────────────────────────────┐│
│ │ [Selecionar Todas] [Desmarcar Todas]      ││
│ │ │ [Domingos] [Segundas] ...               ││
│ │                                            ││
│ │ 📅 Domingo                                 ││
│ │ ☑ 05/10 (Domingo) - 08:00                 ││
│ │ ☑ 05/10 (Domingo) - 10:00                 ││
│ │ ☑ 05/10 (Domingo) - 19:00                 ││
│ │ ...                                        ││
│ └────────────────────────────────────────────┘│
│                                                │
│ [Cancelar]                        [Exportar]  │
└────────────────────────────────────────────────┘
```

## ✅ Checklist de Verificação

Antes de reportar problema, verifique:

- [ ] Arquivo existe: `/client/src/components/SelectiveScheduleExport.tsx`
- [ ] Import existe em: `/client/src/pages/ScheduleEditorDnD.tsx` linha 43
- [ ] Uso existe em: `/client/src/pages/ScheduleEditorDnD.tsx` linha 491-497
- [ ] Build compila sem erros: `npm run build`
- [ ] Biblioteca xlsx instalada: `npm list xlsx`
- [ ] Você é Gestor ou Coordenador
- [ ] Há escala criada para o mês
- [ ] Está na visão geral (URL sem parâmetros)
- [ ] Navegador permite downloads

## 📞 Suporte

Se ainda não encontrar, verifique:

1. **Versão do código**
   ```bash
   git log --oneline -1
   ```
   Deve mostrar commits recentes sobre exportação

2. **Arquivos modificados**
   ```bash
   git status
   ```

3. **Console do navegador**
   - Abra DevTools (F12)
   - Aba Console
   - Procure erros em vermelho

---

**Última atualização:** 06/10/2025
**Versão:** 1.0.0
