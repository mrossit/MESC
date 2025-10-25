# Fix: Substituição - Botão "Aceitar Substituição" Ausente

## 📋 Problema Identificado

### Descrição
Algumas solicitações de substituição antigas não exibiam o botão "Aceitar Substituição" para os ministros, impossibilitando que eles aceitassem as solicitações.

### Exemplo
- ✓ **Funcionando**: "Daniele Pedroso da Silva" com status "Aguardando voluntário" → Botão visível
- ✗ **Quebrado**: "Adrielle Toledo Anhaia" com status "Pendente" → Botão ausente

### Causa Raiz

O sistema usa dois status para solicitações de substituição:

1. **"available"** (Aguardando voluntário): Solicitação aberta para qualquer ministro
2. **"pending"** (Pendente): Solicitação direcionada a um ministro específico

**O bug ocorreu porque:**
- Solicitações antigas foram criadas com status `"pending"`
- MAS não têm `substituteId` (não estão direcionadas a ninguém)
- **Estado inconsistente**: Status diz "pendente" mas não há destinatário

**Na interface:**
- Botão "Aceitar Substituição" só aparecia para status `"available"`
- Status `"pending"` exigia que a solicitação fosse direcionada ao usuário atual (`isForMe`)
- Como `substituteId` era `null`, `isForMe` sempre era `false`
- Resultado: **Nenhum botão aparecia**

---

## 🔧 Solução Implementada

### 1. Correção na Interface (UI)

**Arquivo**: `client/src/pages/Substitutions.tsx`

Atualizado a lógica do botão para aceitar ambos os casos:
- Status `"available"` (como antes)
- Status `"pending"` SEM `substituteId` (novo - trata edge case)

```typescript
// ANTES: Só mostrava para "available"
{item.request.status === "available" && !isMyRequest && (
  <Button>Aceitar Substituição</Button>
)}

// DEPOIS: Mostra para "available" OU "pending sem substituteId"
{(item.request.status === "available" ||
  (item.request.status === "pending" && !isDirected)) && !isMyRequest && (
  <Button>Aceitar Substituição</Button>
)}
```

### 2. Correção no Backend (API)

**Arquivo**: `server/routes/substitutions.ts`

Atualizado o endpoint `/api/substitutions/:id/claim` para aceitar solicitações "pending" sem substituteId:

```typescript
// ANTES: Só aceitava "available"
if (request.status !== 'available') {
  return res.status(400).json({ message: "Solicitação não disponível" });
}

// DEPOIS: Aceita "available" OU "pending sem substituteId"
const isAvailable = request.status === 'available' ||
                    (request.status === 'pending' && !request.substituteId);

if (!isAvailable) {
  return res.status(400).json({ message: "Solicitação não disponível" });
}
```

### 3. Migração de Dados

Criado **3 métodos** para corrigir os dados antigos:

#### Método 1: API Endpoint (Recomendado)
**Mais Fácil - Via Interface Web**

1. Faça login como **Gestor** ou **Coordenador**
2. Abra o console do navegador (F12)
3. Execute:

```javascript
fetch('/api/admin/migrate-substitution-status', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }
})
.then(r => r.json())
.then(data => console.log('✅ Migração concluída:', data))
.catch(err => console.error('❌ Erro:', err));
```

4. Você verá uma mensagem como:
```json
{
  "success": true,
  "message": "Migração concluída com sucesso! 1 registro(s) atualizado(s).",
  "affectedCount": 1,
  "affectedRequests": [
    { "id": "...", "createdAt": "..." }
  ]
}
```

#### Método 2: Script TypeScript
**Arquivo**: `scripts/fix-substitution-status.ts`

```bash
# Se você tiver tsx instalado localmente
npx tsx scripts/fix-substitution-status.ts
```

#### Método 3: SQL Direto
**Arquivo**: `scripts/fix-substitution-status.sql`

```bash
# PostgreSQL (Produção)
psql $DATABASE_URL -f scripts/fix-substitution-status.sql

# SQLite (Desenvolvimento)
sqlite3 local.db < scripts/fix-substitution-status.sql
```

---

## ✅ Checklist de Aplicação

- [x] **Código Atualizado**
  - [x] UI: Button logic in Substitutions.tsx
  - [x] API: Claim endpoint in substitutions.ts
  - [x] Migration endpoint created

- [ ] **Migração de Dados** (Escolha 1 método)
  - [ ] Método 1: API endpoint via console
  - [ ] Método 2: TypeScript script
  - [ ] Método 3: SQL script

- [ ] **Teste**
  - [ ] Login como ministro
  - [ ] Verificar solicitação "Adrielle Toledo"
  - [ ] Confirmar botão "Aceitar Substituição" aparece
  - [ ] Testar aceitar a solicitação

- [ ] **Limpeza** (Após confirmação)
  - [ ] Remover endpoint `/api/admin/migrate-substitution-status` do código
  - [ ] Ou manter como utilitário administrativo

---

## 📊 Impacto

### Antes da Correção
```
Status: "Pendente" + substituteId: null
→ Nenhum botão aparece
→ Ministros não conseguem aceitar
→ Solicitação fica presa
```

### Depois da Correção
```
Status: "Pendente" + substituteId: null
→ Tratado como "available"
→ Botão "Aceitar Substituição" aparece
→ Qualquer ministro pode aceitar
```

### Migração de Dados
```
UPDATE substitution_requests
SET status = 'available'
WHERE status = 'pending'
  AND substitute_id IS NULL;
```

Isso normaliza os dados antigos para o estado correto.

---

## 🔍 Prevenção Futura

### Validação no Servidor
O servidor já garante a consistência em novas solicitações:

```typescript
// server/routes/substitutions.ts:269
const status = finalSubstituteId ? "pending" : "available";
```

**Regra:**
- **TEM** `substituteId` → Status `"pending"` (direcionada)
- **NÃO TEM** `substituteId` → Status `"available"` (aberta)

### Validação Robusta na UI
A UI agora aceita ambos os casos para evitar problemas futuros:
- Status correto: `"available"`
- Edge case: `"pending"` sem `substituteId`

---

## 📝 Arquivos Modificados

```
client/src/pages/Substitutions.tsx
server/routes/substitutions.ts
scripts/fix-substitution-status.ts      (novo)
scripts/fix-substitution-status.sql     (novo)
server/routes.ts                        (migration endpoint)
docs/SUBSTITUTION_STATUS_FIX.md         (este arquivo)
```

---

## 🎯 Resumo

**Problema**: Solicitações com status "pending" mas sem destinatário não mostravam botão.

**Causa**: Estado inconsistente nos dados antigos.

**Solução**:
1. ✅ UI atualizada para tratar edge case
2. ✅ API atualizada para aceitar edge case
3. ✅ Migração criada para normalizar dados

**Ação Necessária**: Executar a migração de dados (escolher 1 dos 3 métodos acima).

---

**Data da Correção**: 2025-10-25
**Autor**: Claude Code
**Status**: ✅ Implementado - Aguardando Migração de Dados
