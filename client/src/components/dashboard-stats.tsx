import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Percent, Calendar, UserCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/lib/types";

export function DashboardStatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total de Ministros",
      value: stats?.totalMinisters || 0,
      icon: Users,
      change: "+3",
      changeText: "este mês",
      iconBg: "bg-neutral-accentWarm/20 dark:bg-dark-gold/20",
      iconColor: "text-neutral-accentWarm dark:text-text-gold"
    },
    {
      title: "Taxa de Resposta",
      value: `${stats?.responseRate || 0}%`,
      icon: Percent,
      change: "+4%",
      changeText: "vs meta 63%",
      iconBg: "bg-neutral-peanut/20 dark:bg-dark-copper/20",
      iconColor: "text-neutral-peanut dark:text-text-gold"
    },
    {
      title: "Escalas Pendentes",
      value: stats?.pendingSchedules || 0,
      icon: Calendar,
      change: "Domingo 19h",
      changeText: "próxima",
      iconBg: "bg-neutral-badgeWarm dark:bg-dark-terracotta/20",
      iconColor: "text-neutral-textMedium dark:text-text-gold"
    },
    {
      title: "Aprovações",
      value: stats?.pendingApprovals || 0,
      icon: UserCheck,
      change: "Novos cadastros",
      changeText: "aguardando",
      iconBg: "bg-neutral-badgeNeutral dark:bg-dark-bronze/20",
      iconColor: "text-neutral-neutral dark:text-text-gold"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, index) => (
        <Card 
          key={index} 
          className=""
          data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {stat.title}
                </p>
                <p 
                  className="text-2xl font-bold text-foreground mt-1"
                  data-testid={`text-stat-value-${index}`}
                >
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`${stat.iconColor} h-6 w-6`} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">{stat.change}</span>
              <span className="text-muted-foreground ml-1">{stat.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
