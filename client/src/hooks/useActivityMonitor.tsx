import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Configuração: 10 MINUTOS FIXO
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms
const CHECK_INTERVAL = 30 * 1000;          // Verifica servidor a cada 30s
const HEARTBEAT_INTERVAL = 60 * 1000;      // Envia heartbeat a cada 1min

/**
 * Hook para monitorar atividade do usuário e fazer logout automático após 10 minutos de inatividade
 *
 * Funcionamento:
 * - Detecta atividade: cliques, toques, digitação, scroll
 * - Reseta timer a cada interação
 * - Verifica sessão no servidor a cada 30s
 * - Envia heartbeat a cada 1min
 * - Após 10min sem atividade: limpa cache e faz logout
 */
export function useActivityMonitor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const timeoutRef = useRef<NodeJS.Timeout>();
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const handleInactivity = useCallback(async () => {
    console.log('[ACTIVITY] 🔒 10 minutos de inatividade - encerrando sessão');

    // 1. Limpa dados da aplicação (localStorage e sessionStorage)
    localStorage.clear();
    sessionStorage.clear();

    // 2. Desregistra Service Workers (PWA cache)
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[ACTIVITY] 🧹 Service Worker desregistrado');
        }
      } catch (error) {
        console.error('[ACTIVITY] Erro ao desregistrar Service Worker:', error);
      }
    }

    // 3. Notifica backend com header Clear-Site-Data
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('[ACTIVITY] 🗑️ Logout no backend concluído');
    } catch (error) {
      console.error('[ACTIVITY] Erro ao destruir sessão:', error);
    }

    // 4. Mostra toast
    toast({
      title: '🔒 Sessão Encerrada',
      description: 'Sua sessão foi encerrada após 10 minutos de inatividade.',
      variant: 'destructive'
    });

    // 5. Redireciona com cache busting (força ignorar cache)
    const timestamp = Date.now();
    setTimeout(() => {
      window.location.href = `/login?reason=inactivity&_=${timestamp}`;
    }, 2000);

  }, [toast]);

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

  const checkServerSession = useCallback(async () => {
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
        console.log(`[ACTIVITY] ✅ Sessão ativa - ${data.minutesRemaining} min restantes`);
      }

    } catch (error) {
      console.error('[ACTIVITY] Erro ao verificar sessão:', error);
      // Em caso de erro de rede, não desloga (pode estar offline)
    }
  }, [handleInactivity]);

  const sendHeartbeat = useCallback(async () => {
    const token = localStorage.getItem('auth_token');

    if (!token) return;

    try {
      await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('[ACTIVITY] 💓 Heartbeat enviado');

    } catch (error) {
      // Silencioso - pode estar offline
      console.debug('[ACTIVITY] Heartbeat falhou (provavelmente offline)');
    }
  }, []);

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');

    // Só ativa monitor se usuário estiver logado
    if (!sessionToken) {
      return;
    }

    console.log('[ACTIVITY] 🎯 Monitor de atividade iniciado (timeout: 10min)');

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
    };

    // Registra listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Inicia timer
    resetTimer();

    // Verifica sessão no servidor a cada 30s
    checkIntervalRef.current = setInterval(() => {
      checkServerSession();
    }, CHECK_INTERVAL);

    // Envia heartbeat a cada 1min
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    // Envia heartbeat imediato
    sendHeartbeat();

    // Cleanup
    return () => {
      console.log('[ACTIVITY] 🛑 Monitor de atividade desativado');

      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };

  }, [resetTimer, checkServerSession, sendHeartbeat]);

  return {
    lastActivity: lastActivityRef.current,
    minutesSinceActivity: Math.floor((Date.now() - lastActivityRef.current) / 60000)
  };
}
