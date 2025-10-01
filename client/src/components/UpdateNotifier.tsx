import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listener para quando o SW encontrar uma atualização
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Verificar por atualizações periodicamente (a cada 60 segundos)
        setInterval(() => {
          reg.update();
        }, 60000);

        // Listener para novo SW waiting
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Listener para mensagens do SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          setUpdateAvailable(true);
        }
      });

      // Verificar se já há um SW esperando para ativar
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setUpdateAvailable(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Pedir ao SW para pular a espera e ativar imediatamente
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Recarregar a página para usar a nova versão
    window.location.reload();
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg border-2 border-primary-foreground/20">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Nova versão disponível</h3>
            <p className="text-xs opacity-90 mb-3">
              Uma atualização do sistema está disponível. Clique em atualizar para obter as melhorias mais recentes.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleUpdate}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setUpdateAvailable(false)}
                className="text-xs text-primary-foreground hover:text-primary-foreground/80"
              >
                Depois
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
