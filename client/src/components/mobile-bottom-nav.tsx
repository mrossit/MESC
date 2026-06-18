import { Link, useLocation } from "wouter";
import { Calendar, Home, Menu, Repeat2, UserRound } from "lucide-react";
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
      title: "Trocas",
      href: "/schedules/substitutions",
      icon: Repeat2,
    },
    {
      title: "Perfil",
      href: "/profile",
      icon: UserRound,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="mobile-bottom-nav ios-glass-bar fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
    >
      <div className="mobile-bottom-nav-inner mx-auto grid max-w-lg grid-cols-5 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border-0 px-1 transition-all",
                "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10",
                isActive
                  ? "font-semibold text-burgundy dark:text-dark-gold"
                  : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-9 items-center justify-center rounded-md transition-colors",
                  isActive && "bg-burgundy/10 text-burgundy dark:bg-dark-gold/15 dark:text-dark-gold"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
              </span>
              <span className="w-full truncate px-0.5 text-center text-[10px] leading-none">{item.title}</span>
            </Link>
          );
        })}

        {/* Botão de Menu (substitui Settings) */}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className={cn(
            "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border-0 bg-transparent px-1 transition-all",
            "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10",
            "text-muted-foreground"
          )}
        >
          <span className="flex h-7 w-9 items-center justify-center rounded-md">
            <Menu className="h-5 w-5 flex-shrink-0" />
          </span>
          <span className="w-full truncate px-0.5 text-center text-[10px] leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
}
