import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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

export function ScheduleOverview() {
  const scheduleData: ScheduleDay[] = [
    {
      date: "12 Nov",
      dayName: "Domingo",
      status: "incomplete",
      masses: [
        { time: "7h", ministers: 10, total: 10 },
        { time: "9h", ministers: 10, total: 10 },
        { time: "11h", ministers: 10, total: 10 },
        { time: "19h", ministers: 7, total: 10 },
      ]
    },
    {
      date: "13 Nov",
      dayName: "Segunda",
      status: "urgent",
      masses: [
        { time: "7h", ministers: 4, total: 4 },
        { time: "12h", ministers: 4, total: 4 },
        { time: "19h", ministers: 1, total: 4 },
      ]
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800">Completa</Badge>;
      case "incomplete":
        return <Badge className="bg-orange-100 text-orange-800">Incompleta</Badge>;
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Urgente</Badge>;
      default:
        return null;
    }
  };

  const getMassStatus = (ministers: number, total: number) => {
    if (ministers === total) return "bg-neutral-accentWarm";
    if (ministers >= total * 0.7) return "bg-orange-400";
    return "bg-red-400";
  };

  return (
    <Card className="  border border-neutral-border/30 dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Escala da Semana
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary hover:bg-neutral-accentWarm/10"
            data-testid="button-view-full-schedule"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
