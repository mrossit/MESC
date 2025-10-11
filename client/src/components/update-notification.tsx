import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, X } from "lucide-react";
import { clearCacheAndReload, hasVersionChanged, APP_VERSION } from "@/lib/version";

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [newVersion, setNewVersion] = useState<string>('');

  useEffect(() => {
    // Se usuário já aceitou atualização, não mostrar novamente
    if (sessionStorage.getItem('update-accepted') === 'true') {
      return;
    }

    // Listener para evento de nova versão disponível (disparado por useVersionCheck)
    const handleAppUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setNewVersion(customEvent.detail.newVersion);
      setShowUpdate(true);
    };

    window.addEventListener('app-update-available', handleAppUpdate);

    // Configura listener para atualizações do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration);

        // Verifica atualizações periodicamente (a cada 30 segundos)
        setInterval(() => {
          registration.update();
        }, 30000);

        // Listener para quando novo SW estiver waiting
        const handleUpdateFound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowUpdate(true);
              }
            });
          }
        };

        registration.addEventListener('updatefound', handleUpdateFound);

        // Verifica imediatamente se já tem atualização
        if (registration.waiting) {
          setShowUpdate(true);
        }
      });

      // Listener para mensagens do service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          setShowUpdate(true);
        }
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('app-update-available', handleAppUpdate);
    };
  }, [newVersion]);

  const handleUpdate = async () => {
    // Marca que usuário aceitou a atualização para não mostrar novamente
    sessionStorage.setItem('update-accepted', 'true');


    try {
      // 1. Desregistra service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Limpa todos os caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }

      // 3. Atualiza versão no localStorage
      if (newVersion) {
        localStorage.setItem('mesc-app-version', newVersion);
      }

      // 4. Força reload com cache bust
      window.location.href = `${window.location.origin}${window.location.pathname}?v=${Date.now()}`;
    } catch (error) {
      console.error('[Update] Error during update:', error);
      // Mesmo com erro, tenta recarregar
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Agenda para mostrar novamente em 5 minutos
    setTimeout(() => {
      setShowUpdate(true);
    }, 5 * 60 * 1000);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] md:bottom-4 md:left-auto md:right-4 md:max-w-md">
      <Alert className="border-primary bg-primary/5 dark:bg-primary/10 backdrop-blur-md shadow-lg">
        <RefreshCw className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between pr-6">
          Nova versão disponível!
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute right-2 top-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm">
            Uma nova versão do MESC (v{newVersion || APP_VERSION}) está disponível com melhorias e correções.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleUpdate} size="sm" className="flex-1">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Atualizar Agora
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Mais Tarde
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
