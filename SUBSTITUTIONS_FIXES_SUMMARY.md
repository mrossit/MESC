# Resumo das Correções Aplicadas - Sistema de Substituições

Data: 2025-10-09

## ✅ Correções Implementadas

### 1. ✅ Legendas do calendário agora atualizam após solicitar substituição

**Problema**: Legendas não mudavam de cor após criar solicitação de substituição.

**Causa**: `fetchSchedules()` era chamado sem `await`, então o estado não era atualizado antes do componente re-renderizar.

**Solução aplicada**:
```typescript
// client/src/pages/Schedules.tsx:1135
// ANTES:
fetchSchedules();

// DEPOIS:
await fetchSchedules();
```

**Resultado**: Agora quando o usuário cria uma solicitação, o calendário recarrega e as legendas atualizam imediatamente:
- 🟢 Verde (#959D90) = Escalado sem substituição
- 🔴 Vinho (#610C27) = Substituição pendente
- 🟡 Amarelo (#FDCF76) = Substituição aprovada

---

### 2. ✅ Datas não retroagem mais um dia

**Problema**: Ao solicitar substituição, a data exibida retroagia um dia.

**Causa**: Função `parseScheduleDate()` criava data local às 00:00:00, que ao ser convertida para UTC causava shift de timezone, fazendo a data parecer um dia anterior.

**Solução aplicada**:
```typescript
// client/src/lib/utils.ts:15-18
// ANTES:
export function parseScheduleDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // ❌ 00:00:00 local
}

// DEPOIS:
export function parseScheduleDate(dateStr: string): Date {
  // Add time component (12:00) to prevent timezone-related date shifting
  return parseISO(dateStr + 'T12:00:00'); // ✅ 12:00:00 (meio-dia)
}
```

**Resultado**: Datas agora são criadas ao meio-dia, evitando problemas de timezone. A data `2025-10-15` permanece como 15, não 14.

---

### 3. ✅ Fluxo correto: substituições vão para quadro público

**Problema**: Todas as substituições iam para aprovação do coordenador, ao invés de ir para o quadro onde outros ministros podem se prontificar.

**Causa**: Backend forçava `status: "pending"` sempre, ignorando se havia substituteId ou não.

**Solução aplicada**:

#### 3.1 Adicionado novo status 'available' no schema
```typescript
// shared/schema.ts:35
// ANTES:
export const substitutionStatusEnum = pgEnum('substitution_status',
  ['pending', 'approved', 'rejected', 'cancelled', 'auto_approved']);

// DEPOIS:
export const substitutionStatusEnum = pgEnum('substitution_status',
  ['available', 'pending', 'approved', 'rejected', 'cancelled', 'auto_approved']);
```

#### 3.2 Alterada lógica do backend
```typescript
// server/routes/substitutions.ts:260-263
// ANTES:
const status: "pending" = "pending";

// DEPOIS:
// Status:
// - Se tem substituteId (indicação direta) → 'pending' (aguarda aceitação do indicado)
// - Se NÃO tem substituteId (aberto) → 'available' (vai para quadro público)
const status = finalSubstituteId ? "pending" : "available";
```

#### 3.3 Mensagens atualizadas
```typescript
// server/routes/substitutions.ts:329-331
const message = finalSubstituteId
  ? "Solicitação criada. Aguardando resposta do ministro indicado."
  : "Solicitação publicada no quadro de substituições. Outros ministros poderão se prontificar.";
```

**Resultado**:
- Sem indicar substituto → status `available` → vai para quadro público
- Com substituto indicado → status `pending` → vai direto para o ministro indicado

---

## 🗄️ Migração Necessária

Foi criado um script de migração SQL que deve ser executado:

```bash
psql -U postgres -d mesc_db -f migrations/add_available_status.sql
```

Ou via Drizzle:
```bash
npm run db:push
```

**Arquivo**: `migrations/add_available_status.sql`

O script adiciona o valor `'available'` ao enum `substitution_status` no PostgreSQL.

---

## 📝 Próximos Passos (Recomendados)

### 1. Atualizar UI da página de Substituições

O arquivo `client/src/pages/Substitutions.tsx` precisa ser atualizado para mostrar duas abas:

- **Aba "Minhas Solicitações"**: Mostra solicitações do usuário (como hoje)
- **Aba "Substituições Disponíveis"** ⭐ NOVA: Mostra todas as solicitações com status `'available'` para que qualquer ministro possa aceitar

Exemplo de estrutura:
```tsx
<Tabs defaultValue="minhas">
  <TabsList>
    <TabsTrigger value="minhas">Minhas Solicitações</TabsTrigger>
    <TabsTrigger value="disponiveis">
      Disponíveis
      {availableCount > 0 && <Badge>{availableCount}</Badge>}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="minhas">
    {/* Lista atual */}
  </TabsContent>

  <TabsContent value="disponiveis">
    {/* Nova lista de substituições com status 'available' */}
    {/* Botão "Me prontificar" para cada uma */}
  </TabsContent>
</Tabs>
```

### 2. Adicionar endpoint para aceitar substituição disponível

```typescript
// POST /api/substitutions/:id/volunteer
// Ministro se prontifica para substituição disponível
router.post("/:id/volunteer", requireAuth, async (req, res) => {
  // 1. Verificar se status é 'available'
  // 2. Atualizar substituteId com o ID do ministro que se prontificou
  // 3. Mudar status para 'approved'
  // 4. Atualizar a escala com o novo ministro
});
```

### 3. Adicionar notificações

- Notificar ministros quando uma nova substituição fica disponível
- Notificar solicitante quando alguém se prontifica

---

## 🧪 Como Testar

### Teste 1: Legendas atualizam imediatamente
1. Faça login como ministro escalado
2. Abra o calendário e veja sua escala (estrela verde)
3. Clique no dia e solicite substituição
4. ✅ Verifique que a legenda muda imediatamente para vinho (pendente) SEM precisar recarregar a página

### Teste 2: Data não retroage
1. Solicite substituição para dia 15
2. ✅ Verifique que a data mostrada é dia 15, não dia 14
3. Verifique no backend/logs que a data correta foi salva

### Teste 3: Fluxo do quadro de substituições
1. Solicite substituição SEM indicar ministro substituto
2. ✅ Verifique que a mensagem diz "publicada no quadro de substituições"
3. Consulte a API: `GET /api/substitutions`
4. ✅ Verifique que o status é `'available'` (não `'pending'`)

### Teste 4: Fluxo de indicação direta
1. Solicite substituição INDICANDO um ministro específico
2. ✅ Verifique que a mensagem diz "Aguardando resposta do ministro indicado"
3. Consulte a API: `GET /api/substitutions`
4. ✅ Verifique que o status é `'pending'` e `substituteId` está preenchido

---

## 📂 Arquivos Modificados

### Frontend
- ✅ `client/src/pages/Schedules.tsx` (linha 1135)
- ✅ `client/src/lib/utils.ts` (linhas 3, 15-18)

### Backend
- ✅ `server/routes/substitutions.ts` (linhas 260-263, 329-331)

### Schema
- ✅ `shared/schema.ts` (linhas 35, 207)

### Migrations
- ✅ `migrations/add_available_status.sql` (novo arquivo)

### Documentação
- ✅ `SUBSTITUTION_BUGS_ANALYSIS.md` (análise detalhada)
- ✅ `SUBSTITUTIONS_FIXES_SUMMARY.md` (este arquivo)

---

## ⚠️ Atenção

Antes de fazer deploy em produção:

1. ✅ Execute a migração do banco de dados
2. ✅ Teste todos os cenários acima
3. ⚠️ Implemente a aba "Substituições Disponíveis" no frontend
4. ⚠️ Adicione endpoint para ministros aceitarem substituições
5. ⚠️ Configure notificações para novo fluxo

---

## 🎯 Status das Correções

| Problema | Status | Prioridade | Testado |
|----------|--------|------------|---------|
| Legendas não atualizam | ✅ Corrigido | CRÍTICO | ⏳ Pendente |
| Data retroage um dia | ✅ Corrigido | ALTO | ⏳ Pendente |
| Fluxo incorreto (backend) | ✅ Corrigido | MÉDIO | ⏳ Pendente |
| UI do quadro (frontend) | ⚠️ Pendente | MÉDIO | - |
| Endpoint aceitar substituição | ⚠️ Pendente | MÉDIO | - |
| Notificações | ⚠️ Pendente | BAIXO | - |

---

**Desenvolvido por**: Claude Code
**Data**: 09/10/2025
