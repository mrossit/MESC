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

interface ScheduledMass {
  id: string;
  date: string;
  time: string;
  location: string;
  position: number;
  type: string;
}

export function MinisterDashboard() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [scheduledMasses, setScheduledMasses] = useState<ScheduledMass[]>([]);
  const [loadingMasses, setLoadingMasses] = useState(true);
  const shouldShowTutorial = useShouldShowTutorial();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

  useEffect(() => {
    fetchScheduledMasses();
  }, []);

  const fetchScheduledMasses = async () => {
    try {
      const response = await fetch("/api/schedules/minister/upcoming");
      if (response.ok) {
        const data = await response.json();
        // Filtra apenas escalas preenchidas (com ministerId)
        const masses = data.assignments?.map((a: any) => ({
          id: a.id,
          date: a.date,
          time: a.massTime,
          location: a.location || "Santuário São Judas Tadeu",
          position: a.position,
          type: a.scheduleTitle || "Missa"
        })) || [];
        setScheduledMasses(masses);
      }
    } catch (error) {
      console.error("Error fetching scheduled masses:", error);
    } finally {
      setLoadingMasses(false);
    }
  };

  const getPositionLabel = (position: number) => {
    return LITURGICAL_POSITIONS[position] || `Ministro ${position}`;
  };

  return (
    <>
      {/* Tutorial Modal */}
      <MinisterTutorial 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
      />

      <div className="space-y-4">
      {/* Minhas Missas Escaladas */}
      <Card className="border border-neutral-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5" />
            Minhas Missas Escaladas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMasses ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse bg-[var(--color-beige-light)]">
                <Calendar className="h-8 w-8 text-[var(--color-green-dark)]" />
              </div>
              <p className="text-[var(--color-text-primary)]">Carregando missas...</p>
            </div>
          ) : scheduledMasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[var(--color-beige-light)]">
                <Calendar className="h-8 w-8 text-[var(--color-green-dark)]" />
              </div>
              <p className="text-[var(--color-text-primary)] font-medium mb-2">Você não possui missas escaladas no momento.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scheduledMasses.slice(0, 10).map((mass) => (
                <div
                  key={mass.id}
                  className="p-4 rounded-lg border border-[var(--color-beige-light)] bg-white hover:bg-[var(--color-beige-light)] transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[var(--color-red-dark)]">
                        {format(new Date(mass.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <Badge className="bg-[var(--color-green-dark)] text-white text-xs">
                        {getPositionLabel(mass.position)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--color-text-primary)]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{mass.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span>{mass.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {scheduledMasses.length > 10 && (
                <div className="text-center pt-2">
                  <Button
                    variant="link"
                    className="text-[var(--color-green-dark)] hover:text-[var(--color-green-dark)]/80"
                    onClick={() => setLocation('/schedules')}
                  >
                    Ver todas ({scheduledMasses.length} missas)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCULTO - Minha Disponibilidade, Minha Formação, Família MESC, Minhas Estatísticas */}
      {/* Removido a pedido do vangrey */}

      {/* Avisos Importantes - REMOVIDO */}
      </div>
    </>
  );
}