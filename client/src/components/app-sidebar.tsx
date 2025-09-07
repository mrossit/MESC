import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  LogOut,
  Settings,
  User,
  Users,
  Clock,
  Church,
  Bell,
  BookOpen,
  FileText,
  BarChart3,
  Shield,
  Sparkles,
  Moon,
  Sun,
  ClipboardCheck,
  Library,
  GraduationCap,
  CheckCircle,
  MessageSquare,
  QrCode,
  HelpCircle,
  Lock,
  ArrowRightLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

// Menu estruturado conforme PRD
const getMenuItemsByRole = (role: string, pendingCount?: number) => {
  const baseMenu = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      badge: null,
      subItems: [],
      roles: ['ministro', 'coordenador', 'gestor'],
    },
  ];

  const escalasMenu = {
    title: "Escalas",
    url: "/schedules",
    icon: Calendar,
    badge: null,
    subItems: [
      { title: "Questionário", url: "/schedules/questionnaire", icon: ClipboardCheck, roles: ['ministro', 'coordenador'] },
      { title: "Acompanhamento", url: "/schedules/tracking", icon: BarChart3, roles: ['coordenador', 'gestor'] },
      { title: "Minhas Escalas", url: "/schedules/my", icon: Calendar, roles: ['ministro'] },
      { title: "Substituições", url: "/schedules/substitutions", icon: ArrowRightLeft, roles: ['ministro', 'coordenador'] },
    ].filter(item => !item.roles || item.roles.includes(role)),
    roles: ['ministro', 'coordenador', 'gestor'],
  };

  const formacaoMenu = {
    title: "Formação",
    url: "/formation",
    icon: GraduationCap,
    badge: null,
    subItems: [
      { title: "Trilha Liturgia", url: "/formation/liturgy", icon: BookOpen, roles: ['ministro', 'coordenador'] },
      { title: "Espiritualidade", url: "/formation/spirituality", icon: Church, roles: ['ministro', 'coordenador'] },
      { title: "Biblioteca", url: "/formation/library", icon: Library, roles: ['ministro', 'coordenador', 'gestor'] },
    ].filter(item => !item.roles || item.roles.includes(role)),
    roles: ['ministro', 'coordenador', 'gestor'],
  };

  const gestaoMenu = {
    title: "Gestão",
    url: "/management",
    icon: Users,
    badge: pendingCount ? { text: pendingCount.toString(), variant: "destructive" as const } : null,
    subItems: [
      { title: "Gerenciar Usuários", url: "/management/users", icon: Users, roles: ['coordenador', 'gestor'] },
      { title: "Aprovações", url: "/approvals", icon: CheckCircle, roles: ['coordenador', 'gestor'] },
    ].filter(item => !item.roles || item.roles.includes(role)),
    roles: ['coordenador', 'gestor'],
  };

  const diretorioMenu = {
    title: "Diretório de Ministros",
    url: "/directory",
    icon: Users,
    badge: null,
    subItems: [],
    roles: ['ministro', 'coordenador', 'gestor'],
  };

  const comunicacaoMenu = {
    title: "Comunicação",
    url: "/communication",
    icon: MessageSquare,
    badge: { text: "3", variant: "default" as const },
    subItems: [],
    roles: ['ministro', 'coordenador', 'gestor'],
  };

  const relatoriosMenu = {
    title: "Relatórios",
    url: "/reports",
    icon: FileText,
    badge: null,
    subItems: [],
    roles: ['coordenador', 'gestor'],
  };

  const qrcodeMenu = {
    title: "QR Code",
    url: "/qrcode",
    icon: QrCode,
    badge: null,
    subItems: [],
    roles: ['coordenador', 'gestor'],
  };

  const allMenus = [
    ...baseMenu,
    escalasMenu,
    formacaoMenu,
    gestaoMenu,
    diretorioMenu,
    comunicacaoMenu,
    relatoriosMenu,
    qrcodeMenu,
  ];

  return allMenus.filter(menu => menu.roles.includes(role));
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(3);
  const [pendingApprovals, setPendingApprovals] = useState(5);
  
  // Pega o role do usuário (default: ministro)
  const userRole = user?.role || 'ministro';
  const menuItems = getMenuItemsByRole(userRole, pendingApprovals);

  const toggleSubMenu = (title: string) => {
    setOpenItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  useEffect(() => {
    const activeParent = menuItems.find(item => 
      item.subItems.some(sub => location === sub.url)
    );
    if (activeParent && !openItems.includes(activeParent.title)) {
      setOpenItems([activeParent.title]);
    }
  }, [location]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <Sidebar className="border-r border-[rgb(184,150,63)]/20 shadow-lg">
      <SidebarHeader className="bg-gradient-to-br from-[rgb(250,248,243)] via-[rgb(247,244,237)] to-[rgb(184,150,63)]/10 border-b border-[rgb(184,150,63)]/20">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src="/LogoSJT.png" 
                  alt="Santuário São Judas Tadeu" 
                  className="w-12 h-12 object-contain"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[rgb(245,241,232)] animate-pulse" />
              </div>
              <div className={cn(
                "transition-all duration-300",
                state === "collapsed" ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                <h2 className="font-bold text-lg text-[rgb(74,58,40)] flex items-center gap-2">
                  MESC
                  <Badge variant="outline" className="text-xs border-[rgb(184,150,63)]/30 text-[rgb(160,82,45)]">
                    v2.0
                  </Badge>
                </h2>
                <p className="text-xs text-[rgb(92,72,55)]">Santuário São Judas Tadeu</p>
              </div>
            </div>
            {state !== "collapsed" && notifications > 0 && (
              <Badge className="bg-red-500 text-white">{notifications}</Badge>
            )}
          </div>
          {state !== "collapsed" && (
            <Progress value={75} className="h-1.5 bg-gold/10" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[rgb(160,82,45)] uppercase text-xs font-semibold tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.subItems.length > 0 ? (
                    <Collapsible
                      open={openItems.includes(item.title)}
                      onOpenChange={() => toggleSubMenu(item.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            "transition-all duration-200 group",
                            location === item.url || item.subItems.some(sub => location === sub.url)
                              ? "bg-gradient-to-r from-[rgb(184,150,63)]/20 to-transparent text-[rgb(74,58,40)] border-l-4 border-[rgb(184,150,63)]"
                              : "hover:bg-[rgb(247,244,237)] hover:text-[rgb(92,72,55)]"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5" />
                              <span className={cn(
                                "transition-all duration-300",
                                state === "collapsed" ? "hidden" : "block"
                              )}>
                                {item.title}
                              </span>
                            </div>
                            {state !== "collapsed" && (
                              <div className="flex items-center gap-2">
                                {item.badge && (
                                  <Badge variant={item.badge.variant} className="text-xs">
                                    {item.badge.text}
                                  </Badge>
                                )}
                                <ChevronDown className={cn(
                                  "w-4 h-4 transition-transform",
                                  openItems.includes(item.title) ? "rotate-180" : ""
                                )} />
                              </div>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                onClick={() => setLocation(subItem.url)}
                                isActive={location === subItem.url}
                                className={cn(
                                  "pl-10 transition-all duration-200",
                                  location === subItem.url
                                    ? "bg-gold/15 text-bronze font-medium"
                                    : "hover:bg-beige-warm/50 hover:text-bronze-aged"
                                )}
                              >
                                <subItem.icon className="w-4 h-4" />
                                <span>{subItem.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => setLocation(item.url)}
                      isActive={location === item.url}
                      className={cn(
                        "transition-all duration-200 group",
                        location === item.url
                          ? "bg-gradient-to-r from-gold/20 to-transparent text-bronze border-l-4 border-gold"
                          : "hover:bg-beige-warm hover:text-bronze-aged"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className={cn(
                            "transition-all duration-300",
                            state === "collapsed" ? "hidden" : "block"
                          )}>
                            {item.title}
                          </span>
                        </div>
                        {state !== "collapsed" && item.badge && (
                          <Badge variant={item.badge.variant} className="text-xs">
                            {item.badge.text}
                          </Badge>
                        )}
                      </div>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/profile")}
                  isActive={location === "/profile"}
                  className={cn(
                    "transition-all duration-200 group",
                    location === "/profile"
                      ? "bg-gradient-to-r from-[rgb(184,150,63)]/20 to-transparent text-[rgb(74,58,40)] border-l-4 border-[rgb(184,150,63)]"
                      : "hover:bg-[rgb(247,244,237)] hover:text-[rgb(92,72,55)]"
                  )}
                >
                  <User className="w-5 h-5" />
                  <span className={cn(
                    "transition-all duration-300",
                    state === "collapsed" ? "hidden" : "block"
                  )}>
                    Meu Perfil
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/settings")}
                  isActive={location === "/settings"}
                  className={cn(
                    "transition-all duration-200 group",
                    location === "/settings"
                      ? "bg-gradient-to-r from-[rgb(184,150,63)]/20 to-transparent text-[rgb(74,58,40)] border-l-4 border-[rgb(184,150,63)]"
                      : "hover:bg-[rgb(247,244,237)] hover:text-[rgb(92,72,55)]"
                  )}
                >
                  <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span className={cn(
                    "transition-all duration-300",
                    state === "collapsed" ? "hidden" : "block"
                  )}>
                    Configurações
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {userRole === 'ministro' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/tutorial")}
                    isActive={location === "/tutorial"}
                    className={cn(
                      "transition-all duration-200 group",
                      location === "/tutorial"
                        ? "bg-gradient-to-r from-[rgb(184,150,63)]/20 to-transparent text-[rgb(74,58,40)] border-l-4 border-[rgb(184,150,63)]"
                        : "hover:bg-[rgb(247,244,237)] hover:text-[rgb(92,72,55)]"
                    )}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span className={cn(
                      "transition-all duration-300",
                      state === "collapsed" ? "hidden" : "block"
                    )}>
                      Tutorial
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/change-password")}
                  isActive={location === "/change-password"}
                  className={cn(
                    "transition-all duration-200 group",
                    location === "/change-password"
                      ? "bg-gradient-to-r from-[rgb(184,150,63)]/20 to-transparent text-[rgb(74,58,40)] border-l-4 border-[rgb(184,150,63)]"
                      : "hover:bg-[rgb(247,244,237)] hover:text-[rgb(92,72,55)]"
                  )}
                >
                  <Lock className="w-5 h-5" />
                  <span className={cn(
                    "transition-all duration-300",
                    state === "collapsed" ? "hidden" : "block"
                  )}>
                    Alterar Senha
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="hover:bg-red-50 hover:text-red-600 group"
                >
                  <LogOut className="w-5 h-5" />
                  <span className={cn(
                    "transition-all duration-300",
                    state === "collapsed" ? "hidden" : "block"
                  )}>
                    Sair
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gold/20 bg-gradient-to-t from-beige-warm to-beige">
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start p-2 hover:bg-gold/10 transition-all"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-gold/30 shadow-md">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-gold/30 to-bronze/20 text-bronze font-semibold">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-beige" />
                  </div>
                  <div className={cn(
                    "transition-all duration-300 text-left",
                    state === "collapsed" ? "w-0 opacity-0 overflow-hidden" : "flex-1"
                  )}>
                    <p className="text-sm font-medium text-bronze">{user?.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-copper">{user?.role}</p>
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Online
                      </Badge>
                    </div>
                  </div>
                  {state !== "collapsed" && (
                    <ChevronDown className="w-4 h-4 text-copper" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 ml-4 mb-2">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/notifications")}>
                <Bell className="mr-2 h-4 w-4" />
                <span>Notificações</span>
                {notifications > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white">{notifications}</Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

      <Button
        onClick={toggleSidebar}
        size="icon"
        variant="ghost"
        className="absolute -right-4 top-6 z-50 rounded-full bg-gradient-to-br from-beige to-beige-warm border border-gold/30 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 group"
      >
        {state === "collapsed" ? (
          <ChevronRight className="w-4 h-4 text-bronze group-hover:translate-x-0.5 transition-transform" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-bronze group-hover:-translate-x-0.5 transition-transform" />
        )}
      </Button>
    </Sidebar>
  );
}