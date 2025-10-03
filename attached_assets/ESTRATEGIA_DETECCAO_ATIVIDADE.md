# ESTRATÉGIA DE DETECÇÃO DE ATIVIDADE INTELIGENTE
**Sistema:** MESC v5.3.0
**Timeout Base:** 10 minutos
**Compatibilidade:** Android 5.0+, iOS 11+, Desktop

---

## 🎯 OBJETIVOS

1. ✅ Detectar atividade real do usuário
2. ✅ Não deslogar usuários em uso legítimo (leitura, background)
3. ✅ Funcionar em dispositivos móveis antigos
4. ✅ Sincronizar entre múltiplas abas
5. ✅ Respeitar limitações do PWA

---

## 📱 TIPOS DE ATIVIDADE CONSIDERADOS

### ✅ Atividade ATIVA (Reseta Timer)

| Tipo | Evento | Peso | Justificativa |
|------|--------|------|---------------|
| **Interação Direta** | click, touch, tap | 100% | Usuário claramente ativo |
| **Navegação** | mudança de rota/página | 100% | Usuário navegando no app |
| **Formulário** | input, textarea, select | 100% | Preenchendo dados |
| **Scroll Intencional** | scroll (com delta > 50px) | 80% | Lendo conteúdo ativamente |
| **Teclado** | keypress, keydown | 100% | Digitando |
| **Requisição API** | fetch/ajax bem-sucedido | 90% | App em uso ativo |

### ⚠️ Atividade PASSIVA (NÃO Reseta Timer, mas Pausa)

| Tipo | Evento | Ação | Justificativa |
|------|--------|------|---------------|
| **App em Background** | visibilitychange (hidden) | Pausa contagem | Pode voltar a qualquer momento |
| **Leitura de Conteúdo** | página estática aberta | Timer estendido (20min) | Uso legítimo |
| **Download/Export** | gerando PDF/Excel | Pausa contagem | Operação em andamento |

### ❌ Inatividade REAL (Conta Timer)

| Tipo | Situação | Timeout |
|------|----------|---------|
| **Abandono** | Nenhum evento por 10min | 10min → Logout |
| **Navegador Fechado** | beforeunload | Imediato (marca sessão) |
| **Aba Inativa** | visibilitychange (hidden) por >20min | 20min → Logout |

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### 1. Sistema de Estados de Sessão

```typescript
// client/src/lib/sessionState.ts (NOVO ARQUIVO)

export enum SessionState {
  ACTIVE = 'active',           // Uso ativo recente (<2min)
  IDLE = 'idle',               // Sem interação mas visível (2-10min)
  BACKGROUND = 'background',   // App em background
  READING = 'reading',         // Modo leitura (conteúdo estático)
  PROCESSING = 'processing',   // Processando operação longa
  EXPIRED = 'expired'          // Sessão expirada (>10min idle)
}

export interface SessionContext {
  state: SessionState;
  lastActivityAt: number;
  lastInteractionAt: number;
  isVisible: boolean;
  isOnline: boolean;
  currentRoute: string;
  idleMinutes: number;
  hasActiveOperation: boolean; // Upload, download, etc
}

class SessionManager {
  private context: SessionContext;
  private listeners: Set<(ctx: SessionContext) => void>;

  constructor() {
    this.context = {
      state: SessionState.ACTIVE,
      lastActivityAt: Date.now(),
      lastInteractionAt: Date.now(),
      isVisible: !document.hidden,
      isOnline: navigator.onLine,
      currentRoute: window.location.pathname,
      idleMinutes: 0,
      hasActiveOperation: false
    };
    this.listeners = new Set();
    this.setupListeners();
  }

  private setupListeners() {
    // Visibilidade da página
    document.addEventListener('visibilitychange', () => {
      this.context.isVisible = !document.hidden;

      if (document.hidden) {
        console.log('[SESSION] 📱 App foi para background');
        this.setState(SessionState.BACKGROUND);
      } else {
        console.log('[SESSION] 📱 App voltou para foreground');
        // Verifica quanto tempo ficou em background
        const minutesInBackground = Math.floor(
          (Date.now() - this.context.lastActivityAt) / 60000
        );

        if (minutesInBackground > 20) {
          console.log(`[SESSION] ⚠️ ${minutesInBackground}min em background - verificando sessão`);
          this.checkServerSession();
        } else {
          this.setState(SessionState.ACTIVE);
          this.recordActivity();
        }
      }
    });

    // Status de conexão
    window.addEventListener('online', () => {
      this.context.isOnline = true;
      console.log('[SESSION] 🌐 Conexão restaurada');
      this.checkServerSession();
    });

    window.addEventListener('offline', () => {
      this.context.isOnline = false;
      console.log('[SESSION] 📡 Sem conexão - pausando verificações');
    });

    // Navegação (mudança de rota)
    window.addEventListener('popstate', () => {
      this.recordActivity();
      this.context.currentRoute = window.location.pathname;
    });
  }

  recordActivity() {
    this.context.lastActivityAt = Date.now();
    this.context.lastInteractionAt = Date.now();
    this.context.idleMinutes = 0;

    if (this.context.state !== SessionState.PROCESSING) {
      this.setState(SessionState.ACTIVE);
    }

    this.notifyListeners();
  }

  recordInteraction(type: string) {
    console.log(`[SESSION] 👆 Interação: ${type}`);
    this.recordActivity();
  }

  setState(state: SessionState) {
    if (this.context.state !== state) {
      console.log(`[SESSION] Estado: ${this.context.state} → ${state}`);
      this.context.state = state;
      this.notifyListeners();
    }
  }

  setActiveOperation(active: boolean) {
    this.context.hasActiveOperation = active;
    if (active) {
      this.setState(SessionState.PROCESSING);
    }
  }

  getContext(): Readonly<SessionContext> {
    return { ...this.context };
  }

  async checkServerSession() {
    // Implementação no próximo bloco
  }

  subscribe(listener: (ctx: SessionContext) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn(this.getContext()));
  }
}

export const sessionManager = new SessionManager();
```

### 2. Hook Atualizado com Inteligência de Contexto

```typescript
// client/src/hooks/useActivityMonitor.tsx (ATUALIZADO)

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { sessionManager, SessionState } from '@/lib/sessionState';

const IDLE_TIMEOUT = 10 * 60 * 1000;      // 10min sem interação
const BACKGROUND_TIMEOUT = 20 * 60 * 1000; // 20min em background
const CHECK_INTERVAL = 30 * 1000;          // Verifica a cada 30s
const READING_ROUTES = ['/schedules', '/formation', '/reports']; // Rotas de leitura

export function useActivityMonitor() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const checkIntervalRef = useRef<NodeJS.Timeout>();

  const isReadingMode = useCallback(() => {
    return READING_ROUTES.some(route => location.startsWith(route));
  }, [location]);

  const getTimeoutDuration = useCallback(() => {
    const ctx = sessionManager.getContext();

    // Se está processando algo, não expira
    if (ctx.hasActiveOperation) {
      return null; // Sem timeout
    }

    // Se está em background
    if (ctx.state === SessionState.BACKGROUND) {
      return BACKGROUND_TIMEOUT; // 20min
    }

    // Se está em modo leitura
    if (isReadingMode() && ctx.state === SessionState.IDLE) {
      return BACKGROUND_TIMEOUT; // 20min também
    }

    // Padrão: 10 minutos
    return IDLE_TIMEOUT;

  }, [isReadingMode]);

  const handleExpiry = useCallback(async () => {
    const ctx = sessionManager.getContext();

    console.log('[ACTIVITY] 🔒 Sessão expirada:', {
      state: ctx.state,
      idleMinutes: ctx.idleMinutes,
      route: ctx.currentRoute
    });

    // Se estava em background, verifica servidor primeiro
    if (ctx.state === SessionState.BACKGROUND) {
      const stillValid = await checkServerSession();
      if (stillValid) {
        console.log('[ACTIVITY] ✅ Sessão ainda válida no servidor');
        resetTimer();
        return;
      }
    }

    // Limpa dados
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_token');
    sessionStorage.clear();

    // Notifica servidor
    try {
      await fetch('/api/session/destroy', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('[ACTIVITY] Erro ao destruir sessão:', error);
    }

    sessionManager.setState(SessionState.EXPIRED);

    // Toast
    toast({
      title: '🔒 Sessão Encerrada',
      description: `Sua sessão foi encerrada após ${ctx.idleMinutes} minutos de inatividade.`,
      variant: 'destructive'
    });

    setTimeout(() => {
      setLocation('/login?reason=inactivity');
    }, 2000);

  }, [toast, setLocation]);

  const checkServerSession = useCallback(async (): Promise<boolean> => {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) return false;

    try {
      const response = await fetch('/api/session/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.expired) {
        console.log('[ACTIVITY] ❌ Servidor: sessão expirada');
        return false;
      }

      console.log(`[ACTIVITY] ✅ Servidor: ${data.minutesRemaining}min restantes`);
      return true;

    } catch (error) {
      console.error('[ACTIVITY] Erro ao verificar servidor:', error);
      // Em caso de erro de rede, mantém sessão (modo offline)
      return true;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const timeout = getTimeoutDuration();

    if (timeout === null) {
      console.log('[ACTIVITY] ⏸️ Timer pausado (operação em andamento)');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      handleExpiry();
    }, timeout);

    console.log(`[ACTIVITY] ⏱️ Timer resetado: ${timeout / 60000}min`);

  }, [getTimeoutDuration, handleExpiry]);

  const sendHeartbeat = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    const ctx = sessionManager.getContext();

    // Não envia heartbeat se offline ou em background há muito tempo
    if (!ctx.isOnline || !ctx.isVisible) {
      return;
    }

    if (!token) return;

    try {
      await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: ctx.state,
          route: ctx.currentRoute
        }),
        credentials: 'include'
      });

      console.log('[ACTIVITY] 💓 Heartbeat OK');

    } catch (error) {
      // Silencioso - pode estar offline
    }
  }, []);

  useEffect(() => {
    // Eventos de interação ATIVA
    const activeEvents = [
      'click',
      'touchstart',
      'keydown',
      'input',
      'submit'
    ];

    // Eventos de interação PASSIVA
    const passiveEvents = [
      'scroll',
      'mousemove'
    ];

    let scrollTimeout: NodeJS.Timeout;
    let mouseMoveTimeout: NodeJS.Timeout;

    const handleActiveEvent = (e: Event) => {
      sessionManager.recordInteraction(e.type);
      resetTimer();
      sendHeartbeat();
    };

    const handleScroll = () => {
      // Só considera atividade se scrollar de forma significativa
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        sessionManager.recordActivity();
        resetTimer();
      }, 500); // Debounce de 500ms
    };

    const handleMouseMove = () => {
      // Mouse move só conta se mover bastante (não apenas tremor)
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        sessionManager.recordActivity();
        // NÃO envia heartbeat para mouse move (muito frequente)
      }, 2000); // Debounce de 2s
    };

    // Registra listeners
    activeEvents.forEach(event => {
      document.addEventListener(event, handleActiveEvent, { passive: true });
    });

    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Inicia timer
    resetTimer();

    // Verificação periódica
    checkIntervalRef.current = setInterval(async () => {
      const ctx = sessionManager.getContext();

      // Atualiza minutos idle
      const minutes = Math.floor((Date.now() - ctx.lastActivityAt) / 60000);
      ctx.idleMinutes = minutes;

      // Se passou de 2min sem interação, muda para IDLE
      if (minutes >= 2 && ctx.state === SessionState.ACTIVE) {
        sessionManager.setState(SessionState.IDLE);
      }

      // Se está visível, verifica servidor
      if (ctx.isVisible && ctx.isOnline) {
        await checkServerSession();
      }

    }, CHECK_INTERVAL);

    // Subscribe para mudanças de estado
    const unsubscribe = sessionManager.subscribe((ctx) => {
      console.log('[SESSION] 📊 Estado atualizado:', ctx.state);
    });

    // Cleanup
    return () => {
      activeEvents.forEach(event => {
        document.removeEventListener(event, handleActiveEvent);
      });
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousemove', handleMouseMove);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      clearTimeout(scrollTimeout);
      clearTimeout(mouseMoveTimeout);

      unsubscribe();
    };

  }, [resetTimer, sendHeartbeat, checkServerSession]);

  return sessionManager.getContext();
}
```

### 3. Detecção de Operações Longas

```typescript
// client/src/hooks/useOperation.tsx (NOVO)

import { useEffect, useCallback } from 'use';
import { sessionManager } from '@/lib/sessionState';

/**
 * Hook para operações longas que não devem expirar a sessão
 * Uso: const { startOperation, endOperation } = useOperation();
 */
export function useOperation() {
  const startOperation = useCallback((name: string) => {
    console.log(`[OPERATION] 🚀 Iniciando: ${name}`);
    sessionManager.setActiveOperation(true);
  }, []);

  const endOperation = useCallback((name: string) => {
    console.log(`[OPERATION] ✅ Finalizada: ${name}`);
    sessionManager.setActiveOperation(false);
    sessionManager.recordActivity(); // Reseta timer após operação
  }, []);

  return { startOperation, endOperation };
}

// Exemplo de uso:
// const { startOperation, endOperation } = useOperation();
//
// const handleExport = async () => {
//   startOperation('Exportar CSV');
//   try {
//     await exportData();
//   } finally {
//     endOperation('Exportar CSV');
//   }
// };
```

### 4. Sincronização Entre Abas (BroadcastChannel)

```typescript
// client/src/lib/sessionSync.ts (NOVO)

class SessionSync {
  private channel: BroadcastChannel | null = null;
  private tabId: string;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random()}`;

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('mesc_session');
      this.setupListeners();
      console.log('[SYNC] 📡 BroadcastChannel ativo:', this.tabId);
    } else {
      console.warn('[SYNC] ⚠️ BroadcastChannel não suportado');
      // Fallback: localStorage events
      this.setupLocalStorageFallback();
    }
  }

  private setupListeners() {
    this.channel?.addEventListener('message', (event) => {
      const { type, data, from } = event.data;

      // Ignora mensagens da própria aba
      if (from === this.tabId) return;

      console.log(`[SYNC] 📨 Recebido de ${from}:`, type);

      switch (type) {
        case 'activity':
          // Outra aba teve atividade, reseta timer local
          sessionManager.recordActivity();
          break;

        case 'logout':
          // Outra aba fez logout, desloga todas
          this.handleCrossTabLogout();
          break;

        case 'expired':
          // Outra aba expirou, verifica se deve expirar também
          this.handleCrossTabExpiry();
          break;
      }
    });
  }

  broadcastActivity() {
    this.channel?.postMessage({
      type: 'activity',
      from: this.tabId,
      timestamp: Date.now()
    });
  }

  broadcastLogout() {
    this.channel?.postMessage({
      type: 'logout',
      from: this.tabId
    });
  }

  broadcastExpiry() {
    this.channel?.postMessage({
      type: 'expired',
      from: this.tabId
    });
  }

  private handleCrossTabLogout() {
    console.log('[SYNC] 🚪 Logout em outra aba - deslogando esta também');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_token');
    window.location.href = '/login?reason=cross_tab_logout';
  }

  private handleCrossTabExpiry() {
    console.log('[SYNC] ⏰ Expiração em outra aba - verificando servidor');
    // Não desloga imediatamente, verifica servidor primeiro
    sessionManager.checkServerSession();
  }

  private setupLocalStorageFallback() {
    // Para browsers antigos sem BroadcastChannel
    window.addEventListener('storage', (e) => {
      if (e.key === 'session_activity' && e.newValue) {
        const data = JSON.parse(e.newValue);
        if (Date.now() - data.timestamp < 1000) {
          sessionManager.recordActivity();
        }
      }
    });
  }
}

export const sessionSync = new SessionSync();
```

---

## 📊 MATRIZ DE DECISÃO DE TIMEOUT

| Cenário | Visível? | Online? | Rota | Operação? | Timeout |
|---------|----------|---------|------|-----------|---------|
| Uso normal | ✅ Sim | ✅ Sim | Qualquer | ❌ Não | **10min** |
| Lendo escala | ✅ Sim | ✅ Sim | /schedules | ❌ Não | **20min** |
| Lendo formação | ✅ Sim | ✅ Sim | /formation | ❌ Não | **20min** |
| App minimizado | ❌ Não | ✅ Sim | Qualquer | ❌ Não | **20min** |
| Exportando CSV | ✅ Sim | ✅ Sim | /reports | ✅ Sim | **∞ (pausado)** |
| Offline (PWA) | ✅ Sim | ❌ Não | Qualquer | ❌ Não | **∞ (pausado)** |
| Múltiplas abas | ✅ Qualquer | ✅ Sim | Qualquer | ❌ Não | **Sincronizado** |

---

## 🧪 CENÁRIOS DE TESTE

### Teste 1: App em Background (Android)
```
1. Abrir MESC no Chrome (Android)
2. Ver dashboard
3. Apertar botão HOME
4. Aguardar 15 minutos
5. Voltar para o app
ESPERADO: ✅ Ainda logado (timeout 20min para background)
```

### Teste 2: Leitura de Documento
```
1. Abrir /schedules/view (escala de missas)
2. Não tocar na tela por 12 minutos
3. Clicar em qualquer lugar
ESPERADO: ✅ Ainda logado (rotas de leitura = 20min)
```

### Teste 3: Exportação Longa
```
1. Abrir /reports
2. Clicar em "Exportar CSV Completo"
3. Aguardar 15 minutos (operação longa simulada)
ESPERADO: ✅ Ainda logado (operações pausam timer)
```

### Teste 4: Múltiplas Abas
```
1. Abrir MESC em aba 1
2. Abrir MESC em aba 2
3. Usar aba 1 ativamente
4. Aguardar 12min sem tocar aba 2
5. Clicar na aba 2
ESPERADO: ✅ Ainda logado (atividade sincronizada)
```

### Teste 5: Offline (PWA)
```
1. Instalar PWA
2. Desativar conexão
3. Navegar offline por 20 minutos
4. Reconectar
ESPERADO: ✅ Verifica servidor, renova se válido
```

---

## 🎯 CONFIGURAÇÃO RECOMENDADA

```typescript
// config/session.ts
export const SESSION_CONFIG = {
  // Timeouts base
  ACTIVE_TIMEOUT: 10 * 60 * 1000,      // 10min uso normal
  BACKGROUND_TIMEOUT: 20 * 60 * 1000,  // 20min em background
  READING_TIMEOUT: 20 * 60 * 1000,     // 20min rotas de leitura

  // Rotas consideradas "leitura" (timeout estendido)
  READING_ROUTES: [
    '/schedules',
    '/schedules/view',
    '/formation',
    '/reports',
    '/ministers/directory'
  ],

  // Eventos de atividade forte (resetam timer imediatamente)
  STRONG_ACTIVITY_EVENTS: [
    'click',
    'touchstart',
    'keydown',
    'input',
    'submit',
    'change'
  ],

  // Eventos de atividade fraca (debounce antes de resetar)
  WEAK_ACTIVITY_EVENTS: [
    { event: 'scroll', debounce: 500 },
    { event: 'mousemove', debounce: 2000 }
  ],

  // Verificação periódica
  CHECK_INTERVAL: 30 * 1000,  // 30s

  // Heartbeat
  HEARTBEAT_INTERVAL: 60 * 1000,  // 1min (apenas quando ativo)

  // Warning
  WARNING_THRESHOLD: 2 * 60 * 1000  // Aviso com 2min restantes
};
```

---

## ✅ VANTAGENS DESTA ABORDAGEM

1. ✅ **Contexto-Aware** - Sabe quando usuário está realmente inativo
2. ✅ **Mobile-Friendly** - Respeita apps em background
3. ✅ **PWA-Compatible** - Funciona offline
4. ✅ **Multi-Tab Sync** - Sincroniza entre abas
5. ✅ **Operações Longas** - Pausa timer durante exports/uploads
6. ✅ **Rotas de Leitura** - Timeout estendido para consulta
7. ✅ **Performance** - Debounce em eventos frequentes
8. ✅ **Graceful Degradation** - Fallbacks para browsers antigos

---

## 📝 RESUMO DA RESPOSTA

### O que é considerado "atividade"?

**ATIVIDADE FORTE (Reseta para 0):**
- ✅ Cliques/Toques
- ✅ Digitação
- ✅ Mudança de página
- ✅ Submit de formulário
- ✅ Requisições API

**ATIVIDADE FRACA (Reseta com debounce):**
- ⚠️ Scroll (após 500ms parado)
- ⚠️ Mouse move (após 2s parado)

**NÃO É INATIVIDADE:**
- ✅ App em background (timeout 20min)
- ✅ Lendo conteúdo estático (timeout 20min)
- ✅ Processando operação longa (pausado)
- ✅ Offline (pausado)
- ✅ Outra aba ativa (sincronizado)

**INATIVIDADE REAL:**
- ❌ 10min sem nenhum evento
- ❌ 20min em background ininterrupto
- ❌ Browser fechado

---

Essa abordagem resolve seus cenários problemáticos?
