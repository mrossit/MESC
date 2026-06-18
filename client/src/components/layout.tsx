import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { isManager as isManagerRole, isCoordinator as isCoordinatorRole } from "@shared/roles";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingNotificationBell } from "@/components/floating-notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallButton } from "@/components/install-button";
import { CommandSearch } from "@/components/command-search";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Settings } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const isMobile = useIsMobile();

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const user = authData?.user;

  return (
    <SidebarProvider>
      <div className="app-shell flex w-full min-w-0 bg-background dark:bg-dark-8">
        <AppSidebar />
        <SidebarInset className="h-full min-w-0 overflow-hidden dark:bg-dark-8">
          {/* Header */}
          <header className="app-mobile-header ios-glass-header sticky top-0 z-40 border-b">
            <div className="app-mobile-header-content flex items-center gap-2 px-3 sm:min-h-16 sm:gap-3 sm:px-6">
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
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="min-w-0 truncate text-sm font-semibold leading-tight sm:text-lg md:text-xl lg:text-2xl">
                        {title === "Escalas Litúrgicas" ? "Escala de Missas" : title}
                      </h2>
                      {/* Dev Mode: Show current role */}
                      {import.meta.env.DEV && user && (
                        <Badge
                          variant={isManagerRole(user.role) ? 'default' : isCoordinatorRole(user.role) ? 'secondary' : 'outline'}
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
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {/* Command Search (busca) */}
                {isMobile ? <CommandSearch /> : <CommandSearch />}

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notificações (sino) */}
                <NotificationBell compact className="h-9 w-9" />

                {/* MOBILE: Botão Settings no canto superior direito */}
                {isMobile && (
                  <Link href="/settings">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className={`app-content-scroll min-h-0 flex-1 overflow-y-auto bg-background px-3 py-3 dark:bg-dark-8 sm:p-6 ${isMobile ? 'pb-mobile-nav' : ''}`}>
            {children}
          </div>
        </SidebarInset>
      </div>

      {/* Mobile Bottom Navigation - Always rendered, hidden by CSS on desktop */}
      <MobileBottomNav />

      {/* Floating Notification Bell for Mobile - removed since we have bottom nav */}
      {!isMobile && <FloatingNotificationBell />}
    </SidebarProvider>
  );
}
