import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Clock, MapPin } from "lucide-react";
import { MinisterTutorial, useShouldShowTutorial } from "@/components/minister-tutorial";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Versiculo {
  id: number;
  frase: string;
  referencia: string;
}

interface ScheduleAssignment {
  id: number;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  scheduleId: number;
  scheduleTitle?: string;
  scheduleStatus?: string;
  location?: string;
}

const LITURGICAL_POSITIONS: Record<number, string> = {
  1: "Círio",
  2: "Turíbulo",
  3: "Naveta",
  4: "Acolhedor(a)",
  5: "Acolhedor(a) 2",
  6: "Galhetas"
};

export function MinisterDashboard() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [versiculo, setVersiculo] = useState<Versiculo | null>(null);
  const [loadingVersiculo, setLoadingVersiculo] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleAssignment[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [ministerPid, setMinisterPid] = useState<number | null>(null);
  const [ministerName, setMinisterName] = useState<string>('');
  const shouldShowTutorial = useShouldShowTutorial();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

  const fetchVersiculo = async () => {
    try {
      console.log('📖 [MINISTER-DASHBOARD] Buscando versículo aleatório...');

      const response = await fetch("/api/versiculos/random", {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [MINISTER-DASHBOARD] Versículo recebido:', data);
        setVersiculo(data);
      } else {
        console.error('❌ [MINISTER-DASHBOARD] Erro ao buscar versículo:', response.status);
      }
    } catch (error) {
      console.error("❌ [MINISTER-DASHBOARD] Erro ao buscar versículo:", error);
    } finally {
      setLoadingVersiculo(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      console.log('🔄 [MINISTER-DASHBOARD] Buscando escala do mês...');
      console.log('🔄 [MINISTER-DASHBOARD] URL: /api/schedules/minister/current-month');
      
      const response = await fetch("/api/schedules/minister/current-month", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('🔄 [MINISTER-DASHBOARD] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [MINISTER-DASHBOARD] Escala recebida:', data);
        setSchedule(data.assignments || []);
        setMinisterPid(data.pid || null);
        setMinisterName(data.name || '');
      } else {
        console.error('❌ [MINISTER-DASHBOARD] Erro ao buscar escala:', response.status);
      }
    } catch (error) {
      console.error("❌ [MINISTER-DASHBOARD] Erro ao buscar escala:", error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Buscar dados quando o componente é montado
  useEffect(() => {
    console.log('🚀 [MINISTER-DASHBOARD] Componente montado');
    fetchVersiculo();
    fetchSchedule();
  }, []);

  return (
    <>
      {/* Tutorial Modal */}
      <MinisterTutorial 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
      />

      <div className="space-y-4">
      {/* Versículo Bíblico de Incentivo */}
      <Card className="border-2 border-[var(--color-green-dark)]">
        <CardHeader className="bg-gradient-to-r from-[var(--color-green-light)] to-[var(--color-green-dark)] text-white">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-6 w-6" />
            Ministro, Lembre-se:
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingVersiculo ? (
            <div className="flex items-center justify-center py-8">
              <BookOpen className="h-8 w-8 text-[var(--color-green-dark)] animate-pulse" />
              <p className="ml-3 text-[var(--color-text-primary)]">Carregando...</p>
            </div>
          ) : versiculo ? (
            <div className="bg-[var(--color-beige-light)] p-6 rounded-lg">
              <p className="text-lg italic text-[var(--color-text-primary)] leading-relaxed mb-4">
                "{versiculo.frase}"
              </p>
              <p className="text-right text-sm font-semibold text-[var(--color-green-dark)]">
                {versiculo.referencia}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-[var(--color-text-secondary)]">Nenhum versículo disponível</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minha Escala do Mês */}
      <Card className="border-2 border-[var(--color-bronze)]">
        <CardHeader className="bg-gradient-to-r from-[var(--color-bronze)] to-[var(--color-gold)] text-white">
          <CardTitle className="flex items-center justify-between text-lg font-bold">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Minha Escala do Mês
            </div>
            {ministerPid && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-normal opacity-90" data-testid="text-minister-name">{ministerName}</span>
                <span className="text-xs font-mono bg-white/20 px-3 py-1 rounded-full" data-testid="text-minister-pid">
                  PID: {ministerPid}
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingSchedule ? (
            <div className="flex items-center justify-center py-8">
              <Calendar className="h-8 w-8 text-[var(--color-bronze)] animate-pulse" />
              <p className="ml-3 text-[var(--color-text-primary)]">Carregando...</p>
            </div>
          ) : schedule.length > 0 ? (
            <div className="space-y-3">
              {schedule
                .sort((a, b) => {
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                  }
                  return a.massTime.localeCompare(b.massTime);
                })
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-[var(--color-beige-light)] p-4 rounded-lg border-l-4 border-[var(--color-bronze)]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[var(--color-bronze)]" />
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {format(new Date(assignment.date), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {assignment.massTime}
                          </div>
                          {assignment.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {assignment.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-[var(--color-bronze)]">
                        {LITURGICAL_POSITIONS[assignment.position] || `Posição ${assignment.position}`}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-[var(--color-text-secondary)]">Nenhuma escala para este mês</p>
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