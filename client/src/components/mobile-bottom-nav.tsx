import { Link, useLocation } from "wouter";
import { Calendar, Users, GraduationCap, Menu, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const navItems: NavItem[] = [
    {
      title: "Home",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Escalas",
      href: "/schedules",
      icon: Calendar,
    },
    {
      title: "Substituir",
      href: "/schedules/substitutions",
      icon: Users,
    },
    {
      title: "Liturgia",
      href: "/formation/liturgy",
      icon: GraduationCap,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md dark:bg-dark-7/95 dark:border-dark-4 md:hidden shadow-lg safe-area-bottom">
      <div className="flex h-16 items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors px-1",
                "hover:bg-accent hover:text-accent-foreground min-w-0",
                isActive
                  ? "text-primary dark:text-dark-gold font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary dark:text-dark-gold")} />
              <span className="text-[9px] leading-tight truncate w-full text-center px-0.5">{item.title}</span>
            </Link>
          );
        })}

        {/* Botão de Menu (substitui Settings) */}
        <button
          onClick={() => setOpenMobile(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors px-1",
            "hover:bg-accent hover:text-accent-foreground min-w-0",
            "text-muted-foreground"
          )}
        >
          <Menu className="h-5 w-5 flex-shrink-0" />
          <span className="text-[9px] leading-tight truncate w-full text-center px-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
