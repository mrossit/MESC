import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, X } from "lucide-react";
import { clearCacheAndReload, hasVersionChanged, APP_VERSION } from "@/lib/version";

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Verifica mudança de versão na inicialização
    if (hasVersionChanged()) {
      console.log('🔄 Nova versão detectada, limpando cache...');
      clearCacheAndReload();
      return;
    }

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
                console.log('🆕 Nova versão disponível!');
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
          console.log('📢 Service Worker atualizado:', event.data.version);
          setShowUpdate(true);
        }
      });

      // Listener para quando novo SW assume o controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Novo service worker ativo, recarregando...');
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (swRegistration?.waiting) {
      // Envia mensagem para o SW waiting assumir o controle
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Se não há SW waiting, apenas limpa cache e recarrega
      clearCacheAndReload();
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
      <Alert className="border-primary bg-primary/5 dark:bg-primary/10 shadow-lg">
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
            Uma nova versão do MESC (v{APP_VERSION}) está disponível com melhorias e correções.
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
