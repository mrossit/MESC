import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Percent, Calendar, UserCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/lib/types";
import { Link } from "wouter";
import { useDebugRender } from "@/lib/debug";

export function DashboardStatsCards() {
  // Track renders in debug panel (development only)
  useDebugRender('DashboardStatsCards');
  // Get current month and year for questionnaire stats
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch real questionnaire stats
  const { data: questionnaireStats } = useQuery({
    queryKey: ["/api/questionnaires/stats", currentMonth, currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/questionnaires/admin/stats?month=${currentMonth}&year=${currentYear}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch questionnaire stats');
      return res.json();
    }
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
      iconBg: "bg-sage/20 dark:bg-sage/30",
      iconColor: "text-sage-dark dark:text-sage-light",
      link: "/user-management"
    },
    {
      title: "Taxa de Resposta",
      value: `${questionnaireStats?.responseRate || stats?.responseRate || 0}%`,
      icon: Percent,
      change: questionnaireStats?.exists ? `${questionnaireStats.totalResponses}/${questionnaireStats.totalActiveUsers}` : "+4%",
      changeText: questionnaireStats?.exists ? "respostas recebidas" : "vs meta 63%",
      iconBg: "bg-cream-light/30 dark:bg-cream-light/20",
      iconColor: "text-sage dark:text-cream-light",
      link: "/schedules/substitutions"
    },
    {
      title: "Escalas Pendentes",
      value: stats?.pendingSchedules || 0,
      icon: Calendar,
      change: "Domingo 19h",
      changeText: "próxima",
      iconBg: "bg-burgundy/15 dark:bg-burgundy/20",
      iconColor: "text-burgundy dark:text-burgundy-soft",
      link: "/schedules"
    },
    {
      title: "Aprovações",
      value: stats?.pendingApprovals || 0,
      icon: UserCheck,
      change: "Novos cadastros",
      changeText: "aguardando",
      iconBg: "bg-sage-light/25 dark:bg-sage-dark/25",
      iconColor: "text-sage-dark dark:text-sage-light",
      link: "/approvals"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, index) => (
        <Link key={index} href={stat.link}>
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
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
        </Link>
      ))}
    </div>
  );
}
