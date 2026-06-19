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
  const currentPath = location.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";

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
  const activeHref = [...navItems]
    .filter((item) => currentPath === item.href || currentPath.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Navegação principal"
      className="mobile-bottom-nav ios-glass-bar fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
    >
      <div className="mobile-bottom-nav-inner mx-auto grid max-w-lg grid-cols-5 items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "mobile-tab-item flex h-full min-w-0 flex-col items-center justify-center gap-0.5 border-0 px-1 transition-colors",
                "text-muted-foreground hover:text-foreground",
                isActive
                  ? "font-semibold text-burgundy dark:text-dark-gold"
                  : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "mobile-tab-icon flex h-6 w-10 items-center justify-center transition-transform",
                  isActive && "scale-105 text-burgundy dark:text-dark-gold"
                )}
              >
                <Icon className="h-[22px] w-[22px] flex-shrink-0 stroke-[2.1]" />
              </span>
              <span className="mobile-tab-label w-full truncate px-0.5 text-center text-[10.5px] leading-none">{item.title}</span>
            </Link>
          );
        })}

        {/* Botão de Menu (substitui Settings) */}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className={cn(
            "mobile-tab-item flex h-full min-w-0 flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-1 transition-colors",
            "text-muted-foreground hover:text-foreground",
            "text-muted-foreground"
          )}
          aria-label="Abrir menu"
        >
          <span className="mobile-tab-icon flex h-6 w-10 items-center justify-center">
            <Menu className="h-[22px] w-[22px] flex-shrink-0 stroke-[2.1]" />
          </span>
          <span className="mobile-tab-label w-full truncate px-0.5 text-center text-[10.5px] leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
}
