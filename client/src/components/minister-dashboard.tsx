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
          <Card className="bg-white border-2 border-neutral-400 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-3 text-gray-800">
                Ministro, lembre-se:
              </h3>
              <p className="text-base italic mb-2 text-gray-700">
                "{versiculo.frase}"
              </p>
              <p className="text-sm font-semibold text-right text-gray-800">
                — {versiculo.referencia}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Minhas Escalas */}
      <Card className="bg-white border-2 border-neutral-400 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Calendar className="h-5 w-5" />
            Minhas Escalas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSchedules ? (
            <p className="text-gray-700">Carregando...</p>
          ) : upcomingSchedules.length === 0 ? (
            <p className="text-gray-700">Você ainda não possui escalas cadastradas.</p>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold mb-2 text-gray-800">
                Você está escalado(a) para:
              </p>
              {upcomingSchedules.slice(0, 5).map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-2">
                  <p className="text-gray-700">
                    {getPositionLabel(schedule.position)} ({getMassTimeLabel(schedule.massTime)} - {format(new Date(schedule.date), "dd/MM", { locale: ptBR })})
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}