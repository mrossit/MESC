import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  X,
  Send,
  MessageSquare,
  Loader2,
  AlertCircle,
  Church,
  Star,
  UserPlus,
  Bell,
  Smartphone,
  XCircle,
  Plus,
  ListPlus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseScheduleDate } from "@/lib/utils";
import { LITURGICAL_POSITIONS } from "@shared/constants";

// Definir mínimos de ministros por horário de missa
const MINIMUM_MINISTERS: Record<string, number> = {
  "08:00": 12,  // Missa das 8h - 12 ministros
  "08:00:00": 12,
  "10:00": 15,  // Missa das 10h - 15 ministros
  "10:00:00": 15,
  "19:00": 15,  // Missa das 19h - 15 ministros
  "19:00:00": 15,
  "19:30": 12,  // São Judas - 12 ministros (domingo 28)
  "19:30:00": 12,
  "06:30": 8,   // Missa da semana - 8 ministros
  "06:30:00": 8,
  "18:00": 10,  // Missa da tarde - 10 ministros
  "18:00:00": 10,
};

interface SubstitutionRequest {
  request: {
    id: string;
    assignmentId: string;
    requestingMinisterId: string;
    substituteMinisterId: string | null;
    reason: string;
    status: "available" | "pending" | "approved" | "rejected" | "cancelled" | "auto_approved";
    urgency: "low" | "medium" | "high" | "critical";
    createdAt: string;
    updatedAt: string;
  };
  assignment: {
    id: string;
    date: number;
    massTime: string;
    position: number;
  };
  requestingUser: {
    id: string;
    name: string;
    email: string;
    profilePhoto: string | null;
  };
  substituteUser?: {
    id: string;
    name: string;
  };
}

interface MassPendency {
  id: string;
  date: string;
  massTime: string;
  location: string;
  isSpecial: boolean;
  specialName?: string;
  minimumRequired: number;
  currentConfirmed: number;
  ministersShort: number;
  confirmedMinisters: Array<{
    id: string;
    name: string;
    position: number;
  }>;
  availableMinisters: Array<{
    id: string;
    name: string;
    lastServed?: string;
  }>;
  urgencyLevel: "low" | "medium" | "high" | "critical";
}

interface UpcomingAssignment {
  id: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  scheduleId: string;
}

interface AvailableSubstitute {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

export default function Substitutions() {
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  
  const user = authData?.user;
  const queryClient = useQueryClient();
  
  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";
  
  // Set default tab based on user role
  const [activeTab, setActiveTab] = useState(isCoordinator ? "pendencies" : "substitutions");
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SubstitutionRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [selectedMassForNotification, setSelectedMassForNotification] = useState<MassPendency | null>(null);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendToWhatsApp, setSendToWhatsApp] = useState(true);
  const [sendToApp, setSendToApp] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<SubstitutionRequest | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  // New substitution request dialog state
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [selectedScheduleForRequest, setSelectedScheduleForRequest] = useState<UpcomingAssignment | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestType, setRequestType] = useState<"open" | "directed">("open");
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>("");
  const [creatingRequest, setCreatingRequest] = useState(false);

  // Fetch upcoming assignments for the current minister
  const { data: upcomingAssignments = [] } = useQuery<UpcomingAssignment[]>({
    queryKey: ["/api/schedules/minister/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/schedules/minister/upcoming", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch upcoming assignments");
      const data = await response.json();
      return data.assignments || [];
    },
    enabled: !!user && !isCoordinator,
  });

  // Fetch available substitutes for selected schedule
  const { data: availableSubstitutes = [], refetch: refetchAvailableSubstitutes } = useQuery<AvailableSubstitute[]>({
    queryKey: ["/api/substitutions/available", selectedScheduleForRequest?.id],
    queryFn: async () => {
      if (!selectedScheduleForRequest) return [];
      const response = await fetch(`/api/substitutions/available/${selectedScheduleForRequest.id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch available substitutes");
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!selectedScheduleForRequest && requestType === "directed",
  });

  // Fetch mass pendencies (real data from backend)
  const { data: massPendencies = [], isLoading: loadingPendencies } = useQuery<MassPendency[]>({
    queryKey: ["/api/mass-pendencies"],
    queryFn: async () => {
      const response = await fetch("/api/mass-pendencies", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch mass pendencies");
      return response.json();
    },
    enabled: isCoordinator,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch substitution requests
  const { data: substitutionRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["/api/substitutions"],
    queryFn: async () => {
      const response = await fetch("/api/substitutions", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch substitution requests");
      const data = await response.json();
      return data;
    },
    enabled: !!user,
  });

  // Respond to substitution request mutation
  const respondToSubstitutionMutation = useMutation({
    mutationFn: async ({ requestId, accept, message }: any) => {
      const response = await fetch(`/api/substitutions/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          response: accept ? "accepted" : "rejected",
          responseMessage: message 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitutions"] });
      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso",
      });
      setIsResponseDialogOpen(false);
      setResponseMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleRespondToRequest = (request: SubstitutionRequest) => {
    setSelectedRequest(request);
    setIsResponseDialogOpen(true);
  };

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;

    setCancellingRequest(true);
    try {
      const response = await fetch(`/api/substitutions/${requestToCancel.request.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Solicitação cancelada com sucesso"
        });
        queryClient.invalidateQueries({ queryKey: ["/api/substitutions"] });
        setIsCancelDialogOpen(false);
        setRequestToCancel(null);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao cancelar solicitação",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar solicitação",
        variant: "destructive"
      });
    } finally {
      setCancellingRequest(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case "critical": return "Crítico";
      case "high": return "Alta";
      case "medium": return "Média";
      case "low": return "Baixa";
      default: return urgency;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "secondary";
      case "pending": return "default";
      case "approved": return "default";
      case "auto_approved": return "default";
      case "rejected": return "destructive";
      case "cancelled": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Aguardando voluntário";
      case "pending": return "Pendente";
      case "approved": return "Aprovado";
      case "auto_approved": return "Aprovado automaticamente";
      case "rejected": return "Rejeitado";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const inviteMinisterToMass = (massId: string, ministerId: string) => {
    toast({
      title: "Convite Enviado",
      description: "O ministro foi convidado para servir nesta missa",
    });
    // In production, this would send an invitation
  };

  const handleSendNotifications = async () => {
    if (!selectedMassForNotification) return;

    const notifications = [];
    
    if (sendToApp) {
      // Enviar notificação pela central de mensagens do app
      try {
        const response = await fetch("/api/notifications/mass-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            massId: selectedMassForNotification.id,
            date: selectedMassForNotification.date,
            time: selectedMassForNotification.massTime,
            location: selectedMassForNotification.location,
            message: notificationMessage || `Precisamos de ${selectedMassForNotification.ministersShort} ministros para a missa de ${format(new Date(selectedMassForNotification.date), "dd/MM")} às ${selectedMassForNotification.massTime}`,
            urgencyLevel: selectedMassForNotification.urgencyLevel
          })
        });
        
        if (response.ok) {
          notifications.push("Central de Mensagens");
        }
      } catch (error) {
        console.error("Erro ao enviar notificação no app:", error);
      }
    }
    
    if (sendToWhatsApp) {
      // Preparar mensagem para WhatsApp
      const whatsappMessage = encodeURIComponent(
        notificationMessage || 
        `🔔 *CONVOCAÇÃO URGENTE*\n\n` +
        `Precisamos de ${selectedMassForNotification.ministersShort} ministros para:\n` +
        `📅 ${format(new Date(selectedMassForNotification.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}\n` +
        `🕐 ${selectedMassForNotification.massTime}\n` +
        `⛪ ${selectedMassForNotification.location}\n\n` +
        `Por favor, confirme sua disponibilidade o quanto antes!`
      );
      
      // Abrir WhatsApp Web com a mensagem
      window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
      notifications.push("WhatsApp");
    }
    
    if (notifications.length > 0) {
      toast({
        title: "Notificações Enviadas",
        description: `Mensagem enviada via: ${notifications.join(" e ")}`,
      });
    }
    
    setIsNotificationDialogOpen(false);
    setNotificationMessage("");
    setSendToApp(true);
    setSendToWhatsApp(true);
  };

  const openNotificationDialog = (mass: MassPendency) => {
    setSelectedMassForNotification(mass);
    setNotificationMessage(
      `Prezados ministros,\n\n` +
      `Precisamos de ${mass.ministersShort} ministros para a missa de ${format(new Date(mass.date), "EEEE, dd 'de' MMMM", { locale: ptBR })} às ${mass.massTime} na ${mass.location}.\n\n` +
      `Quem puder servir nesta celebração, por favor confirme sua disponibilidade.\n\n` +
      `Ministério da Comunhão`
    );
    setIsNotificationDialogOpen(true);
  };

  const openNewRequestDialog = () => {
    setIsNewRequestDialogOpen(true);
    setSelectedScheduleForRequest(null);
    setRequestReason("");
    setRequestType("open");
    setSelectedSubstituteId("");
  };

  const handleCreateRequest = async () => {
    if (!selectedScheduleForRequest) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma escala",
        variant: "destructive"
      });
      return;
    }

    if (requestType === "directed" && !selectedSubstituteId) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um ministro substituto",
        variant: "destructive"
      });
      return;
    }

    setCreatingRequest(true);
    try {
      const response = await fetch("/api/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scheduleId: selectedScheduleForRequest.id,
          substituteId: requestType === "directed" ? selectedSubstituteId : null,
          reason: requestReason || "Não especificado"
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: result.message || "Solicitação criada com sucesso"
        });
        queryClient.invalidateQueries({ queryKey: ["/api/substitutions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/schedules/minister/upcoming"] });
        setIsNewRequestDialogOpen(false);
        setRequestReason("");
        setSelectedScheduleForRequest(null);
        setRequestType("open");
        setSelectedSubstituteId("");
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar solicitação",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating request:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar solicitação",
        variant: "destructive"
      });
    } finally {
      setCreatingRequest(false);
    }
  };

  return (
    <Layout 
      title="Substituições"
      subtitle={isCoordinator ? "Gerencie pendências e substituições" : "Gerencie solicitações de substituição"}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full", isCoordinator ? "grid-cols-2" : "grid-cols-1")}>
          {isCoordinator && (
            <TabsTrigger value="pendencies" className="relative">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Pendências
              {massPendencies.filter(p => p.urgencyLevel === "critical" || p.urgencyLevel === "high").length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="substitutions">
            <Users className="h-4 w-4 mr-2" />
            Substituições
          </TabsTrigger>
        </TabsList>

        {isCoordinator && (
          <TabsContent value="pendencies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Missas com Ministros Faltantes</CardTitle>
                <CardDescription>
                  Missas dominicais que ainda não atingiram o número mínimo de ministros confirmados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPendencies ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : massPendencies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Todas as missas têm ministros suficientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {massPendencies.map((mass) => {
                      const progressPercentage = (mass.currentConfirmed / mass.minimumRequired) * 100;
                      const daysUntil = Math.floor((new Date(mass.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div 
                          key={mass.id}
                          className={cn(
                            "border rounded-lg p-4",
                            mass.urgencyLevel === "critical" && "border-red-500 bg-red-50 dark:bg-red-900/20",
                            mass.urgencyLevel === "high" && "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
                            mass.isSpecial && "ring-2 ring-amber-400"
                          )}
                        >
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  {mass.isSpecial && (
                                    <Star className="h-4 w-4 text-amber-500" />
                                  )}
                                  <h3 className="font-semibold">
                                    {mass.isSpecial 
                                      ? mass.specialName 
                                      : `Missa de ${format(new Date(mass.date), "EEEE", { locale: ptBR })}`}
                                  </h3>
                                  <Badge variant={getUrgencyColor(mass.urgencyLevel)}>
                                    {getUrgencyLabel(mass.urgencyLevel)}
                                  </Badge>
                                  {daysUntil <= 3 && (
                                    <Badge variant="outline" className="border-red-500 text-red-600">
                                      {daysUntil === 0 ? "Hoje" : 
                                       daysUntil === 1 ? "Amanhã" : 
                                       `Em ${daysUntil} dias`}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(mass.date), "dd/MM/yyyy")}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {mass.massTime}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Church className="h-3 w-3" />
                                    {mass.location}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Summary Stats */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-2xl font-bold">
                                  <span className={cn(
                                    mass.urgencyLevel === "critical" && "text-red-600",
                                    mass.urgencyLevel === "high" && "text-orange-600"
                                  )}>
                                    {mass.currentConfirmed}
                                  </span>
                                  <span className="text-muted-foreground text-lg">/{mass.minimumRequired}</span>
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">ministros confirmados</p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progresso da escala</span>
                                <span className="font-medium">
                                  Faltam {mass.ministersShort} ministros
                                </span>
                              </div>
                              <Progress 
                                value={progressPercentage} 
                                className={cn(
                                  "h-2",
                                  progressPercentage < 50 && "[&>div]:bg-red-500",
                                  progressPercentage >= 50 && progressPercentage < 80 && "[&>div]:bg-orange-500",
                                  progressPercentage >= 80 && progressPercentage < 100 && "[&>div]:bg-yellow-500",
                                  progressPercentage >= 100 && "[&>div]:bg-green-500"
                                )}
                              />
                            </div>

                            {/* Alert for critical situations */}
                            {mass.urgencyLevel === "critical" && (
                              <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-800 dark:text-red-200">
                                  <span className="font-semibold">URGENTE:</span> Esta missa é {daysUntil === 0 ? "hoje" : "em breve"} e 
                                  ainda faltam {mass.ministersShort} ministros!
                                </p>
                              </div>
                            )}

                            {/* Available Ministers to Invite */}
                            {mass.availableMinisters.length > 0 && (
                              <div className="border-t pt-3">
                                <p className="text-sm font-medium mb-2">Ministros disponíveis para convidar:</p>
                                <div className="space-y-2">
                                  {mass.availableMinisters.slice(0, 4).map((minister) => (
                                    <div key={minister.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{minister.name}</p>
                                        {minister.lastServed && (
                                          <p className="text-xs text-muted-foreground">
                                            Último: {format(new Date(minister.lastServed), "dd/MM")}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 flex-shrink-0"
                                        onClick={() => inviteMinisterToMass(mass.id, minister.id)}
                                      >
                                        <UserPlus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant={mass.urgencyLevel === "critical" ? "destructive" : "default"}
                                className="flex-1"
                                onClick={() => {
                                  // Enviar convite individual para ministros disponíveis
                                  mass.availableMinisters.forEach(minister => {
                                    inviteMinisterToMass(mass.id, minister.id);
                                  });
                                  toast({
                                    title: "Convites Enviados",
                                    description: `${mass.availableMinisters.length} convites individuais enviados`,
                                  });
                                }}
                              >
                                <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="truncate">Enviar Convite em Massa</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1 sm:flex-initial"
                                onClick={() => openNotificationDialog(mass)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="truncate">Notificar Grupo</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="substitutions" className="space-y-4">
          {!isCoordinator && (
            <div className="flex justify-end">
              <Button onClick={openNewRequestDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Substituição</CardTitle>
              <CardDescription>
                {isCoordinator
                  ? "Todas as solicitações de substituição do ministério"
                  : "Suas solicitações e pedidos que você pode atender"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : substitutionRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma solicitação de substituição no momento</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {substitutionRequests.map((item: SubstitutionRequest) => {
                    // Parse date correctly to avoid timezone issues
                    const assignmentDate = item.assignment?.date
                      ? parseScheduleDate(item.assignment.date)
                      : new Date();
                    const isDirected = item.request.substituteMinisterId !== null;
                    const isForMe = isDirected && item.request.substituteMinisterId === user?.id;
                    const isMyRequest = item.requestingUser.id === user?.id;
                    
                    return (
                      <div 
                        key={item.request.id}
                        className={cn(
                          "border rounded-lg p-4",
                          isMyRequest && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                          isForMe && !isMyRequest && "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        )}
                      >
                        {/* Header com nome e badges */}
                        <div className="mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="font-semibold text-base">
                              {isMyRequest ? "Sua solicitação" : item.requestingUser.name}
                            </p>
                            
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                              {isDirected && !isMyRequest && (
                                <Badge variant="outline" className="gap-1 whitespace-nowrap">
                                  <Users className="h-3 w-3 flex-shrink-0" />
                                  {isForMe ? "Para você" : "Direcionado"}
                                </Badge>
                              )}
                              <Badge variant={getUrgencyColor(item.request.urgency)} className="whitespace-nowrap">
                                {getUrgencyLabel(item.request.urgency)}
                              </Badge>
                              <Badge variant={getStatusColor(item.request.status)} className="whitespace-nowrap">
                                {getStatusLabel(item.request.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo principal em duas colunas */}
                        <div className="flex flex-col gap-4 mb-4">
                          {/* Informações da missa */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Detalhes da Missa
                            </h4>
                            <div className="bg-muted/50 rounded-md p-3 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium whitespace-nowrap">Data:</span>
                                </div>
                                <span className="text-muted-foreground truncate ml-6 sm:ml-0">
                                  {item.assignment?.date && !isNaN(assignmentDate.getTime()) 
                                    ? format(assignmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) 
                                    : "Data inválida"}
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium whitespace-nowrap">Horário:</span>
                                </div>
                                <span className="text-muted-foreground ml-6 sm:ml-0">{item.assignment?.massTime || ""}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Church className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium whitespace-nowrap">Posição:</span>
                                </div>
                                <Badge variant="secondary" className="text-xs ml-6 sm:ml-0 self-start sm:self-auto">
                                  {LITURGICAL_POSITIONS[item.assignment?.position || 1]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Motivo */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Motivo da Solicitação
                            </h4>
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 break-words">
                              {item.request.reason}
                            </p>
                          </div>
                        </div>
                        
                        {/* Botões de ação */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                          {/* Botão para aceitar solicitação direcionada (pending com substituteId) */}
                          {item.request.status === "pending" && !isMyRequest && isDirected && isForMe && (
                            <Button
                              size="sm"
                              onClick={() => handleRespondToRequest(item)}
                              className="flex-1 sm:flex-initial"
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Responder
                            </Button>
                          )}

                          {/* Botão para reivindicar solicitação aberta (available OU pending sem substituteId) */}
                          {(item.request.status === "available" || (item.request.status === "pending" && !isDirected)) && !isMyRequest && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/substitutions/${item.request.id}/claim`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ message: "Aceito substituir" })
                                  });

                                  if (response.ok) {
                                    toast({
                                      title: "Sucesso",
                                      description: "Substituição aceita com sucesso!"
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["/api/substitutions"] });
                                  } else {
                                    const error = await response.json();
                                    toast({
                                      title: "Erro",
                                      description: error.message,
                                      variant: "destructive"
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Erro",
                                    description: "Erro ao aceitar substituição",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className="flex-1 sm:flex-initial"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aceitar Substituição
                            </Button>
                          )}

                          {/* Botão para cancelar própria solicitação */}
                          {(item.request.status === "pending" || item.request.status === "available") && isMyRequest && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 flex-1 sm:flex-initial"
                              onClick={() => {
                                setRequestToCancel(item);
                                setIsCancelDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for sending notifications */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Notificação para Ministros</DialogTitle>
            <DialogDescription>
              Configure como deseja notificar os ministros sobre esta missa
            </DialogDescription>
          </DialogHeader>

          {selectedMassForNotification && (
            <div className="space-y-4">
              {/* Informações da Missa */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {selectedMassForNotification.isSpecial && (
                    <Star className="h-4 w-4 text-amber-500" />
                  )}
                  <p className="font-semibold">
                    {selectedMassForNotification.isSpecial 
                      ? selectedMassForNotification.specialName 
                      : `Missa de ${format(new Date(selectedMassForNotification.date), "EEEE", { locale: ptBR })}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedMassForNotification.date), "dd/MM/yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedMassForNotification.massTime}
                  </div>
                  <div className="flex items-center gap-1">
                    <Church className="h-3 w-3" />
                    {selectedMassForNotification.location}
                  </div>
                </div>
                <p className="text-sm font-medium text-destructive mt-2">
                  Faltam {selectedMassForNotification.ministersShort} ministros
                </p>
              </div>

              {/* Mensagem */}
              <div>
                <Label htmlFor="notification-message">Mensagem</Label>
                <Textarea
                  id="notification-message"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Digite a mensagem para os ministros..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              {/* Canais de Notificação */}
              <div className="space-y-3">
                <Label>Canais de Notificação</Label>
                
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="app-notification"
                    checked={sendToApp}
                    onCheckedChange={(checked) => setSendToApp(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="app-notification"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Bell className="h-4 w-4 text-primary" />
                      Central de Mensagens do App
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Envia notificação interna para todos os ministros
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="whatsapp-notification"
                    checked={sendToWhatsApp}
                    onCheckedChange={(checked) => setSendToWhatsApp(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="whatsapp-notification"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Smartphone className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Abre o WhatsApp com a mensagem pronta para enviar ao grupo
                    </p>
                  </div>
                </div>
              </div>

              {!sendToApp && !sendToWhatsApp && (
                <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Selecione pelo menos um canal de notificação
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNotificationDialogOpen(false);
                setNotificationMessage("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendNotifications}
              disabled={!sendToApp && !sendToWhatsApp}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Notificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for responding to substitution requests */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle>Responder Solicitação</DialogTitle>
            <DialogDescription>
              Você deseja aceitar esta solicitação de substituição?
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Solicitante:</span> {selectedRequest.requestingUser.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Data:</span>{" "}
                  {format(new Date(selectedRequest.assignment.date), "dd/MM/yyyy")}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Horário:</span> {selectedRequest.assignment.massTime}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Posição:</span>{" "}
                  {LITURGICAL_POSITIONS[selectedRequest.assignment.position]}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Motivo:</span> {selectedRequest.request.reason}
                </p>
              </div>

              <div>
                <Label htmlFor="response-message">Mensagem (opcional)</Label>
                <Textarea
                  id="response-message"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Adicione uma mensagem..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedRequest) {
                  respondToSubstitutionMutation.mutate({
                    requestId: selectedRequest.request.id,
                    accept: false,
                    message: responseMessage
                  });
                }
              }}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Recusar
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest) {
                  respondToSubstitutionMutation.mutate({
                    requestId: selectedRequest.request.id,
                    accept: true,
                    message: responseMessage
                  });
                }
              }}
              className="w-full sm:w-auto"
            >
              <Check className="h-4 w-4 mr-2" />
              Aceitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar cancelamento */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Cancelamento</DialogTitle>
            <DialogDescription>
              {requestToCancel && (
                <>
                  Tem certeza que deseja cancelar sua solicitação de substituição para o dia{" "}
                  <strong>
                    {format(new Date(requestToCancel.assignment.date), "dd 'de' MMMM", { locale: ptBR })}
                  </strong>{" "}
                  na missa das <strong>{requestToCancel.assignment.massTime}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Atenção:
                </p>
                <ul className="mt-1 space-y-1 text-amber-800 dark:text-amber-200 text-xs">
                  <li>• Esta ação não pode ser desfeita</li>
                  <li>• Você voltará a estar escalado para esta data</li>
                  <li>• Os ministros que já responderam serão notificados</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setRequestToCancel(null);
              }}
              disabled={cancellingRequest}
              className="w-full sm:w-auto"
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={cancellingRequest}
              className="w-full sm:w-auto"
            >
              {cancellingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirmar Cancelamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar nova solicitação de substituição */}
      <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Substituição</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para solicitar uma substituição em uma de suas escalas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selecionar escala */}
            <div className="space-y-2">
              <Label htmlFor="schedule-select">Escala para substituição *</Label>
              <Select
                value={selectedScheduleForRequest?.id || ""}
                onValueChange={(value) => {
                  const schedule = upcomingAssignments.find(a => a.id === value);
                  setSelectedScheduleForRequest(schedule || null);
                }}
              >
                <SelectTrigger id="schedule-select">
                  <SelectValue placeholder="Selecione uma escala" />
                </SelectTrigger>
                <SelectContent>
                  {upcomingAssignments.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhuma escala futura disponível
                    </div>
                  ) : (
                    upcomingAssignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {format(new Date(assignment.date), "dd/MM/yyyy")} às{" "}
                        {assignment.massTime} - {LITURGICAL_POSITIONS[assignment.position]}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de solicitação */}
            <div className="space-y-3">
              <Label>Tipo de solicitação</Label>
              <RadioGroup value={requestType} onValueChange={(value: "open" | "directed") => {
                setRequestType(value);
                setSelectedSubstituteId("");
              }}>
                <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="open" id="open" />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <label
                      htmlFor="open"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Solicitação Aberta
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Qualquer ministro disponível pode se candidatar à substituição
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="directed" id="directed" />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <label
                      htmlFor="directed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Solicitação Direcionada
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Escolha um ministro específico para substituí-lo
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Seleção de ministro (apenas para solicitação direcionada) */}
            {requestType === "directed" && (
              <div className="space-y-2">
                <Label htmlFor="substitute-select">Ministro Substituto *</Label>
                <Select
                  value={selectedSubstituteId}
                  onValueChange={setSelectedSubstituteId}
                  disabled={!selectedScheduleForRequest}
                >
                  <SelectTrigger id="substitute-select">
                    <SelectValue placeholder={
                      selectedScheduleForRequest
                        ? "Selecione um ministro"
                        : "Primeiro selecione uma escala"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubstitutes.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        {selectedScheduleForRequest
                          ? "Nenhum ministro disponível"
                          : "Selecione uma escala primeiro"}
                      </div>
                    ) : (
                      availableSubstitutes.map((minister) => (
                        <SelectItem key={minister.id} value={minister.id}>
                          {minister.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedScheduleForRequest && availableSubstitutes.length === 0 && (
                  <p className="text-xs text-amber-600">
                    Não há ministros disponíveis para esta escala. Considere criar uma solicitação aberta.
                  </p>
                )}
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Informe o motivo da solicitação (opcional)"
                className="min-h-[100px]"
              />
            </div>

            {/* Informações sobre urgência */}
            {selectedScheduleForRequest && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Informações importantes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • Assim que um ministro aceitar seu pedido, a substituição é confirmada automaticamente
                      </li>
                      <li>
                        • Você receberá uma notificação quando a substituição for confirmada
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewRequestDialogOpen(false);
                setRequestReason("");
                setSelectedScheduleForRequest(null);
                setRequestType("open");
                setSelectedSubstituteId("");
              }}
              disabled={creatingRequest}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={
                creatingRequest ||
                !selectedScheduleForRequest ||
                (requestType === "directed" && !selectedSubstituteId)
              }
            >
              {creatingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Criar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
