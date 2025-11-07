# Análise de Bugs no Sistema de Substituições

## Problemas Identificados

### 1. ⚠️ Legendas não atualizam no calendário após pedido de substituição

**Causa raiz**: A função `getUserSubstitutionStatus()` busca corretamente as substituições no estado `substitutions`, mas esse estado **NÃO é atualizado** após criar uma nova solicitação.

**Localização**: `client/src/pages/Schedules.tsx:1085-1145`

**Problema**:
```typescript
const handleRequestSubstitution = async () => {
  // ... código de validação ...

  const response = await fetch("/api/substitutions", {
    method: "POST",
    // ...
  });

  // ❌ PROBLEMA: Chama fetchSchedules() mas NÃO recarrega as substituições!
  fetchSchedules(); // linha 1135
}
```

**Impacto**:
- Usuário cria solicitação de substituição
- Estado `substitutions` não é atualizado
- `getUserSubstitutionStatus()` não encontra a nova substituição
- Legendas do calendário não mudam para vinho (pending)

---

### 2. ⚠️ Datas retroagem um dia ao solicitar substituição

**Causa raiz**: Problema de timezone ao manipular datas. A função `parseScheduleDate()` cria uma data **local**, mas ao enviar ao backend, pode haver conversão para UTC que subtrai horas.

**Localização**: `client/src/lib/utils.ts:13-16`

**Código atual**:
```typescript
export function parseScheduleDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // ❌ Cria data LOCAL às 00:00:00
}
```

**O que acontece**:
1. Data armazenada no DB: `"2025-10-15"`
2. `parseScheduleDate("2025-10-15")` → `Date(2025, 9, 15)` às 00:00:00 **hora local**
3. Se hora local é GMT-3, isso equivale a `2025-10-15T03:00:00Z` em UTC
4. Mas ao enviar dados ou comparar, pode ser interpretado como dia anterior

**Exemplo concreto**:
```
Escala: 2025-10-15
parseScheduleDate("2025-10-15") → new Date(2025, 9, 15) → 2025-10-15T00:00:00-03:00
.toISOString() → 2025-10-15T03:00:00.000Z
Backend interpreta como dia 15, mas visualização pode mostrar dia 14
```

---

### 3. ⚠️ Fluxo incorreto: substituições vão para aprovação do coordenador

**Causa raiz**: Backend está FORÇANDO status `pending` ao invés de permitir auto-aprovação ou publicação direta no quadro.

**Localização**: `server/routes/substitutions.ts:260-261`

**Código atual**:
```typescript
// ❌ Status sempre começa como pending - coordenador aprova manualmente
const status: "pending" = "pending";
```

**O que deveria acontecer**:
1. Ministro solicita substituição
2. Solicitação vai para **Quadro de Substituições** (status: `open` ou `available`)
3. Outros ministros veem e podem se prontificar
4. Quando alguém aceita, status muda para `assigned` ou `approved`
5. **NÃO** deve ir para aprovação do coordenador

**Código comentado no backend** (linhas 24-34):
```typescript
// Verificar se solicitação deve ser auto-aprovada (> 12h antes)
function shouldAutoApprove(massDateStr: string, massTime: string): boolean {
  const now = new Date();
  const [year, month, day] = massDateStr.split('-').map(Number);
  const [hours, minutes] = massTime.split(':').map(Number);
  const massDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilMass >= 12;
}
```

Esta função existe mas **NÃO está sendo usada**!

---

## Soluções Propostas

### Solução 1: Recarregar substituições após criar solicitação

**Arquivo**: `client/src/pages/Schedules.tsx:1135`

**Mudança**:
```typescript
// Recarregar escalas E substituições
await fetchSchedules(); // Isso já recarrega as substituições! Verificar linha 214
```

**Verificação**: A função `fetchSchedules()` já recarrega `substitutions` na linha 214:
```typescript
setSubstitutions(data.substitutions || []);
```

**Problema real**: A chamada não está sendo `await`ed, então o estado não atualiza antes do componente re-renderizar!

**Correção**:
```typescript
// ANTES (linha 1135):
fetchSchedules();

// DEPOIS:
await fetchSchedules();
```

---

### Solução 2: Corrigir bug de data retroativa

**Opção A**: Usar UTC ao criar datas
```typescript
export function parseScheduleDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Criar data em UTC para evitar problemas de timezone
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}
```

**Opção B**: Garantir que datas sempre usem formato ISO sem conversão
```typescript
export function parseScheduleDate(dateStr: string): Date {
  // parseISO da date-fns lida melhor com timezones
  return parseISO(dateStr + 'T12:00:00');
}
```

**Recomendação**: Opção B é mais segura e usa biblioteca já importada.

---

### Solução 3: Mudar fluxo para quadro de substituições

**Arquivo**: `server/routes/substitutions.ts:260-276`

**Mudança 1**: Remover hardcode de `status: "pending"`
```typescript
// ANTES:
const status: "pending" = "pending";

// DEPOIS:
// Se tem substituteId, vai direto para pending (indicação direta)
// Se NÃO tem substituteId, vai para "available" (quadro aberto)
const status = substituteId ? "pending" : "available";
```

**Mudança 2**: Adicionar novo status no schema
```typescript
// shared/schema.ts - adicionar "available" aos status possíveis
status: text("status").notNull().default("available"),
// valores: "available" | "pending" | "approved" | "rejected" | "cancelled"
```

**Mudança 3**: Frontend deve mostrar solicitações `available` no quadro
```typescript
// Novo componente ou aba: "Substituições Disponíveis"
// Listar todas as substituições com status "available"
// Qualquer ministro pode clicar e aceitar
```

---

## Checklist de Implementação

- [ ] Corrigir await em `fetchSchedules()` após criar substituição
- [ ] Mudar `parseScheduleDate()` para usar `parseISO` com timezone fixo
- [ ] Adicionar status "available" no schema de substitutions
- [ ] Alterar lógica do backend para usar status "available" quando sem substituteId
- [ ] Criar interface no frontend para mostrar substituições disponíveis
- [ ] Testar fluxo completo:
  - [ ] Criar solicitação sem indicar substituto → deve ir para quadro
  - [ ] Verificar que legendas atualizam imediatamente
  - [ ] Verificar que data permanece correta
  - [ ] Outro ministro aceita → status muda para approved
  - [ ] Escala é atualizada com novo ministro

---

## Arquivos Afetados

### Frontend
- `client/src/pages/Schedules.tsx` (linha 1135 - adicionar await)
- `client/src/lib/utils.ts` (linha 13-16 - corrigir parseScheduleDate)
- `client/src/pages/Substitutions.tsx` (adicionar aba "Disponíveis")

### Backend
- `server/routes/substitutions.ts` (linha 260 - mudar lógica de status)
- `shared/schema.ts` (adicionar status "available" se não existir)

### Database
- Pode precisar de migração para atualizar enum de status

---

## Prioridade de Correção

1. **CRÍTICO**: Await em fetchSchedules() - impacta UX imediatamente
2. **ALTO**: Bug de data retroativa - dados incorretos
3. **MÉDIO**: Fluxo do quadro de substituições - feature incorreta mas não quebra
