import { Link, useLocation } from "wouter";
import { Calendar, Users, GraduationCap, Settings, Home, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
  isThemeToggle?: boolean;
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "system") {
      const currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(currentTheme === "dark" ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

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
    {
      title: theme === "dark" ? "Claro" : "Escuro",
      action: toggleTheme,
      icon: theme === "dark" ? Sun : Moon,
      isThemeToggle: true,
    },
    {
      title: "Ajustes",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md dark:bg-dark-7/95 dark:border-dark-4 md:hidden shadow-lg safe-area-bottom">
      <div className="flex h-16 items-stretch">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.href && (location === item.href || location.startsWith(item.href + "/"));

          if (item.action) {
            return (
              <button
                key={item.title + index}
                onClick={item.action}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors px-1",
                  "hover:bg-accent hover:text-accent-foreground min-w-0",
                  item.isThemeToggle
                    ? "text-muted-foreground"
                    : ""
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-[9px] leading-tight truncate w-full text-center px-0.5">{item.title}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
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
      </div>
    </nav>
  );
}
