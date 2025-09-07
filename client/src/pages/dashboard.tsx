import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { toast as sonner } from "sonner";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useState } from "react";
import { Layout, PageHeader, Card } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Church, 
  CheckCircle, 
  ArrowUpDown,
  Plus,
  ChevronRight,
  UserPlus,
  Calendar,
  ArrowRightLeft,
  Bell,
  Activity,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  GraduationCap,
  Shield,
  BarChart3,
  FileText
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [userRole, setUserRole] = useState<'ministro' | 'coordenador' | 'gestor'>('ministro');

  // Mostra notificação de boas-vindas uma vez
  useEffect(() => {
    if (isAuthenticated && !hasShownWelcome) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(user.role || 'ministro');
      
      const roleTitle = {
        'ministro': 'Ministro',
        'coordenador': 'Coordenador',
        'gestor': 'Gestor'
      }[user.role || 'ministro'];
      
      sonner.success(`Bem-vindo(a) de volta, ${user.name || roleTitle}!`, {
        description: 'Sistema MESC - Santuário São Judas Tadeu',
        duration: 5000,
        action: {
          label: 'Fechar',
          onClick: () => sonner.dismiss(),
        },
      });
      setHasShownWelcome(true);
    }
  }, [isAuthenticated, hasShownWelcome]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  const dashboardStats = stats || {
    totalMinisters: 150,
    weeklyMasses: 15,
    availableToday: 42,
    substitutions: 3,
    pendingApprovals: 5,
    questionnaireResponse: 68,
    formationProgress: 45,
    scheduleCoverage: 92
  };

  // Renderiza dashboard baseado no role
  if (userRole === 'ministro') {
    return <DashboardMinistro stats={dashboardStats} />;
  } else if (userRole === 'coordenador') {
    return <DashboardCoordenador stats={dashboardStats} />;
  } else if (userRole === 'gestor') {
    return <DashboardGestor stats={dashboardStats} />;
  }

  return (
    <Layout>
      <PageHeader 
        title="Dashboard" 
        description="Visão geral do ministério"
      />
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sonner.info('Sincronizando dados...', {
                  description: 'Atualizando informações do ministério',
                  duration: 2000,
                });
                setTimeout(() => {
                  sonner.success('Dados sincronizados com sucesso!');
                }, 2000);
              }}
              className="border-gold/30 hover:bg-gold/10"
            >
              <Activity className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sonner('📢 Novo aviso do coordenador', {
                  description: 'Reunião de ministros agendada para domingo após a missa das 10h',
                  duration: 8000,
                  action: {
                    label: 'Ver detalhes',
                    onClick: () => console.log('Ver detalhes'),
                  },
                });
              }}
              className="border-gold/30 hover:bg-gold/10"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificações
              <Badge className="ml-2 bg-red-500 text-white">3</Badge>
            </Button>
          </div>
          <Button 
            data-testid="button-new-schedule"
            className="bg-gold hover:bg-gold/90 text-white border-none shadow-lg"
            onClick={() => {
              sonner.promise(
                new Promise((resolve) => {
                  setTimeout(() => resolve('Escala criada'), 2000);
                }),
                {
                  loading: 'Criando nova escala...',
                  success: 'Nova escala criada com sucesso!',
                  error: 'Erro ao criar escala',
                }
              );
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Escala
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:border-gold">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-copper dark:text-pearl-dark/70">Total Ministros</p>
                  <p className="text-3xl font-bold text-bronze dark:text-pearl-dark mt-2" data-testid="text-total-ministers">
                    {dashboardStats.totalMinisters}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-gold" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-pastel-green">↗ +12</span>
                <span className="text-sm text-copper dark:text-pearl-dark/60">este mês</span>
              </div>
            </div>
          </Card>

          <Card className="hover:border-gold">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-copper dark:text-pearl-dark/70">Missas Semanais</p>
                  <p className="text-3xl font-bold text-bronze dark:text-pearl-dark mt-2" data-testid="text-weekly-masses">
                    {dashboardStats.weeklyMasses}
                  </p>
                </div>
                <div className="w-12 h-12 bg-pastel-orange/30 dark:bg-pastel-orange/20 rounded-full flex items-center justify-center">
                  <Church className="w-6 h-6 text-copper" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-pastel-green">100%</span>
                <span className="text-sm text-copper dark:text-pearl-dark/60">cobertura</span>
              </div>
            </div>
          </Card>

          <Card className="hover:border-gold">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-copper dark:text-pearl-dark/70">Disponíveis Hoje</p>
                  <p className="text-3xl font-bold text-bronze dark:text-pearl-dark mt-2" data-testid="text-available-today">
                    {dashboardStats.availableToday}
                  </p>
                </div>
                <div className="w-12 h-12 bg-pastel-green/30 dark:bg-pastel-green/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-bronze-satin" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-pastel-green">76%</span>
                <span className="text-sm text-copper dark:text-pearl-dark/60">disponibilidade</span>
              </div>
            </div>
          </Card>

          <Card className="hover:border-gold">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-copper dark:text-pearl-dark/70">Substituições</p>
                  <p className="text-3xl font-bold text-bronze dark:text-pearl-dark mt-2" data-testid="text-substitutions">
                    {dashboardStats.substitutions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-pastel-yellow/30 dark:bg-pastel-yellow/20 rounded-full flex items-center justify-center">
                  <ArrowUpDown className="w-6 h-6 text-copper-aged" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-pastel-red">↗ +3</span>
                <span className="text-sm text-copper dark:text-pearl-dark/60">esta semana</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Overview */}
          <Card className="lg:col-span-2">
            <div className="flex flex-row items-center justify-between p-6 pb-4">
              <h3 className="text-lg font-semibold text-bronze dark:text-pearl-dark">Próximas Missas</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                data-testid="button-view-all-masses"
                className="text-copper hover:text-bronze hover:bg-gold/10"
              >
                Ver todas
              </Button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div 
                onClick={() => {
                  sonner.message('Missa Dominical - 08:00', {
                    description: '6 ministros escalados. Coordenador: Pe. João Silva',
                    duration: 5000,
                  });
                }}
                className="flex items-center gap-4 p-4 bg-beige-warm/50 dark:bg-gray-dark rounded-lg hover:bg-gold/10 dark:hover:bg-gold/5 transition-colors duration-200 cursor-pointer">
                <div className="w-15 h-15 bg-gold/20 rounded-lg flex items-center justify-center">
                  <Church className="w-8 h-8 text-gold" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-bronze dark:text-pearl-dark">Missa Dominical</h4>
                  <p className="text-sm text-copper dark:text-pearl-dark/70">Domingo, 26/01 - 08:00</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-pastel-green/30 text-bronze-aged dark:bg-pastel-green/20 dark:text-pastel-green">
                      6 ministros
                    </Badge>
                    <Badge className="bg-gold/20 text-bronze dark:bg-gold/10 dark:text-gold">
                      Confirmado
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-copper/50" />
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer">
                <div className="w-15 h-15 bg-pastel-orange/30 dark:bg-pastel-orange/20 rounded-lg flex items-center justify-center">
                  <Church className="w-8 h-8 text-copper" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-bronze dark:text-pearl-dark">Missa das Crianças</h4>
                  <p className="text-sm text-copper dark:text-pearl-dark/70">Domingo, 26/01 - 10:00</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-pastel-green/30 text-bronze-aged dark:bg-pastel-green/20 dark:text-pastel-green">
                      4 ministros
                    </Badge>
                    <Badge className="bg-pastel-yellow/30 text-copper-aged dark:bg-pastel-yellow/20 dark:text-pastel-yellow">
                      Pendente
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-copper/50" />
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer">
                <div className="w-15 h-15 bg-pastel-purple/30 dark:bg-pastel-purple/20 rounded-lg flex items-center justify-center">
                  <Church className="w-8 h-8 text-bronze-satin" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-bronze dark:text-pearl-dark">Missa Solene</h4>
                  <p className="text-sm text-copper dark:text-pearl-dark/70">Domingo, 26/01 - 19:00</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-pastel-green/30 text-bronze-aged dark:bg-pastel-green/20 dark:text-pastel-green">
                      8 ministros
                    </Badge>
                    <Badge className="bg-primary/10 text-primary">
                      Confirmado
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-copper/50" />
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-6 pb-4">
              <h3 className="text-lg font-semibold text-bronze dark:text-pearl-dark">Atividades Recentes</h3>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div 
                onClick={() => {
                  sonner.success('Nova ministra adicionada', {
                    description: 'Ana Silva agora faz parte do ministério',
                    duration: 3000,
                  });
                }}
                className="flex items-start gap-3 cursor-pointer hover:bg-gold/5 p-2 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-pastel-green/30 dark:bg-pastel-green/20 rounded-full flex items-center justify-center mt-0.5">
                  <UserPlus className="w-4 h-4 text-bronze-satin" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-bronze dark:text-pearl-dark">Ana Silva foi adicionada como ministra</p>
                  <p className="text-xs text-copper/70 dark:text-pearl-dark/50 mt-1">Há 2 horas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center mt-0.5">
                  <Calendar className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-bronze dark:text-pearl-dark">Escala de Fevereiro criada</p>
                  <p className="text-xs text-copper/70 dark:text-pearl-dark/50 mt-1">Há 4 horas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-pastel-yellow/30 dark:bg-pastel-yellow/20 rounded-full flex items-center justify-center mt-0.5">
                  <ArrowRightLeft className="w-4 h-4 text-copper-aged" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-bronze dark:text-pearl-dark">João Santos solicitou substituição</p>
                  <p className="text-xs text-copper/70 dark:text-pearl-dark/50 mt-1">Ontem</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-pastel-blue/30 dark:bg-pastel-blue/20 rounded-full flex items-center justify-center mt-0.5">
                  <Bell className="w-4 h-4 text-bronze" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-bronze dark:text-pearl-dark">Questionário de disponibilidade enviado</p>
                  <p className="text-xs text-copper/70 dark:text-pearl-dark/50 mt-1">2 dias atrás</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Dashboard do Ministro
function DashboardMinistro({ stats }: any) {
  return (
    <Layout>
      <PageHeader 
        title="Meu Dashboard" 
        description="Minhas atividades e compromissos no ministério"
      />
      <div className="space-y-6">
        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-[rgb(184,150,63)] transition-colors">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próximas Escalas</p>
                  <p className="text-2xl font-bold mt-1">5</p>
                </div>
                <Calendar className="w-8 h-8 text-[rgb(184,150,63)]" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Próxima: Dom 26/01 - 10h</p>
            </div>
          </Card>

          <Card className="hover:border-[rgb(184,150,63)] transition-colors">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Questionário do Mês</p>
                  <Badge className="mt-1" variant="outline">Pendente</Badge>
                </div>
                <ClipboardCheck className="w-8 h-8 text-[rgb(160,82,45)]" />
              </div>
              <Button size="sm" variant="link" className="px-0 mt-2 text-[rgb(184,150,63)]">
                Responder agora →
              </Button>
            </div>
          </Card>

          <Card className="hover:border-[rgb(184,150,63)] transition-colors">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Formação</p>
                  <p className="text-2xl font-bold mt-1">45%</p>
                </div>
                <GraduationCap className="w-8 h-8 text-[rgb(184,150,63)]" />
              </div>
              <Progress value={45} className="mt-2" />
            </div>
          </Card>

          <Card className="hover:border-[rgb(184,150,63)] transition-colors">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Substituições</p>
                  <p className="text-2xl font-bold mt-1">0</p>
                </div>
                <ArrowUpDown className="w-8 h-8 text-[rgb(160,82,45)]" />
              </div>
              <p className="text-xs text-green-600 mt-2">Nenhuma pendente</p>
            </div>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Minhas Próximas Escalas</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[rgb(247,244,237)]/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Church className="w-5 h-5 text-[rgb(160,82,45)]" />
                      <div>
                        <p className="font-medium">Missa Dominical</p>
                        <p className="text-sm text-muted-foreground">Dom 26/01 - 10h00</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Confirmado</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Módulos de Formação</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Liturgia Básica</span>
                    <span className="text-muted-foreground">100%</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Espiritualidade</span>
                    <span className="text-muted-foreground">60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Prática Ministerial</span>
                    <span className="text-muted-foreground">30%</span>
                  </div>
                  <Progress value={30} className="h-2" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Dashboard do Coordenador
function DashboardCoordenador({ stats }: any) {
  return (
    <Layout>
      <PageHeader 
        title="Dashboard Coordenador" 
        description="Gestão operacional do ministério"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              {stats.pendingApprovals} aprovações pendentes
            </Badge>
          </div>
          <Button className="bg-gradient-to-r from-[rgb(160,82,45)] to-[rgb(184,115,51)]">
            <Plus className="w-4 h-4 mr-2" />
            Nova Escala
          </Button>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-[rgb(184,150,63)]/30">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Escalas da Semana</p>
                  <p className="text-2xl font-bold mt-1">{stats.weeklyMasses}</p>
                </div>
                <Calendar className="w-8 h-8 text-[rgb(184,150,63)]" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.scheduleCoverage}% cobertura
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="border-[rgb(184,150,63)]/30">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Questionários</p>
                  <p className="text-2xl font-bold mt-1">{stats.questionnaireResponse}%</p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-[rgb(160,82,45)]" />
              </div>
              <Progress value={stats.questionnaireResponse} className="mt-2" />
            </div>
          </Card>

          <Card className="border-[rgb(184,150,63)]/30">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Substituições Pendentes</p>
                  <p className="text-2xl font-bold mt-1">{stats.substitutions}</p>
                </div>
                <ArrowRightLeft className="w-8 h-8 text-[rgb(184,150,63)]" />
              </div>
              <Button size="sm" variant="link" className="px-0 mt-2">
                Gerenciar →
              </Button>
            </div>
          </Card>

          <Card className="border-[rgb(184,150,63)]/30">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ministros Ativos</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalMinisters}</p>
                </div>
                <Users className="w-8 h-8 text-[rgb(160,82,45)]" />
              </div>
              <p className="text-xs text-green-600 mt-2">+5 este mês</p>
            </div>
          </Card>
        </div>

        {/* Tabelas e Listas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[rgb(184,150,63)]" />
                Acompanhamento de Respostas
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 hover:bg-[rgb(247,244,237)]/50 rounded">
                  <span className="text-sm">Responderam</span>
                  <Badge>{Math.floor(stats.totalMinisters * 0.68)} ministros</Badge>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-[rgb(247,244,237)]/50 rounded">
                  <span className="text-sm">Pendentes</span>
                  <Badge variant="outline">{Math.floor(stats.totalMinisters * 0.32)} ministros</Badge>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-[rgb(247,244,237)]/50 rounded">
                  <span className="text-sm">Prazo</span>
                  <Badge variant="destructive">3 dias restantes</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Alertas e Pendências
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900">5 solicitações de cadastro</p>
                  <Button size="sm" variant="link" className="px-0 text-red-700">
                    Revisar agora →
                  </Button>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900">3 substituições pendentes</p>
                  <Button size="sm" variant="link" className="px-0 text-yellow-700">
                    Gerenciar →
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Dashboard do Gestor
function DashboardGestor({ stats }: any) {
  return (
    <Layout>
      <PageHeader 
        title="Dashboard Executivo" 
        description="Visão estratégica do ministério MESC"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-6 h-6 text-[rgb(184,150,63)]" />
            KPIs do Ministério
          </h2>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-[rgb(184,150,63)]/50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Ministros</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalMinisters}</p>
                </div>
                <Users className="w-10 h-10 text-[rgb(184,150,63)]" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+3.4% este mês</span>
              </div>
            </div>
          </Card>

          <Card className="border-[rgb(184,150,63)]/50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Engajamento</p>
                  <p className="text-3xl font-bold mt-1">87%</p>
                </div>
                <Activity className="w-10 h-10 text-[rgb(160,82,45)]" />
              </div>
              <Progress value={87} className="mt-2" />
            </div>
          </Card>

          <Card className="border-[rgb(184,150,63)]/50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cobertura de Missas</p>
                  <p className="text-3xl font-bold mt-1">{stats.scheduleCoverage}%</p>
                </div>
                <Church className="w-10 h-10 text-[rgb(184,150,63)]" />
              </div>
              <Badge variant="secondary" className="mt-2">Meta: 95%</Badge>
            </div>
          </Card>

          <Card className="border-[rgb(184,150,63)]/50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Formação Completa</p>
                  <p className="text-3xl font-bold mt-1">{stats.formationProgress}%</p>
                </div>
                <GraduationCap className="w-10 h-10 text-[rgb(160,82,45)]" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">68 ministros certificados</p>
            </div>
          </Card>
        </div>

        {/* Gráficos e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[rgb(184,150,63)]" />
                Evolução Mensal
              </h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                [Gráfico de evolução mensal]
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Relatórios Disponíveis</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Relatório Mensal
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Análise de Disponibilidade
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Performance Individual
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Relatório Paroquial
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
