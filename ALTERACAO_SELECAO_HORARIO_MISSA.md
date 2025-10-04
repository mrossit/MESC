# Alteração: Seleção de Horário de Missa na Edição de Escala

## Data: 2025-10-04

## Objetivo
Implementar uma tela de seleção de horário de missa quando o usuário for editar uma escala em um dia que possui múltiplas missas (ex: domingos com 3 missas às 8h, 10h e 19h).

## Problema Original
Antes desta alteração, quando o coordenador tentava editar uma escala em um dia com múltiplas missas, não havia uma forma clara de selecionar qual missa específica ele queria ajustar.

## Solução Implementada

### Arquivo Modificado
`/home/runner/workspace/client/src/components/ScheduleEditDialog.tsx`

### Mudanças Principais

#### 1. Importações Adicionadas
```typescript
import { Clock } from 'lucide-react';
import { getMassTimesForDate } from '@shared/constants';
```

#### 2. Interface Atualizada
```typescript
interface ScheduleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  time?: string; // ✨ NOVO: Tornado opcional
  initialMinisters: Minister[];
  onSave: () => void;
}
```

#### 3. Estados Adicionados
```typescript
const [selectedTime, setSelectedTime] = useState<string | null>(initialTime || null);
const [showTimeSelection, setShowTimeSelection] = useState(false);

// Obter horários disponíveis para a data selecionada
const availableTimes = date ? getMassTimesForDate(new Date(date)) : [];
const hasMultipleTimes = availableTimes.length > 1;
```

#### 4. Lógica de Controle
Novo `useEffect` que determina quando mostrar a tela de seleção:
```typescript
useEffect(() => {
  if (open) {
    // Se não tem horário definido e há múltiplos horários, mostrar seleção
    if (!initialTime && hasMultipleTimes) {
      setShowTimeSelection(true);
      setSelectedTime(null);
    } else {
      setShowTimeSelection(false);
      setSelectedTime(initialTime || availableTimes[0] || null);
    }
  }
}, [open, initialTime, hasMultipleTimes, availableTimes]);
```

#### 5. Nova Tela de Seleção de Horário
Quando `showTimeSelection` é `true`, o diálogo exibe:
- Título: "Selecione o Horário da Missa"
- Lista de botões para cada horário disponível no dia
- Cada botão mostra:
  - Ícone de relógio
  - Horário formatado (HH:MM)
  - Texto "Clique para editar esta escala"

```typescript
{availableTimes.map((time) => (
  <Button
    key={time}
    variant={selectedTime === time ? "default" : "outline"}
    className="h-16 justify-start text-left"
    onClick={() => {
      setSelectedTime(time);
      setShowTimeSelection(false);
    }}
  >
    <Clock className="h-5 w-5 mr-3" />
    <div>
      <div className="font-semibold text-lg">
        Missa das {time.substring(0, 5)}
      </div>
      <div className="text-xs text-muted-foreground">
        Clique para editar esta escala
      </div>
    </div>
  </Button>
))}
```

#### 6. Botão "Trocar Horário"
Na tela de edição de ministros, quando há múltiplos horários, foi adicionado um botão para voltar à seleção:
```typescript
{hasMultipleTimes && (
  <Button
    variant="ghost"
    size="sm"
    className="ml-2 h-6 text-xs"
    onClick={() => setShowTimeSelection(true)}
  >
    Trocar horário
  </Button>
)}
```

#### 7. Validação ao Salvar
A função `handleSave` agora valida se um horário foi selecionado:
```typescript
if (!selectedTime) {
  toast({
    title: "Selecione o horário",
    description: "Por favor, selecione o horário da missa antes de salvar.",
    variant: "destructive"
  });
  return;
}
```

## Fluxo de Uso

### Cenário 1: Dia com Múltiplas Missas (ex: Domingo)
1. Coordenador clica para editar escala de um domingo
2. Sistema detecta que há 3 missas (8h, 10h, 19h)
3. **NOVO**: Exibe tela de seleção perguntando qual missa editar
4. Coordenador clica no botão "Missa das 10:00"
5. Sistema abre a tela de edição de ministros para a missa das 10h
6. Se necessário, coordenador pode clicar em "Trocar horário" para mudar

### Cenário 2: Dia com Uma Única Missa (ex: Terça-feira)
1. Coordenador clica para editar escala de uma terça-feira
2. Sistema detecta que há apenas 1 missa (6h30)
3. Sistema pula a tela de seleção automaticamente
4. Abre diretamente a tela de edição de ministros

### Cenário 3: Edição com Horário Pré-definido
1. Coordenador já está editando uma missa específica
2. Sistema recebe o parâmetro `time` preenchido
3. Sistema pula a tela de seleção automaticamente
4. Abre diretamente a tela de edição com o horário correto

## Horários de Missa no Sistema

Conforme definido em `/home/runner/workspace/shared/constants.ts`:

- **Domingo**: 08:00, 10:00, 19:00 (3 missas)
- **Segunda a Sexta**: 06:30 (exceto novena de outubro)
- **Primeira Quinta-feira**: 06:30, 19:30
- **Primeiro Sábado**: 06:30
- **Primeiro Sábado de Outubro**: 06:30, 16:00
- **Novena de Outubro (20-27)**:
  - Segunda a Sexta: 19:30 (apenas)
  - Sábado: 19:00 (apenas)

## Benefícios da Implementação

1. **Clareza**: Usuário sabe exatamente qual missa está editando
2. **Prevenção de Erros**: Evita editar o horário errado por engano
3. **Experiência Melhorada**: Interface intuitiva com botões grandes e claros
4. **Flexibilidade**: Permite trocar de horário durante a edição
5. **Eficiência**: Pula a seleção quando só há uma missa no dia

## Compatibilidade
- ✅ Mantém compatibilidade com código existente
- ✅ Não quebra funcionalidades anteriores
- ✅ Funciona em todos os componentes que usam `ScheduleEditDialog`
- ✅ TypeScript compila sem erros
- ✅ Build de produção executado com sucesso

## Arquivos Relacionados
- `/home/runner/workspace/client/src/components/ScheduleEditDialog.tsx` (modificado)
- `/home/runner/workspace/shared/constants.ts` (utilizado)
- `/home/runner/workspace/client/src/pages/AutoScheduleGeneration.tsx` (usa o componente)
- `/home/runner/workspace/client/src/pages/Schedules.tsx` (usa o componente)

## Status
✅ **IMPLEMENTADO E TESTADO**
