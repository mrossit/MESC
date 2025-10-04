import { ReactNode } from "react";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

interface LayoutCleanProps {
  children: ReactNode;
  title?: string;
}

export function LayoutClean({ children, title }: LayoutCleanProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-background dark:bg-dark-8">
      {/* TopBar - Últimos 5 usuários */}
      <TopBar />

      {/* Header simplificado - apenas título */}
      {title && (
        <header className="sticky top-0 bg-background dark:bg-dark-7 border-b border-border dark:border-dark-4 z-40">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold tracking-tight">
              {title}
            </h1>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </main>

      {/* BottomNav - Menu fixo */}
      <BottomNav />
    </div>
  );
}
