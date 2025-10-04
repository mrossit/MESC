import { Layout } from "@/components/layout";
import { DashboardStatsCards } from "@/components/dashboard-stats";
import { QuickActions } from "@/components/quick-actions";
import { ScheduleOverview } from "@/components/schedule-overview";
import { PendingApprovals } from "@/components/pending-approvals";
import { FormationProgress } from "@/components/formation-progress";
import { RecentActivity } from "@/components/recent-activity";
import { MinisterDashboard } from "@/components/minister-dashboard";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";

export default function Dashboard() {
  // Usar os dados do cache que já foram carregados pelo AuthGuard
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: Infinity, // Nunca considera stale pois AuthGuard já gerencia
    refetchOnMount: false, // Não refetch ao montar
    refetchOnWindowFocus: false, // Não refetch ao focar
  });

  const user = authData?.user;
  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  const getTitle = () => {
    if (user?.role === "coordenador") return "Dashboard Coordenador";
    if (user?.role === "gestor") return "Dashboard Gestor";
    return undefined; // Remove título para ministro
  };

  const getSubtitle = () => {
    return isCoordinator
      ? "Gestão completa do ministério"
      : undefined; // Remove subtítulo para ministro
  };

  // Se for ministro, mostra o dashboard simplificado
  if (user?.role === "ministro") {
    return (
      <Layout>
        <MinisterDashboard />
      </Layout>
    );
  }

  // Dashboard para coordenadores e gestores
  return (
    <Layout title={getTitle()} subtitle={getSubtitle()}>
      <div className="space-y-4">
        {/* Statistics Cards */}
        <DashboardStatsCards />

        {/* Quick Actions - Only for coordinators */}
        {isCoordinator && <QuickActions />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Schedule Overview */}
          <ScheduleOverview />

          {/* Pending Approvals - Only for coordinators */}
          {isCoordinator && <PendingApprovals />}
        </div>

        {/* Formation Progress */}
        <FormationProgress />

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </Layout>
  );
}