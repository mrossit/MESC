import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [lastPromptTime, setLastPromptTime] = useState<number>(0);

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

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className=" rounded-lg shadow-lg border border-neutral-accentWarm/30 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-neutral-accentWarm dark:text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Nova versão disponível</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Uma nova versão do MESC está disponível. Atualize para obter as últimas funcionalidades e melhorias.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleUpdate}
                className="bg-neutral-accentWarm dark:bg-amber-700 hover:bg-neutral-accentWarm/90 dark:hover:bg-amber-600"
              >
                Atualizar agora
              </Button>
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