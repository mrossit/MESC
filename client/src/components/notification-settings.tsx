import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Smartphone, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { pushNotificationService, NotificationType } from '../services/push-notifications.service';
import { useToast } from '../hooks/use-toast';

interface NotificationSettings {
  enabled: boolean;
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  sound: boolean;
  vibration: boolean;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    types: {
      [NotificationType.SCHEDULE]: true,
      [NotificationType.SUBSTITUTION]: true,
      [NotificationType.REMINDER]: true,
      [NotificationType.ANNOUNCEMENT]: true,
      [NotificationType.FORMATION]: true,
      [NotificationType.APPROVAL]: true,
      [NotificationType.SYSTEM]: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    },
    sound: true,
    vibration: true
  });

  useEffect(() => {
    checkNotificationStatus();
    loadSettings();
  }, []);

  const checkNotificationStatus = async () => {
    const currentPermission = await pushNotificationService.getPermissionStatus();
    setPermission(currentPermission);

    const subscription = await pushNotificationService.getCurrentSubscription();
    setIsSubscribed(!!subscription);
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationService.requestPermission();

      if (result === 'granted') {
        await pushNotificationService.initialize();
        setPermission('granted');
        setIsSubscribed(true);

        const newSettings = { ...settings, enabled: true };
        saveSettings(newSettings);

        toast({
          title: 'Notificações Ativadas',
          description: 'Você receberá notificações importantes do sistema MESC',
        });
      } else if (result === 'denied') {
        toast({
          title: 'Permissão Negada',
          description: 'Você precisa habilitar as notificações nas configurações do navegador',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar as notificações',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.unsubscribeUser();
      setIsSubscribed(false);

      const newSettings = { ...settings, enabled: false };
      saveSettings(newSettings);

      toast({
        title: 'Notificações Desativadas',
        description: 'Você não receberá mais notificações push',
      });
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar as notificações',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.showLocalNotification(
        '🔔 Teste de Notificação',
        'Esta é uma notificação de teste. As notificações estão funcionando corretamente!',
        {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: settings.vibration ? [200, 100, 200] : undefined,
          requireInteraction: true
        }
      );

      toast({
        title: 'Teste Enviado',
        description: 'Verifique se a notificação apareceu',
      });
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar notificação de teste',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeToggle = (type: NotificationType) => {
    const newSettings = {
      ...settings,
      types: {
        ...settings.types,
        [type]: !settings.types[type]
      }
    };
    saveSettings(newSettings);
  };

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      [NotificationType.SCHEDULE]: 'Escalas',
      [NotificationType.SUBSTITUTION]: 'Substituições',
      [NotificationType.REMINDER]: 'Lembretes',
      [NotificationType.ANNOUNCEMENT]: 'Comunicados',
      [NotificationType.FORMATION]: 'Formação',
      [NotificationType.APPROVAL]: 'Aprovações',
      [NotificationType.SYSTEM]: 'Sistema'
    };
    return labels[type];
  };

  const getTypeDescription = (type: NotificationType): string => {
    const descriptions: Record<NotificationType, string> = {
      [NotificationType.SCHEDULE]: 'Novas escalas e alterações',
      [NotificationType.SUBSTITUTION]: 'Pedidos e confirmações de substituição',
      [NotificationType.REMINDER]: 'Lembretes de compromissos',
      [NotificationType.ANNOUNCEMENT]: 'Avisos da coordenação',
      [NotificationType.FORMATION]: 'Novos módulos e atividades',
      [NotificationType.APPROVAL]: 'Aprovações pendentes',
      [NotificationType.SYSTEM]: 'Atualizações do sistema'
    };
    return descriptions[type];
  };

  const getTypeIcon = (type: NotificationType): string => {
    const icons: Record<NotificationType, string> = {
      [NotificationType.SCHEDULE]: '📅',
      [NotificationType.SUBSTITUTION]: '🔄',
      [NotificationType.REMINDER]: '⏰',
      [NotificationType.ANNOUNCEMENT]: '📢',
      [NotificationType.FORMATION]: '🎓',
      [NotificationType.APPROVAL]: '✅',
      [NotificationType.SYSTEM]: '⚙️'
    };
    return icons[type];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Notificações
        </CardTitle>
        <CardDescription>
          Gerencie como e quando você recebe notificações do sistema MESC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status das Notificações */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações importantes diretamente no seu dispositivo
              </p>
            </div>
            <div className="flex items-center gap-2">
              {permission === 'granted' && isSubscribed && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Ativo
                </Badge>
              )}
              {permission === 'denied' && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  Bloqueado
                </Badge>
              )}
              {permission === 'default' && (
                <Badge variant="secondary" className="gap-1">
                  <Bell className="h-3 w-3" />
                  Não configurado
                </Badge>
              )}
            </div>
          </div>

          {permission === 'denied' && (
            <Alert>
              <BellOff className="h-4 w-4" />
              <AlertDescription>
                As notificações estão bloqueadas. Para receber notificações, você precisa:
                <ol className="mt-2 ml-4 list-decimal">
                  <li>Clique no ícone de cadeado na barra de endereços</li>
                  <li>Encontre "Notificações" nas permissões</li>
                  <li>Mude de "Bloquear" para "Permitir"</li>
                  <li>Recarregue a página</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {permission !== 'denied' && (
            <div className="flex gap-2">
              {!isSubscribed ? (
                <Button
                  onClick={handleEnableNotifications}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Ativar Notificações
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDisableNotifications}
                    disabled={isLoading}
                  >
                    <BellOff className="mr-2 h-4 w-4" />
                    Desativar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleTestNotification}
                    disabled={isLoading}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    Testar
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Tipos de Notificação */}
        <div className="space-y-4">
          <div>
            <Label className="text-base">Tipos de Notificação</Label>
            <p className="text-sm text-muted-foreground">
              Escolha quais tipos de notificação você deseja receber
            </p>
          </div>

          <div className="space-y-3">
            {Object.values(NotificationType).map((type) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getTypeIcon(type)}</span>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      {getTypeLabel(type)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getTypeDescription(type)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.types[type]}
                  onCheckedChange={() => handleTypeToggle(type)}
                  disabled={!isSubscribed}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Configurações Adicionais */}
        <div className="space-y-4">
          <div>
            <Label className="text-base">Configurações Adicionais</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">Som</Label>
                <p className="text-xs text-muted-foreground">
                  Tocar som ao receber notificações
                </p>
              </div>
              <Switch
                checked={settings.sound}
                onCheckedChange={(checked) =>
                  saveSettings({ ...settings, sound: checked })
                }
                disabled={!isSubscribed}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">Vibração</Label>
                <p className="text-xs text-muted-foreground">
                  Vibrar ao receber notificações
                </p>
              </div>
              <Switch
                checked={settings.vibration}
                onCheckedChange={(checked) =>
                  saveSettings({ ...settings, vibration: checked })
                }
                disabled={!isSubscribed}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">Horário Silencioso</Label>
                <p className="text-xs text-muted-foreground">
                  Não receber notificações das {settings.quietHours.start} às {settings.quietHours.end}
                </p>
              </div>
              <Switch
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) =>
                  saveSettings({
                    ...settings,
                    quietHours: { ...settings.quietHours, enabled: checked }
                  })
                }
                disabled={!isSubscribed}
              />
            </div>
          </div>
        </div>

        {/* Sincronização */}
        {isSubscribed && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">Sincronização</Label>
                <p className="text-xs text-muted-foreground">
                  Sincronizar notificações pendentes
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await pushNotificationService.syncPendingNotifications();
                  toast({
                    title: 'Sincronização Iniciada',
                    description: 'Verificando notificações pendentes...',
                  });
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}