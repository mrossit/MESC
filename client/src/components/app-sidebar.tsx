import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import {
  Church,
  BarChart3,
  Calendar,
  Users,
  GraduationCap,
  Bell,
  Settings,
  UserCog,
  FileText,
  UserCheck,
  ChevronRight,
  KeyRound,
  LogOut,
  User,
  HelpCircle,
  ChartBar,
  Move
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/hooks/use-navigate";
import { useState } from "react";
import { MinisterTutorial } from "@/components/minister-tutorial";

// Interface para items do menu
interface MenuItem {
  title: string;
  href?: string;
  icon: React.ComponentType<any>;
  roles: string[];
  badge?: number | string;
  items?: SubMenuItem[];
}

interface SubMenuItem {
  title: string;
  href: string;
  roles: string[];
  badge?: number | string;
}

export function AppSidebar() {
  const [location] = useLocation();
  const navigate = useNavigate();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const { setOpenMobile, isMobile } = useSidebar();
  
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const user = authData?.user;
  
  // Debug log
  
  // Fetch unread notification count
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
  });

  // Fetch pending users count for coordinators
  const { data: pendingUsersData } = useQuery({
    queryKey: ["/api/users/pending"],
    queryFn: async () => {
      const response = await fetch("/api/users/pending", {
        credentials: "include"
      });
      if (!response.ok) return { users: [] };
      return response.json();
    },
    enabled: !!user && (user.role === "coordenador" || user.role === "gestor"),
  });

  const pendingUsersCount = pendingUsersData?.users?.length || 0;

  const handleLogout = async () => {
    await authAPI.logout();
    navigate("/login");
  };

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      title: "Escalas",
      icon: Calendar,
      roles: ["gestor", "coordenador", "ministro"],
      items: [
        { title: "Questionário", href: "/questionnaire", roles: ["gestor", "coordenador", "ministro"] },
        { title: "Acompanhamento", href: "/questionnaire-responses", roles: ["gestor", "coordenador"] },
        { title: "Escalas", href: "/schedules", roles: ["gestor", "coordenador", "ministro"] },
        { title: "Geração Automática", href: "/schedules/auto-generation", roles: ["gestor", "coordenador"] },
        { title: "Substituições", href: "/schedules/substitutions", roles: ["gestor", "coordenador", "ministro"] },
      ]
    },
    {
      title: "Formação",
      icon: GraduationCap,
      roles: ["gestor", "coordenador", "ministro"],
      items: [
        { title: "Trilha Liturgia", href: "/formation/liturgy", roles: ["gestor", "coordenador", "ministro"] },
        { title: "Espiritualidade", href: "/formation/spirituality", roles: ["gestor", "coordenador", "ministro"] },
        { title: "Biblioteca", href: "/formation/library", roles: ["gestor", "coordenador"] },
      ]
    },
    {
      title: "Gestão de Usuários",
      icon: UserCog,
      roles: ["gestor", "coordenador"],
      items: [
        { title: "Gerenciar Usuários", href: "/user-management", roles: ["gestor", "coordenador"] },
        { title: "Aprovações", href: "/approvals", roles: ["gestor", "coordenador"], badge: pendingUsersCount > 0 ? pendingUsersCount : undefined },
      ]
    },
    {
      title: "Diretório de Ministros",
      href: "/ministers-directory",
      icon: Users,
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      title: "Comunicação",
      href: "/communication",
      icon: Bell,
      roles: ["gestor", "coordenador", "ministro"],
      badge: unreadCount?.count || undefined
    },
    {
      title: "Relatórios",
      href: "/reports",
      icon: ChartBar,
      roles: ["gestor", "coordenador"]
    },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* Tutorial Modal */}
      <MinisterTutorial 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
      />
      
      <Sidebar 
        collapsible="icon"
        className="border-0"
      >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="MESC - Santuário São Judas - Ir para Dashboard"
              className="cursor-pointer"
            >
              <Link 
                href="/dashboard"
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <img
                    src="/sjtlogo.png"
                    alt="Santuário São Judas Tadeu"
                    className="h-full w-full object-contain rounded-md hover:opacity-90 transition-opacity"
                  />
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="truncate font-semibold">MESC</span>
                  <span className="truncate text-xs text-muted-foreground">Santuário São Judas</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Perfil</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    asChild
                    tooltip={`${user.name} (${user.role})`}
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                  >
                    <Link 
                      href="/profile"
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoUrl || undefined} />
                        <AvatarFallback className="bg-neutral-neutral text-neutral-cream dark:bg-dark-gold dark:text-dark-10 text-xs">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium leading-none">{user.name}</span>
                        <span className="text-xs capitalize text-muted-foreground">{user.role === 'coordenador' ? 'Coordenador Sistema' : user.role}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const isActive = item.href === location || 
                  (item.items && item.items.some(sub => sub.href === location));

                if (item.items) {
                  return (
                    <Collapsible key={item.title} asChild defaultOpen={isActive}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isActive}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                            {item.badge && (
                              <SidebarMenuBadge className="bg-neutral-badgeWarm text-neutral-textDark dark:bg-dark-gold dark:text-dark-10 font-medium">{item.badge}</SidebarMenuBadge>
                            )}
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items
                              .filter(subItem => user && subItem.roles.includes(user.role))
                              .map((subItem) => (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={location === subItem.href}
                                  >
                                    <Link 
                                      href={subItem.href}
                                      onClick={() => {
                                        if (isMobile) {
                                          setOpenMobile(false);
                                        }
                                      }}
                                    >
                                      <span>{subItem.title}</span>
                                      {subItem.badge && (
                                        <SidebarMenuBadge className="bg-neutral-accentWarm text-neutral-cream dark:bg-dark-terracotta dark:text-text-light font-medium">{subItem.badge}</SidebarMenuBadge>
                                      )}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <Link 
                        href={item.href!}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {item.badge && (
                          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-2" tooltip="Configurações">
                  <Settings />
                  Configurações
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56 mb-2">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  navigate('/profile');
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigate('/settings');
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                {user?.role === "ministro" && (
                  <DropdownMenuItem onClick={() => {
                    setIsTutorialOpen(true);
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Tutorial do Sistema</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => {
                  navigate('/change-password');
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Alterar Senha</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}