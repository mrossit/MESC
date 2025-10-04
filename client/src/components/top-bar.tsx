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
    <div className="w-full bg-[#F5E6CC] border-b-2 border-[#7A1C1C]/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-semibold text-[#7A1C1C] uppercase tracking-wider">
              Últimas Conexões
            </h2>

            {isLoading ? (
              <div className="flex gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 w-14 rounded-full bg-[#F6EFE3] animate-pulse" />
                ))}
              </div>
            ) : !recentUsers || recentUsers.length === 0 ? (
              <span className="text-sm text-[#6B6B6B] italic">
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
                            ? "ring-[#2E7D32] shadow-lg shadow-[#2E7D32]/30"
                            : "ring-[#7A1C1C] shadow-lg shadow-[#7A1C1C]/30"
                        )}
                      >
                        <AvatarImage src={user.photoUrl || undefined} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-[#7A1C1C] to-[#7A1C1C]/80 text-white text-sm font-bold">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Indicador de status - maior e mais visível */}
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-[3px] ring-[#F5E6CC] transition-all",
                          user.isOnline
                            ? "bg-[#2E7D32] shadow-lg shadow-[#2E7D32]/50"
                            : "bg-[#7A1C1C] shadow-lg shadow-[#7A1C1C]/50"
                        )}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#1E1E1E] max-w-[70px] truncate">
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
