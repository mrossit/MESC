import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wand2, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  Bell, 
  Download,
  Church,
  AlertCircle
} from "lucide-react";

export default function Schedules() {
  const { isAuthenticated } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState("2025-01");

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Calendar data for January 2025
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getDayOfWeek = (day: number) => {
    // January 1, 2025 is a Wednesday (3)
    // Sunday is 0, Monday is 1, etc.
    const firstDay = 3; // Wednesday
    return (firstDay + day - 1) % 7;
  };

  const hasMasses = (day: number) => {
    const dayOfWeek = getDayOfWeek(day);
    // Sundays (0) have masses, and some weekdays
    return dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6;
  };

  const getMassCount = (day: number) => {
    const dayOfWeek = getDayOfWeek(day);
    if (dayOfWeek === 0) return 3; // Sunday: 3 masses
    return 1; // Weekdays: 1 mass
  };

  const todaysMasses = [
    {
      time: "08:00",
      ministers: 6,
      status: "confirmed"
    },
    {
      time: "10:00", 
      ministers: 4,
      status: "pending"
    },
    {
      time: "19:00",
      ministers: 8,
      status: "confirmed"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Confirmado
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Escalas</h1>
            <p className="text-muted-foreground mt-1">Gerenciar escalas mensais de ministros</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-01">Janeiro 2025</SelectItem>
                <SelectItem value="2025-02">Fevereiro 2025</SelectItem>
                <SelectItem value="2025-03">Março 2025</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="button-generate-schedule">
              <Wand2 className="w-4 h-4 mr-2" />
              Gerar Escala Automática
            </Button>
          </div>
        </div>

        {/* Schedule Calendar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Janeiro 2025</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" data-testid="button-prev-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {daysOfWeek.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Previous month days */}
              {Array.from({ length: 3 }, (_, i) => (
                <div key={`prev-${i}`} className="p-3 text-center text-sm text-muted-foreground">
                  {29 + i}
                </div>
              ))}
              
              {/* Current month days */}
              {calendarDays.map((day) => {
                const dayOfWeek = getDayOfWeek(day);
                const isToday = day === 26; // Example: today is the 26th
                const hasScheduledMasses = hasMasses(day);
                const massCount = getMassCount(day);

                return (
                  <div
                    key={day}
                    className={`p-3 text-center text-sm cursor-pointer transition-colors rounded-md ${
                      isToday
                        ? "bg-primary text-primary-foreground font-medium"
                        : hasScheduledMasses
                        ? "bg-primary/10 border-2 border-primary/20 text-foreground font-medium hover:bg-primary/20"
                        : "text-foreground hover:bg-muted"
                    }`}
                    data-testid={`calendar-day-${day}`}
                  >
                    <div className="font-medium">{day}</div>
                    {hasScheduledMasses && (
                      <div className="text-xs text-primary mt-1">
                        {massCount} {massCount === 1 ? 'missa' : 'missas'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Schedule Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Masses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Missas de Hoje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todaysMasses.map((mass, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">Missa das {mass.time}</h4>
                    <p className="text-sm text-muted-foreground">
                      {mass.ministers} ministros escalados
                    </p>
                  </div>
                  {getStatusBadge(mass.status)}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-4 bg-muted/50 hover:bg-muted"
                data-testid="button-add-substitute"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Adicionar Substituto</h4>
                  <p className="text-sm text-muted-foreground">Encontrar ministro disponível</p>
                </div>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-4 bg-muted/50 hover:bg-muted"
                data-testid="button-send-reminders"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Enviar Lembretes</h4>
                  <p className="text-sm text-muted-foreground">Notificar ministros escalados</p>
                </div>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-4 bg-muted/50 hover:bg-muted"
                data-testid="button-print-schedule"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-3">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Imprimir Escala</h4>
                  <p className="text-sm text-muted-foreground">Gerar PDF da escala mensal</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
