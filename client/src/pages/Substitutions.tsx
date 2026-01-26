import { Layout } from "@/components/layout";
import { useState, useEffect, useMemo } from "react";
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
  ListPlus,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseScheduleDate } from "@/lib/utils";
import { formatMassTime, capitalizeFirst } from "@/features/schedules/utils/formatters";
import { LITURGICAL_POSITIONS, getPositionDisplayName } from "@shared/constants";

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
    scheduleId: string;
    requesterId: string;
    substituteId: string | null;
    reason: string;
    status: "available" | "pending" | "approved" | "rejected" | "cancelled" | "auto_approved";
    urgency: "low" | "medium" | "high" | "critical";
    createdAt: string;
    updatedAt: string;
  };
  assignment: {
    id: string;
    date: string;
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

type SubstitutionGroup = {
  key: string;
  date: Date | null;
  massTime: string;
  items: Array<{
    item: SubstitutionRequest;
    assignmentDate: Date | null;
  }>;
};

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
  
  // Estado para controlar expansão/colapso de grupos
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showPreviousRequests, setShowPreviousRequests] = useState(false);

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

  // Função auxiliar para converter horário para minutos (para ordenação)
  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const parts = time.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
  };

  const groupedSubstitutionRequests = useMemo<{
    current: SubstitutionGroup[];
    previous: SubstitutionGroup[];
  }>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processed = substitutionRequests
      .filter((item: SubstitutionRequest) => item.request.status !== "cancelled")
      .map((item: SubstitutionRequest) => {
        const assignmentDate = item.assignment?.date
          ? typeof item.assignment.date === "string"
            ? parseScheduleDate(item.assignment.date)
            : new Date(item.assignment.date)
          : null;

        return {
          item,
          assignmentDate,
        };
      })
      .sort((a: { item: SubstitutionRequest; assignmentDate: Date | null }, b: { item: SubstitutionRequest; assignmentDate: Date | null }) => {
        const aDate = a.assignmentDate ?? new Date();
        const bDate = b.assignmentDate ?? new Date();

        // Primeiro ordenar por data
        const dateDiff = aDate.getTime() - bDate.getTime();
        if (dateDiff !== 0) return dateDiff;

        // Se mesma data, ordenar por horário
        const aTime = a.item.assignment?.massTime || "00:00:00";
        const bTime = b.item.assignment?.massTime || "00:00:00";
        return timeToMinutes(aTime) - timeToMinutes(bTime);
      });

    const currentGroups = new Map<string, SubstitutionGroup>();
    const previousGroups = new Map<string, SubstitutionGroup>();

    processed.forEach((entry: { item: SubstitutionRequest; assignmentDate: Date | null }) => {
      const { item, assignmentDate } = entry;
      const hasValidDate = assignmentDate && !isNaN(assignmentDate.getTime());
      const dateKey = hasValidDate ? format(assignmentDate!, "yyyy-MM-dd") : "sem-data";
      const massTime = item.assignment?.massTime || "";
      const groupKey = `${dateKey}|${massTime}`;

      // Verificar se é passado ou futuro
      const isPrevious = hasValidDate && assignmentDate! < today;
      const targetMap = isPrevious ? previousGroups : currentGroups;

      if (!targetMap.has(groupKey)) {
        targetMap.set(groupKey, {
          key: groupKey,
          date: hasValidDate ? assignmentDate : null,
          massTime,
          items: [],
        });
      }

      targetMap.get(groupKey)!.items.push({
        item,
        assignmentDate: hasValidDate ? assignmentDate : null,
      });
    });

    // Ordenar grupos por data e horário
    const sortGroups = (groups: SubstitutionGroup[]) => {
      return groups.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        
        // Ordenar por data
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        
        // Se mesma data, ordenar por horário
        return timeToMinutes(a.massTime) - timeToMinutes(b.massTime);
      });
    };

    return {
      current: sortGroups(Array.from(currentGroups.values())),
      previous: sortGroups(Array.from(previousGroups.values()))
    };
  }, [substitutionRequests]);

  // Respond to substitution request mutation
  interface SubstitutionResponse {
    requestId: string;
    accept: boolean;
    message?: string;
  }
  const respondToSubstitutionMutation = useMutation({
    mutationFn: async ({ requestId, accept, message }: SubstitutionResponse) => {
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
      // Invalidar todas as queries de substituições e schedules relacionados
      queryClient.invalidateQueries({ queryKey: ["/api/substitutions"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/minister/upcoming"] });
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
        const isCoordinatorAction = isCoordinator && requestToCancel.requestingUser.id !== user?.id;
        toast({
          title: "Sucesso",
          description: isCoordinatorAction 
            ? `Solicitação de ${requestToCancel.requestingUser.name} excluída com sucesso`
            : "Solicitação cancelada com sucesso"
        });
        // Invalidar todas as queries de substituições e schedules relacionados
        queryClient.invalidateQueries({ queryKey: ["/api/substitutions"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/schedules"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/schedules/minister/upcoming"] });
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
        // Invalidar todas as queries de substituições e schedules relacionados
        queryClient.invalidateQueries({ queryKey: ["/api/substitutions"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/schedules"], exact: false });
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

  // Funções para controlar colapso/expansão de grupos
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const expandAllGroups = () => {
    setCollapsedGroups(new Set());
  };

  const collapseAllGroups = () => {
    const allKeys = [
      ...groupedSubstitutionRequests.current.map(g => g.key),
      ...groupedSubstitutionRequests.previous.map(g => g.key)
    ];
    setCollapsedGroups(new Set(allKeys));
  };

  const renderGroup = (group: SubstitutionGroup) => {
    const hasValidDate = group.date && !isNaN(group.date.getTime());
    const formattedDate = hasValidDate
      ? capitalizeFirst(format(group.date!, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
      : "Data não informada";
    const formattedTime = group.massTime
      ? formatMassTime(group.massTime)
      : "";
    const isCollapsed = collapsedGroups.has(group.key);
    
    const pendingCount = group.items.filter(({ item }) => 
      item.request.status === "pending" || item.request.status === "available"
    ).length;

    return (
      <div key={group.key} className="space-y-4">
        <div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2 cursor-pointer hover:bg-muted/50 rounded-t px-2 -mx-2 transition-colors"
          onClick={() => toggleGroupCollapse(group.key)}
        >
          <div className="flex items-center gap-2 text-sm">
            {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              {formattedTime
                ? `Missa das ${formattedTime}`
                : "Horário não informado"}
            </span>
            <Badge variant="secondary" className="ml-2" data-testid={`badge-total-${group.key}`}>
              {group.items.length} {group.items.length === 1 ? 'pedido' : 'pedidos'}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600" data-testid={`badge-pending-${group.key}`}>
                {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
              </Badge>
            )}
          </div>
        </div>
        {!isCollapsed && (
          <div className="space-y-4">
            {group.items.map(({ item, assignmentDate }) => {
                  const isDirected = item.request.substituteId !== null;
                  const isForMe = isDirected && item.request.substituteId === user?.id;
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
                                {item.assignment?.date && assignmentDate && !isNaN(assignmentDate.getTime())
                                  ? format(assignmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                  : "Data inválida"}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium whitespace-nowrap">Horário:</span>
                              </div>
                              <span className="text-muted-foreground ml-6 sm:ml-0">
                                {item.assignment?.massTime ? formatMassTime(item.assignment.massTime) : ""}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <Church className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium whitespace-nowrap">Posição:</span>
                              </div>
                              <Badge variant="secondary" className="text-xs ml-6 sm:ml-0 self-start sm:self-auto">
                                {getPositionDisplayName(item.assignment?.position || 1)}
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

                        {/* Substituto (se existir) */}
                        {item.substituteUser && item.request.status !== "available" && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Ministro Substituto
                            </h4>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                  {item.substituteUser.name}
                                </span>
                              </div>
                              {item.request.status === "approved" && (
                                <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-6">
                                  Substituição confirmada
                                </p>
                              )}
                            </div>
                          </div>
                        )}
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
                                  // Invalidar todas as queries de substituições e schedules relacionados
                                  queryClient.invalidateQueries({ queryKey: ["/api/substitutions"], exact: false });
                                  queryClient.invalidateQueries({ queryKey: ["/api/schedules"], exact: false });
                                  queryClient.invalidateQueries({ queryKey: ["/api/schedules/minister/upcoming"] });
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

                        {/* Botão para cancelar solicitação (própria ou coordenador) */}
                        {(item.request.status === "pending" || item.request.status === "available") && (isMyRequest || isCoordinator) && (
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
                            {isCoordinator && !isMyRequest ? "Excluir" : "Cancelar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>
    );
  };

  const renderSubstitutionList = () => {
    if (loadingRequests) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const hasCurrentRequests = groupedSubstitutionRequests.current.length > 0;
    const hasPreviousRequests = groupedSubstitutionRequests.previous.length > 0;

    if (!hasCurrentRequests && !hasPreviousRequests) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma solicitação de substituição no momento</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Botões para expandir/colapsar todos */}
        {(hasCurrentRequests || hasPreviousRequests) && (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={expandAllGroups}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              Expandir Todos
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={collapseAllGroups}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Compactar Todos
            </Button>
          </div>
        )}

        {/* Pedidos atuais e futuros */}
        {hasCurrentRequests && (
          <div className="space-y-6">
            {groupedSubstitutionRequests.current.map(renderGroup)}
          </div>
        )}

        {/* Pedidos anteriores (datas passadas) */}
        {hasPreviousRequests && (
          <div className="space-y-4 mt-8">
            <div 
              className="flex items-center justify-between border-b pb-2 cursor-pointer hover:bg-muted/50 rounded-t px-2 -mx-2 transition-colors"
              onClick={() => setShowPreviousRequests(!showPreviousRequests)}
            >
              <div className="flex items-center gap-2">
                {showPreviousRequests ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                <h3 className="text-lg font-semibold">Anteriores</h3>
                <Badge variant="secondary">
                  {groupedSubstitutionRequests.previous.length} {groupedSubstitutionRequests.previous.length === 1 ? 'grupo' : 'grupos'}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                Pedidos de datas passadas
              </span>
            </div>
            {showPreviousRequests && (
              <div className="space-y-6 opacity-75">
                {groupedSubstitutionRequests.previous.map(renderGroup)}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
              {renderSubstitutionList()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rest of the dialogs and modals will remain the same below */}
      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder à Solicitação</DialogTitle>
            <DialogDescription>
              Aceite ou rejeite esta solicitação de substituição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Digite sua resposta..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!selectedRequest?.request.id) return;
                respondToSubstitutionMutation.mutate({
                  requestId: selectedRequest.request.id,
                  accept: false,
                  message: responseMessage
                });
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              onClick={() => {
                if (!selectedRequest?.request.id) return;
                respondToSubstitutionMutation.mutate({
                  requestId: selectedRequest.request.id,
                  accept: true,
                  message: responseMessage
                });
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Aceitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCoordinator && requestToCancel?.requestingUser.id !== user?.id 
                ? "Excluir Solicitação" 
                : "Cancelar Solicitação"}
            </DialogTitle>
            <DialogDescription>
              {isCoordinator && requestToCancel?.requestingUser.id !== user?.id 
                ? `Tem certeza que deseja excluir a solicitação de ${requestToCancel?.requestingUser.name}?`
                : "Tem certeza que deseja cancelar esta solicitação de substituição?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              Não, manter
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={cancellingRequest}
            >
              {cancellingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {isCoordinator && requestToCancel?.requestingUser.id !== user?.id ? "Excluindo..." : "Cancelando..."}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  {isCoordinator && requestToCancel?.requestingUser.id !== user?.id ? "Sim, excluir" : "Sim, cancelar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Ministros Disponíveis</DialogTitle>
            <DialogDescription>
              Escolha como deseja notificar os ministros sobre esta missa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mensagem de Convite</Label>
              <Textarea
                placeholder="Digite a mensagem do convite..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Canais de Notificação</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="app-notification"
                  checked={sendToApp}
                  onCheckedChange={(checked) => setSendToApp(checked as boolean)}
                />
                <label
                  htmlFor="app-notification"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Central de Mensagens do App
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whatsapp-notification"
                  checked={sendToWhatsApp}
                  onCheckedChange={(checked) => setSendToWhatsApp(checked as boolean)}
                />
                <label
                  htmlFor="whatsapp-notification"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  WhatsApp
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendNotifications}>
              <Send className="h-4 w-4 mr-1" />
              Enviar Notificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Substituição</DialogTitle>
            <DialogDescription>
              Solicite um substituto para uma de suas escalas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Selecione a Escala</Label>
              <Select
                value={selectedScheduleForRequest?.id || ""}
                onValueChange={(value) => {
                  const schedule = upcomingAssignments.find(s => s.id === value);
                  setSelectedScheduleForRequest(schedule || null);
                  if (requestType === "directed") {
                    refetchAvailableSubstitutes();
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma escala..." />
                </SelectTrigger>
                <SelectContent>
                  {upcomingAssignments.map((assignment) => {
                    const assignDate = new Date(assignment.date);
                    const formattedDate = format(assignDate, "dd/MM/yyyy (EEEE)", { locale: ptBR });
                    return (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {formattedDate} - {formatMassTime(assignment.massTime)} - {getPositionDisplayName(assignment.position)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Solicitação</Label>
              <RadioGroup value={requestType} onValueChange={(value: "open" | "directed") => {
                setRequestType(value);
                if (value === "directed" && selectedScheduleForRequest) {
                  refetchAvailableSubstitutes();
                }
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="open" id="open" />
                  <label htmlFor="open" className="text-sm font-medium cursor-pointer">
                    Aberta (qualquer ministro pode aceitar)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="directed" id="directed" />
                  <label htmlFor="directed" className="text-sm font-medium cursor-pointer">
                    Direcionada (escolher um ministro específico)
                  </label>
                </div>
              </RadioGroup>
            </div>

            {requestType === "directed" && selectedScheduleForRequest && (
              <div>
                <Label>Ministro Substituto</Label>
                {availableSubstitutes.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                    Nenhum ministro disponível para esta data/horário.
                    Considere criar uma solicitação aberta.
                  </div>
                ) : (
                  <Select value={selectedSubstituteId} onValueChange={setSelectedSubstituteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um ministro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubstitutes.map((minister) => (
                        <SelectItem key={minister.id} value={minister.id}>
                          {minister.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Explique o motivo da solicitação..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRequestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRequest} disabled={creatingRequest}>
              {creatingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
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
