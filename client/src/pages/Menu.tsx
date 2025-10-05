import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  Calendar,
  GraduationCap,
  UserCog,
  Users,
  Bell,
  ChartBar,
  QrCode,
  User,
  Settings,
  LogOut,
  FileText,
  UserCheck,
  Sparkles,
  ClipboardList,
  LayoutGrid,
} from "lucide-react";
import { authAPI } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/hooks/use-navigate";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
  badge?: number;
  items?: SubMenuItem[];
}

interface SubMenuItem {
  title: string;
  href: string;
  roles: string[];
}

export default function Menu() {
  const [, setLocation] = useLocation();
  const navigate = useNavigate();

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });

  const user = authData?.user;

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
  });

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

  const menuSections = {
    questionnaires: [
      {
        title: "Questionário",
        href: "/questionnaire",
        icon: FileText,
        roles: ["gestor", "coordenador", "ministro"]
      },
      {
        title: "Acompanhamento",
        href: "/questionnaire-responses",
        icon: UserCheck,
        roles: ["gestor", "coordenador"]
      },
    ],
    schedules: [
      {
        title: "Escalas",
        href: "/schedules",
        icon: Calendar,
        roles: ["gestor", "coordenador", "ministro"]
      },
      {
        title: "Geração Automática",
        href: "/schedules/auto-generation",
        icon: Sparkles,
        roles: ["gestor", "coordenador"]
      },
    ],
    administration: [
      {
        title: "Gerenciar Usuários",
        href: "/user-management",
        icon: UserCog,
        roles: ["gestor", "coordenador"]
      },
      {
        title: "Aprovações",
        href: "/approvals",
        icon: UserCheck,
        roles: ["gestor", "coordenador"],
        badge: pendingUsersCount > 0 ? pendingUsersCount : undefined
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
      {
        title: "QR Code",
        href: "/qrcode",
        icon: QrCode,
        roles: ["gestor", "coordenador"]
      },
    ],
    settings: [
      {
        title: "Perfil",
        href: "/profile",
        icon: User,
        roles: ["gestor", "coordenador", "ministro"]
      },
      {
        title: "Configurações",
        href: "/settings",
        icon: Settings,
        roles: ["gestor", "coordenador", "ministro"]
      },
    ]
  };

  const filterByRole = (items: MenuItem[]) =>
    items.filter(item => user && item.roles.includes(user.role));

  return (
    <Layout title="Menu Principal" subtitle={`Olá, ${user?.name || 'Ministro'}`}>
      <div className="space-y-8">
        {/* Perfil do usuário */}
        <Card className="bg-gradient-to-br from-[#CACDA5] to-[#99A285] border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarImage src={user?.photoUrl || undefined} alt={user?.name || 'Usuário'} />
                <AvatarFallback className="bg-white text-[#99A285] text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{user?.name || 'Ministro'}</h2>
                <p className="text-white/90 text-sm">{user?.email}</p>
                <Badge className="mt-2 bg-white/20 text-white border-white/30 capitalize">
                  {user?.role || 'ministro'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu em Tabs */}
        <Tabs defaultValue="schedules" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#CACDA5]/20">
            <TabsTrigger value="questionnaires" className="data-[state=active]:bg-[#A0B179] data-[state=active]:text-white">
              <ClipboardList className="h-4 w-4 mr-2" />
              Questionários
            </TabsTrigger>
            <TabsTrigger value="schedules" className="data-[state=active]:bg-[#A0B179] data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" />
              Escalas
            </TabsTrigger>
            <TabsTrigger value="administration" className="data-[state=active]:bg-[#A0B179] data-[state=active]:text-white">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Administração
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#A0B179] data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questionnaires" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filterByRole(menuSections.questionnaires).map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.href}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#A0B179] border-2"
                    onClick={() => setLocation(item.href)}
                    data-testid={`menu-card-${item.href.replace(/\//g, '-')}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <Icon className="h-12 w-12 text-[#99A285]" />
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filterByRole(menuSections.schedules).map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.href}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#A0B179] border-2"
                    onClick={() => setLocation(item.href)}
                    data-testid={`menu-card-${item.href.replace(/\//g, '-')}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <Icon className="h-12 w-12 text-[#99A285]" />
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="administration" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filterByRole(menuSections.administration).map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.href}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#A0B179] border-2"
                    onClick={() => setLocation(item.href)}
                    data-testid={`menu-card-${item.href.replace(/\//g, '-')}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3 relative">
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                        >
                          {item.badge > 9 ? '9+' : item.badge}
                        </Badge>
                      )}
                      <Icon className="h-12 w-12 text-[#99A285]" />
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filterByRole(menuSections.settings).map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.href}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 hover:border-[#A0B179] border-2"
                    onClick={() => setLocation(item.href)}
                    data-testid={`menu-card-${item.href.replace(/\//g, '-')}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <Icon className="h-12 w-12 text-[#99A285]" />
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />

        {/* Botão de Logout */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="w-full max-w-md border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair do Sistema
          </Button>
        </div>
      </div>
    </Layout>
  );
}
