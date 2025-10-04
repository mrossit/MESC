/**
 * Componente: Fixed Footer
 * Menu inferior fixo sobreposto com navegação principal
 * Rotas: HOME | ESCALA | SUBSTITUIÇÕES | PERFIL
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Home, Calendar, Users, UserCircle } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

interface UnreadCount {
  unread: number;
}

interface ProfileAlert {
  hasAlert: boolean;
}

const ROUTES = [
  { id: 'home', path: '/', label: 'HOME', icon: Home, ariaLabel: 'Ir para Home' },
  { id: 'escala', path: '/schedules', label: 'ESCALA', icon: Calendar, ariaLabel: 'Ir para Escalas' },
  { id: 'substituicoes', path: '/substitutions', label: 'SUBSTITUIÇÕES', icon: Users, ariaLabel: 'Ir para Substituições' },
  { id: 'perfil', path: '/profile', label: 'PERFIL', icon: UserCircle, ariaLabel: 'Ir para Perfil' }
] as const;

export function FixedFooter() {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const [announceText, setAnnounceText] = useState<string>('');

  // Query para contagem de escalas não lidas
  const { data: unreadData } = useQuery<UnreadCount>({
    queryKey: ['/api/escala/unread-count', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/escala/unread-count?user_id=${user?.id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erro ao buscar escalas não lidas');
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 15000 // 15s polling
  });

  // Query para alertas de perfil
  const { data: profileAlert } = useQuery<ProfileAlert>({
    queryKey: ['/api/user/profile-alert', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/user/${user?.id}/profile-alert`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erro ao buscar alertas de perfil');
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // 30s polling
  });

  // Persistir última rota visitada
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`last_route_user_${user.id}`, location);
    }
  }, [location, user?.id]);

  // Restaurar última rota ao montar
  useEffect(() => {
    if (user?.id) {
      const savedRoute = localStorage.getItem(`last_route_user_${user.id}`);
      if (savedRoute && savedRoute !== location) {
        // Apenas restaura se for diferente da rota atual
        console.log(`[FixedFooter] Rota salva: ${savedRoute}`);
      }
    }
  }, [user?.id]);

  // Anunciar mudanças de badges via ARIA live
  useEffect(() => {
    if (unreadData && unreadData.unread > 0) {
      setAnnounceText(`Você tem ${unreadData.unread} nova${unreadData.unread > 1 ? 's' : ''} escala${unreadData.unread > 1 ? 's' : ''}`);
      // Limpar após 3s
      const timer = setTimeout(() => setAnnounceText(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [unreadData?.unread]);

  // Logar navegação
  const logNavigation = useCallback(async (route: string) => {
    if (!user?.id) return;

    try {
      await fetch('/api/navigation/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user.id,
          route,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('[FixedFooter] Erro ao logar navegação:', error);
    }
  }, [user?.id]);

  // Handler de navegação
  const handleNavigate = useCallback((route: typeof ROUTES[number]) => {
    setLocation(route.path);
    logNavigation(route.id);
  }, [setLocation, logNavigation]);

  // Handler de long-press (atalhos rápidos) - feature opcional
  const handleLongPress = useCallback((route: typeof ROUTES[number]) => {
    console.log(`[FixedFooter] Long press em ${route.id}`);
    // TODO: Implementar menu contextual com atalhos
  }, []);

  // Verificar se rota está ativa
  const isActive = useCallback((routePath: string) => {
    if (routePath === '/' && location === '/') return true;
    if (routePath !== '/' && location.startsWith(routePath)) return true;
    return false;
  }, [location]);

  return (
    <>
      {/* Announcer para acessibilidade */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceText}
      </div>

      <footer
        className="fixed-footer"
        role="navigation"
        aria-label="Navegação principal"
      >
        <nav className="footer-nav">
          {ROUTES.map((route) => {
            const Icon = route.icon;
            const active = isActive(route.path);
            const showBadge = route.id === 'escala' && unreadData && unreadData.unread > 0;
            const showDot = route.id === 'perfil' && profileAlert?.hasAlert;

            return (
              <button
                key={route.id}
                className={`nav-item ${active ? 'active' : ''}`}
                data-route={route.id}
                data-pid={user?.id}
                onClick={() => handleNavigate(route)}
                aria-label={route.ariaLabel}
                aria-current={active ? 'page' : undefined}
                type="button"
              >
                <div className="nav-item-icon-wrapper">
                  <Icon
                    className="nav-item-icon"
                    aria-hidden="true"
                  />
                  {showBadge && (
                    <span
                      className="nav-badge"
                      aria-label={`${unreadData.unread} não lida${unreadData.unread > 1 ? 's' : ''}`}
                    >
                      {unreadData.unread > 9 ? '9+' : unreadData.unread}
                    </span>
                  )}
                  {showDot && (
                    <span
                      className="nav-dot"
                      aria-label="Notificação de perfil"
                    />
                  )}
                </div>
                <span className="nav-item-label">{route.label}</span>
              </button>
            );
          })}
        </nav>
      </footer>

      {/* Padding bottom para compensar altura do footer */}
      <div
        className="footer-spacer"
        aria-hidden="true"
      />
    </>
  );
}
