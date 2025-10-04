import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

interface LayoutCleanProps {
  children: ReactNode;
  title?: string;
}

export function LayoutClean({ children, title }: LayoutCleanProps) {
  // Verificar se usuário está autenticado
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const isAuthenticated = !!authData?.user;

  return (
    <div className="flex flex-col h-screen w-full layout-clean">
      {/* TopBar - Apenas se autenticado */}
      {isAuthenticated && <TopBar />}

      {/* Header simplificado - apenas título */}
      {title && (
        <header className="sticky top-0 bg-white border-b-2 border-[#F5E6CC] z-40">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#7A1C1C]">
              {title}
            </h1>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto ${isAuthenticated ? 'pb-20' : ''}`}>
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </main>

      {/* BottomNav - Apenas se autenticado */}
      {isAuthenticated && <BottomNav />}
    </div>
  );
}
