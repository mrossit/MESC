import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleDay {
  date: string;
  dayName: string;
  status: "complete" | "incomplete" | "urgent";
  masses: Array<{
    time: string;
    ministers: number;
    total: number;
  }>;
}

interface Schedule {
  id: string;
  massDate: string;
  massTime: string;
  ministerId: string | null;
  position: number;
}

export function ScheduleOverview() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Domingo
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Sábado

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd')
    }],
    queryFn: async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const response = await fetch(`/api/schedules?start=${startDate}&end=${endDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json();
    }
  });

  // Agrupar escalas por data e horário
  const scheduleData: ScheduleDay[] = [];

  if (schedules && schedules.length > 0) {
    const groupedByDate: Record<string, Record<string, { filled: number; total: number }>> = {};

    schedules.forEach(schedule => {
      const dateKey = schedule.massDate;
      const timeKey = schedule.massTime;

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {};
      }
      if (!groupedByDate[dateKey][timeKey]) {
        groupedByDate[dateKey][timeKey] = { filled: 0, total: 0 };
      }

      groupedByDate[dateKey][timeKey].total++;
      if (schedule.ministerId) {
        groupedByDate[dateKey][timeKey].filled++;
      }
    });

    // Converter para formato de exibição - pegar apenas próximos 2 dias com missas
    const sortedDates = Object.keys(groupedByDate).sort().slice(0, 2);

    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr + 'T00:00:00');
      const masses = Object.entries(groupedByDate[dateStr]).map(([time, data]) => ({
        time: time.slice(0, 5), // "HH:MM"
        ministers: data.filled,
        total: data.total
      }));

      const totalFilled = masses.reduce((sum, m) => sum + m.ministers, 0);
      const totalRequired = masses.reduce((sum, m) => sum + m.total, 0);
      const fillRate = totalRequired > 0 ? totalFilled / totalRequired : 0;

      let status: "complete" | "incomplete" | "urgent" = "complete";
      if (fillRate < 0.5) status = "urgent";
      else if (fillRate < 1) status = "incomplete";

      scheduleData.push({
        date: format(date, "dd MMM", { locale: ptBR }),
        dayName: format(date, "EEEE", { locale: ptBR }),
        status,
        masses
      });
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-sage/20 text-sage-dark dark:bg-sage/30 dark:text-sage-light">Completa</Badge>;
      case "incomplete":
        return <Badge className="bg-cream-light/40 text-sage dark:bg-cream-light/25 dark:text-cream-light">Incompleta</Badge>;
      case "urgent":
        return <Badge className="bg-burgundy/20 text-burgundy dark:bg-burgundy/30 dark:text-burgundy-soft">Urgente</Badge>;
      default:
        return null;
    }
  };

  const getMassStatus = (ministers: number, total: number) => {
    if (ministers === total) return "bg-sage dark:bg-sage-light";
    if (ministers >= total * 0.7) return "bg-cream-light/60 dark:bg-cream-light/40";
    return "bg-burgundy dark:bg-burgundy-soft";
  };

  if (isLoading) {
    return (
      <Card className="border border-neutral-border/30 dark:border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Escala da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="border border-neutral-border rounded-lg p-4">
                <Skeleton className="h-6 w-32 mb-3" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="  border border-neutral-border/30 dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Escala da Semana
          </CardTitle>
          <Link href="/schedules">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary hover:bg-neutral-accentWarm/10"
              data-testid="button-view-full-schedule"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {scheduleData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma escala programada para esta semana
          </div>
        ) : (
          <div className="space-y-4">
            {scheduleData.map((day, index) => (
            <div 
              key={index} 
              className="border border-neutral-border rounded-lg p-4"
              data-testid={`card-schedule-day-${index}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground">
                  {day.dayName}, {day.date}
                </h4>
                {getStatusBadge(day.status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {day.masses.map((mass, massIndex) => (
                  <div 
                    key={massIndex} 
                    className="flex items-center gap-2"
                    data-testid={`text-mass-info-${index}-${massIndex}`}
                  >
                    <span 
                      className={`w-2 h-2 ${getMassStatus(mass.ministers, mass.total)} rounded-full`}
                    />
                    <span className="text-muted-foreground">
                      {mass.time}: {mass.ministers}/{mass.total} ministros
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
