# Sistema de Gerenciamento de Cache e Atualizações - MESC

## Visão Geral

Sistema robusto implementado para resolver problemas de cache, telas em branco e layouts desatualizados após deploys.

## Componentes Principais

### 1. Sistema de Versionamento (`client/src/lib/version.ts`)

**Versão Atual:** 5.4.1

**Funcionalidades:**
- Detecta mudanças de versão automaticamente
- Limpa cache quando versão muda
- Verifica inatividade prolongada (>7 dias) e força atualização
- Preserva configurações importantes (tema, etc)

**Como usar:**
```typescript
import { APP_VERSION, clearCacheAndReload, hasVersionChanged } from '@/lib/version';

// Verificar se versão mudou
if (hasVersionChanged()) {
  clearCacheAndReload();
}
```

### 2. Service Worker Aprimorado (`client/public/sw.js`)

**Melhorias Implementadas:**

#### Cache Busting Agressivo
- Versão sincronizada: `5.4.1`
- Build number dinâmico baseado em timestamp
- Deleta TODOS os caches antigos na ativação
- Remove entradas de API automaticamente

#### Estratégias de Cache
- **API Críticas** (schedules, ministers): Network-only (sempre dados frescos)
- **Outras APIs**: Network-first com fallback
- **JS/CSS**: Network-first (sempre versão mais recente)
- **Imagens**: Cache-first

#### Logs Detalhados
```
[SW] Activating new service worker, version: 5.4.1
[SW] Deleting old cache: mesc-v5.4.0
[SW] All old caches cleared, claiming clients
[SW] Notifying 3 clients about update
```

### 3. Componente UpdateNotification

**Localização:** `client/src/components/update-notification.tsx`

**Funcionalidades:**
- Detecta nova versão automaticamente
- Mostra notificação visual ao usuário
- Permite atualização imediata ou postergar
- Verifica atualizações a cada 30 segundos
- Auto-recarrega quando nova versão assume controle

**Interface:**
```
┌─────────────────────────────────────────┐
│ 🔄 Nova versão disponível!          ✕  │
│                                         │
│ Uma nova versão do MESC (v5.4.1) está  │
│ disponível com melhorias e correções.  │
│                                         │
│ [🔄 Atualizar Agora] [Mais Tarde]     │
└─────────────────────────────────────────┘
```

### 4. HTML com Cache Busting

**Headers Anti-Cache:**
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

**Service Worker com Timestamp:**
```javascript
const swUrl = '/sw.js?v=' + Date.now();
```

**Verificações Automáticas:**
- Inicial: Imediatamente após carregar
- Periódica: A cada 60 segundos
- Listeners: updatefound, controllerchange

## Fluxo de Atualização

### Deploy de Nova Versão

1. **Desenvolvedor atualiza versão:**
   ```typescript
   // client/src/lib/version.ts
   export const APP_VERSION = '5.4.2'; // Incrementar aqui

   // client/public/sw.js
   const VERSION = '5.4.2'; // E aqui também
   ```

2. **Build e deploy:**
   ```bash
   npm run build
   # Deploy para produção
   ```

3. **Usuário abre o app:**
   - Script HTML registra novo SW com cache busting
   - SW detecta mudança de versão
   - Caches antigos são deletados
   - `hasVersionChanged()` retorna true

4. **Duas opções:**

   **Opção A - Atualização Automática:**
   ```typescript
   if (hasVersionChanged()) {
     clearCacheAndReload(); // Limpa tudo e recarrega
   }
   ```

   **Opção B - Notificação ao Usuário:**
   - Componente `UpdateNotification` detecta atualização
   - Mostra prompt amigável
   - Usuário clica "Atualizar Agora"
   - App recarrega com nova versão

### Inatividade Prolongada

```typescript
// A cada 1 hora, verifica inatividade
checkInactivityAndClear();

// Se > 7 dias sem uso:
if (hoursSinceUpdate > 168) {
  clearCacheAndReload(); // Força atualização
}
```

## Logs e Debugging

### Console Logs Úteis

```javascript
// Versão detectada
"🔄 Nova versão detectada, limpando cache..."

// Service Worker
"[SW] Activating new service worker, version: 5.4.1"
"[SW] Deleting old cache: mesc-v5.4.0"
"[SW] Notifying 3 clients about update"

// Atualizações
"🆕 Nova versão disponível!"
"📢 Service Worker atualizado: mesc-v5.4.1"
"🔄 Novo service worker ativo, recarregando..."
```

### Verificar Status no DevTools

```javascript
// Console
localStorage.getItem('mesc-app-version') // Versão armazenada
localStorage.getItem('mesc-last-update')  // Timestamp última atualização

// Application > Service Workers
// Deve mostrar: "mesc-v5.4.1"

// Application > Cache Storage
// Deve ter apenas: "mesc-v5.4.1"
```

## Troubleshooting

### Problema: Tela em Branco

**Causa:** Cache antigo com código incompatível

**Solução:**
```javascript
// DevTools Console
await caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
location.reload();
```

### Problema: Layout Não Atualiza

**Causa:** Service Worker antigo ainda ativo

**Solução:**
```javascript
// DevTools > Application > Service Workers
// Click "Unregister" em todos
// Recarregar página
```

### Problema: Usuário não vê notificação de atualização

**Verificar:**
1. `UpdateNotification` está no `App.tsx`?
2. Console mostra "[SW] Update found"?
3. Component `showUpdate` está true?

**Forçar atualização:**
```typescript
import { clearCacheAndReload } from '@/lib/version';
clearCacheAndReload();
```

## Manutenção

### Antes de Cada Deploy

1. **Incrementar versões:**
   ```bash
   # Editar client/src/lib/version.ts
   export const APP_VERSION = '5.4.X';

   # Editar client/public/sw.js
   const VERSION = '5.4.X';
   ```

2. **Testar localmente:**
   ```bash
   npm run build
   npm start
   # Abrir DevTools > Application > Clear storage
   # Recarregar e verificar logs
   ```

3. **Deploy:**
   - Fazer deploy normal
   - Monitorar logs de usuários
   - Verificar se notificações aparecem

### Monitoramento Pós-Deploy

- Verificar console logs nos primeiros acessos
- Confirmar que caches antigos foram deletados
- Validar que nova versão está ativa
- Acompanhar reports de tela em branco (devem diminuir drasticamente)

## Configurações Importantes

### Intervalos de Verificação

```typescript
// Update notification
const CHECK_INTERVAL = 30000; // 30 segundos

// HTML Service Worker registration
setInterval(() => registration.update(), 60000); // 60 segundos

// Inatividade
const INACTIVITY_LIMIT = 168; // 7 dias em horas
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hora
```

### Dados Preservados na Limpeza

```typescript
const keysToKeep = [
  'mesc-ui-theme'  // Tema escuro/claro
];
```

## Benefícios Esperados

✅ **Elimina telas em branco** após deploy
✅ **Atualização automática** de layout e funcionalidades  
✅ **Notificação amigável** para usuários
✅ **Limpeza automática** após inatividade
✅ **Cache busting robusto** em todos os níveis
✅ **Logs detalhados** para debugging
✅ **Recuperação automática** de erros de cache

## Suporte

Para problemas relacionados a cache:
1. Verificar logs do console
2. Limpar Application > Storage
3. Desregistrar Service Workers
4. Forçar reload com Ctrl+Shift+R
5. Se persistir: `clearCacheAndReload()`

---

**Última atualização:** 2025-10-08  
**Versão do Sistema:** 5.4.1
