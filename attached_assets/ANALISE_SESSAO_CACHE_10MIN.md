# ANÁLISE: Sistema de Limpeza de Cache e Sessão (10 MINUTOS)
**Data:** 03/10/2025
**Sistema:** MESC v5.3.0
**Timeout de Inatividade:** 10 minutos

---

## 📋 PROPOSTA APROVADA

### Objetivo
Implementar sistema automático de limpeza de cache quando a sessão expirar após **10 minutos de inatividade**, evitando que o usuário precise limpar cache manualmente no navegador.

### Configuração
```env
INACTIVITY_TIMEOUT_MINUTES=10        # 10 minutos sem atividade = logout
JWT_EXPIRES_IN=12h                   # Access token: 12 horas
REFRESH_TOKEN_EXPIRES_IN=7d          # Refresh token: 7 dias
```

---

## 🔍 ADAPTAÇÕES NECESSÁRIAS

### 1. Sistema Atual (MESC)
- ✅ JWT com expiração de 24h
- ✅ Cookie com maxAge de 7 dias
- ✅ PostgreSQL (Neon)
- ✅ TypeScript 100%

### 2. Proposta Original (Adaptada)
- ⚠️ MySQL → **PostgreSQL**
- ⚠️ Sessões isoladas → **Integração com JWT**
- ⚠️ Polling constante → **Activity monitor eficiente**
- ✅ 10 minutos de timeout (mantido)

---

## ✅ SOLUÇÃO IMPLEMENTADA PARA MESC

### Arquitetura Híbrida
**JWT (stateless) + Activity Tracking (stateful)**

#### Vantagens
1. ✅ Mantém performance do JWT
2. ✅ Adiciona controle de inatividade de 10min
3. ✅ Analytics de sessões ativas
4. ✅ Limpeza automática de cache
5. ✅ Compatível com PWA offline

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabela: `active_sessions`

```sql
-- Criação da tabela de sessões ativas
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_active ON active_sessions(is_active);
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);
CREATE INDEX idx_active_sessions_activity ON active_sessions(last_activity_at);

-- Comentários
COMMENT ON TABLE active_sessions IS 'Sessões ativas com controle de inatividade de 10 minutos';
COMMENT ON COLUMN active_sessions.last_activity_at IS 'Última interação do usuário (clique, scroll, etc)';
COMMENT ON COLUMN active_sessions.expires_at IS 'Expiração absoluta da sessão (JWT expiration)';
```

### Job de Limpeza Automática

```sql
-- Função para expirar sessões inativas (>10 minutos)
CREATE OR REPLACE FUNCTION expire_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Marca como inativa sessões com mais de 10 minutos sem atividade
  UPDATE active_sessions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND (EXTRACT(EPOCH FROM (NOW() - last_activity_at)) / 60) > 10;

  -- Remove sessões inativas antigas (mais de 30 dias)
  DELETE FROM active_sessions
  WHERE is_active = FALSE
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION expire_inactive_sessions() IS 'Expira sessões com >10min de inatividade';
```

### Schema TypeScript (Drizzle)

```typescript
// shared/schema.ts - ADICIONAR

export const activeSessions = pgTable('active_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar('session_token', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').default(true)
});

export const activeSessionsRelations = relations(activeSessions, ({ one }) => ({
  user: one(users, {
    fields: [activeSessions.userId],
    references: [users.id]
  })
}));

export type ActiveSession = typeof activeSessions.$inferSelect;
```

---

## 🔧 BACKEND - ENDPOINTS

### 1. Endpoint de Verificação de Sessão

```typescript
// server/routes/session.ts (NOVO ARQUIVO)
import { Router } from 'express';
import { db } from '../db';
import { activeSessions, users } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';

const router = Router();

// POST /api/session/verify
router.post('/verify', async (req, res) => {
  const sessionToken = req.body.sessionToken || req.cookies?.session_token;

  if (!sessionToken) {
    return res.json({ expired: true, reason: 'no_token' });
  }

  try {
    // Busca sessão no banco
    const [session] = await db
      .select()
      .from(activeSessions)
      .where(
        and(
          eq(activeSessions.sessionToken, sessionToken),
          eq(activeSessions.isActive, true),
          gt(activeSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      return res.json({ expired: true, reason: 'session_not_found' });
    }

    // Calcula minutos desde última atividade
    const now = new Date();
    const lastActivity = new Date(session.lastActivityAt);
    const minutesInactive = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);

    console.log(`[SESSION] User ${session.userId}: ${minutesInactive} min inactive`);

    // Se passou 10 minutos, expira
    if (minutesInactive > 10) {
      // Marca sessão como inativa
      await db
        .update(activeSessions)
        .set({ isActive: false })
        .where(eq(activeSessions.id, session.id));

      console.log(`[SESSION] ❌ Expired - User ${session.userId}`);

      return res.json({
        expired: true,
        reason: 'inactivity',
        minutesInactive
      });
    }

    // Sessão ainda válida
    return res.json({
      expired: false,
      minutesInactive,
      minutesRemaining: 10 - minutesInactive
    });

  } catch (error) {
    console.error('[SESSION] Error verifying:', error);
    return res.status(500).json({
      expired: true,
      reason: 'server_error'
    });
  }
});

// POST /api/session/heartbeat - Atualiza última atividade
router.post('/heartbeat', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const sessionToken = req.cookies?.session_token;

  if (!userId || !sessionToken) {
    return res.status(401).json({ success: false });
  }

  try {
    // Atualiza last_activity_at
    await db
      .update(activeSessions)
      .set({ lastActivityAt: new Date() })
      .where(
        and(
          eq(activeSessions.userId, userId),
          eq(activeSessions.sessionToken, sessionToken),
          eq(activeSessions.isActive, true)
        )
      );

    res.json({ success: true, timestamp: new Date() });

  } catch (error) {
    console.error('[SESSION] Error updating heartbeat:', error);
    res.status(500).json({ success: false });
  }
});

// POST /api/session/create - Cria sessão ao fazer login
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false });
  }

  try {
    const { nanoid } = await import('nanoid');
    const sessionToken = nanoid(64);

    // Expira em 12 horas (JWT expiration)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    // Cria nova sessão
    const [newSession] = await db
      .insert(activeSessions)
      .values({
        userId,
        sessionToken,
        expiresAt,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null
      })
      .returning();

    // Define cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000 // 12 horas
    });

    res.json({
      success: true,
      sessionToken,
      expiresAt
    });

  } catch (error) {
    console.error('[SESSION] Error creating:', error);
    res.status(500).json({ success: false });
  }
});

// POST /api/session/destroy - Destroi sessão ao fazer logout
router.post('/destroy', authenticateToken, async (req: AuthRequest, res) => {
  const sessionToken = req.cookies?.session_token;

  if (sessionToken) {
    try {
      await db
        .update(activeSessions)
        .set({ isActive: false })
        .where(eq(activeSessions.sessionToken, sessionToken));
    } catch (error) {
      console.error('[SESSION] Error destroying:', error);
    }
  }

  res.clearCookie('session_token');
  res.json({ success: true });
});

export default router;
```

### 2. Atualização do Login

```typescript
// server/authRoutes.ts - MODIFICAR rota /login

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await login(email, password);

    // Define cookie JWT
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 horas
      path: '/'
    });

    // NOVO: Cria sessão de atividade
    const { nanoid } = await import('nanoid');
    const sessionToken = nanoid(64);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    await db.insert(activeSessions).values({
      userId: result.user.id,
      sessionToken,
      expiresAt,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null
    });

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token: result.token,
      user: result.user,
      sessionToken // Retorna para o frontend armazenar
    });

  } catch (error: any) {
    // ... resto do código
  }
});
```

### 3. Registro de Rotas

```typescript
// server/routes.ts - ADICIONAR
import sessionRoutes from './routes/session';

export async function registerRoutes(app: Express): Promise<Server> {
  // ... outras rotas ...

  // Session routes
  app.use('/api/session', sessionRoutes);

  // ... resto do código ...
}
```

---

## 💻 FRONTEND - IMPLEMENTAÇÃO

### 1. Hook de Monitor de Atividade

```typescript
// client/src/hooks/useActivityMonitor.tsx (NOVO ARQUIVO)
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms
const CHECK_INTERVAL = 30 * 1000; // Verifica a cada 30 segundos

export function useActivityMonitor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const handleInactivity = useCallback(async () => {
    console.log('[ACTIVITY] 🔒 10 minutos de inatividade - encerrando sessão');

    // Limpa tokens e dados sensíveis
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_token');
    sessionStorage.clear();

    // Mantém preferências (tema, configurações)
    // localStorage.getItem('theme') permanece

    // Notifica backend
    try {
      await fetch('/api/session/destroy', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('[ACTIVITY] Erro ao destruir sessão:', error);
    }

    // Mostra toast antes de redirecionar
    toast({
      title: '🔒 Sessão Encerrada',
      description: 'Sua sessão foi encerrada após 10 minutos de inatividade.',
      variant: 'destructive'
    });

    // Redireciona para login
    setTimeout(() => {
      setLocation('/login?reason=inactivity');
    }, 2000);

  }, [setLocation, toast]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Limpa timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Inicia novo timeout de 10 minutos
    timeoutRef.current = setTimeout(() => {
      handleInactivity();
    }, INACTIVITY_TIMEOUT);

  }, [handleInactivity]);

  const checkSession = useCallback(async () => {
    const sessionToken = localStorage.getItem('session_token');

    if (!sessionToken) {
      return; // Usuário não logado
    }

    try {
      const response = await fetch('/api/session/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.expired) {
        console.log('[ACTIVITY] ❌ Sessão expirada no servidor:', data.reason);
        await handleInactivity();
      } else {
        console.log(`[ACTIVITY] ✅ Sessão ativa - ${data.minutesRemaining}min restantes`);
      }

    } catch (error) {
      console.error('[ACTIVITY] Erro ao verificar sessão:', error);
    }
  }, [handleInactivity]);

  const sendHeartbeat = useCallback(async () => {
    const token = localStorage.getItem('auth_token');

    if (!token) return;

    try {
      await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      console.log('[ACTIVITY] 💓 Heartbeat enviado');

    } catch (error) {
      console.error('[ACTIVITY] Erro ao enviar heartbeat:', error);
    }
  }, []);

  useEffect(() => {
    // Eventos que indicam atividade do usuário
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      resetTimer();
      sendHeartbeat();
    };

    // Registra listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Inicia timer
    resetTimer();

    // Verifica sessão no servidor a cada 30s
    checkIntervalRef.current = setInterval(() => {
      checkSession();
    }, CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };

  }, [resetTimer, checkSession, sendHeartbeat]);

  return {
    lastActivity: lastActivityRef.current,
    minutesSinceActivity: Math.floor((Date.now() - lastActivityRef.current) / 60000)
  };
}
```

### 2. Componente de Indicador de Sessão

```typescript
// client/src/components/SessionIndicator.tsx (NOVO ARQUIVO)
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export function SessionIndicator() {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const sessionToken = localStorage.getItem('session_token');

      if (!sessionToken) {
        setMinutesRemaining(null);
        return;
      }

      try {
        const response = await fetch('/api/session/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken }),
          credentials: 'include'
        });

        const data = await response.json();

        if (!data.expired) {
          setMinutesRemaining(data.minutesRemaining);
          setShowWarning(data.minutesRemaining <= 2); // Mostra aviso com 2min ou menos
        } else {
          setMinutesRemaining(null);
        }

      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      }
    };

    // Verifica a cada 30 segundos
    const interval = setInterval(checkSession, 30000);
    checkSession(); // Verifica imediatamente

    return () => clearInterval(interval);
  }, []);

  if (minutesRemaining === null || minutesRemaining > 2) {
    return null; // Não mostra nada se tudo ok
  }

  return (
    <Badge
      variant={showWarning ? 'destructive' : 'secondary'}
      className="flex items-center gap-2"
    >
      <Clock className="h-3 w-3" />
      Sessão expira em {minutesRemaining} min
    </Badge>
  );
}
```

### 3. Atualização do Login

```typescript
// client/src/pages/login.tsx - MODIFICAR

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao fazer login');
    }

    // Armazena tokens
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('session_token', data.sessionToken); // NOVO

    // Armazena dados do usuário
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redireciona
    setLocation('/dashboard');

  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Integração no App.tsx

```typescript
// client/src/App.tsx - MODIFICAR

import { useActivityMonitor } from '@/hooks/useActivityMonitor';
import { SessionIndicator } from '@/components/SessionIndicator';

function App() {
  // Monitor de atividade (10 minutos)
  useActivityMonitor();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <SessionIndicator /> {/* Indicador visual */}
          <Toaster />
          <PWAUpdatePrompt />
          <PWAInstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 5. Página de Login com Mensagem de Inatividade

```typescript
// client/src/pages/login.tsx - ADICIONAR

function Login() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <div className="container">
      {reason === 'inactivity' && (
        <Alert variant="warning" className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertTitle>Sessão Encerrada</AlertTitle>
          <AlertDescription>
            Sua sessão foi encerrada após 10 minutos de inatividade.
            Por favor, faça login novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Resto do formulário de login */}
    </div>
  );
}
```

---

## 📊 IMPACTOS DA IMPLEMENTAÇÃO

### ✅ Positivos

1. **Segurança Aumentada**
   - Logout automático após 10min de inatividade
   - Impossível usar sessão antiga após timeout
   - Limpeza automática de tokens sensíveis

2. **Melhor UX**
   - Indicador visual de tempo restante
   - Mensagem clara ao ser deslogado
   - Heartbeat silencioso mantém sessão ativa

3. **Compliance**
   - Atende requisitos de segurança
   - Sessões rastreáveis
   - Logs de atividade

4. **Analytics**
   - Tempo de sessão médio
   - Padrões de uso
   - Horários de pico

### ⚠️ Atenção

1. **Timeout Curto (10min)**
   - ⚠️ Usuários podem perder trabalho não salvo
   - ⚠️ Formulários longos podem expirar
   - ⚠️ Leitura de documentos pode ser interrompida

2. **Mitigações Necessárias:**
   - ✅ Auto-save de formulários a cada 2min
   - ✅ Aviso visual com 2min restantes
   - ✅ Qualquer interação reseta o timer
   - ✅ Mensagem clara explicando o logout

3. **Impacto no Servidor**
   - Heartbeat a cada interação (moderado)
   - Job de limpeza diário (baixo)
   - Queries adicionais por request (baixo)

4. **Storage**
   - ~100 bytes por sessão ativa
   - Estimativa: 150 usuários = ~15KB
   - Limpeza automática de sessões antigas

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Database (1-2 horas)
- [ ] Criar tabela `active_sessions` via migration Drizzle
- [ ] Criar função `expire_inactive_sessions()`
- [ ] Configurar job diário de limpeza
- [ ] Testar queries de performance

### Fase 2: Backend (3-4 horas)
- [ ] Criar `server/routes/session.ts`
- [ ] Implementar endpoints verify, heartbeat, create, destroy
- [ ] Modificar `/api/auth/login` para criar sessão
- [ ] Modificar `/api/auth/logout` para destruir sessão
- [ ] Testes de API

### Fase 3: Frontend (3-4 horas)
- [ ] Criar `hooks/useActivityMonitor.tsx`
- [ ] Criar `components/SessionIndicator.tsx`
- [ ] Integrar em `App.tsx`
- [ ] Modificar página de login (armazenar session_token)
- [ ] Adicionar mensagem de inatividade
- [ ] Testes de timeout

### Fase 4: Refinamentos (1-2 horas)
- [ ] Auto-save de formulários em progresso
- [ ] Warning toast com 2min restantes
- [ ] Documentação para usuários
- [ ] Testes end-to-end

**Tempo Total: 8-12 horas**

---

## ✅ CHECKLIST DE DEPLOY

### Pré-Deploy
- [ ] Criar migration Drizzle
- [ ] Testar em ambiente de desenvolvimento
- [ ] Configurar variáveis de ambiente
- [ ] Revisar código

### Deploy
- [ ] Aplicar migration no banco
- [ ] Deploy do backend
- [ ] Deploy do frontend
- [ ] Configurar job de limpeza (cron)

### Pós-Deploy
- [ ] Monitorar logs de sessão
- [ ] Verificar taxa de timeouts
- [ ] Coletar feedback inicial
- [ ] Ajustar se necessário (após 1 semana)

---

## 📝 VARIÁVEIS DE AMBIENTE

```env
# .env (adicionar)
INACTIVITY_TIMEOUT_MINUTES=10
JWT_EXPIRES_IN=12h
SESSION_CHECK_INTERVAL_SECONDS=30
SESSION_CLEANUP_DAYS=30
```

---

## 🎯 MÉTRICAS DE SUCESSO

### Monitorar após 1 semana:
1. **Taxa de timeout por inatividade** (esperado: 20-30%)
2. **Tempo médio de sessão** (esperado: 15-25 min)
3. **Reclamações de usuários** (esperado: <5%)
4. **Trabalho perdido** (formulários não salvos)

### Ajustes possíveis:
- Se >40% timeout → considerar 15min
- Se <10% timeout → timeout ok, talvez reduzir para 8min
- Se muitas reclamações → adicionar auto-save agressivo

---

**CONCLUSÃO:** Sistema pronto para implementação com timeout de **10 minutos** conforme solicitado. Inclui verificação no servidor, limpeza automática de cache e indicador visual para o usuário.
