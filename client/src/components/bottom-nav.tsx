import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { Home, Star, ArrowUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function BottomNav() {
  const [location] = useLocation();

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: 1000 * 60 * 5,
  });

  const user = authData?.user;

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/dashboard",
      active: location === "/dashboard",
    },
    {
      icon: Star,
      label: "Escala",
      href: "/schedules",
      active: location.startsWith("/schedules") && !location.includes("substitutions"),
    },
    {
      icon: ArrowUpDown,
      label: "Substituições",
      href: "/schedules/substitutions",
      active: location.includes("/substitutions"),
    },
  ];

  const handleNavigation = (href: string) => {
    window.location.href = href;
  };

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t-2 border-black">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-around h-16 sm:h-18">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[70px] sm:min-w-[80px]",
                item.active
                  ? "text-[#FACC15]"
                  : "text-white/70 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6",
                  item.active && "stroke-[2.5]"
                )}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}

          {/* Perfil do usuário */}
          <button
            onClick={() => handleNavigation("/profile")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[70px] sm:min-w-[80px]",
              location === "/profile"
                ? "text-[#FACC15]"
                : "text-white/70 hover:text-white"
            )}
          >
            <div className="relative">
              <Avatar
                className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7 ring-2 ring-offset-1 transition-all ring-offset-black",
                  location === "/profile"
                    ? "ring-[#FACC15]"
                    : "ring-transparent"
                )}
              >
                <AvatarImage src={user.photoUrl || undefined} alt={user.name} />
                <AvatarFallback className="bg-[#FACC15] text-black text-[10px] font-bold">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs font-medium">Perfil</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
