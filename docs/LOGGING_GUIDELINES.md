# Guia de Boas Práticas de Logging - MESC

## 📋 Visão Geral

Este documento define as práticas recomendadas para logging no projeto MESC após a limpeza de logs realizada.

## 🎯 Objetivos

1. **Performance**: Reduzir overhead de logs em produção
2. **Clareza**: Logs úteis e relevantes para debugging
3. **Segurança**: Nunca logar dados sensíveis
4. **Manutenibilidade**: Código limpo e profissional

---

## ✅ O QUE FAZER

### 1. Use o Logger Estruturado

```typescript
import { logger } from './utils/logger';

// ✅ BOM: Usar logger estruturado
logger.error('Failed to fetch user', { userId, error });
logger.warn('Rate limit exceeded', { ip: req.ip });
logger.info('User logged in', { userId });
logger.debug('Processing data', { count: items.length });
```

### 2. Logs Condicionais para Desenvolvimento

```typescript
// ✅ BOM: Log apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

### 3. Logs de Erro Sempre Visíveis

```typescript
// ✅ BOM: Errors sempre devem ser logados
try {
  await riskyOperation();
} catch (error) {
  console.error('❌ Operation failed:', error);
  // ou logger.error('Operation failed', { error });
}
```

### 4. Use Emojis para Categorização Visual

```typescript
console.log('✅ Server started on port 5000');
console.error('❌ Database connection failed');
console.warn('⚠️ Deprecated API used');
console.log('🔌 WebSocket connected');
```

---

## ❌ O QUE NÃO FAZER

### 1. Console.log Excessivo

```typescript
// ❌ MAU: Logs desnecessários em produção
console.log('Entering function');
console.log('Processing item:', item);
console.log('Exiting function');
```

### 2. Logs de Dados Sensíveis

```typescript
// ❌ PÉSSIMO: NUNCA logar senhas ou tokens
console.log('Password:', password);
console.log('Token:', jwt);
console.log('User data:', { ...user, passwordHash });
```

### 3. Logs Sem Contexto

```typescript
// ❌ MAU: Sem contexto útil
console.log('Error');
console.log('Data:', data);

// ✅ BOM: Com contexto
console.error('Failed to save user:', { userId, error: error.message });
```

### 4. Logs em Loops

```typescript
// ❌ MAU: Inunda o console
users.forEach(user => {
  console.log('Processing user:', user.id);
});

// ✅ BOM: Log resumido
console.log(`Processing ${users.length} users`);
```

---

## 🔒 Segurança

### Dados que NUNCA devem ser logados:

- ❌ Senhas (plaintext ou hash)
- ❌ Tokens JWT
- ❌ Session IDs
- ❌ API Keys
- ❌ Dados pessoais sensíveis (CPF, RG, etc.)
- ❌ Dados religiosos completos

### Dados que podem ser logados:

- ✅ User IDs (UUIDs)
- ✅ Timestamps
- ✅ Error messages (sem stack traces em produção)
- ✅ Status codes HTTP
- ✅ Métricas agregadas

---

## 📊 Níveis de Log

### Produção (`NODE_ENV=production`)

```typescript
// Apenas erros e warnings críticos
logger.error('Critical error', { context });
logger.warn('Important warning', { context });
```

### Desenvolvimento (`NODE_ENV=development`)

```typescript
// Todos os níveis disponíveis
logger.error('Error', { context });
logger.warn('Warning', { context });
logger.info('Info', { context });
logger.debug('Debug', { context });
```

---

## 🛠️ Sistema de Logger

O projeto usa `server/utils/logger.ts` que:

- ✅ Sanitiza dados sensíveis automaticamente
- ✅ Adiciona timestamps
- ✅ Respeita NODE_ENV
- ✅ Formata JSON para contexto

```typescript
// Usar o logger em vez de console.log direto
import { logger } from '@/utils/logger';

logger.info('Operation completed', {
  userId,
  duration: Date.now() - start
});
```

---

## 🧹 Manutenção

### Limpeza Periódica

Execute periodicamente para encontrar logs desnecessários:

```bash
# Contar console.log no código
grep -r "console\.log" server/ --include="*.ts" | wc -l

# Revisar logs de debug
grep -r "console\.log.*DEBUG" server/ --include="*.ts"
```

### Script de Limpeza

Use o script fornecido:

```bash
npm run cleanup:logs
```

---

## 📝 Exemplos Práticos

### Autenticação

```typescript
// ❌ MAU
console.log('Login attempt:', { email, password });

// ✅ BOM
logger.info('Login attempt', { email });

// ✅ MELHOR
if (process.env.NODE_ENV === 'development') {
  logger.debug('Login attempt', { email });
}
```

### Erros de Banco de Dados

```typescript
// ❌ MAU
console.log('Database error:', error);

// ✅ BOM
console.error('❌ Database query failed:', error.message);

// ✅ MELHOR
logger.error('Database query failed', {
  query: 'getUserById',
  userId,
  error: error.message
});
```

### Requisições HTTP

```typescript
// ❌ MAU: Log de cada requisição
app.use((req, res, next) => {
  console.log('Request:', req.method, req.path);
  next();
});

// ✅ BOM: Log apenas em desenvolvimento
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Request', { method: req.method, path: req.path });
  }
  next();
});
```

---

## 🎯 Checklist de Code Review

Ao revisar código, verificar:

- [ ] Não há `console.log` sem `if (NODE_ENV === 'development')`
- [ ] Dados sensíveis não são logados
- [ ] Logs de erro têm contexto suficiente
- [ ] Não há logs excessivos em loops
- [ ] Logger estruturado é usado quando apropriado
- [ ] Emojis usados para categorização visual

---

## 🔄 Migração de Código Legado

Para código antigo com muitos logs:

1. **Identificar** logs de debug vs. produção
2. **Envolver** debug logs em `if (NODE_ENV === 'development')`
3. **Remover** logs completamente desnecessários
4. **Substituir** `console.log` por `logger.debug/info`
5. **Manter** `console.error` para erros críticos

---

## 📚 Recursos Adicionais

- **Logger Utils**: `server/utils/logger.ts`
- **Script de Limpeza**: `scripts/cleanup-logs.sh`
- **Testes**: Verificar logs não quebram testes

---

**Última Atualização**: 2025-01-XX
**Responsável**: Equipe MESC

---

## 💡 Dica Final

> **"Se você precisa de um console.log para entender o código,
> o código provavelmente precisa de um comentário, não de um log."**

Use logs para **monitoramento e debugging**, não para **documentação**.
