import { useEffect, useRef } from 'react';

/**
 * Hook para verificar atualizações de versão do sistema
 * Compara a versão do servidor com a versão local
 * Quando detecta mudança, limpa cache e força reload
 */
export function useVersionCheck() {
  const currentVersionRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Não executar em desenvolvimento
    if (import.meta.env.DEV) {
      return;
    }

    const checkVersion = async () => {
      // Evita múltiplas checagens simultâneas
      if (isCheckingRef.current) return;
      
      try {
        isCheckingRef.current = true;
        
        const response = await fetch('/api/version', {
          cache: 'no-store', // Sempre busca versão fresca
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          console.warn('[VersionCheck] Failed to check version:', response.status);
          return;
        }

        const data = await response.json();
        const serverVersion = data.version;

        // Primeira checagem - salva versão atual
        if (currentVersionRef.current === null) {
          currentVersionRef.current = serverVersion;
          localStorage.setItem('mesc-app-version', serverVersion);
          console.log('[VersionCheck] Current version:', serverVersion);
          return;
        }

        // Se a versão mudou, atualizar app
        if (serverVersion !== currentVersionRef.current) {
          console.log('[VersionCheck] New version detected:', serverVersion, '(current:', currentVersionRef.current + ')');
          
          // Limpa todos os caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => {
                console.log('[VersionCheck] Deleting cache:', cacheName);
                return caches.delete(cacheName);
              })
            );
          }

          // Limpa service worker cache
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
              registrations.map(registration => {
                console.log('[VersionCheck] Unregistering service worker');
                return registration.unregister();
              })
            );
          }

          // Atualiza versão no localStorage
          localStorage.setItem('mesc-app-version', serverVersion);
          
          // Força reload com cache bust
          const timestamp = Date.now();
          console.log('[VersionCheck] Reloading application...');
          
          setTimeout(() => {
            window.location.href = `${window.location.origin}${window.location.pathname}?v=${timestamp}`;
          }, 500);
        }
      } catch (error) {
        console.error('[VersionCheck] Error checking version:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Checagem inicial
    checkVersion();

    // Checagem periódica a cada 2 minutos
    const interval = setInterval(checkVersion, 2 * 60 * 1000);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, []);
}
