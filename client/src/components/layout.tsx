import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingNotificationBell } from "@/components/floating-notification-bell";
import { InstallButton } from "@/components/install-button";
import { CommandSearch } from "@/components/command-search";
import { FixedFooter } from "@/components/FixedFooter";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="sticky top-0 border-b border-border bg-background">
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
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
      
      {/* Floating Notification Bell for Mobile */}
      <FloatingNotificationBell />

      {/* Fixed Footer - Menu Inferior */}
      <FixedFooter />
    </SidebarProvider>
  );
}