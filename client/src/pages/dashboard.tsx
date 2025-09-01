import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
    totalMinisters: 247,
    weeklyMasses: 15,
    availableToday: 189,
    substitutions: 8
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral do ministério</p>
          </div>
          <div className="flex items-center gap-3">
            <Button data-testid="button-new-schedule">
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Ministros</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-ministers">
                    {dashboardStats.totalMinisters}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-green-600">↗ +12</span>
                <span className="text-sm text-muted-foreground">este mês</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Missas Semanais</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-weekly-masses">
                    {dashboardStats.weeklyMasses}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <Church className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-green-600">100%</span>
                <span className="text-sm text-muted-foreground">cobertura</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Disponíveis Hoje</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-available-today">
                    {dashboardStats.availableToday}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-green-600">76%</span>
                <span className="text-sm text-muted-foreground">disponibilidade</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Substituições</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-substitutions">
                    {dashboardStats.substitutions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <ArrowUpDown className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-red-600">↗ +3</span>
                <span className="text-sm text-muted-foreground">esta semana</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Overview */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Próximas Missas</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-all-masses">
                Ver todas
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                <div className="w-15 h-15 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Church className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Missa Dominical</h4>
                  <p className="text-sm text-muted-foreground">Domingo, 26/01 - 08:00</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      6 ministros
                    </Badge>
                    <Badge className="bg-primary/10 text-primary">
                      Confirmado
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                <div className="w-15 h-15 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Church className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Missa das Crianças</h4>
                  <p className="text-sm text-muted-foreground">Domingo, 26/01 - 10:00</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      4 ministros
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                      Pendente
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                <div className="w-15 h-15 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Church className="w-8 h-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Missa Solene</h4>
                  <p className="text-sm text-muted-foreground">Domingo, 26/01 - 19:00</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      8 ministros
                    </Badge>
                    <Badge className="bg-primary/10 text-primary">
                      Confirmado
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mt-0.5">
                  <UserPlus className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">Ana Silva foi adicionada como ministra</p>
                  <p className="text-xs text-muted-foreground mt-1">Há 2 horas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">Escala de Fevereiro criada</p>
                  <p className="text-xs text-muted-foreground mt-1">Há 4 horas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mt-0.5">
                  <ArrowRightLeft className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">João Santos solicitou substituição</p>
                  <p className="text-xs text-muted-foreground mt-1">Ontem</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mt-0.5">
                  <Bell className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">Questionário de disponibilidade enviado</p>
                  <p className="text-xs text-muted-foreground mt-1">2 dias atrás</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
