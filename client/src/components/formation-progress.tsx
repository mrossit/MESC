import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Book, Heart, Bookmark } from "lucide-react";

interface FormationTrack {
  title: string;
  icon: typeof Book;
  progress: number;
  completed: number;
  total: number;
  iconBg: string;
  iconColor: string;
  progressColor: string;
}

export function FormationProgress() {
  const formationTracks: FormationTrack[] = [
    {
      title: "Trilha Liturgia",
      icon: Book,
      progress: 78,
      completed: 118,
      total: 152,
      iconBg: "bg-neutral-accentNeutral/10",
      iconColor: "text-neutral-accentNeutral",
      progressColor: "bg-neutral-accentNeutral",
    },
    {
      title: "Espiritualidade",
      icon: Heart,
      progress: 65,
      completed: 99,
      total: 152,
      iconBg: "bg-neutral-accentWarm/10 dark:bg-amber-900/20",
      iconColor: "text-neutral-accentWarm dark:text-amber-500",
      progressColor: "bg-neutral-accentWarm dark:bg-amber-700",
    },
    {
      title: "Biblioteca",
      icon: Bookmark,
      progress: 58,
      completed: 89,
      total: 152,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      progressColor: "bg-blue-500",
    },
  ];

  return (
    <Card className="  border border-neutral-border/30 dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Progresso de Formação
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary hover:text-primary hover:bg-neutral-accentWarm/10"
            data-testid="button-view-all-formation"
          >
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {formationTracks.map((track, index) => (
            <div 
              key={index}
              className="border border-neutral-border rounded-lg p-4"
              data-testid={`card-formation-track-${index}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 ${track.iconBg} rounded-lg flex items-center justify-center`}>
                  <track.icon className={`${track.iconColor} h-4 w-4`} />
                </div>
                <h4 className="font-medium text-foreground">{track.title}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concluído</span>
                  <span 
                    className="text-foreground font-medium"
                    data-testid={`text-progress-percentage-${index}`}
                  >
                    {track.progress}%
                  </span>
                </div>
                <div className="w-full bg-neutral-peachCream/50 rounded-full h-2">
                  <div 
                    className={`${track.progressColor} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${track.progress}%` }}
                  />
                </div>
                <p 
                  className="text-xs text-muted-foreground"
                  data-testid={`text-progress-count-${index}`}
                >
                  {track.completed} de {track.total} ministros
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
