import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { invalidateScheduleCache } from "@/lib/cacheManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Eye,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Wand2,
  Loader2,
  Trash2,
  XCircle,
  Edit2,
  Star,
  UserCheck,
  UserX,
  Send
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LITURGICAL_POSITIONS, MASS_TIMES_BY_DAY, ALL_MASS_TIMES, getMassTimesForDate } from "@shared/constants";
import { ScheduleExport } from "@/components/ScheduleExport";

// Helper function to capitalize first letter of a string
const capitalizeFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to format time from "HH:MM:SS" to "HH:MM"
const formatMassTime = (time: string) => {
  return time.substring(0, 5);
};

interface Schedule {
  id: string;
  title: string;
  month: number;
  year: number;
  status: "draft" | "published" | "completed";
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
}

interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  ministerId: string;
  ministerName?: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
}

interface SubstitutionRequest {
  id: string;
  assignmentId: string;
  requestingMinisterId: string;
  substituteMinisterId: string | null;
  status: "pending" | "approved" | "auto_approved";
  reason: string;
}

// Constantes importadas do arquivo centralizado

export default function Schedules() {
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  
  const user = authData?.user;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRequest[]>([]);
  const [ministers, setMinisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedMassTime, setSelectedMassTime] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const [selectedMinisterId, setSelectedMinisterId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [isViewScheduleDialogOpen, setIsViewScheduleDialogOpen] = useState(false);
  const [selectedDateAssignments, setSelectedDateAssignments] = useState<ScheduleAssignment[]>([]);
  const [loadingDateAssignments, setLoadingDateAssignments] = useState(false);
  const [isSubstitutionDialogOpen, setIsSubstitutionDialogOpen] = useState(false);
  const [selectedAssignmentForSubstitution, setSelectedAssignmentForSubstitution] = useState<ScheduleAssignment | null>(null);
  const [substitutionReason, setSubstitutionReason] = useState("");
  const [submittingSubstitution, setSubmittingSubstitution] = useState(false);
  const [ministerSearch, setMinisterSearch] = useState("");
  const [filterByPreferredPosition, setFilterByPreferredPosition] = useState(false);

  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  // Invalidar cache ao entrar na página de escalas
  useEffect(() => {
    invalidateScheduleCache();
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchMinisters();
  }, [currentMonth]);

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/schedules?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
        setAssignments(data.assignments || []);
        setSubstitutions(data.substitutions || []);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMinisters = async () => {
    try {
      const response = await fetch("/api/ministers", {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Ministers loaded:', data);
        // Carregar TODOS os ministros (não filtrar por ativo) para permitir edição completa
        // Ordenar: ativos primeiro, depois alfabeticamente
        const sortedMinisters = data.sort((a: any, b: any) => {
          if (a.active && !b.active) return -1;
          if (!a.active && b.active) return 1;
          return a.name.localeCompare(b.name);
        });
        setMinisters(sortedMinisters);
      }
    } catch (error) {
      console.error("Error fetching ministers:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de ministros",
        variant: "destructive"
      });
    }
  };

  const fetchScheduleForDate = async (date: Date) => {
    setLoadingDateAssignments(true);
    setSelectedDateAssignments([]); // Reset assignments before loading
    setIsViewScheduleDialogOpen(true); // Open dialog immediately

    try {
      // Format date as YYYY-MM-DD to avoid timezone issues
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/schedules/by-date/${dateStr}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📅 Schedule data for date:', data);

        if (data.assignments && data.assignments.length > 0) {
          setSelectedDateAssignments(data.assignments);
        } else {
          // Keep dialog open but show empty state with message
          setSelectedDateAssignments([]);
        }
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        toast({
          title: "Erro",
          description: errorData.message || "Erro ao buscar escala",
          variant: "destructive"
        });
        setIsViewScheduleDialogOpen(false); // Close on error
      }
    } catch (error) {
      console.error("Error fetching schedule for date:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar escala para a data",
        variant: "destructive"
      });
      setIsViewScheduleDialogOpen(false); // Close on error
    } finally {
      setLoadingDateAssignments(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          title: `Escala ${capitalizeFirst(format(currentMonth, "MMMM yyyy", { locale: ptBR }))}`,
          month: currentMonth.getMonth() + 1,
          year: currentMonth.getFullYear()
        })
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Escala criada com sucesso"
        });
        fetchSchedules();
      } else {
        const errorText = await response.text();
        let errorMessage = "Erro ao criar escala";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {}
        
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar escala",
        variant: "destructive"
      });
    }
  };

  const handleAssignMinister = async () => {
    if (!selectedDate || !selectedMassTime || !selectedMinisterId) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      const currentSchedule = schedules.find(s => 
        s.month === currentMonth.getMonth() + 1 && 
        s.year === currentMonth.getFullYear()
      );

      if (!currentSchedule) {
        toast({
          title: "Erro",
          description: "Crie uma escala para este mês primeiro",
          variant: "destructive"
        });
        return;
      }

      // Format date as YYYY-MM-DD to avoid timezone issues
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const response = await fetch("/api/schedule-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          scheduleId: currentSchedule.id,
          ministerId: selectedMinisterId,
          date: dateStr,
          massTime: selectedMassTime,
          position: selectedPosition
        })
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Ministro escalado com sucesso"
        });
        fetchSchedules();
        setIsAssignmentDialogOpen(false);
        setSelectedMinisterId("");
        setSelectedMassTime("");
        setSelectedPosition(1);
      }
    } catch (error) {
      console.error("Error assigning minister:", error);
      toast({
        title: "Erro",
        description: "Erro ao escalar ministro",
        variant: "destructive"
      });
    }
  };

  const handlePublishSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/publish`, {
        method: "PATCH",
        credentials: "include"
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Escala publicada com sucesso"
        });
        fetchSchedules();
      }
    } catch (error) {
      console.error("Error publishing schedule:", error);
      toast({
        title: "Erro",
        description: "Erro ao publicar escala",
        variant: "destructive"
      });
    }
  };

  const handleUnpublishSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/unpublish`, {
        method: "PATCH",
        credentials: "include"
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Publicação cancelada com sucesso"
        });
        fetchSchedules();
      }
    } catch (error) {
      console.error("Error unpublishing schedule:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar publicação",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Escala excluída com sucesso"
        });
        fetchSchedules();
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir escala",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir escala",
        variant: "destructive"
      });
    }
  };

  const handleRequestSubstitution = async () => {
    if (!selectedAssignmentForSubstitution || !substitutionReason.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, informe o motivo da substituição",
        variant: "destructive"
      });
      return;
    }

    setSubmittingSubstitution(true);
    try {
      const currentMinister = ministers.find(m => m.id === user?.id);
      if (!currentMinister) {
        toast({
          title: "Erro",
          description: "Ministro não encontrado",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch("/api/substitutions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          assignmentId: selectedAssignmentForSubstitution.id,
          requestingMinisterId: currentMinister.id,
          reason: substitutionReason,
          urgency: "medium"
        })
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Solicitação de substituição enviada com sucesso"
        });
        setIsSubstitutionDialogOpen(false);
        setSubstitutionReason("");
        setSelectedAssignmentForSubstitution(null);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao solicitar substituição",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error requesting substitution:", error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar substituição",
        variant: "destructive"
      });
    } finally {
      setSubmittingSubstitution(false);
    }
  };

  const handleGenerateSchedule = async (scheduleId: string) => {
    setGeneratingSchedule(true);
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/generate`, {
        method: "POST",
        credentials: "include"
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchSchedules(); // Reload data
        toast({
          title: "Sucesso",
          description: result.message,
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive", 
          title: "Erro",
          description: error.message || "Erro ao gerar escala inteligente",
        });
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar escala inteligente",
      });
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter(a => {
      // Parse date string directly to avoid timezone issues
      // The date from API is in format YYYY-MM-DD
      const assignmentDate = typeof a.date === 'string'
        ? parseISO(a.date.split('T')[0]) // Handle both YYYY-MM-DD and full ISO strings
        : a.date;
      return isSameDay(assignmentDate, date);
    });
  };

  const isUserScheduledOnDate = (date: Date) => {
    if (!user?.id) return false;
    
    const dayAssignments = getAssignmentsForDate(date);
    // Find current user's minister record - comparing id directly
    const currentMinister = ministers.find(m => m.id === user.id);
    if (!currentMinister) return false;
    
    // Check if user is currently assigned OR has a substitution request for this date
    const isCurrentlyAssigned = dayAssignments.some(a => a.ministerId === currentMinister.id);
    
    // Also check if user requested substitution (even if approved and transferred)
    const dayAssignmentIds = dayAssignments.map(a => a.id);
    const hasSubstitutionRequest = substitutions.some(s => 
      dayAssignmentIds.includes(s.assignmentId) && 
      s.requestingMinisterId === currentMinister.id
    );
    
    return isCurrentlyAssigned || hasSubstitutionRequest;
  };

  const getUserSubstitutionStatus = (date: Date) => {
    if (!user?.id) return null;
    
    const dayAssignments = getAssignmentsForDate(date);
    const currentMinister = ministers.find(m => m.id === user.id);
    if (!currentMinister) return null;
    
    // Check if user has a substitution request for this date
    // We need to check by requestingMinisterId, not by current assignment
    // because when approved, the assignment is transferred to the substitute
    const dayAssignmentIds = dayAssignments.map(a => a.id);
    const userSubstitutionRequest = substitutions.find(s => 
      dayAssignmentIds.includes(s.assignmentId) && 
      s.requestingMinisterId === currentMinister.id
    );
    
    
    if (!userSubstitutionRequest) {
      // Also check if user is currently assigned (no substitution requested)
      const userAssignment = dayAssignments.find(a => a.ministerId === currentMinister.id);
      return userAssignment ? null : null;
    }
    
    // Return status: 'pending' for red, 'approved' or 'auto_approved' for green
    if (userSubstitutionRequest.status === 'pending') {
      return 'pending';
    } else if (userSubstitutionRequest.status === 'approved' || userSubstitutionRequest.status === 'auto_approved') {
      return 'approved';
    }
    
    return null;
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo = 0
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "published": return "default";
      case "completed": return "outline";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Rascunho";
      case "published": return "Publicada";
      case "completed": return "Concluída";
      default: return status;
    }
  };

  const currentSchedule = schedules.find(s =>
    s.month === currentMonth.getMonth() + 1 &&
    s.year === currentMonth.getFullYear()
  );

  if (loading) {
    return (
      <Layout
        title="Escalas Litúrgicas"
        subtitle="Gerenciar escalas de ministros para as celebrações"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Carregando escalas...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Escalas Litúrgicas"
      subtitle="Gerenciar escalas de ministros para as celebrações"
    >
      <div className="space-y-4 sm:space-y-6">
        {isCoordinator && !currentSchedule && (
          <div className="flex items-center justify-end px-2 sm:px-0">
            <Button 
              onClick={handleCreateSchedule}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-xs sm:text-sm">Nova Escala</span>
            </Button>
          </div>
        )}

      {currentSchedule && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">{capitalizeFirst(format(currentMonth, "MMMM yyyy", { locale: ptBR }))}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Criada em {format(new Date(currentSchedule.createdAt), "dd/MM/yyyy")}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Badge variant={getStatusColor(currentSchedule.status)} className="w-fit">
                  {getStatusLabel(currentSchedule.status)}
                </Badge>
                {isCoordinator && (
                  <div className="flex flex-wrap items-center gap-2">
                    {currentSchedule.status === "draft" && (
                      <>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateSchedule(currentSchedule.id)}
                          disabled={generatingSchedule}
                          className="text-xs sm:text-sm"
                        >
                          {generatingSchedule ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Wand2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          <span className="hidden sm:inline">{generatingSchedule ? 'Gerando...' : 'Gerar IA'}</span>
                          <span className="sm:hidden">IA</span>
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handlePublishSchedule(currentSchedule.id)}
                          className="text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Publicar Escala</span>
                          <span className="sm:hidden">Publicar</span>
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSchedule(currentSchedule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      </>
                    )}
                    {currentSchedule.status === "published" && isCoordinator && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnpublishSchedule(currentSchedule.id)}
                        className="text-amber-600 hover:text-amber-600 text-xs sm:text-sm"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Cancelar Publicação</span>
                        <span className="sm:hidden">Despublicar</span>
                      </Button>
                    )}
                    
                    {/* Editor Detalhado para coordenadores */}
                    {currentSchedule && isCoordinator && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.location.href = '/schedule-editor'}
                        className="text-xs sm:text-sm"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Editor Detalhado</span>
                        <span className="sm:hidden">Editor</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "list")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="month" className="text-xs sm:text-sm px-2 sm:px-3">
            <CalendarIcon className="h-3.5 w-3.5 mr-1 sm:h-4 sm:w-4 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Visualização Mensal</span>
            <span className="sm:hidden">Mensal</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="text-xs sm:text-sm px-2 sm:px-3">
            <Clock className="h-3.5 w-3.5 mr-1 sm:h-4 sm:w-4 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Lista Detalhada</span>
            <span className="sm:hidden">Lista</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-10 sm:w-10"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <h2 className="text-sm font-semibold capitalize sm:text-lg md:text-xl flex-1 text-center sm:text-left">
                    <span className="sm:hidden">
                      {format(currentMonth, "MMM yyyy", { locale: ptBR })}
                    </span>
                    <span className="hidden sm:inline">
                      {capitalizeFirst(format(currentMonth, "MMMM yyyy", { locale: ptBR }))}
                    </span>
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-10 sm:w-10"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                {isCoordinator && currentSchedule && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDate(new Date());
                      setIsAssignmentDialogOpen(true);
                    }}
                    className="text-xs w-full sm:w-auto sm:text-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Escalar Ministro</span>
                    <span className="sm:hidden">Escalar</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              {/* Banner informativo quando escala está publicada */}
              {currentSchedule?.status === "published" && (
                <div className="mb-3 p-3 sm:mb-4 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-300 dark:border-blue-700 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 sm:text-sm">
                        <span className="hidden sm:inline">Escala Publicada - Interaja com o calendário!</span>
                        <span className="sm:hidden">Escala Publicada</span>
                      </p>
                      <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5 sm:text-xs sm:mt-1">
                        <span className="hidden sm:inline">Clique em qualquer dia para ver detalhes. Dias em dourado indicam que você está escalado.</span>
                        <span className="sm:hidden">Toque nos dias para ver detalhes</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
                {/* Header dos dias */}
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, idx) => (
                  <div key={idx} className="text-center font-semibold text-[10px] py-1 sm:hidden">
                    {day}
                  </div>
                ))}
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                  <div key={day} className="hidden text-center font-semibold text-sm py-2 sm:block">
                    {day}
                  </div>
                ))}
                
                {/* Dias do mês */}
                {getDaysInMonth().map((day, index) => {
                  const dayAssignments = getAssignmentsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  const isUserScheduled = isUserScheduledOnDate(day);
                  const substitutionStatus = getUserSubstitutionStatus(day);
                  const availableMassTimes = getMassTimesForDate(day);
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[60px] p-1 border rounded transition-all relative sm:min-h-24 sm:rounded-lg sm:p-2",
                        isToday && !isUserScheduled && "border-primary border-2",
                        isSelected && !isUserScheduled && "bg-accent",
                        // Destaque especial quando usuário está escalado - cores baseadas no status de substituição
                        isUserScheduled && currentSchedule?.status === "published" && !substitutionStatus && "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-500 shadow-lg ring-2 ring-amber-400 ring-offset-1",
                        // Vermelho quando tem substituição pendente
                        isUserScheduled && substitutionStatus === 'pending' && "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-500 shadow-lg ring-2 ring-red-400 ring-offset-1",
                        // Verde quando substituição foi aprovada
                        isUserScheduled && substitutionStatus === 'approved' && "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-500 shadow-lg ring-2 ring-green-400 ring-offset-1",
                        !isSameMonth(day, currentMonth) && "opacity-50",
                        // Tornar clicável quando há escala publicada
                        currentSchedule?.status === "published" && isSameMonth(day, currentMonth) && !isUserScheduled && "cursor-pointer hover:bg-accent hover:shadow-lg hover:scale-105",
                        // Hover especial baseado no status
                        isUserScheduled && !substitutionStatus && currentSchedule?.status === "published" && isSameMonth(day, currentMonth) && "cursor-pointer hover:from-amber-200 hover:to-yellow-200 hover:dark:from-amber-800/40 hover:dark:to-yellow-800/40 hover:scale-110 hover:shadow-xl hover:ring-4",
                        isUserScheduled && substitutionStatus === 'pending' && isSameMonth(day, currentMonth) && "cursor-pointer hover:from-red-200 hover:to-red-300 hover:dark:from-red-800/40 hover:dark:to-red-700/40 hover:scale-110 hover:shadow-xl hover:ring-4",
                        isUserScheduled && substitutionStatus === 'approved' && isSameMonth(day, currentMonth) && "cursor-pointer hover:from-green-200 hover:to-green-300 hover:dark:from-green-800/40 hover:dark:to-green-700/40 hover:scale-110 hover:shadow-xl hover:ring-4",
                        // Tornar clicável para coordenador em rascunho
                        isCoordinator && currentSchedule?.status === "draft" && isSameMonth(day, currentMonth) && "cursor-pointer hover:bg-accent"
                      )}
                      onClick={() => {
                        setSelectedDate(day);
                        
                        // Se a escala está publicada, abre modal de visualização
                        if (currentSchedule?.status === "published") {
                          fetchScheduleForDate(day);
                        } 
                        // Se é coordenador e escala está em rascunho, abre modal de edição
                        else if (isCoordinator && currentSchedule && currentSchedule.status === "draft") {
                          setIsAssignmentDialogOpen(true);
                        }
                      }}>
                      {/* Badge especial quando usuário está escalado */}
                      {isUserScheduled && currentSchedule?.status === "published" && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10">
                          <div className="relative">
                            {!substitutionStatus && (
                              <>
                                <div className="absolute inset-0 bg-amber-400 rounded-full blur-lg opacity-60 animate-pulse" />
                                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 fill-amber-400 animate-pulse relative" />
                              </>
                            )}
                            {substitutionStatus === 'pending' && (
                              <>
                                <div className="absolute inset-0 bg-red-400 rounded-full blur-lg opacity-60 animate-pulse" />
                                <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 fill-red-400 animate-pulse relative" />
                              </>
                            )}
                            {substitutionStatus === 'approved' && (
                              <>
                                <div className="absolute inset-0 bg-green-400 rounded-full blur-lg opacity-60 animate-pulse" />
                                <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 fill-green-400 animate-pulse relative" />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="font-semibold text-xs mb-0.5 sm:text-sm sm:mb-1 flex items-center justify-between">
                        <span className={cn(
                          "transition-all",
                          isUserScheduled && currentSchedule?.status === "published" && "text-amber-700 dark:text-amber-300 font-bold text-lg"
                        )}>
                          {format(day, "d")}
                        </span>
                      </div>
                      {/* Mini indicadores de missas - mobile simplificado */}
                      <div className="sm:hidden">
                        {currentSchedule?.status === "published" && isSameMonth(day, currentMonth) && (
                          <>
                            {isUserScheduled ? (
                              <div className="flex flex-col items-center gap-0.5">
                                {substitutionStatus === 'pending' ? (
                                  <UserX className="h-4 w-4 text-red-600 dark:text-red-400 fill-red-400" />
                                ) : substitutionStatus === 'approved' ? (
                                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 fill-green-400" />
                                ) : (
                                  <Star className="h-4 w-4 text-amber-600 dark:text-amber-400 fill-amber-500 animate-pulse" />
                                )}
                              </div>
                            ) : dayAssignments.length > 0 ? (
                              (() => {
                                // Total de escalados = todos os assignments (incluindo VACANTES)
                                const totalAssigned = dayAssignments.length;
                                // Confirmados = ministros reais (não VACANTES)
                                const confirmed = dayAssignments.filter(a => a.ministerName !== 'VACANT').length;
                                // À confirmar = ministros VACANTES
                                const toConfirm = dayAssignments.filter(a => a.ministerName === 'VACANT').length;

                                return (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="flex items-center gap-0.5">
                                      <Users className="h-3 w-3 text-primary" />
                                      <span className="text-[9px] font-medium text-primary">{totalAssigned}</span>
                                    </div>
                                    {toConfirm > 0 && (
                                      <div className="flex items-center gap-0.5">
                                        <AlertCircle className="h-3 w-3 text-orange-500" />
                                        <span className="text-[9px] font-medium text-orange-600 dark:text-orange-400">{toConfirm}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : availableMassTimes.length > 0 ? (
                              <div className="flex items-center justify-center">
                                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                      {/* Mini indicadores de missas - desktop completo */}
                      <div className="hidden sm:block space-y-0.5">
                        {currentSchedule?.status === "published" && isSameMonth(day, currentMonth) ? (
                          // Escala publicada - mostrar clicável
                          (<>
                            {isUserScheduled ? (
                              <div className="space-y-0.5">
                                {substitutionStatus === 'pending' ? (
                                  <div className="flex items-center gap-1">
                                    <UserX className="h-4 w-4 text-red-600 dark:text-red-400 fill-red-400 flex-shrink-0" />
                                    <span className="text-[10px] font-bold text-red-700 dark:text-red-300 truncate">Aguardando</span>
                                  </div>
                                ) : substitutionStatus === 'approved' ? (
                                  <div className="flex items-center gap-1">
                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 fill-green-400 flex-shrink-0" />
                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-300 truncate">Substituído</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-amber-600 dark:text-amber-400 fill-amber-500 animate-pulse flex-shrink-0" />
                                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 truncate">Escalado</span>
                                  </div>
                                )}
                              </div>
                            ) : dayAssignments.length > 0 ? (
                              (() => {
                                // Total de escalados = todos os assignments (incluindo VACANTES)
                                const totalAssigned = dayAssignments.length;
                                // Confirmados = ministros reais (não VACANTES)
                                const confirmed = dayAssignments.filter(a => a.ministerName !== 'VACANT').length;
                                // À confirmar = ministros VACANTES
                                const toConfirm = dayAssignments.filter(a => a.ministerName === 'VACANT').length;

                                return (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 text-primary">
                                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="text-[10px] font-medium truncate">{totalAssigned} escalados</span>
                                    </div>
                                    {toConfirm > 0 && (
                                      <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="text-[10px] font-medium truncate">{toConfirm} à confirmar</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : availableMassTimes.length > 0 ? (
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-[10px] font-medium truncate">{availableMassTimes.length * 20} vagas</span>
                              </div>
                            ) : null}
                          </>)
                        ) : currentSchedule?.status === "draft" && isCoordinator ? (
                          // Rascunho - mostrar horários para coordenador
                          (<>
                            {availableMassTimes && availableMassTimes.slice(0, 3).map((time) => {
                              const timeAssignments = dayAssignments.filter(a => a.massTime === time);
                              return (
                                <div key={time} className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs">{time}</span>
                                  {timeAssignments.length > 0 && (
                                    <Badge variant="secondary" className="h-4 px-1 text-xs">
                                      {timeAssignments.length}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                            {availableMassTimes && availableMassTimes.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{availableMassTimes.length - 3} mais
                              </span>
                            )}
                          </>)
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legenda dos indicadores visuais - Sempre visível quando há escala */}
              {currentSchedule && (
                <Card className="mt-6 border-2 border-primary/20 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-primary" />
                      </div>
                      <span>Legenda do Calendário</span>
                    </CardTitle>
                    <CardDescription>
                      Entenda os indicadores visuais da escala de ministros
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentSchedule.status === "published" && (
                      <>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-2 border-amber-300 dark:border-amber-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 border-2 border-amber-500 rounded-xl flex items-center justify-center ring-2 ring-amber-400/50 shadow-md flex-shrink-0 group-hover:ring-4 transition-all">
                            <Star className="h-5 w-5 text-amber-600 dark:text-amber-400 fill-amber-500 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-amber-800 dark:text-amber-300 leading-tight">Você está escalado</p>
                            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1">Dia com sua participação confirmada</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40 border-2 border-red-300 dark:border-red-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 border-2 border-red-500 rounded-xl flex items-center justify-center ring-2 ring-red-400/50 shadow-md flex-shrink-0 group-hover:ring-4 transition-all">
                            <UserX className="h-5 w-5 text-red-600 dark:text-red-400 fill-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-red-800 dark:text-red-300 leading-tight">Substituição solicitada</p>
                            <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-1">Aguardando confirmação de substituto</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40 border-2 border-green-300 dark:border-green-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 border-2 border-green-500 rounded-xl flex items-center justify-center ring-2 ring-green-400/50 shadow-md flex-shrink-0 group-hover:ring-4 transition-all">
                            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400 fill-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-green-800 dark:text-green-300 leading-tight">Substituto confirmado</p>
                            <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-1">Substituição já foi aprovada</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 border-2 border-blue-300 dark:border-blue-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 border-2 border-blue-500 rounded-xl flex items-center justify-center ring-2 ring-blue-400/50 shadow-md flex-shrink-0 group-hover:ring-4 transition-all">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-blue-800 dark:text-blue-300 leading-tight">Ministros escalados</p>
                            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-1">Quantidade de ministros confirmados</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40 border-2 border-orange-300 dark:border-orange-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 border-2 border-orange-500 rounded-xl flex items-center justify-center ring-2 ring-orange-400/50 shadow-md flex-shrink-0 group-hover:ring-4 transition-all">
                            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-orange-800 dark:text-orange-300 leading-tight">Vagas disponíveis</p>
                            <p className="text-xs text-orange-700/70 dark:text-orange-400/70 mt-1">Posições ainda não preenchidas</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 border-2 border-primary hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 border-2 border-primary rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-md flex-shrink-0 group-hover:ring-4 ring-primary/30 transition-all">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-primary leading-tight">Dia atual</p>
                            <p className="text-xs text-primary/70 mt-1">Data de hoje no calendário</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-400 dark:border-slate-600 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-accent/50 border-2 border-slate-500 dark:border-slate-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:ring-4 ring-slate-400/30 transition-all">
                            <span className="text-base font-bold text-slate-700 dark:text-slate-200">D</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">Dia selecionado</p>
                            <p className="text-xs text-slate-700/70 dark:text-slate-400/70 mt-1">Dia que você clicou para ver</p>
                          </div>
                        </div>
                      </>
                    )}
                    {currentSchedule.status === "draft" && isCoordinator && (
                      <>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40 border-2 border-purple-300 dark:border-purple-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 border-2 border-purple-500 rounded-xl flex items-center justify-center ring-2 ring-purple-400/50 shadow-md flex-shrink-0 group-hover:ring-4 transition-all">
                            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-purple-800 dark:text-purple-300 leading-tight">Horários de missa</p>
                            <p className="text-xs text-purple-700/70 dark:text-purple-400/70 mt-1">Dias com celebrações agendadas</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 border-2 border-primary hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 border-2 border-primary rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-md flex-shrink-0 group-hover:ring-4 ring-primary/30 transition-all">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-primary leading-tight">Dia atual</p>
                            <p className="text-xs text-primary/70 mt-1">Data de hoje no calendário</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-400 dark:border-slate-600 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                          <div className="w-12 h-12 bg-accent/50 border-2 border-slate-500 dark:border-slate-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:ring-4 ring-slate-400/30 transition-all">
                            <span className="text-base font-bold text-slate-700 dark:text-slate-200">D</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">Dia selecionado</p>
                            <p className="text-xs text-slate-700/70 dark:text-slate-400/70 mt-1">Dia que você clicou para ver</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Seção de informações sobre posições litúrgicas */}
                  <div className="mt-6 pt-4 border-t-2 border-primary/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">Posições Litúrgicas</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(LITURGICAL_POSITIONS).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{key}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-tight">{value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {key === '1' && 'Ministro que lidera a distribuição da Eucaristia'}
                              {key === '2' && 'Ministro auxiliar na distribuição'}
                              {key === '3' && 'Ministro que auxilia na celebração'}
                              {key === '4' && 'Ministro de apoio adicional'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentSchedule.status === "published" && (
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Dica</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                            Clique em qualquer dia do calendário para ver os detalhes completos da escala e gerenciar suas escalações.
                            Os dias com indicadores coloridos possuem informações importantes!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Escalas Detalhadas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Visualização completa das escalas do mês
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {getDaysInMonth().map((day) => {
                  // Filtrar apenas dias do mês atual
                  if (!isSameMonth(day, currentMonth)) return null;

                  const dayAssignments = getAssignmentsForDate(day);
                  const isUserScheduled = isUserScheduledOnDate(day);
                  const availableMassTimes = getMassTimesForDate(day);

                  // Não renderizar dias sem missas disponíveis
                  if (availableMassTimes.length === 0) return null;

                  // Se não é coordenador e não tem assignments, não mostrar
                  if (dayAssignments.length === 0 && !isCoordinator) return null;
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "border rounded-lg p-3 sm:p-4",
                        isUserScheduled && currentSchedule?.status === "published" && "border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-yellow-100 shadow-lg dark:from-amber-900/40 dark:to-yellow-800/40 dark:border-amber-500"
                      )}
                    >
                      <h3 className="font-semibold text-sm sm:text-lg mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="break-words">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                        {isUserScheduled && currentSchedule?.status === "published" && (
                          <Badge variant="secondary" className="w-fit text-[10px] sm:text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                            Você está escalado
                          </Badge>
                        )}
                      </h3>

                      <div className="space-y-3 sm:space-y-4">
                        {availableMassTimes && availableMassTimes.map((time) => {
                          const timeAssignments = dayAssignments.filter(a => a.massTime === time);
                          
                          return (
                            <div key={time} className="bg-muted/50 rounded-lg p-2 sm:p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium text-xs sm:text-sm">Missa das {time}</span>
                                </div>
                                {isCoordinator && currentSchedule && currentSchedule.status !== "published" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedDate(day);
                                      setSelectedMassTime(time);
                                      setIsAssignmentDialogOpen(true);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {timeAssignments.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                                  {timeAssignments.map((assignment) => {
                                    const currentMinister = ministers.find(m => m.id === user?.id);
                                    const isCurrentUser = currentMinister && assignment.ministerId === currentMinister.id;
                                    
                                    return (
                                      <div 
                                        key={assignment.id} 
                                        className={cn(
                                          "flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-1.5 sm:p-2 rounded",
                                          isCurrentUser && "bg-amber-100 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700"
                                        )}
                                      >
                                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5 flex-shrink-0">
                                          <span className="hidden sm:inline">{assignment.position} - {LITURGICAL_POSITIONS[assignment.position] || 'Posição'}</span>
                                          <span className="sm:hidden">{assignment.position}</span>
                                        </Badge>
                                        <span className={cn("truncate flex-1 min-w-0 text-[11px] sm:text-sm", isCurrentUser && "font-medium")}>
                                          {assignment.ministerName || "Ministro"}
                                        </span>
                                        <div className="flex-shrink-0">
                                          {assignment.confirmed ? (
                                            <Check className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <AlertCircle className="h-3 w-3 text-yellow-600" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  Nenhum ministro escalado
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para visualizar escala publicada */}
      <Dialog open={isViewScheduleDialogOpen} onOpenChange={setIsViewScheduleDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:w-full mx-auto p-3 sm:p-6">
          <DialogHeader className="space-y-1 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg leading-tight">
              Escala do dia {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Confira os ministros escalados para as celebrações deste dia
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] sm:max-h-[60vh] -mx-3 px-3 sm:-mx-0 sm:px-0">
            <div className="space-y-4 pr-2 sm:pr-4">
              {loadingDateAssignments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-sm text-muted-foreground">Carregando escalas...</p>
                </div>
              ) : selectedDateAssignments && selectedDateAssignments.length > 0 ? (
                <>
                  {Object.entries(
                    selectedDateAssignments.reduce((acc, assignment) => {
                      const massTime = assignment.massTime || 'Sem horário';
                      if (!acc[massTime]) {
                        acc[massTime] = [];
                      }
                      acc[massTime].push(assignment);
                      return acc;
                    }, {} as Record<string, ScheduleAssignment[]>)
                  )
                    .sort(([a], [b]) => {
                      // Ordenar por horário correto (converter para minutos)
                      const timeToMinutes = (time: string) => {
                        if (time === 'Sem horário') return 9999;
                        const [hours, minutes] = time.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      return timeToMinutes(a) - timeToMinutes(b);
                    })
                    .map(([massTime, assignments]) => (
                    <div key={massTime} className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          <h3 className="font-semibold text-sm sm:text-lg">
                            Missa das {formatMassTime(massTime)}
                          </h3>
                        </div>
                        {isCoordinator && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMassTime(massTime);
                              setIsAssignmentDialogOpen(true);
                              setIsViewScheduleDialogOpen(false);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-2 pl-0 sm:pl-7">
                        {assignments
                          .sort((a, b) => a.position - b.position)
                          .map((assignment) => {
                            const currentMinister = ministers.find(m => m.id === user?.id);
                            const isCurrentUser = currentMinister && assignment.ministerId === currentMinister.id;

                            return (
                              <div
                                key={assignment.id}
                                className={cn(
                                  "flex flex-col p-2 sm:p-3 rounded-lg border bg-card",
                                  isCurrentUser && "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
                                )}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                  <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                    <Badge variant={isCurrentUser ? "default" : "secondary"} className="flex-shrink-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                                      <span className="hidden sm:inline">{assignment.position} - {LITURGICAL_POSITIONS[assignment.position]}</span>
                                      <span className="sm:hidden">{assignment.position}</span>
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                      <p className={cn("font-medium text-xs sm:text-sm truncate", isCurrentUser && "text-amber-900 dark:text-amber-100")}>
                                        {assignment.ministerName || "Ministro"}
                                      </p>
                                      <p className="text-[10px] sm:hidden text-muted-foreground truncate mt-0.5">
                                        {LITURGICAL_POSITIONS[assignment.position]}
                                      </p>
                                      {isCurrentUser && (
                                        <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                          Você está escalado nesta posição
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0 sm:ml-2">
                                    {assignment.confirmed ? (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="text-[10px] sm:text-xs">Confirmado</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-yellow-600">
                                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="text-[10px] sm:text-xs">Pendente</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  {isCurrentUser && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-orange-600 hover:text-orange-700 text-[11px] sm:text-sm h-8 sm:h-9"
                                      onClick={() => {
                                        setSelectedAssignmentForSubstitution(assignment);
                                        setIsSubstitutionDialogOpen(true);
                                      }}
                                    >
                                      <UserX className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                      <span className="hidden sm:inline">Solicitar Substituição</span>
                                      <span className="sm:hidden">Solicitar Substituto</span>
                                    </Button>
                                  )}
                                  {isCoordinator && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className={cn("text-[11px] sm:text-sm h-8 sm:h-9", isCurrentUser ? "flex-shrink-0" : "")}
                                        onClick={async () => {
                                          // Abrir diálogo de edição com dados pré-preenchidos
                                          setSelectedMassTime(assignment.massTime);
                                          setSelectedPosition(assignment.position);
                                          setSelectedMinisterId(assignment.ministerId);
                                          setIsAssignmentDialogOpen(true);
                                          setIsViewScheduleDialogOpen(false);

                                          // Remover a escalação atual primeiro
                                          try {
                                            await fetch(`/api/schedule-assignments/${assignment.id}`, {
                                              method: "DELETE",
                                              credentials: "include"
                                            });
                                          } catch (error) {
                                            console.error("Error removing assignment:", error);
                                          }
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                        <span className="hidden sm:inline">Editar</span>
                                        <span className="sm:hidden">✎</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className={cn("text-destructive hover:text-destructive text-[11px] sm:text-sm h-8 sm:h-9", isCurrentUser ? "flex-shrink-0" : "")}
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(`/api/schedule-assignments/${assignment.id}`, {
                                              method: "DELETE",
                                              credentials: "include"
                                            });

                                            if (response.ok) {
                                              toast({
                                                title: "Sucesso",
                                                description: "Ministro removido da escala"
                                              });
                                              await fetchScheduleForDate(selectedDate);
                                              await fetchSchedules();
                                            } else {
                                              throw new Error("Erro ao remover");
                                            }
                                          } catch (error) {
                                            toast({
                                              title: "Erro",
                                              description: "Erro ao remover ministro da escala",
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                        <span className="hidden sm:inline">Remover</span>
                                        <span className="sm:hidden">✕</span>
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma escala encontrada para esta data</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-3 sm:mt-4 flex-col sm:flex-row gap-2">
            {selectedDateAssignments && selectedDateAssignments.length > 0 && selectedDate && (
              <ScheduleExport
                date={selectedDate}
                assignments={selectedDateAssignments}
              />
            )}
            <Button
              variant="outline"
              onClick={() => setIsViewScheduleDialogOpen(false)}
              className="w-full sm:w-auto text-sm"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para escalar ministro */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={(open) => {
        setIsAssignmentDialogOpen(open);
        if (open) {
          console.log('🔄 Recarregando ministros ao abrir diálogo de edição');
          fetchMinisters();
        } else {
          // Limpar estados ao fechar
          setMinisterSearch('');
          setFilterByPreferredPosition(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Escalar Ministro</DialogTitle>
            <DialogDescription>
              Selecione o ministro, horário e posição para {selectedDate && format(selectedDate, "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Horário da Missa</label>
              <Select value={selectedMassTime} onValueChange={setSelectedMassTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {selectedDate && getMassTimesForDate(selectedDate).map((time) => {
                    // Formatar horário para exibição (remover segundos)
                    const displayTime = time.substring(0, 5);
                    return (
                      <SelectItem key={time} value={time}>
                        {displayTime}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Posição Litúrgica</label>
              <Select value={selectedPosition.toString()} onValueChange={(v) => setSelectedPosition(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LITURGICAL_POSITIONS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Ministro</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {ministers.filter(m => m.active).length} ativos
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {ministers.length} total
                  </Badge>
                </div>
              </div>

              {/* Barra de pesquisa */}
              <div className="relative">
                <Input
                  placeholder="Buscar ministro pelo nome..."
                  value={ministerSearch}
                  onChange={(e) => setMinisterSearch(e.target.value)}
                  className="pr-10"
                />
                {ministerSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setMinisterSearch('')}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Button
                  variant={filterByPreferredPosition ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterByPreferredPosition(!filterByPreferredPosition)}
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {filterByPreferredPosition ? 'Todos' : 'Por Preferência'}
                </Button>
              </div>

              {/* Seletor de ministro */}
              <Select
                value={selectedMinisterId}
                onValueChange={(value) => {
                  setSelectedMinisterId(value);
                  setMinisterSearch('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={ministers.length === 0 ? "Carregando ministros..." : "Selecione o ministro"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {ministers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  ) : (() => {
                    // Filtrar ministros
                    let filteredMinisters = ministers;

                    // Filtro por busca
                    if (ministerSearch.trim()) {
                      filteredMinisters = filteredMinisters.filter(m =>
                        m.name.toLowerCase().includes(ministerSearch.toLowerCase())
                      );
                    }

                    // Filtro por posição preferida
                    if (filterByPreferredPosition && selectedPosition) {
                      filteredMinisters = filteredMinisters.filter(m =>
                        m.preferredPosition === selectedPosition
                      );
                    }

                    if (filteredMinisters.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum ministro encontrado
                        </div>
                      );
                    }

                    return filteredMinisters.map((minister) => (
                      <SelectItem key={minister.id} value={minister.id}>
                        <div className="flex items-center gap-2 w-full">
                          <span className={cn(!minister.active && "text-muted-foreground")}>
                            {minister.name}
                          </span>
                          <div className="flex items-center gap-1 ml-auto">
                            {!minister.active && (
                              <Badge variant="outline" className="text-xs bg-slate-100">
                                Inativo
                              </Badge>
                            )}
                            {minister.preferredPosition && (
                              <Badge
                                variant={minister.preferredPosition === selectedPosition ? "default" : "outline"}
                                className="text-xs"
                              >
                                {LITURGICAL_POSITIONS[minister.preferredPosition]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignMinister}>
              Escalar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para solicitar substituição */}
      <Dialog open={isSubstitutionDialogOpen} onOpenChange={setIsSubstitutionDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Solicitar Substituição</DialogTitle>
            <DialogDescription>
              {selectedAssignmentForSubstitution && (
                <>
                  Você está solicitando substituição para o dia{" "}
                  <strong>
                    {format(new Date(selectedAssignmentForSubstitution.date), "dd 'de' MMMM", { locale: ptBR })}
                  </strong>{" "}
                  na missa das <strong>{formatMassTime(selectedAssignmentForSubstitution.massTime)}</strong> como{" "}
                  <strong>{LITURGICAL_POSITIONS[selectedAssignmentForSubstitution.position]}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivo da substituição <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Por favor, explique o motivo da sua ausência..."
                value={substitutionReason}
                onChange={(e) => setSubstitutionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Seja específico sobre o motivo para ajudar na aprovação da sua solicitação.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Importante:
                  </p>
                  <ul className="mt-1 space-y-1 text-amber-800 dark:text-amber-200 text-xs">
                    <li>• Sua solicitação será enviada aos coordenadores para aprovação</li>
                    <li>• Outros ministros serão notificados sobre a necessidade de substituição</li>
                    <li>• Você será notificado quando alguém aceitar substituí-lo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSubstitutionDialogOpen(false);
                setSubstitutionReason("");
                setSelectedAssignmentForSubstitution(null);
              }}
              disabled={submittingSubstitution}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRequestSubstitution}
              disabled={submittingSubstitution || !substitutionReason.trim()}
            >
              {submittingSubstitution ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}