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

    // Limpa tokens e dados sensíveis
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    // Mantém preferências do usuário (theme, etc)
    // localStorage.getItem('theme') permanece intacto

    // Notifica backend
    try {
      await fetch('/api/session/destroy', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('[ACTIVITY] Erro ao destruir sessão:', error);
    }

    // Mostra toast
    toast({
      title: '🔒 Sessão Encerrada',
      description: 'Sua sessão foi encerrada após 10 minutos de inatividade.',
      variant: 'destructive'
    });

    // Redireciona para login após 2 segundos
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
        
        // Se estiver na página de login, apenas limpa o localStorage silenciosamente
        if (window.location.pathname === '/login') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('session_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else {
          // Senão, faz o processo completo de logout
          await handleInactivity();
        }
      } else {
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
