import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  UserPlus,
  ArrowLeftRight,
  Bell,
  LogIn,
  LogOut,
  FileText,
  Settings,
  BookOpen,
  UserCog,
  ClipboardList,
  Download
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Activity } from "@/lib/types";

const getActivityIcon = (action: string) => {
  switch (action) {
    case "login":
      return LogIn;
    case "logout":
      return LogOut;
    case "publish_schedule":
    case "create_schedule":
    case "update_schedule":
    case "view_schedule":
      return CalendarCheck;
    case "approve_user":
    case "reject_user":
    case "update_user_role":
      return UserCog;
    case "request_substitution":
    case "approve_substitution":
    case "reject_substitution":
    case "claim_substitution":
      return ArrowLeftRight;
    case "respond_questionnaire":
    case "view_questionnaire":
    case "create_questionnaire":
      return ClipboardList;
    case "view_formation":
    case "complete_formation_module":
      return BookOpen;
    case "view_reports":
      return FileText;
    case "export_report":
      return Download;
    case "update_profile":
      return UserPlus;
    case "update_mass_times":
    case "create_mass_time":
    case "delete_mass_time":
      return Settings;
    default:
      return Bell;
  }
};

const getActivityIconStyle = (action: string) => {
  // Authentication actions
  if (action === 'login' || action === 'logout') {
    return { bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-600 dark:text-blue-400" };
  }
  // Schedule actions
  if (action.includes('schedule')) {
    return { bg: "bg-sage/20 dark:bg-sage/30", color: "text-sage-dark dark:text-sage-light" };
  }
  // User management
  if (action.includes('user') || action === 'update_profile') {
    return { bg: "bg-sage-light/25 dark:bg-sage-dark/25", color: "text-sage dark:text-sage-light" };
  }
  // Substitutions
  if (action.includes('substitution')) {
    return { bg: "bg-burgundy/15 dark:bg-burgundy/25", color: "text-burgundy dark:text-burgundy-soft" };
  }
  // Reports
  if (action.includes('report')) {
    return { bg: "bg-purple-100 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" };
  }
  // Formation
  if (action.includes('formation')) {
    return { bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" };
  }
  // Questionnaires
  if (action.includes('questionnaire')) {
    return { bg: "bg-orange-100 dark:bg-orange-900/30", color: "text-orange-600 dark:text-orange-400" };
  }
  // Default
  return { bg: "bg-cream-light/35 dark:bg-cream-light/20", color: "text-sage dark:text-cream-light" };
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    if (diffInMinutes < 1) return "agora mesmo";
    return `há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else {
    const days = Math.floor(diffInHours / 24);
    if (days === 1) return "ontem";
    if (days < 7) return `há ${days} dias`;
    const weeks = Math.floor(days / 7);
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
};

interface ActivityItem {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function RecentActivity() {
  const { data: activities = [], isLoading, error } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity/recent"],
    queryFn: async () => {
      const response = await fetch("/api/activity/recent?limit=10", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="border border-neutral-border/30 dark:border-border">
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

  if (error || activities.length === 0) {
    return (
      <Card className="border border-neutral-border/30 dark:border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {error ? "Erro ao carregar atividades" : "Nenhuma atividade recente"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-neutral-border/30 dark:border-border">
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
                    {activity.userName && (
                      <span className="font-medium">{activity.userName}: </span>
                    )}
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
