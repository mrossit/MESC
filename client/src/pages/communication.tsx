import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Send,
  Users,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Check,
  Mail,
  MessageSquare,
  Megaphone
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
}

export default function Communication() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inbox");
  
  // Form state for sending notifications
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "error">("info");
  const [recipientRole, setRecipientRole] = useState<"all" | "ministro" | "coordenador" | "gestor">("ministro");

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });

  const user = authData?.user;
  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  // Fetch notifications with auto-refresh
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: activeTab === "inbox",
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Fetch unread count
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/notifications", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      const count = data.recipientCount || 0;
      toast({
        title: "Comunicado enviado com sucesso",
        description: `Mensagem enviada para ${count} destinatário${count !== 1 ? 's' : ''}`,
      });
      // Reset form
      setTitle("");
      setMessage("");
      setType("info");
      setRecipientRole("ministro");
      // Switch to inbox tab
      setActiveTab("inbox");
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar comunicado",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

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
      toast({
        title: "Notificações marcadas como lidas",
        description: "Todas as notificações foram marcadas como lidas",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Notificação excluída",
        description: "A notificação foi removida",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a mensagem",
        variant: "destructive",
      });
      return;
    }

    sendNotificationMutation.mutate({
      title,
      message,
      type,
      recipientRole: recipientRole === "all" ? "all" : recipientRole,
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: string, read: boolean) => {
    if (read) return "bg-gray-50";
    
    switch (type) {
      case "success":
        return "bg-green-50";
      case "warning":
        return "bg-yellow-50";
      case "error":
        return "bg-red-50";
      default:
        return "bg-blue-50";
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <Layout 
      title="Comunicação" 
      subtitle={isCoordinator ? "Envie comunicados e gerencie notificações" : "Suas notificações e comunicados"}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isCoordinator ? 'grid-cols-2' : 'grid-cols-1'} max-w-md`}>
          <TabsTrigger value="inbox" className="relative">
            <Bell className="h-4 w-4 mr-2" />
            Caixa de Entrada
            {unreadCount?.count ? (
              <Badge className="ml-2 h-5 px-1.5 bg-red-500 text-white">
                {unreadCount.count}
              </Badge>
            ) : null}
          </TabsTrigger>
          {isCoordinator && (
            <TabsTrigger value="send">
              <Send className="h-4 w-4 mr-2" />
              Enviar Comunicado
            </TabsTrigger>
          )}
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notificações</CardTitle>
                  <CardDescription>
                    {unreadNotifications.length > 0 
                      ? `Você tem ${unreadNotifications.length} notificação(ões) não lida(s)`
                      : "Todas as notificações foram lidas"}
                  </CardDescription>
                </div>
                {notifications.length > 0 && unreadNotifications.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                      <Mail className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhuma notificação</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Você será notificado quando houver novos comunicados
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-all ${
                          getNotificationBg(notification.type, notification.read)
                        } ${!notification.read ? "border-l-4 border-l-blue-500" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1">
                              <h4 className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                                {notification.title}
                              </h4>
                              <p className={`text-sm mt-1 ${!notification.read ? "text-foreground/90" : "text-muted-foreground"}`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(notification.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                                data-testid={`button-mark-read-${notification.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isCoordinator || window.confirm("Tem certeza que deseja excluir esta notificação?")) {
                                  deleteNotificationMutation.mutate(notification.id);
                                }
                              }}
                              data-testid={`button-delete-${notification.id}`}
                              title={isCoordinator ? "Excluir mensagem (coordenador)" : "Excluir minha notificação"}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Tab (Coordinators only) */}
        {isCoordinator && (
          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enviar Comunicado</CardTitle>
                <CardDescription>
                  Envie mensagens para os membros do ministério
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendNotification} className="space-y-6">
                  {/* Recipient Selection */}
                  <div className="space-y-3">
                    <Label>Destinatários</Label>
                    <RadioGroup value={recipientRole} onValueChange={(value: any) => setRecipientRole(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ministro" id="ministro" />
                        <Label htmlFor="ministro" className="font-normal cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Todos os Ministros
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="coordenador" id="coordenador" />
                        <Label htmlFor="coordenador" className="font-normal cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Coordenadores
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="font-normal cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            Todos os Usuários
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Message Type */}
                  <div className="space-y-3">
                    <Label>Tipo de Mensagem</Label>
                    <RadioGroup value={type} onValueChange={(value: any) => setType(value)}>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="info" id="info" />
                          <Label htmlFor="info" className="font-normal cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-blue-500" />
                              Informativo
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="success" id="success" />
                          <Label htmlFor="success" className="font-normal cursor-pointer">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              Positivo
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="warning" id="warning" />
                          <Label htmlFor="warning" className="font-normal cursor-pointer">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              Aviso
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="error" id="error" />
                          <Label htmlFor="error" className="font-normal cursor-pointer">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-500" />
                              Urgente
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Comunicado</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Reunião Mensal, Mudança de Horário..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">{title.length}/100 caracteres</p>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      placeholder="Digite sua mensagem aqui..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{message.length}/500 caracteres</p>
                  </div>

                  {/* Preview */}
                  {(title || message) && (
                    <div className="space-y-2">
                      <Label>Pré-visualização</Label>
                      <div className={`p-4 rounded-lg border ${getNotificationBg(type, false)} border-l-4 border-l-blue-500`}>
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(type)}
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                              {title || "Título do comunicado"}
                            </h4>
                            <p className="text-sm mt-1 text-foreground/90">
                              {message || "Mensagem do comunicado"}
                            </p>
                            <p className="text-xs text-mesc-text/50 mt-2">
                              Agora
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={sendNotificationMutation.isPending}
                  >
                    {sendNotificationMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Comunicado
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </Layout>
  );
}