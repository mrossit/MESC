import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingNotificationBell } from "@/components/floating-notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallButton } from "@/components/install-button";
import { CommandSearch } from "@/components/command-search";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background dark:bg-dark-8">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          {/* TopBar - Usuários Recentes */}
          <TopBar />

          {/* Header */}
          <header className="sticky top-0 border-b border-border bg-background dark:bg-dark-7 dark:border-dark-4 z-40">
            <div className="flex h-14 items-center gap-4 px-4 sm:h-16 sm:px-6">
              <SidebarTrigger className="-ml-1" />

              {/* Title section - responsive */}
              <div className="flex-1 min-w-0">
                {title && (
                  <div className="flex flex-col">
                    <h2 className="truncate text-base font-semibold sm:text-lg md:text-xl lg:text-2xl">
                      {title === "Escalas Litúrgicas" ? "Escala de Missas" : title}
                    </h2>
                    {subtitle && (
                      <p className="hidden truncate text-xs text-muted-foreground sm:block sm:text-sm">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions section - responsive */}
              <div className="flex items-center gap-2">
                {/* Command Search - responsive */}
                <CommandSearch />

                {/* Install Button */}
                <InstallButton size="sm" className="hidden sm:inline-flex" />

                {/* Notifications */}
                <NotificationBell compact className="h-9 w-9" />

                {/* Dark Mode Toggle */}
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Main Content - com padding bottom para o BottomNav */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 bg-background dark:bg-dark-8">
            {children}
          </main>

          {/* BottomNav - Menu fixo inferior */}
          <BottomNav />
        </SidebarInset>
      </div>

      {/* Floating Notification Bell for Mobile */}
      <FloatingNotificationBell />
    </SidebarProvider>
  );
}