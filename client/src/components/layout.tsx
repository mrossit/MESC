import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingNotificationBell } from "@/components/floating-notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallButton } from "@/components/install-button";
import { CommandSearch } from "@/components/command-search";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { DebugPanel } from "@/components/debug-panel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const isMobile = useIsMobile();
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const user = authData?.user;

  // WebSocket connection for debug panel
  const { isConnected } = useWebSocket({
    enabled: user?.role === "coordenador" || user?.role === "gestor",
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background dark:bg-dark-8">
        <AppSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background dark:bg-dark-7 dark:border-dark-4">
            <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6">
              {/* MOBILE: Avatar no canto superior esquerdo (atalho do perfil) */}
              {isMobile && user && (
                <Link href="/profile">
                  <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                    <AvatarImage src={user.photoUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary dark:bg-dark-gold/20 dark:text-dark-gold text-xs font-semibold">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )}

              {/* DESKTOP: Sidebar Trigger on left */}
              {!isMobile && <SidebarTrigger className="-ml-1" />}

              {/* Title section - responsive */}
              <div className="flex-1 min-w-0">
                {title && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-semibold sm:text-lg md:text-xl lg:text-2xl">
                        {title === "Escalas Litúrgicas" ? "Escala de Missas" : title}
                      </h2>
                      {/* Dev Mode: Show current role */}
                      {(import.meta.env.DEV || window.location.hostname === 'localhost') && user && (
                        <Badge
                          variant={user.role === 'gestor' ? 'default' : user.role === 'coordenador' ? 'secondary' : 'outline'}
                          className="text-[10px] sm:text-xs px-1.5 py-0 h-5"
                        >
                          {user.role}
                        </Badge>
                      )}
                    </div>
                    {subtitle && (
                      <p className="hidden truncate text-xs text-muted-foreground sm:block sm:text-sm">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions section - à direita */}
              <div className="flex items-center gap-2">
                {/* Command Search (busca) */}
                {isMobile ? <CommandSearch /> : <CommandSearch />}

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notificações (sino) */}
                <NotificationBell compact className="h-9 w-9" />

                {/* MOBILE: Hamburguer menu no canto superior direito */}
                {isMobile && <SidebarTrigger />}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className={`flex-1 overflow-y-auto p-4 sm:p-6 bg-background dark:bg-dark-8 ${isMobile ? 'pb-20' : ''}`}>
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Mobile Bottom Navigation - Always rendered, hidden by CSS on desktop */}
      <MobileBottomNav />

      {/* Floating Notification Bell for Mobile - removed since we have bottom nav */}
      {!isMobile && <FloatingNotificationBell />}

      {/* Debug Panel - Only in development */}
      {isDev && <DebugPanel isConnected={isConnected} />}
    </SidebarProvider>
  );
}