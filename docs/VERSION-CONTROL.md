# Sistema de Controle de Versão e Cache

Sistema automático de versionamento e gerenciamento de cache para o MESC.

## 📋 Funcionalidades

### 1. **Versionamento Automático**
- Detecção automática de novas versões
- Comparação entre versão local e do servidor
- Notificação visual para o usuário

### 2. **Limpeza Automática de Cache**
- Cache limpo automaticamente ao detectar nova versão
- Limpeza por inatividade (após 10 minutos)
- Preserva dados críticos (auth_token, user_preferences)

### 3. **Monitoramento de Atividade**
- Registra atividade do usuário (mouse, teclado, scroll, touch)
- Verifica inatividade a cada 5 minutos
- Limpa cache após 10 minutos de inatividade

### 4. **Polling de Versão**
- Verifica nova versão no servidor a cada 15 minutos
- Exibe banner de atualização quando nova versão disponível
- Usuário pode escolher atualizar ou adiar

---

## 🚀 Como Usar

### Para Desenvolvedores

#### 1. Atualizar Versão ao Fazer Deploy

Edite **2 arquivos** antes de fazer deploy:

**`/client/src/lib/version.ts`:**
```typescript
export const APP_VERSION = '1.0.1'; // ← Atualizar aqui
```

**`/server/routes.ts`:**
```typescript
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.1', // ← Atualizar aqui
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
```

**Importante:** As duas versões DEVEM ser iguais!

#### 2. Versionamento Semântico

Use versionamento semântico (SemVer):

- **Major (1.0.0 → 2.0.0)**: Mudanças incompatíveis, breaking changes
- **Minor (1.0.0 → 1.1.0)**: Novas funcionalidades, retrocompatível
- **Patch (1.0.0 → 1.0.1)**: Correções de bugs, retrocompatível

Exemplos:
```
1.0.0 → 1.0.1  (bug fix)
1.0.1 → 1.1.0  (nova feature)
1.1.0 → 2.0.0  (breaking change)
```

---

## 🔄 Fluxo de Atualização

### Cenário 1: Deploy de Nova Versão

1. Desenvolvedor atualiza versão de `1.0.0` para `1.0.1`
2. Deploy para produção
3. Usuário acessa aplicação
4. Sistema detecta `localStorage.app_version = 1.0.0` ≠ `1.0.1`
5. **Cache é limpo automaticamente**
6. Versão atualizada para `1.0.1` no localStorage
7. Banner aparece: "Nova versão disponível!"
8. Usuário clica em "Atualizar Agora"
9. Página recarrega com nova versão

### Cenário 2: Usuário Inativo

1. Usuário deixa aplicação aberta
2. Após 10 minutos sem atividade:
   - Sistema verifica inatividade
   - Limpa cache automaticamente
   - Registra atividade novamente (reset)
3. Usuário volta a usar aplicação
4. Cache foi limpo, aplicação está atualizada

### Cenário 3: Polling de Versão

1. Aplicação verifica versão do servidor a cada 15 minutos
2. Servidor retorna versão `1.0.1`
3. Versão local é `1.0.0`
4. Dispara evento `new-version-available`
5. Banner de atualização aparece
6. Usuário pode atualizar ou adiar

---

## 🎨 Componentes

### `VersionChecker`
Componente React que:
- Monitora versão da aplicação
- Exibe banner de atualização
- Gerencia processo de atualização

**Localização:** `/client/src/components/VersionChecker.tsx`

**Uso:**
```tsx
import { VersionChecker } from '@/components/VersionChecker';

function App() {
  return (
    <>
      <VersionChecker />
      {/* Resto da aplicação */}
    </>
  );
}
```

### `VersionBadge`
Badge opcional para exibir versão (footer, settings, etc):

```tsx
import { VersionBadge } from '@/components/VersionChecker';

function Footer() {
  return (
    <footer>
      <VersionBadge /> {/* Exibe: "Versão 1.0.0" */}
    </footer>
  );
}
```

---

## 🛠️ API

### Funções Disponíveis

**`/client/src/lib/version.ts`:**

```typescript
// Verificar se há nova versão
checkVersion(): boolean

// Atualizar versão armazenada
updateVersion(): void

// Limpar todo o cache
clearAppCache(): Promise<void>

// Forçar reload
forceReload(): void

// Registrar atividade do usuário
recordActivity(): void

// Verificar inatividade (padrão: 10 min)
checkInactivity(minutesThreshold?: number): boolean

// Inicializar sistema de versão
initVersionControl(): Promise<void>

// Buscar versão do servidor
fetchServerVersion(): Promise<string | null>

// Iniciar polling de versão (padrão: 15 min)
startVersionPolling(intervalMinutes?: number): void
```

### Endpoint da API

**GET /api/version**

Retorna:
```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-06T00:30:00.000Z",
  "environment": "production"
}
```

---

## ⚙️ Configuração

### Intervalos de Tempo

Edite em `/client/src/components/VersionChecker.tsx`:

```typescript
// Verificar inatividade a cada X minutos
const inactivityInterval = setInterval(async () => {
  if (checkInactivity(10)) { // ← 10 minutos de inatividade
    await clearAppCache();
  }
}, 5 * 60 * 1000); // ← Verifica a cada 5 minutos

// Polling de versão do servidor
startVersionPolling(15); // ← Verifica a cada 15 minutos
```

### Dados Preservados

Edite em `/client/src/lib/version.ts`:

```typescript
// Dados que NÃO serão removidos ao limpar cache
const criticalKeys = [
  'auth_token',      // Token de autenticação
  'user_preferences' // Preferências do usuário
];
```

---

## 📱 Comportamento do Banner

### Aparência
- Posição: Canto inferior direito
- Cor: Primária com fundo transparente
- Ícone: Ícone de refresh
- Botões: "Atualizar Agora" e "Mais Tarde"

### Interações
1. **Atualizar Agora:**
   - Limpa cache
   - Aguarda 1 segundo
   - Recarrega página automaticamente

2. **Mais Tarde:**
   - Fecha banner
   - Banner reaparece no próximo polling (15 min)

3. **Fechar (X):**
   - Fecha banner
   - Mesmo comportamento de "Mais Tarde"

---

## 🧹 O Que é Limpo?

### Cache do Navegador
- Service Worker caches
- Cache API (todas as chaves)

### localStorage
- **Removido:** Tudo exceto `auth_token` e `user_preferences`
- **Preservado:** Dados críticos de autenticação

### sessionStorage
- **Removido:** Todo o conteúdo

### NÃO é limpo
- Cookies
- IndexedDB
- Auth token
- Preferências do usuário

---

## 🐛 Debugging

### Console Logs

O sistema exibe logs detalhados:

```
🚀 Inicializando controle de versão...
📦 Versão atual: 1.0.0
🕐 Build: 2025-10-06T00:30:00.000Z
⚠️ Nova versão detectada! Limpando cache...
🧹 Limpando cache da aplicação...
  Removendo cache: vite-v1
  Removendo cache: workbox-precache-v2
✅ Cache limpo com sucesso
✅ Versão atualizada para: 1.0.1
```

### Forçar Limpeza de Cache

No console do navegador:

```javascript
// Importar e executar
import { clearAppCache } from '@/lib/version';
await clearAppCache();

// Ou via window
window.location.reload(true); // Hard reload
```

### Verificar Versão Atual

```javascript
localStorage.getItem('app_version'); // "1.0.0"
```

### Simular Inatividade

```javascript
// Definir last_activity para 11 minutos atrás
localStorage.setItem(
  'last_activity',
  String(Date.now() - (11 * 60 * 1000))
);

// Aguardar próxima verificação (5 min) ou forçar
import { checkInactivity } from '@/lib/version';
checkInactivity(10); // true
```

---

## 📋 Checklist de Deploy

Antes de fazer deploy para produção:

- [ ] Atualizar versão em `/client/src/lib/version.ts`
- [ ] Atualizar versão em `/server/routes.ts` (endpoint /api/version)
- [ ] Verificar se as versões são **idênticas**
- [ ] Testar localmente: `npm run build && npm start`
- [ ] Verificar console do navegador (logs de versão)
- [ ] Fazer deploy
- [ ] Verificar endpoint: `curl https://seu-dominio.com/api/version`
- [ ] Abrir aplicação e verificar banner de atualização

---

## 🔒 Segurança

### Dados Preservados
- Token de autenticação permanece seguro
- Não há perda de sessão do usuário

### Proteção contra Loop
- Sistema só limpa cache uma vez por versão
- Após atualização, não limpa novamente

### Rate Limiting
- Endpoint `/api/version` é público (não precisa auth)
- Mas está sujeito a rate limiting geral (100 req/min)

---

## 🎯 Benefícios

### Para Usuários
- ✅ Sempre têm versão mais recente
- ✅ Não precisam limpar cache manualmente
- ✅ Notificação clara de atualização disponível
- ✅ Cache limpo automaticamente

### Para Desenvolvedores
- ✅ Deploy sem preocupação com cache antigo
- ✅ Controle preciso sobre quando limpar cache
- ✅ Logs detalhados para debugging
- ✅ Sistema automático, pouca manutenção

---

**Última atualização:** Outubro 2025
**Versão do documento:** 1.0
**Responsável:** Equipe MESC DevOps
