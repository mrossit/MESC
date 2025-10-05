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
        return <Badge className="bg-[#A0B179]/20 text-[#A0B179] border border-[#A0B179]/30">Completa</Badge>;
      case "incomplete":
        return <Badge className="bg-orange-100 text-orange-800 border border-orange-200">Incompleta</Badge>;
      case "urgent":
        return <Badge className="bg-red-100 text-red-800 border border-red-200">Urgente</Badge>;
      default:
        return null;
    }
  };

  const getMassStatus = (ministers: number, total: number) => {
    if (ministers === total) return "bg-[#A0B179]";
    if (ministers >= total * 0.7) return "bg-orange-400";
    return "bg-red-400";
  };

  return (
    <Card className="border-2 hover:border-[#A0B179] transition-all duration-200">
      <CardHeader className="bg-gradient-to-r from-[#CACDA5]/10 to-[#99A285]/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Escala da Semana
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#99A285] hover:text-[#A0B179] hover:bg-[#CACDA5]/20"
            data-testid="button-view-full-schedule"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {scheduleData.map((day, index) => (
            <div
              key={index}
              className="border-2 border-[#CACDA5]/40 rounded-lg p-4 hover:border-[#A0B179] transition-all"
              data-testid={`card-schedule-day-${index}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">
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
                      className={`w-3 h-3 ${getMassStatus(mass.ministers, mass.total)} rounded-full shadow-sm`}
                    />
                    <span className="text-muted-foreground font-medium">
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
