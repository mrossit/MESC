import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "@/hooks/use-navigate";
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Trash2
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function NotificationBell({ compact = false, showLabel = false, className = "" }: NotificationBellProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open, // Only fetch when popover is open
  });

  // Fetch unread count
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Check for new notifications
  useEffect(() => {
    if (unreadCount && unreadCount.count > lastCount && lastCount > 0) {
      // New notification arrived
      toast({
        title: "Nova notificação",
        description: "Você recebeu uma nova mensagem",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/communication")}
          >
            Ver
          </Button>
        ),
      });
    }
    setLastCount(unreadCount?.count || 0);
  }, [unreadCount, lastCount, navigate]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Todas marcadas como lidas",
        description: "Suas notificações foram atualizadas",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const recentNotifications = notifications.slice(0, 5); // Show only 5 most recent

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={`relative ${className}`}
          onClick={() => {
            setOpen(true);
            refetchNotifications();
          }}
        >
          <Bell className={compact ? "h-5 w-5" : "h-4 w-4"} />
          {showLabel && !compact && <span className="ml-2">Notificações</span>}
          {unreadCount && unreadCount.count > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {unreadCount.count > 9 ? "9+" : unreadCount.count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 bg-neutral-whiteBeige/95  dark:bg-dark-7/95 dark:" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-neutral-textDark dark:text-text-light">Notificações</h3>
              <p className="text-xs text-neutral-textMedium dark:text-muted-foreground mt-1">
                {unreadNotifications.length > 0 
                  ? `${unreadNotifications.length} não lida(s)` 
                  : "Todas lidas"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  navigate("/communication");
                }}
                title="Ver todas"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-neutral-textLight/30 dark:text-dark-copper/30 mx-auto mb-3" />
              <p className="text-sm text-neutral-textMedium dark:text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-neutral-textLight dark:text-muted-foreground/70 mt-1">
                Você será notificado quando houver novidades
              </p>
            </div>
          ) : (
            <div>
              {recentNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-4 hover:bg-neutral-peanut/20 dark:hover:bg-dark-3 transition-colors cursor-pointer ${
                      !notification.read ? "bg-neutral-accentWarm/10 dark:bg-dark-gold/10" : ""
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsReadMutation.mutate(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`text-sm font-medium truncate ${
                              !notification.read ? "text-neutral-textDark dark:text-text-light" : "text-neutral-textMedium dark:text-muted-foreground"
                            }`}>
                              {notification.title}
                            </p>
                            <p className={`text-xs mt-1 line-clamp-2 ${
                              !notification.read ? "text-neutral-textDark/80 dark:text-text-light/80" : "text-neutral-textMedium dark:text-muted-foreground"
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-neutral-textLight dark:text-muted-foreground/70 mt-2">
                              {format(new Date(notification.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < recentNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {recentNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => {
                  setOpen(false);
                  navigate("/communication");
                }}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}