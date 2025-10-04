import { LayoutClean } from "@/components/layout-clean";
import { DashboardStatsCards } from "@/components/dashboard-stats";
import { QuickActions } from "@/components/quick-actions";
import { ScheduleOverview } from "@/components/schedule-overview";
import { PendingApprovals } from "@/components/pending-approvals";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function CoordinatorDashboard() {
  const [, setLocation] = useLocation();

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const user = authData?.user;
  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  // Redirecionar se não for coordenador
  useEffect(() => {
    if (user && !isCoordinator) {
      setLocation("/dashboard");
    }
  }, [user, isCoordinator, setLocation]);

  const getTitle = () => {
    if (user?.role === "coordenador") return "Dashboard Coordenador";
    if (user?.role === "gestor") return "Dashboard Gestor";
    return "Dashboard Administrativo";
  };

  if (!isCoordinator) {
    return null;
  }

  return (
    <LayoutClean title={getTitle()}>
      <div className="space-y-6">
        {/* Statistics Cards */}
        <DashboardStatsCards />

        {/* Quick Actions */}
        <QuickActions />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schedule Overview */}
          <ScheduleOverview />

          {/* Pending Approvals */}
          <PendingApprovals />
        </div>
      </div>
    </LayoutClean>
  );
}
