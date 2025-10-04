import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Users, Bell, TrendingUp, HelpCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MinisterTutorial, useShouldShowTutorial } from "@/components/minister-tutorial";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LITURGICAL_POSITIONS } from "@shared/constants";
import { useLocation } from "wouter";

interface ScheduleAssignment {
  id: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  scheduleTitle: string;
}

interface Versiculo {
  id: number;
  frase: string;
  referencia: string;
}

export function MinisterDashboard() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleAssignment[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [versiculo, setVersiculo] = useState<Versiculo | null>(null);
  const shouldShowTutorial = useShouldShowTutorial();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

  useEffect(() => {
    fetchUpcomingSchedules();
    fetchVersiculo();
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

  const fetchVersiculo = async () => {
    try {
      const response = await fetch("/api/versiculos/random");
      if (response.ok) {
        const data = await response.json();
        setVersiculo(data);
      }
    } catch (error) {
      console.error("Error fetching versiculo:", error);
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
        {/* Versículo Bíblico */}
        {versiculo && (
          <Card style={{ backgroundColor: 'var(--color-beige-light)' }} className="border border-neutral-border/30">
            <CardContent className="p-6">
              <p className="text-base italic mb-2" style={{ color: 'var(--color-text-primary)' }}>
                "{versiculo.frase}"
              </p>
              <p className="text-sm font-semibold text-right" style={{ color: 'var(--color-text-primary)' }}>
                — {versiculo.referencia}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Minhas Escalas */}
      <Card style={{ backgroundColor: 'var(--color-beige-light)' }} className="border border-neutral-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            <Calendar className="h-5 w-5" />
            Minhas Escalas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSchedules ? (
            <p style={{ color: 'var(--color-text-primary)' }}>Carregando...</p>
          ) : upcomingSchedules.length === 0 ? (
            <p style={{ color: 'var(--color-text-primary)' }}>Você ainda não possui escalas cadastradas.</p>
          ) : (
            <div className="space-y-2">
              <p style={{ color: 'var(--color-text-primary)' }} className="font-semibold mb-2">
                Você está escalado(a) para:
              </p>
              {upcomingSchedules.slice(0, 5).map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-2">
                  <p style={{ color: 'var(--color-text-primary)' }}>
                    {getPositionLabel(schedule.position)} ({getMassTimeLabel(schedule.massTime)} - {format(new Date(schedule.date), "dd/MM", { locale: ptBR })})
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disponibilidade */}
        <Card className="  border border-neutral-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock className="h-5 w-5 text-neutral-accentNeutral" />
              Minha Disponibilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-14 h-14 bg-neutral-accentNeutral/10 rounded-full flex items-center justify-center mb-3">
                <Clock className="h-7 w-7 text-neutral-accentNeutral/50" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Em desenvolvimento</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Gerencie seus horários disponíveis para servir
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Formação */}
        <Card className="  border border-neutral-border/30">
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
        <Card className="  border border-neutral-border/30">
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
        <Card className="  border border-neutral-border/30">
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
        <Card className="  border border-neutral-border/30">
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
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-900">
            Avisos Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-blue-900 font-medium">Sistema em fase Beta</p>
                <p className="text-xs text-blue-700/70">
                  Estamos trabalhando para trazer novas funcionalidades em breve
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-blue-900 font-medium">Mantenha seus dados atualizados</p>
                <p className="text-xs text-blue-700/70">
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