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

interface Versiculo {
  id: number;
  frase: string;
  referencia: string;
}

export function MinisterDashboard() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [scheduledMasses, setScheduledMasses] = useState<ScheduledMass[]>([]);
  const [loadingMasses, setLoadingMasses] = useState(true);
  const [versiculo, setVersiculo] = useState<Versiculo | null>(null);
  const [loadingVersiculo, setLoadingVersiculo] = useState(true);
  const shouldShowTutorial = useShouldShowTutorial();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

  useEffect(() => {
    fetchScheduledMasses();
    fetchVersiculo();
  }, []);

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

  const fetchScheduledMasses = async () => {
    try {
      console.log('🔄 [MINISTER-DASHBOARD] Buscando missas do mês atual...');
      console.log('🔄 [MINISTER-DASHBOARD] URL: /api/schedules/minister/current-month');

      const response = await fetch("/api/schedules/minister/current-month", {
        credentials: 'include'
      });

      console.log('📡 [MINISTER-DASHBOARD] Response status:', response.status);
      console.log('📡 [MINISTER-DASHBOARD] Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();

        console.log('✅ [MINISTER-DASHBOARD] Dados RAW recebidos da API:');
        console.log(JSON.stringify(data, null, 2));
        console.log(`📊 [MINISTER-DASHBOARD] Total de assignments: ${data.assignments?.length || 0}`);

        if (data.assignments && data.assignments.length > 0) {
          console.log('📋 [MINISTER-DASHBOARD] Detalhes de cada assignment:');
          data.assignments.forEach((a: any, index: number) => {
            console.log(`  [${index}] ID: ${a.id}, Date: ${a.date}, Time: ${a.massTime}, Position: ${a.position}`);
          });
        }

        const masses = data.assignments?.map((a: any) => ({
          id: a.id,
          date: a.date,
          time: a.massTime,
          location: a.location || "Santuário São Judas Tadeu",
          position: a.position,
          type: a.scheduleTitle || "Missa"
        })) || [];

        console.log('📋 [MINISTER-DASHBOARD] Missas APÓS transformação:');
        console.log(JSON.stringify(masses, null, 2));
        console.log(`📊 [MINISTER-DASHBOARD] Total de missas após transformação: ${masses.length}`);

        setScheduledMasses(masses);
        console.log('✅ [MINISTER-DASHBOARD] Estado scheduledMasses atualizado!');
      } else {
        const errorText = await response.text();
        console.error('❌ [MINISTER-DASHBOARD] Erro na API:', response.status, response.statusText);
        console.error('❌ [MINISTER-DASHBOARD] Resposta:', errorText);
      }
    } catch (error) {
      console.error("❌ [MINISTER-DASHBOARD] Erro ao buscar missas:", error);
    } finally {
      setLoadingMasses(false);
      console.log('🏁 [MINISTER-DASHBOARD] Loading finalizado');
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

      {/* OCULTO - Minha Disponibilidade, Minha Formação, Família MESC, Minhas Estatísticas */}
      {/* Removido a pedido do vangrey */}

      {/* Avisos Importantes - REMOVIDO */}
      </div>
    </>
  );
}