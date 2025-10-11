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
          return;
        }

        // Se a versão mudou, dispara evento para mostrar notificação
        if (serverVersion !== currentVersionRef.current) {

          // Dispara evento customizado para UpdateNotification mostrar alerta
          const event = new CustomEvent('app-update-available', {
            detail: {
              newVersion: serverVersion,
              currentVersion: currentVersionRef.current
            }
          });
          window.dispatchEvent(event);

          // Atualiza referência para não disparar múltiplas vezes
          currentVersionRef.current = serverVersion;
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
