# Sistema de Versionamento e Atualização Automática

## 📋 Visão Geral

O sistema detecta automaticamente quando há um novo deploy e notifica os usuários para atualizar, **garantindo limpeza completa de cache** para evitar problemas com versões antigas.

## 🔄 Como Funciona

### 1. Detecção de Nova Versão
- `useVersionCheck` verifica a versão do servidor via `/api/version` a cada **2 minutos**
- Quando detecta mudança, dispara evento `app-update-available`
- `UpdateNotification` escuta o evento e **mostra alerta** ao usuário

### 2. Notificação ao Usuário
- Aparece notificação com fundo blur no canto da tela
- Usuário pode:
  - **Atualizar Agora**: Limpa cache e recarrega imediatamente
  - **Mais Tarde**: Adiar por 5 minutos

### 3. Limpeza de Cache ao Atualizar
Quando usuário clica em "Atualizar Agora":
1. ✅ Desregistra todos os service workers
2. ✅ Deleta todos os caches do browser
3. ✅ Atualiza versão no localStorage
4. ✅ Força reload com cache bust (`?v=timestamp`)

### 4. Prevenção de Re-exibição
- Usa `sessionStorage` para marcar que usuário aceitou atualização
- Não mostra notificação novamente após reload
- Limpa automaticamente ao fechar navegador

## 🚀 Como Fazer um Deploy

### Passo 1: Incrementar Versão

**Arquivo: `client/src/lib/version.ts`**
```typescript
export const APP_VERSION = '5.4.2'; // ← INCREMENTAR AQUI
```

**Arquivo: `server/routes/version.ts`**
```typescript
const SYSTEM_VERSION = '5.4.2'; // ← SINCRONIZAR COM CLIENTE
```

### Passo 2: Build e Deploy
```bash
npm run build
# Deploy para produção
```

### Passo 3: Automático 🎉
- Usuários conectados receberão notificação **em até 2 minutos**
- Ao clicar em "Atualizar", cache será **totalmente limpo**
- Nova versão carrega sem problemas

## 📁 Arquivos Envolvidos

### Frontend
- `client/src/lib/version.ts` - Versão e funções de cache
- `client/src/hooks/useVersionCheck.tsx` - Detecção de versão
- `client/src/components/update-notification.tsx` - UI de notificação
- `client/src/App.tsx` - Integração do sistema

### Backend
- `server/routes/version.ts` - Endpoint `/api/version`

## 🔧 Configurações

### Intervalo de Verificação
```typescript
// client/src/hooks/useVersionCheck.tsx
const interval = setInterval(checkVersion, 2 * 60 * 1000); // 2 minutos
```

### Tempo de Re-exibição (se dispensar)
```typescript
// client/src/components/update-notification.tsx
setTimeout(() => {
  setShowUpdate(true);
}, 5 * 60 * 1000); // 5 minutos
```

### Itens Preservados no Cache
```typescript
// client/src/lib/version.ts
const keysToKeep = ['mesc-ui-theme']; // Tema não é removido
```

## 🎯 Vantagens

✅ **Detecção Automática** - Não precisa fazer nada manualmente
✅ **Cache Sempre Limpo** - Garante que nova versão funcione
✅ **UX Amigável** - Usuário escolhe quando atualizar
✅ **Sem Loops** - Sistema robusto que não trava
✅ **Backdrop Blur** - Visual profissional na notificação
✅ **Sincronização** - Cliente e servidor sempre alinhados

## 🐛 Troubleshooting

### Notificação não aparece
- Verificar se versões estão sincronizadas
- Checar console do navegador para logs `[VersionCheck]`
- Confirmar que `/api/version` está respondendo

### Cache não limpa
- Verificar função `clearCacheAndReload()` nos logs
- Checar se navegador permite limpeza de cache
- Testar em modo anônimo

### Loop infinito
- Verificar se `sessionStorage.setItem('update-accepted')` está sendo chamado
- Confirmar que não há múltiplos listeners de `controllerchange`

## 📊 Logs para Debug

No console do navegador:
```
[VersionCheck] Current version: 5.4.1
[VersionCheck] New version detected: 5.4.2
🆕 Nova versão disponível: {newVersion: "5.4.2", currentVersion: "5.4.1"}
🔄 Iniciando atualização e limpeza de cache...
[Update] Unregistering service worker
[Update] Deleting cache: mesc-app-cache-v5.4.1
[Update] Reloading application...
```

## ⚠️ IMPORTANTE

**SEMPRE** sincronizar as versões nos dois arquivos:
- `client/src/lib/version.ts` → `APP_VERSION`
- `server/routes/version.ts` → `SYSTEM_VERSION`

Se as versões não estiverem sincronizadas, o sistema pode detectar update em todo reload!
