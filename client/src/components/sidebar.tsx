import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  Church, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  Cross
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Ministros", href: "/ministers", icon: Users },
  { name: "Escalas", href: "/schedules", icon: Calendar },
  { name: "Disponibilidade", href: "/availability", icon: Clock },
  { name: "Missas", href: "/masses", icon: Church },
];

export function Sidebar() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
      window.location.href = "/api/logout";
    }
  };

  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Usuário';
  };

  const getUserRole = () => {
    switch (user?.role) {
      case 'reitor':
        return 'Reitor';
      case 'coordenador':
        return 'Coordenador';
      case 'ministro':
        return 'Ministro';
      default:
        return 'Usuário';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Cross className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-foreground">MESC</h2>
            <p className="text-xs text-muted-foreground">São Judas Tadeu</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border bg-muted/50">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl} alt={getUserDisplayName()} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(getUserDisplayName())}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-muted-foreground">{getUserRole()}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10 px-3",
                  isActive && "bg-primary text-primary-foreground"
                )}
                data-testid={`nav-link-${item.name.toLowerCase()}`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}

        <div className="pt-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 px-3"
            data-testid="nav-link-settings"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </nav>
    </aside>
  );
}
