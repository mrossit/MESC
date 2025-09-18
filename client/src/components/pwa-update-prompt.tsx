import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [lastPromptTime, setLastPromptTime] = useState<number>(0);
  const [forceUpdateAvailable, setForceUpdateAvailable] = useState(false);

  useEffect(() => {
    // Disable PWA update prompts in development mode
    if (import.meta.env.DEV) {
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Prevent showing prompt too frequently (minimum 5 minutes apart)
                const now = Date.now();
                if (now - lastPromptTime > 5 * 60 * 1000) {
                  setWaitingWorker(newWorker);
                  setShowUpdatePrompt(true);
                  setLastPromptTime(now);
                }
              }
            });
          }
        });
      });

      // Check if there's already a waiting worker (only once on load)
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting && lastPromptTime === 0) {
          const now = Date.now();
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
          setLastPromptTime(now);
        }
      });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('Service worker updated to version:', event.data.version);
          setForceUpdateAvailable(true);
          setShowUpdatePrompt(true);
        }
      });
    }
  }, [lastPromptTime]);

  const handleUpdate = async () => {
    if (waitingWorker) {
      try {
        // Hide the prompt immediately for better UX
        setShowUpdatePrompt(false);
        
        // Setup listeners before sending message
        const controllerChangePromise = new Promise<void>((resolve) => {
          const handler = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handler);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handler);
        });

        // Send skip waiting message
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for controller change or timeout
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(resolve, 3000);
        });

        await Promise.race([controllerChangePromise, timeoutPromise]);
        window.location.reload();
        
      } catch (error) {
        console.error('Erro durante atualização:', error);
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  const handleForceUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({ type: 'FORCE_UPDATE' });
        }
      });
    }
    // Clear all local storage and caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    localStorage.clear();
    sessionStorage.clear();
    
    // Force hard reload after a short delay
    setTimeout(() => {
      window.location.href = window.location.href + '?v=' + Date.now();
    }, 500);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className=" rounded-lg shadow-lg border border-neutral-accentWarm/30 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-neutral-accentWarm dark:text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              {forceUpdateAvailable ? 'Atualização instalada' : 'Nova versão disponível'}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {forceUpdateAvailable 
                ? 'Uma nova versão foi instalada. Recarregue para aplicar as mudanças.'
                : 'Uma nova versão do MESC está disponível. Atualize para obter as últimas funcionalidades e melhorias.'
              }
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={forceUpdateAvailable ? handleForceUpdate : handleUpdate}
                className="bg-neutral-accentWarm dark:bg-amber-700 hover:bg-neutral-accentWarm/90 dark:hover:bg-amber-600"
              >
                {forceUpdateAvailable ? 'Recarregar' : 'Atualizar agora'}
              </Button>
              {forceUpdateAvailable && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open('/clear-cache.html', '_blank')}
                  className="text-xs"
                >
                  Limpar Cache
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
              >
                Mais tarde
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}