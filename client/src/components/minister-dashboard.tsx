import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Users, Bell, TrendingUp, HelpCircle, CheckCircle, AlertCircle, Calendar as CalendarIcon, Star } from "lucide-react";
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

        console.log('📅 Dados recebidos da API:', data);

        // Filtrar apenas missas do MÊS ATUAL
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        console.log(`🔍 Mês atual: ${currentMonth} (${currentMonth + 1}), Ano: ${currentYear}`);

        const masses = data.assignments
          ?.filter((a: any) => {
            // Criar data corretamente sem problema de timezone
            const [year, month, day] = a.date.split('-').map(Number);
            const massDate = new Date(year, month - 1, day); // month - 1 porque JS começa em 0

            console.log(`   Missa: ${a.date} → Mês: ${massDate.getMonth()}, Ano: ${massDate.getFullYear()}, Match: ${massDate.getMonth() === currentMonth && massDate.getFullYear() === currentYear}`);

            return massDate.getMonth() === currentMonth &&
                   massDate.getFullYear() === currentYear;
          })
          .map((a: any) => ({
            id: a.id,
            date: a.date,
            time: a.massTime,
            location: a.location || "Santuário São Judas Tadeu",
            position: a.position,
            type: a.scheduleTitle || "Missa"
          })) || [];

        console.log(`✅ Missas filtradas: ${masses.length}`);
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
      {/* Minhas Missas do Mês - Layout HORIZONTAL */}
      <Card className="border-2 border-[var(--color-green-dark)]">
        <CardHeader className="bg-gradient-to-r from-[var(--color-green-light)] to-[var(--color-green-dark)] text-white">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            Minhas Missas - {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingMasses ? (
            <div className="flex items-center justify-center py-8">
              <Star className="h-8 w-8 text-yellow-400 fill-yellow-400 animate-pulse" />
              <p className="ml-3 text-[var(--color-text-primary)]">Carregando...</p>
            </div>
          ) : scheduledMasses.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-[var(--color-text-secondary)]">Nenhuma missa escalada neste mês</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4">
                {scheduledMasses.map((mass) => (
                  <div
                    key={mass.id}
                    className="flex-shrink-0 w-[280px] p-4 rounded-lg border-2 border-[var(--color-green-dark)] bg-white shadow-lg hover:shadow-xl transition-all relative"
                  >
                    {/* Estrela no canto */}
                    <div className="absolute -top-3 -right-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-60 animate-pulse" />
                        <Star className="h-8 w-8 text-yellow-500 fill-yellow-400 relative" />
                      </div>
                    </div>

                    {/* Data grande e destacada */}
                    <div className="text-center mb-3">
                      <p className="text-5xl font-bold text-[var(--color-red-dark)]">
                        {format(new Date(mass.date), "dd", { locale: ptBR })}
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] uppercase">
                        {format(new Date(mass.date), "MMMM", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Horário */}
                    <div className="flex items-center justify-center gap-2 mb-3 bg-[var(--color-beige-light)] py-2 rounded">
                      <Clock className="h-4 w-4 text-[var(--color-green-dark)]" />
                      <span className="font-bold text-[var(--color-green-dark)]">
                        {mass.time?.substring(0, 5)}h
                      </span>
                    </div>

                    {/* Posição/Função */}
                    <div className="text-center">
                      <Badge className="bg-[var(--color-green-dark)] text-white font-semibold px-3 py-1 text-xs">
                        {getPositionLabel(mass.position)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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