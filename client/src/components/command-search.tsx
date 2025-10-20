import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  BarChart3,
  Calendar,
  Users,
  GraduationCap,
  Bell,
  Settings,
  FileText,
  UserCheck,
  User,
  HelpCircle,
  LogOut,
  ChevronRight,
  Home,
  UserCog
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon: React.ElementType;
  group: string;
  roles?: string[];
  action?: () => void;
}

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });

  const user = authData?.user;

  // Definir todos os itens de menu disponíveis
  const allMenuItems: SearchItem[] = [
    // Menu Principal
    {
      id: "dashboard",
      title: "Dashboard",
      description: "Painel principal",
      href: "/dashboard",
      icon: BarChart3,
      group: "Principal",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "questionnaire",
      title: "Questionário",
      description: "Questionário de disponibilidade",
      href: "/questionnaire",
      icon: FileText,
      group: "Escalas",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "schedules",
      title: "Escalas",
      description: "Visualizar escalas de missas",
      href: "/schedules",
      icon: Calendar,
      group: "Escalas",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "substitutions",
      title: "Substituições",
      description: "Gerenciar substituições",
      href: "/schedules/substitutions",
      icon: Users,
      group: "Escalas",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "ministers-directory",
      title: "Diretório de Ministros",
      description: "Ver perfil e contatos dos ministros",
      href: "/ministers-directory",
      icon: Users,
      group: "Comunidade",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "ministers",
      title: "Gestão de Ministros",
      description: "Gerenciar ministros (admin)",
      href: "/ministers",
      icon: UserCog,
      group: "Gestão",
      roles: ["gestor", "coordenador"]
    },
    {
      id: "user-management",
      title: "Gestão de Usuários",
      description: "Gerenciar usuários do sistema",
      href: "/user-management",
      icon: Settings,
      group: "Gestão",
      roles: ["gestor", "coordenador"]
    },
    {
      id: "formation-liturgy",
      title: "Trilha Liturgia",
      description: "Formação em liturgia",
      href: "/formation/liturgy",
      icon: GraduationCap,
      group: "Formação",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "formation-spirituality",
      title: "Espiritualidade",
      description: "Formação espiritual",
      href: "/formation/spirituality",
      icon: GraduationCap,
      group: "Formação",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "formation-library",
      title: "Biblioteca",
      description: "Materiais de estudo",
      href: "/formation/library",
      icon: GraduationCap,
      group: "Formação",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "communication",
      title: "Comunicação",
      description: "Central de notificações",
      href: "/communication",
      icon: Bell,
      group: "Comunicação",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "reports",
      title: "Relatórios",
      description: "Relatórios do sistema",
      href: "/reports",
      icon: FileText,
      group: "Gestão",
      roles: ["gestor", "coordenador"]
    },
    {
      id: "approvals",
      title: "Aprovações",
      description: "Aprovar novos usuários",
      href: "/approvals",
      icon: UserCheck,
      group: "Gestão",
      roles: ["gestor", "coordenador"]
    },
    // Configurações
    {
      id: "profile",
      title: "Meu Perfil",
      description: "Gerenciar perfil pessoal",
      href: "/profile",
      icon: User,
      group: "Configurações",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "settings",
      title: "Configurações",
      description: "Preferências do sistema",
      href: "/settings",
      icon: Settings,
      group: "Configurações",
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      id: "change-password",
      title: "Alterar Senha",
      description: "Modificar senha de acesso",
      href: "/change-password",
      icon: Settings,
      group: "Configurações",
      roles: ["gestor", "coordenador", "ministro"]
    }
  ];

  // Filtrar itens baseado no papel do usuário
  const availableItems = allMenuItems.filter(item => 
    user && item.roles?.includes(user.role)
  );

  // Filtrar baseado na busca
  const filteredItems = availableItems.filter(item => {
    const searchLower = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.group.toLowerCase().includes(searchLower)
    );
  });

  // Agrupar itens por categoria
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  // Atalho de teclado (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((item: SearchItem) => {
    setOpen(false);
    setSearch("");
    if (item.action) {
      item.action();
    } else {
      navigate(item.href);
    }
  }, [navigate]);

  return (
    <>
      {/* Desktop Search Bar */}
      <div className="hidden lg:flex items-center rounded-lg border bg-background px-3 py-1.5">
        <Search className="h-4 w-4 text-muted-foreground mr-2" />
        <button
          onClick={() => setOpen(true)}
          className="h-auto w-32 border-0 bg-transparent p-0 text-sm text-muted-foreground text-left xl:w-48 hover:text-foreground transition-colors"
        >
          Buscar...
        </button>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* Mobile Search Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Buscar</span>
      </Button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Buscar menu..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          {Object.entries(groupedItems).map(([group, items], index) => (
            <div key={group}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                      className="cursor-pointer"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <span>{item.title}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}