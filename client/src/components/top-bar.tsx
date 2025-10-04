import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  photoUrl?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export function TopBar() {
  // Buscar APENAS os 5 últimos usuários conectados
  const { data: recentUsers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/recent-connections"],
    queryFn: async () => {
      const response = await fetch("/api/users/recent-connections", {
        credentials: "include"
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.slice(0, 5); // APENAS 5 usuários
    },
    refetchInterval: 30000,
  });

  return (
    <div className="w-full bg-gradient-to-r from-background to-muted/20 dark:from-dark-7 dark:to-dark-6 border-b-2 border-primary/10 dark:border-dark-gold/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-semibold text-foreground/70 dark:text-dark-cream/70 uppercase tracking-wider">
              Últimas Conexões
            </h2>

            {isLoading ? (
              <div className="flex gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 w-14 rounded-full bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : !recentUsers || recentUsers.length === 0 ? (
              <span className="text-sm text-muted-foreground italic">
                Aguardando conexões...
              </span>
            ) : (
              <div className="flex gap-4">
                {recentUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                    title={`${user.name} - ${user.isOnline ? 'Online' : 'Offline'}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative">
                      <Avatar
                        className={cn(
                          "h-14 w-14 ring-[3px] ring-offset-2 transition-all duration-300 group-hover:scale-110 group-hover:ring-offset-4",
                          user.isOnline
                            ? "ring-green-500 dark:ring-green-400 shadow-lg shadow-green-500/30"
                            : "ring-red-500 dark:ring-red-400 shadow-lg shadow-red-500/30"
                        )}
                      >
                        <AvatarImage src={user.photoUrl || undefined} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Indicador de status - maior e mais visível */}
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-[3px] ring-background dark:ring-dark-7 transition-all",
                          user.isOnline
                            ? "bg-green-500 shadow-lg shadow-green-500/50"
                            : "bg-red-500 shadow-lg shadow-red-500/50"
                        )}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground/80 dark:text-dark-cream/80 max-w-[70px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
