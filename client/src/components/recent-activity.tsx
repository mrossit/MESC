import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  CalendarCheck, 
  UserPlus, 
  ArrowLeftRight, 
  Bell,
  User
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Activity } from "@/lib/types";

const getActivityIcon = (action: string) => {
  switch (action) {
    case "schedule_published":
    case "schedule_created":
      return CalendarCheck;
    case "user_created":
    case "formation_completed":
      return UserPlus;
    case "substitution_requested":
      return ArrowLeftRight;
    case "questionnaire_sent":
    default:
      return Bell;
  }
};

const getActivityIconStyle = (action: string) => {
  switch (action) {
    case "schedule_published":
    case "schedule_created":
      return { bg: "bg-sage/20 dark:bg-sage/30", color: "text-sage-dark dark:text-sage-light" };
    case "user_created":
    case "formation_completed":
      return { bg: "bg-sage-light/25 dark:bg-sage-dark/25", color: "text-sage dark:text-sage-light" };
    case "substitution_requested":
      return { bg: "bg-burgundy/15 dark:bg-burgundy/25", color: "text-burgundy dark:text-burgundy-soft" };
    default:
      return { bg: "bg-cream-light/35 dark:bg-cream-light/20", color: "text-sage dark:text-cream-light" };
  }
};

const mockActivities: Activity[] = [
  {
    id: "1",
    userId: "1",
    action: "schedule_published",
    description: "Ana Coordenadora publicou a escala de Dezembro",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: "2",
    userId: "2",
    action: "formation_completed",
    description: "Pedro Oliveira completou a formação em Liturgia",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: "3",
    userId: "3",
    action: "substitution_requested",
    description: "Carlos Ferreira solicitou substituição para domingo 19h",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
  },
  {
    id: "4",
    userId: "4",
    action: "questionnaire_sent",
    description: "Questionário de disponibilidade enviado para 152 ministros",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
];

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    return `há ${diffInMinutes} minutos`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `há ${hours} horas`;
  } else {
    const days = Math.floor(diffInHours / 24);
    return days === 1 ? "ontem" : `há ${days} dias`;
  }
};

export function RecentActivity() {
  const { data: activities = mockActivities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activity"],
    queryFn: () => new Promise(resolve => setTimeout(() => resolve(mockActivities), 500)),
  });

  if (isLoading) {
    return (
      <Card className="  border border-neutral-border/30 dark:border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 pb-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
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
        <CardTitle className="text-lg font-semibold text-foreground">
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const IconComponent = getActivityIcon(activity.action);
            const iconStyle = getActivityIconStyle(activity.action);
            const isLast = index === activities.length - 1;

            return (
              <div 
                key={activity.id}
                className={`flex items-start gap-3 ${!isLast ? 'pb-4 border-b border-neutral-border/50' : ''}`}
                data-testid={`activity-item-${activity.id}`}
              >
                <div className={`w-8 h-8 ${iconStyle.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`${iconStyle.color} h-4 w-4`} />
                </div>
                <div className="flex-1">
                  <p 
                    className="text-sm text-foreground"
                    data-testid={`text-activity-description-${activity.id}`}
                  >
                    {activity.description}
                  </p>
                  <p 
                    className="text-xs text-muted-foreground"
                    data-testid={`text-activity-time-${activity.id}`}
                  >
                    {formatTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
