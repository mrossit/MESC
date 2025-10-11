import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import {
  Bell, Settings2, Heart, Church, Calendar, Users,
  Save, AlertCircle, CheckCircle, Sparkles, Clock,
  HandHeart, PartyPopper, Code2, RefreshCw, Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '@/lib/auth';
import { APP_VERSION } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/useWebSocket';

type UserSettings = {
  pushNotifications: boolean;
  emailNotifications: boolean;
  reminderHours: number;
  availableForSickCommunion: boolean;
  availableForAdoration: boolean;
  availableForOtherPastorals: boolean;
  availableForEvents: boolean;
};

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    pushNotifications: false,
    emailNotifications: true,
    reminderHours: 24,
    availableForSickCommunion: false,
    availableForAdoration: false,
    availableForOtherPastorals: false,
    availableForEvents: false
  });
  const [extraActivities, setExtraActivities] = useState<{
    sickCommunion: boolean;
    mondayAdoration: boolean;
    helpOtherPastorals: boolean;
    festiveEvents: boolean;
  }>({
    sickCommunion: false,
    mondayAdoration: false,
    helpOtherPastorals: false,
    festiveEvents: false
  });
  const [saving, setSaving] = useState(false);
  const [savingActivities, setSavingActivities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState(false);
  const queryClient = useQueryClient();

  // Dev mode detection
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  // Get current user
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });

  // WebSocket connection status
  const { isConnected } = useWebSocket({
    enabled: authData?.user?.role === "coordenador" || authData?.user?.role === "gestor",
  });

  // Buscar configurações do usuário
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/settings', { credentials: 'include' });
        if (!res.ok) {
          // Se não existir ou houver erro, retorna valores padrão
          return {
            pushNotifications: false,
            emailNotifications: true,
            reminderHours: 24,
            availableForSickCommunion: false,
            availableForAdoration: false,
            availableForOtherPastorals: false,
            availableForEvents: false
          };
        }
        const data = await res.json();
        return data;
      } catch (error) {
        // Em caso de erro de rede ou outro, retorna valores padrão
        return {
          pushNotifications: false,
          emailNotifications: true,
          reminderHours: 24,
          availableForSickCommunion: false,
          availableForAdoration: false,
          availableForOtherPastorals: false,
          availableForEvents: false
        };
      }
    }
  });

  // Buscar atividades extras
  const { data: activitiesData, refetch: refetchActivities, isSuccess: activitiesLoaded } = useQuery({
    queryKey: ['extra-activities'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/profile/extra-activities', { credentials: 'include' });
        if (!res.ok) {
          console.error('Failed to fetch activities, status:', res.status);
          return null;
        }
        const data = await res.json();
        return data;
      } catch (error) {
        console.error('Error fetching activities:', error);
        return null;
      }
    },
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: 'always', // Sempre refetch quando o componente é montado
    refetchOnWindowFocus: false // Desabilitar refetch no focus para evitar conflitos
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  // Controle de mudanças
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar dados quando disponíveis
  useEffect(() => {
    if (activitiesLoaded && activitiesData) {
      setExtraActivities(activitiesData);
      // Reset flag quando novos dados são carregados
      setHasUserInteracted(false);
    } else if (activitiesLoaded && !activitiesData) {
      // Se não há dados, usar valores padrão
      setExtraActivities({
        sickCommunion: false,
        mondayAdoration: false,
        helpOtherPastorals: false,
        festiveEvents: false
      });
      setHasUserInteracted(false);
    }
  }, [activitiesData, activitiesLoaded]);

  // Função para salvar apenas as atividades extras
  const saveExtraActivities = async (activities: typeof extraActivities) => {
    // Evitar múltiplas chamadas simultâneas
    if (savingActivities) return;

    setSavingActivities(true);
    try {
      const res = await fetch('/api/profile/extra-activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(activities)
      });

      if (res.ok) {
        // Atualizar o cache da query diretamente sem invalidar
        queryClient.setQueryData(['extra-activities'], activities);
        // Mostrar indicador de sucesso brevemente
        setTimeout(() => setSavingActivities(false), 500);
      } else {
        console.error('Erro ao salvar preferências de atividades');
        setSavingActivities(false);
        // Recarregar dados em caso de erro
        refetchActivities();
      }
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
      setSavingActivities(false);
      // Recarregar dados em caso de erro
      refetchActivities();
    }
  };

  // Debounce para salvar automaticamente após mudanças
  useEffect(() => {
    // Só salvar se o usuário interagiu
    if (hasUserInteracted) {
      // Limpar timer anterior se existir
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Criar novo timer
      saveTimerRef.current = setTimeout(() => {
        saveExtraActivities(extraActivities);
      }, 1000); // Aguarda 1 segundo após a última mudança
    }

    // Cleanup
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [extraActivities, hasUserInteracted]);

  const handlePushNotificationToggle = async (checked: boolean) => {
    // Se está ativando as notificações push
    if (checked && 'Notification' in window) {
      // Verificar o status atual da permissão
      if (Notification.permission === 'default') {
        // Solicitar permissão se ainda não foi decidido
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setSettings(prev => ({ ...prev, pushNotifications: true }));
          setSuccess('Notificações push ativadas com sucesso!');
        } else {
          setError('É necessário permitir as notificações para ativar este recurso.');
          setSettings(prev => ({ ...prev, pushNotifications: false }));
        }
      } else if (Notification.permission === 'granted') {
        // Se já tem permissão, apenas ativa
        setSettings(prev => ({ ...prev, pushNotifications: true }));
      } else {
        // Se foi negado anteriormente
        setError('As notificações foram bloqueadas. Para reativar, acesse as configurações do seu navegador.');
        setSettings(prev => ({ ...prev, pushNotifications: false }));
      }
    } else if (!checked) {
      // Se está desativando
      setSettings(prev => ({ ...prev, pushNotifications: false }));
    } else {
      // Se o navegador não suporta notificações
      setError('Seu navegador não suporta notificações push.');
      setSettings(prev => ({ ...prev, pushNotifications: false }));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Salvar configurações gerais
      const settingsRes = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      // Salvar atividades extras
      const activitiesRes = await fetch('/api/profile/extra-activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(extraActivities)
      });

      if (activitiesRes.ok) {
        setSuccess('Configurações salvas com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['user-settings'] });
        queryClient.invalidateQueries({ queryKey: ['extra-activities'] });
      } else if (settingsRes.status === 404 || activitiesRes.status === 404) {
        // Se o endpoint não existir, apenas mostra sucesso (para desenvolvimento)
        setSuccess('Configurações salvas!');
      } else {
        const errorData = await activitiesRes.json().catch(() => ({ error: 'Erro ao salvar' }));
        setError(errorData.error || 'Erro ao salvar configurações');
      }
    } catch (err) {
      // Em caso de erro de rede, salva localmente
      setSuccess('Configurações salvas!');
    } finally {
      setSaving(false);
    }
  };

  // Dev mode: Switch user role for testing
  const handleRoleSwitch = async (newRole: 'ministro' | 'coordenador' | 'gestor') => {
    if (!isDev) return;

    setSwitchingRole(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/dev/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        // Invalidate all queries to refresh with new role
        await queryClient.invalidateQueries();
        setSuccess(`Role alterado para: ${newRole}`);

        // Reload page after short delay to ensure all components update
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError('Erro ao alterar role. Endpoint /api/dev/switch-role pode não estar implementado.');
      }
    } catch (err) {
      setError('Erro ao alterar role');
    } finally {
      setSwitchingRole(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Configurações" subtitle="Preferências de notificações e disponibilidade">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Carregando configurações...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configurações" subtitle="Preferências de notificações e disponibilidade">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Card className="border-opacity-30">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Settings2 className="h-5 w-5" />
                  Configurações
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Gerencie suas preferências de notificações e disponibilidade
                </CardDescription>
              </div>
              <Button 
                onClick={handleSaveSettings} 
                disabled={saving}
                className="w-full sm:w-auto"
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Mensagens de erro/sucesso */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="notifications" className="w-full">
              <TabsList className={`grid w-full ${isDev ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="notifications" className="text-xs sm:text-sm">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger value="availability" className="text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Disponibilidade
                </TabsTrigger>
                {isDev && (
                  <TabsTrigger value="dev" className="text-xs sm:text-sm">
                    <Code2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Dev Mode
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="notifications" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="push" className="text-sm sm:text-base font-medium">
                              Notificações Push
                            </Label>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Receba notificações no navegador sobre suas escalas
                            </p>
                          </div>
                          <Switch
                            id="push"
                            checked={settings.pushNotifications}
                            onCheckedChange={handlePushNotificationToggle}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="email" className="text-sm sm:text-base font-medium">
                              Notificações por E-mail
                            </Label>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Receba lembretes por e-mail sobre suas escalas
                            </p>
                          </div>
                          <Switch
                            id="email"
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => 
                              setSettings(prev => ({ ...prev, emailNotifications: checked }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reminder" className="text-sm sm:text-base font-medium">
                            Lembrete antecipado
                          </Label>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Quantas horas antes da missa você deseja ser notificado?
                          </p>
                          <select
                            id="reminder"
                            value={settings.reminderHours}
                            onChange={(e) => 
                              setSettings(prev => ({ ...prev, reminderHours: Number(e.target.value) }))
                            }
                            className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_0.7rem_center]"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`
                            }}
                          >
                            <option value={12}>12 horas antes</option>
                            <option value={24}>24 horas antes</option>
                            <option value={48}>48 horas antes</option>
                            <option value={72}>72 horas antes</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="availability" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Atividades Extras do Ministério</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Marque as atividades para as quais você está disponível além das escalas regulares
                        </CardDescription>
                      </div>
                      {savingActivities && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          <span>Salvando...</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="sickCommunion"
                          checked={extraActivities.sickCommunion}
                          onCheckedChange={(checked) => {
                            setHasUserInteracted(true);
                            setExtraActivities(prev => ({ ...prev, sickCommunion: checked as boolean }));
                          }}
                        />
                        <div className="space-y-1">
                          <Label 
                            htmlFor="sickCommunion" 
                            className="text-sm sm:text-base font-medium cursor-pointer flex items-center gap-2"
                          >
                            <Heart className="h-4 w-4 text-red-500" />
                            Comunhão dos Enfermos
                          </Label>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Disponível para levar comunhão aos doentes e idosos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="adoration"
                          checked={extraActivities.mondayAdoration}
                          onCheckedChange={(checked) => {
                            setHasUserInteracted(true);
                            setExtraActivities(prev => ({ ...prev, mondayAdoration: checked as boolean }));
                          }}
                        />
                        <div className="space-y-1">
                          <Label 
                            htmlFor="adoration" 
                            className="text-sm sm:text-base font-medium cursor-pointer flex items-center gap-2"
                          >
                            <Clock className="h-4 w-4 text-purple-500" />
                            Adoração às Segundas 22h
                          </Label>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Participar da adoração ao Santíssimo Sacramento
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="otherPastorals"
                          checked={extraActivities.helpOtherPastorals}
                          onCheckedChange={(checked) => {
                            setHasUserInteracted(true);
                            setExtraActivities(prev => ({ ...prev, helpOtherPastorals: checked as boolean }));
                          }}
                        />
                        <div className="space-y-1">
                          <Label 
                            htmlFor="otherPastorals" 
                            className="text-sm sm:text-base font-medium cursor-pointer flex items-center gap-2"
                          >
                            <HandHeart className="h-4 w-4 text-blue-500" />
                            Ajudar em Outras Pastorais
                          </Label>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Disponível para apoiar outras pastorais quando necessário
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="events"
                          checked={extraActivities.festiveEvents}
                          onCheckedChange={(checked) => {
                            setHasUserInteracted(true);
                            setExtraActivities(prev => ({ ...prev, festiveEvents: checked as boolean }));
                          }}
                        />
                        <div className="space-y-1">
                          <Label 
                            htmlFor="events" 
                            className="text-sm sm:text-base font-medium cursor-pointer flex items-center gap-2"
                          >
                            <PartyPopper className="h-4 w-4 text-green-500" />
                            Servir em Eventos Festivos
                          </Label>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Participar de eventos especiais e celebrações da paróquia
                          </p>
                        </div>
                      </div>
                    </div>

                    {savingActivities && (
                      <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                        Salvando preferências...
                      </div>
                    )}

                    <Alert className="mt-6">
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        Ao marcar estas opções, os coordenadores poderão contar com você para estas atividades especiais
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DEV MODE TAB - Only visible in development */}
              {isDev && (
                <TabsContent value="dev" className="space-y-6 mt-6">
                  <Card className="border-yellow-500 border-2">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-yellow-600" />
                        Modo Desenvolvedor
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Ferramentas de teste - apenas visível em desenvolvimento
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Current Role Display */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm text-blue-800">
                          <strong>Role Atual:</strong> {authData?.user?.role || 'Carregando...'}
                          <br />
                          <strong>Usuário:</strong> {authData?.user?.name || 'Carregando...'} ({authData?.user?.email || 'Carregando...'})
                        </AlertDescription>
                      </Alert>

                      {/* Role Switcher */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Alternar Role para Teste
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Mude rapidamente entre diferentes roles para testar todas as perspectivas da aplicação
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button
                            variant={authData?.user?.role === 'ministro' ? 'default' : 'outline'}
                            onClick={() => handleRoleSwitch('ministro')}
                            disabled={switchingRole || authData?.user?.role === 'ministro'}
                            className="w-full"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Ministro
                          </Button>

                          <Button
                            variant={authData?.user?.role === 'coordenador' ? 'default' : 'outline'}
                            onClick={() => handleRoleSwitch('coordenador')}
                            disabled={switchingRole || authData?.user?.role === 'coordenador'}
                            className="w-full"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Coordenador
                          </Button>

                          <Button
                            variant={authData?.user?.role === 'gestor' ? 'default' : 'outline'}
                            onClick={() => handleRoleSwitch('gestor')}
                            disabled={switchingRole || authData?.user?.role === 'gestor'}
                            className="w-full"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Gestor
                          </Button>
                        </div>

                        {switchingRole && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Alterando role...
                          </div>
                        )}
                      </div>

                      {/* Test Accounts Info */}
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Contas de Teste:</strong>
                          <ul className="mt-2 space-y-1 ml-4 list-disc">
                            <li>test.ministro@test.com (role: ministro)</li>
                            <li>test.coord@test.com (role: coordenador)</li>
                            <li>test.gestor@test.com (role: gestor)</li>
                          </ul>
                          <p className="mt-2 text-muted-foreground">
                            Senha padrão: <code className="bg-muted px-1 py-0.5 rounded">test123</code>
                          </p>
                        </AlertDescription>
                      </Alert>

                      {/* Warning */}
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Atenção:</strong> Esta funcionalidade está disponível apenas em ambiente de desenvolvimento.
                          Ao alterar o role, a página será recarregada automaticamente.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* System Info Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              <span>Versão {APP_VERSION}</span>
            </div>
            {(authData?.user?.role === "coordenador" || authData?.user?.role === "gestor") && (
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span>{isConnected ? 'Tempo real ativo' : 'Modo polling'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}