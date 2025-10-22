import { Layout } from "@/components/layout";
import { MinisterDashboard } from "@/components/minister-dashboard";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  FileQuestion,
  UserCheck,
  TrendingDown,
  CalendarClock,
  Volume2
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useRef, useState, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from "@/lib/queryClient";
import { parseScheduleDate } from "@/lib/utils";

// Memoized connection status indicator to prevent unnecessary re-renders
const ConnectionStatus = memo(({ isConnected }: { isConnected: boolean }) => (
  <div className="group relative inline-flex items-center">
    {/* Small dot indicator - uses absolute positioning to prevent layout shifts */}
    <div
      className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} cursor-help transition-colors duration-300`}
      title={isConnected ? 'Tempo real ativo' : 'Modo pesquisa periódica'}
    />
    {/* Tooltip on hover - absolute positioned to not affect layout */}
    <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-3 py-2 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none">
      <div className="absolute -top-1 left-2 w-2 h-2 bg-popover rotate-45" />
      {isConnected ? '✓ Atualizações em tempo real ativas' : '⟳ Atualização a cada 5 minutos'}
    </div>
  </div>
));

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitleRef = useRef<string>(document.title);

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Fetch urgent alerts - refetch every 5 minutes (WebSocket handles real-time updates)
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/dashboard/urgent-alerts"],
    enabled: authData?.user?.role === "coordenador" || authData?.user?.role === "gestor",
    refetchInterval: 300000, // Refetch every 5 minutes (300s)
  });

  // Play sound alert for critical masses
  const playSoundAlert = () => {
    if (!soundEnabled) return;

    if (!audioRef.current) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  // WebSocket connection for real-time notifications
  const { isConnected } = useWebSocket({
    enabled: authData?.user?.role === "coordenador" || authData?.user?.role === "gestor",
    onSubstitutionRequest: (data) => {
      // Refetch alerts when new substitution request
      refetchAlerts();
      setUnreadAlerts(prev => prev + 1);
    },
    onCriticalMass: (data) => {
      // Play sound for critical mass
      playSoundAlert();
      refetchAlerts();
      setUnreadAlerts(prev => prev + 1);
    },
    onAlertUpdate: (data) => {
      // Check for critical masses (< 12h)
      if (data.criticalMasses?.length > 0) {
        data.criticalMasses.forEach((mass: any) => {
          if (mass.hoursUntil < 12) {
            playSoundAlert();
          }
        });
      }
    }
  });

  // Fetch next week masses
  const { data: nextWeekData } = useQuery({
    queryKey: ["/api/dashboard/next-week-masses"],
    enabled: authData?.user?.role === "coordenador" || authData?.user?.role === "gestor",
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  // Fetch ministry stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/dashboard/ministry-stats"],
    enabled: authData?.user?.role === "coordenador" || authData?.user?.role === "gestor",
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const user = authData?.user;
  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  // Update browser tab title with notification badge
  useEffect(() => {
    if (!isCoordinator) return;

    const updateTitle = () => {
      if (unreadAlerts > 0 && !document.hasFocus()) {
        document.title = `(${unreadAlerts}) ${originalTitleRef.current}`;
      } else {
        document.title = originalTitleRef.current;
      }
    };

    updateTitle();

    const handleFocus = () => {
      setUnreadAlerts(0);
      document.title = originalTitleRef.current;
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.title = originalTitleRef.current;
    };
  }, [unreadAlerts, isCoordinator]);

  const getTitle = () => {
    if (user?.role === "coordenador") return "Central de Operações";
    if (user?.role === "gestor") return "Central de Operações";
    return "Dashboard Ministro";
  };

  const getSubtitle = () => {
    return isCoordinator
      ? "Visão completa e ações rápidas"
      : "Acompanhe suas atividades";
  };

  // Se for ministro, mostra o dashboard simplificado
  if (user?.role === "ministro") {
    return (
      <Layout title={getTitle()} subtitle={getSubtitle()}>
        <MinisterDashboard />
      </Layout>
    );
  }

  const alerts = alertsData?.data;
  const nextWeek = nextWeekData?.data || [];
  const stats = statsData?.data;

  const hasCriticalAlerts = (alerts?.criticalMasses?.length || 0) > 0 || (alerts?.urgentSubstitutions?.length || 0) > 0;

  return (
    <Layout title={getTitle()} subtitle={getSubtitle()}>
      <div className="space-y-6">
        {/* Sound Control - Minimized, no version/connection status */}
        {isCoordinator && (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="gap-2"
            >
              <Volume2 className={`h-4 w-4 ${soundEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-xs">{soundEnabled ? 'Som ativo' : 'Som off'}</span>
            </Button>
          </div>
        )}

        {/* URGENT ALERTS SECTION */}
        {hasCriticalAlerts && (
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">Atenção Urgente - Ação Necessária!</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              {alerts?.criticalMasses?.map((mass: any) => (
                <div
                  key={mass.scheduleId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white/10 rounded-md cursor-pointer hover:bg-white/20 transition-colors"
                  onClick={() => setLocation(`/schedules?date=${mass.date}`)}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm break-words">
                        {format(parseScheduleDate(mass.date), "dd/MM - EEEE", { locale: ptBR })} às {mass.massTime}
                      </p>
                      <p className="text-xs opacity-90">
                        {mass.vacancies} vagas vazias • {mass.hoursUntil}h até a missa
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 flex-shrink-0 self-end sm:self-center" />
                </div>
              ))}

              {alerts?.urgentSubstitutions?.map((sub: any) => (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white/10 rounded-md cursor-pointer hover:bg-white/20 transition-colors"
                  onClick={() => setLocation('/substitutions')}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm break-words">
                        Substituição pendente - {sub.requesterName}
                      </p>
                      <p className="text-xs opacity-90">
                        {format(parseScheduleDate(sub.massDate), "dd/MM", { locale: ptBR })} • {sub.hoursUntil}h restantes
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 flex-shrink-0 self-end sm:self-center" />
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* REAL METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/ministers')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ministros Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeMinisters || 0}</div>
              <p className="text-xs text-muted-foreground">Clique para gerenciar</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/questionnaires')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.responseRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.questionnaireStatus === 'closed' ? 'Questionário fechado' : 'Questionário ativo'}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/schedules')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobertura do Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.monthCoverage?.fullyStaffed || 0}/{stats?.monthCoverage?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.monthCoverage?.percentage || 0}% completas
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/approvals')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ações Pendentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingActions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {alerts?.totalAlerts || 0} críticas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* QUICK ACTIONS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex flex-col items-start gap-2 w-full"
            onClick={() => setLocation('/schedules?filter=incomplete')}
          >
            <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div className="text-left w-full">
              <p className="font-semibold text-sm truncate">Corrigir Escalas</p>
              <p className="text-xs text-muted-foreground truncate">
                {(alerts?.incompleteMasses?.length || 0) + (alerts?.criticalMasses?.length || 0)} incompletas
              </p>
            </div>
          </Button>

          {stats?.questionnaireStatus === 'closed' && (
            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex flex-col items-start gap-2 w-full"
              onClick={() => setLocation('/questionnaires/admin')}
            >
              <FileQuestion className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="text-left w-full">
                <p className="font-semibold text-sm truncate">Abrir Questionário</p>
                <p className="text-xs text-muted-foreground truncate">Coletar disponibilidade</p>
              </div>
            </Button>
          )}

          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex flex-col items-start gap-2 w-full"
            onClick={() => setLocation('/substitutions')}
          >
            <UserCheck className="h-5 w-5 text-purple-500 flex-shrink-0" />
            <div className="text-left w-full">
              <p className="font-semibold text-sm truncate">Substituições</p>
              <p className="text-xs text-muted-foreground truncate">
                {(alerts?.pendingSubstitutions?.length || 0) + (alerts?.urgentSubstitutions?.length || 0)} pendentes
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex flex-col items-start gap-2 w-full"
            onClick={() => setLocation('/ministers?status=pending')}
          >
            <Users className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="text-left w-full">
              <p className="font-semibold text-sm truncate">Aprovar Ministros</p>
              <p className="text-xs text-muted-foreground truncate">Aguardando aprovação</p>
            </div>
          </Button>
        </div>

        {/* NEXT 7 DAYS MASSES TABLE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Próximas Missas (7 dias)</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Clique em uma linha para gerenciar a escala
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nextWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma missa programada para os próximos 7 dias
                </p>
              ) : (
                nextWeek.map((mass: any) => (
                  <div
                    key={mass.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors gap-3 ${
                      mass.status === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                      mass.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                      'border-green-500 bg-green-50 dark:bg-green-950/20'
                    }`}
                    onClick={() => setLocation(`/schedules?date=${mass.date}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <p className="font-semibold text-sm">
                          {format(parseScheduleDate(mass.date), "dd/MM - EEE", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">{mass.massTime}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CheckCircle2 className={`h-4 w-4 ${
                          mass.status === 'full' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <span className="text-xs sm:text-sm whitespace-nowrap">
                          {mass.totalAssigned}/{mass.requiredMinisters} confirmados
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {mass.totalVacancies > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {mass.totalVacancies} vagas
                          </Badge>
                        )}

                        {mass.hasPendingSubstitutions && (
                          <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Substituição pendente</span>
                            <span className="sm:hidden">Subst. pend.</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Badge
                      className="self-start sm:self-center flex-shrink-0 text-xs"
                      variant={
                        mass.status === 'critical' ? 'destructive' :
                        mass.status === 'warning' ? 'outline' :
                        'default'
                      }
                    >
                      {mass.staffingRate}%
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* MINISTRY HEALTH INDICATORS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                <span className="break-words">Ministros Inativos (30+ dias)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.inactiveMinisters?.length || 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todos os ministros estão ativos!
                </p>
              ) : (
                <div className="space-y-2">
                  {stats?.inactiveMinisters?.slice(0, 5).map((minister: any) => (
                    <div
                      key={minister.id}
                      className="flex items-center justify-between gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50"
                      onClick={() => setLocation(`/ministers/${minister.id}`)}
                    >
                      <span className="text-sm truncate flex-1">{minister.name}</span>
                      <Badge variant="outline" className="flex-shrink-0 text-xs whitespace-nowrap">
                        {minister.daysSinceService ? `${Math.floor(minister.daysSinceService)} dias` : 'Nunca serviu'}
                      </Badge>
                    </div>
                  ))}
                  {(stats?.inactiveMinisters?.length || 0) > 5 && (
                    <Button
                      variant="link"
                      className="w-full text-xs sm:text-sm"
                      onClick={() => setLocation('/ministers?filter=inactive')}
                    >
                      Ver todos ({stats?.inactiveMinisters?.length})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                <span>Alertas de Atenção</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(alerts?.incompleteMasses?.length || 0) > 0 && (
                <Alert
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setLocation('/schedules?filter=incomplete')}
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <AlertDescription className="text-xs sm:text-sm break-words">
                    <span className="font-semibold">{alerts?.incompleteMasses?.length}</span> missas incompletas nos próximos 7 dias
                  </AlertDescription>
                </Alert>
              )}

              {(alerts?.pendingSubstitutions?.length || 0) > 0 && (
                <Alert
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setLocation('/substitutions')}
                >
                  <UserCheck className="h-4 w-4 flex-shrink-0" />
                  <AlertDescription className="text-xs sm:text-sm break-words">
                    <span className="font-semibold">{alerts?.pendingSubstitutions?.length}</span> substituições aguardando aceite
                  </AlertDescription>
                </Alert>
              )}

              {stats?.responseRate < 80 && stats?.questionnaireStatus !== 'closed' && (
                <Alert className="cursor-pointer hover:bg-accent/50" onClick={() => setLocation('/questionnaires')}>
                  <FileQuestion className="h-4 w-4 flex-shrink-0" />
                  <AlertDescription className="text-xs sm:text-sm break-words">
                    Taxa de resposta baixa: <span className="font-semibold">{stats?.responseRate}%</span>
                  </AlertDescription>
                </Alert>
              )}

              {!(alerts?.incompleteMasses?.length || 0) && !(alerts?.pendingSubstitutions?.length || 0) && stats?.responseRate >= 80 && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Tudo em ordem! Sem alertas pendentes.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
