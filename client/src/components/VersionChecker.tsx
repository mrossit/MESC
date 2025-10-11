import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { RefreshCw, X } from 'lucide-react';
import {
  APP_VERSION,
  checkVersion,
  clearAppCache,
  forceReload,
  recordActivity,
  checkInactivity,
  fetchServerVersion,
  startVersionPolling
} from '@/lib/version';

export function VersionChecker() {
  const { toast } = useToast();
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Verificar versão na inicialização
    const hasNewVersion = checkVersion();
    if (hasNewVersion) {
      // Dar um tempo para a aplicação carregar antes de mostrar o banner
      setTimeout(() => {
        setShowUpdateBanner(true);
      }, 2000);
    }

    // Registrar atividade do usuário
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      recordActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Verificar inatividade a cada 5 minutos
    const inactivityInterval = setInterval(async () => {
      if (checkInactivity(10)) {
        await clearAppCache();
        recordActivity(); // Reset timer
      }
    }, 5 * 60 * 1000); // 5 minutos

    // Iniciar polling de versão do servidor
    startVersionPolling(15); // Verifica a cada 15 minutos

    // Escutar evento de nova versão disponível
    const handleNewVersion = (event: CustomEvent) => {
      const { serverVersion } = event.detail;
      setNewVersion(serverVersion);
      setShowUpdateBanner(true);

      toast({
        title: 'Nova versão disponível!',
        description: `Versão ${serverVersion} está disponível. Clique em "Atualizar" para obter a versão mais recente.`,
        duration: 10000,
      });
    };

    window.addEventListener('new-version-available', handleNewVersion as EventListener);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityInterval);
      window.removeEventListener('new-version-available', handleNewVersion as EventListener);
    };
  }, [toast]);

  const handleUpdate = async () => {
    setIsUpdating(true);

    toast({
      title: 'Atualizando aplicação...',
      description: 'Limpando cache e recarregando a página...',
    });

    try {
      // Limpar cache
      await clearAppCache();

      // Aguardar um momento
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recarregar página
      forceReload();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: 'Erro na atualização',
        description: 'Tente recarregar a página manualmente (Ctrl+Shift+R)',
        variant: 'destructive',
      });
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
  };

  if (!showUpdateBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className="border-primary bg-primary/5">
        <RefreshCw className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Nova versão disponível!
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-3">
            {newVersion
              ? `Versão ${newVersion} está disponível.`
              : 'Uma nova versão do sistema foi detectada.'}
            {' '}Atualize agora para obter os recursos mais recentes.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Atualizando...' : 'Atualizar Agora'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
            >
              Mais Tarde
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Badge de versão (opcional - pode ser usado no footer ou settings)
 */
export function VersionBadge() {
  return (
    <div className="text-xs text-muted-foreground">
      Versão {APP_VERSION}
    </div>
  );
}
