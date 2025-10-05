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
      iconBg: "bg-[#CACDA5]/20",
      iconColor: "text-[#99A285]"
    },
    {
      title: "Taxa de Resposta",
      value: `${stats?.responseRate || 0}%`,
      icon: Percent,
      change: "+4%",
      changeText: "vs meta 63%",
      iconBg: "bg-[#A0B179]/20",
      iconColor: "text-[#A0B179]"
    },
    {
      title: "Escalas Pendentes",
      value: stats?.pendingSchedules || 0,
      icon: Calendar,
      change: "Domingo 19h",
      changeText: "próxima",
      iconBg: "bg-[#99A285]/20",
      iconColor: "text-[#99A285]"
    },
    {
      title: "Aprovações",
      value: stats?.pendingApprovals || 0,
      icon: UserCheck,
      change: "Novos cadastros",
      changeText: "aguardando",
      iconBg: "bg-[#CACDA5]/20",
      iconColor: "text-[#A0B179]"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, index) => (
        <Card
          key={index}
          className="border-2 hover:border-[#A0B179] transition-all duration-200 hover:shadow-lg"
          data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {stat.title}
                </p>
                <p
                  className="text-3xl font-bold text-foreground mt-1"
                  data-testid={`text-stat-value-${index}`}
                >
                  {stat.value}
                </p>
              </div>
              <div className={`w-14 h-14 ${stat.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                <stat.icon className={`${stat.iconColor} h-7 w-7`} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-[#A0B179] mr-1" />
              <span className="text-[#99A285] font-semibold">{stat.change}</span>
              <span className="text-muted-foreground ml-1">{stat.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
