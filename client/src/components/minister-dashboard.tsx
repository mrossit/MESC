import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Users, Bell, TrendingUp, HelpCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MinisterTutorial, useShouldShowTutorial } from "@/components/minister-tutorial";
import { SaintOfTheDay } from "@/components/SaintOfTheDay";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LITURGICAL_POSITIONS } from "@shared/constants";
import { useLocation } from "wouter";
import { useDebugRender } from "@/lib/debug";

interface ScheduleAssignment {
  id: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  scheduleTitle: string;
}

export function MinisterDashboard() {
  // Track renders in debug panel (development only)
  useDebugRender('MinisterDashboard');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleAssignment[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const shouldShowTutorial = useShouldShowTutorial();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

  useEffect(() => {
    fetchUpcomingSchedules();
  }, []);

  const fetchUpcomingSchedules = async () => {
    try {
      const response = await fetch("/api/schedules/minister/upcoming");
      if (response.ok) {
        const data = await response.json();
        setUpcomingSchedules(data.assignments || []);
      }
    } catch (error) {
      console.error("Error fetching upcoming schedules:", error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleOpenTutorial = () => {
    setIsTutorialOpen(true);
  };

  const getMassTimeLabel = (time: string) => {
    const times: Record<string, string> = {
      "saturday_evening": "Sábado 19h",
      "sunday_7am": "Domingo 7h",
      "sunday_9am": "Domingo 9h",
      "sunday_11am": "Domingo 11h",
      "sunday_7pm": "Domingo 19h"
    };
    return times[time] || time;
  };

  const getPositionLabel = (position: number) => {
    return LITURGICAL_POSITIONS[position] || `Posição ${position}`;
  };

  return (
    <>
      {/* Tutorial Modal */}
      <MinisterTutorial 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
      />

      <div className="space-y-4">
        {/* Cartão de Boas-vindas */}
        <Card className="bg-gradient-to-r from-mesc-gold/10 to-mesc-beige/20 dark:from-gray-800 dark:to-gray-900 border-neutral-accentWarm/30 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">Bem-vindo ao MESC</h2>
                <p className="text-muted-foreground mt-1">
                  Sistema de Gestão do Ministério Extraordinário da Sagrada Comunhão
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenTutorial}
                  className="hidden md:flex items-center gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  Tutorial
                </Button>
                <div className="hidden md:block">
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Versão Beta
                  </Badge>
                </div>
              </div>
            </div>
            {/* Botão do Tutorial para Mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTutorial}
              className="md:hidden mt-4 w-full flex items-center justify-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Iniciar Tutorial
            </Button>
          </CardContent>
        </Card>

      {/* Próximas Escalas */}
      <Card className="  border border-neutral-border/30 dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-neutral-accentWarm dark:text-amber-600" />
            Minhas Próximas Escalas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSchedules ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-neutral-peachCream/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Calendar className="h-8 w-8 text-neutral-accentWarm/50 dark:text-gray-600" />
              </div>
              <p className="text-muted-foreground">Carregando escalas...</p>
            </div>
          ) : upcomingSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-neutral-peachCream/30 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-neutral-accentWarm/50 dark:text-gray-600" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">Nenhuma escala próxima</p>
              <p className="text-sm text-muted-foreground/70 max-w-sm">
                Você não possui escalas programadas para os próximos dias
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingSchedules.slice(0, 5).map((schedule) => (
                <div 
                  key={schedule.id} 
                  className="flex items-center justify-between p-3 bg-neutral-peachCream/10 dark:bg-gray-800 rounded-lg border border-neutral-border/20 dark:border-gray-700 hover:bg-neutral-peachCream/20 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">
                        {format(new Date(schedule.date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {getPositionLabel(schedule.position)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{getMassTimeLabel(schedule.massTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingSchedules.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="link" 
                    className="text-primary hover:text-primary/80"
                    onClick={() => setLocation('/schedules')}
                  >
                    Ver todas ({upcomingSchedules.length} escalas)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Santo do Dia */}
        <SaintOfTheDay />

        {/* Formação */}
        <Card className="  border border-neutral-border/30 dark:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Minha Formação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="h-7 w-7 text-blue-500/70" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Em desenvolvimento</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Acompanhe seu progresso nos módulos de formação
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notificações */}
        <Card className="  border border-neutral-border/30 dark:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Bell className="h-4 w-4 text-orange-500" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <Bell className="h-6 w-6 text-orange-500/70" />
              </div>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>

        {/* Família MESC */}
        <Card className="  border border-neutral-border/30 dark:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Users className="h-4 w-4 text-purple-500" />
              Família MESC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-purple-500/70" />
              </div>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Pessoais */}
        <Card className="  border border-neutral-border/30 dark:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Minhas Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-500/70" />
              </div>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avisos e Comunicados */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Avisos Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">Sistema em fase Beta</p>
                <p className="text-xs text-blue-700/70 dark:text-blue-200/70">
                  Estamos trabalhando para trazer novas funcionalidades em breve
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">Mantenha seus dados atualizados</p>
                <p className="text-xs text-blue-700/70 dark:text-blue-200/70">
                  Acesse seu perfil para atualizar suas informações pessoais
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}