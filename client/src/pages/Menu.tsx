import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
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

  const menuItems: MenuItem[] = [
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
    {
      title: "Escalas",
      href: "/schedules",
      icon: Calendar,
      roles: ["gestor", "coordenador", "ministro"]
    },
    {
      title: "Geração Automática",
      href: "/schedules/auto-generation",
      icon: Calendar,
      roles: ["gestor", "coordenador"]
    },
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
  ];

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <Layout title="Menu Principal" subtitle={`Olá, ${user?.name || 'Ministro'}`}>
      <div className="space-y-6">
        {/* Grid de opções do menu */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
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
                  <Icon className="h-10 w-10 text-primary" />
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Botão de Logout */}
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="w-full max-w-md"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair do Sistema
          </Button>
        </div>

        {/* Informações do usuário */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Logado como: <strong>{user?.email}</strong></p>
          <p>Função: <strong className="capitalize">{user?.role}</strong></p>
        </div>
      </div>
    </Layout>
  );
}
