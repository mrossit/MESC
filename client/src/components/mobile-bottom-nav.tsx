import { Link, useLocation } from "wouter";
import { Calendar, Users, GraduationCap, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

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
    title: "Substituições",
    href: "/schedules/substitutions",
    icon: Users,
  },
  {
    title: "Liturgia",
    href: "/formation/liturgy",
    icon: GraduationCap,
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
  },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md dark:bg-dark-7/95 dark:border-dark-4 md:hidden shadow-lg">
      <div className="flex h-16 items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "text-primary dark:text-dark-gold font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary dark:text-dark-gold")} />
              <span className="text-[10px] leading-none">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
