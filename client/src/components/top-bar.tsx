import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  photoUrl?: string;
  phone?: string;
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
    <div className="w-full top-bar" style={{ backgroundColor: '#000000' }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-semibold title">
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
                {recentUsers.map((user, index) => {
                  const whatsappLink = user.phone 
                    ? `https://api.whatsapp.com/send/?phone=5515${user.phone.replace(/\D/g, '')}`
                    : '#';
                  
                  return (
                    <a
                      key={user.id}
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                      title={`${user.name} - ${user.isOnline ? 'Online' : 'Offline'}${user.phone ? ' - Clique para abrir WhatsApp' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "h-14 w-14 ring-[3px] ring-offset-2 transition-all duration-300 group-hover:scale-110 group-hover:ring-offset-4",
                            user.isOnline
                              ? "ring-[#95CB89] shadow-lg shadow-[#95CB89]/30"
                              : "ring-[#FACC15] shadow-lg shadow-[#FACC15]/30"
                          )}
                        >
                          <AvatarImage src={user.photoUrl || undefined} alt={user.name} />
                          <AvatarFallback className="bg-white text-black text-sm font-bold">
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicador de status - verde para online, amarelo para offline */}
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-[3px] ring-black transition-all",
                            user.isOnline
                              ? "bg-[#95CB89] shadow-lg shadow-[#95CB89]/50"
                              : "bg-[#FACC15] shadow-lg shadow-[#FACC15]/50"
                          )}
                        />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
