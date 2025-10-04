import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronLeft, Star, UserX, Check, AlertCircle, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  ministerId: string | null;
  ministerName: string;
  position: number;
  massTime: string;
  confirmed: boolean;
  date: string;
}

const LITURGICAL_POSITIONS: { [key: number]: string } = {
  1: "Ministro 1",
  2: "Ministro 2",
  3: "Ministro 3",
  4: "Ministro 4",
};

export default function ScheduleDay() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMassTime, setSelectedMassTime] = useState<string | null>(null);

  const dateStr = params.date as string;
  const date = dateStr ? parseISO(dateStr) : new Date();

  useEffect(() => {
    fetchScheduleForDate();
  }, [dateStr]);

  const fetchScheduleForDate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/schedules/by-date/${dateStr}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupedByTime = assignments.reduce((acc, assignment) => {
    const massTime = assignment.massTime || 'Sem horário';
    if (!acc[massTime]) {
      acc[massTime] = [];
    }
    acc[massTime].push(assignment);
    return acc;
  }, {} as Record<string, ScheduleAssignment[]>);

  const massTimesAvailable = Object.keys(groupedByTime);

  return (
    <Layout
      title={`Escala do dia ${format(date, "dd 'de' MMMM", { locale: ptBR })}`}
      subtitle="Confira os ministros escalados"
    >
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate("/schedules")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar para Escalas
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-sm text-muted-foreground">Carregando escalas...</p>
          </div>
        ) : !selectedMassTime ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecione o horário da missa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {massTimesAvailable.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma escala encontrada para esta data
                </p>
              ) : (
                massTimesAvailable.map((time) => {
                  const timeAssignments = groupedByTime[time];
                  const userAssignment = timeAssignments.find(a => {
                    const currentMinister = user?.id;
                    return currentMinister && a.ministerId === currentMinister;
                  });

                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedMassTime(time)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all hover:shadow-lg",
                        userAssignment
                          ? "border-yellow-500 bg-yellow-50 hover:bg-yellow-100"
                          : "border-border hover:bg-accent",
                        "bg-[rgb(var(--card))]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold text-base">Missa das {time}</p>
                            <p className="text-sm text-muted-foreground">
                              {timeAssignments.length} ministros escalados
                            </p>
                          </div>
                        </div>
                        {userAssignment && (
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium text-yellow-700">Você está escalado</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Missa das {selectedMassTime}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMassTime(null)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Voltar para horários
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupedByTime[selectedMassTime]
                  ?.sort((a, b) => a.position - b.position)
                  .map((assignment) => {
                    const isCurrentUser = user?.id === assignment.ministerId;

                    return (
                      <div
                        key={assignment.id}
                        className={cn(
                          "flex flex-col p-3 rounded-lg border bg-card relative",
                          isCurrentUser && "bg-yellow-50 border-yellow-500 border-2"
                        )}
                      >
                        {isCurrentUser && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div className="relative">
                              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-60" />
                              <Star className="h-6 w-6 text-yellow-600 fill-yellow-500 relative" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <Badge variant={isCurrentUser ? "destructive" : "secondary"} className="text-xs">
                              {assignment.position} - {LITURGICAL_POSITIONS[assignment.position]}
                            </Badge>
                            <div>
                              <p className={cn("font-medium text-sm", isCurrentUser && "text-yellow-900 font-bold text-base")}>
                                {assignment.ministerName || "Ministro"}
                              </p>
                              {isCurrentUser && (
                                <p className="text-xs text-yellow-700 font-semibold mt-0.5 flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-500" />
                                  Você está escalado nesta posição
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {assignment.confirmed ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <Check className="h-4 w-4" />
                                <span className="text-xs">Confirmado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">Pendente</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
