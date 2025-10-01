import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LITURGICAL_POSITIONS, MASS_TIMES_BY_DAY, ALL_MASS_TIMES, getMassTimesForDate } from "@shared/constants";

// Helper function to capitalize first letter of a string
const capitalizeFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

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
        setMinisters(data.filter((m: any) => m.active));
      }
    } catch (error) {
      console.error("Error fetching ministers:", error);
    }
  };

  const fetchScheduleForDate = async (date: Date) => {
    setLoadingDateAssignments(true);
    setSelectedDateAssignments([]); // Reset assignments before loading
    setIsViewScheduleDialogOpen(true); // Open dialog immediately

    try {
      const response = await fetch(`/api/schedules/by-date/${date.toISOString()}`, {
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

      const response = await fetch("/api/schedule-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          scheduleId: currentSchedule.id,
          ministerId: selectedMinisterId,
          date: selectedDate.toISOString(),
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
    return assignments.filter(a => 
      isSameDay(new Date(a.date), date)
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando escalas...</div>
      </div>
    );
  }

  const currentSchedule = schedules.find(s => 
    s.month === currentMonth.getMonth() + 1 && 
    s.year === currentMonth.getFullYear()
  );

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
                    
                    {/* Editor Detalhado só aparece para escalas não publicadas e coordenadores */}
                    {currentSchedule && currentSchedule.status !== "published" && isCoordinator && (
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
                        {currentSchedule?.status === "published" && (
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
                              <div className="flex items-center justify-center">
                                <Users className="h-3.5 w-3.5 text-primary" />
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                      {/* Mini indicadores de missas - desktop completo */}
                      <div className="hidden sm:block space-y-0.5">
                        {currentSchedule?.status === "published" ? (
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
                              <div className="flex items-center gap-1 text-primary">
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-[10px] font-medium truncate">{dayAssignments.length} escalados</span>
                              </div>
                            ) : availableMassTimes.length > 0 ? (
                              <p className="text-[10px] text-muted-foreground truncate">Sem escalas</p>
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
                <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-bold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Legenda</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {currentSchedule.status === "published" && (
                      <>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-500 rounded-lg flex items-center justify-center ring-2 ring-amber-400 ring-offset-1 shadow-md flex-shrink-0">
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 fill-amber-500 animate-pulse" />
                          </div>
                          <span className="text-xs font-medium sm:hidden">Escalado</span>
                          <div className="hidden sm:block">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Você está escalado</span>
                            <p className="text-xs text-muted-foreground">Clique para ver detalhes da sua escala</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-500 rounded-lg flex items-center justify-center ring-2 ring-red-400 ring-offset-1 shadow-md flex-shrink-0">
                            <UserX className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 fill-red-400 animate-pulse" />
                          </div>
                          <span className="text-xs font-medium sm:hidden">Pendente</span>
                          <div className="hidden sm:block">
                            <span className="font-semibold text-red-700 dark:text-red-400">Substituição solicitada</span>
                            <p className="text-xs text-muted-foreground">Aguardando alguém aceitar substituir</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-500 rounded-lg flex items-center justify-center ring-2 ring-green-400 ring-offset-1 shadow-md flex-shrink-0">
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 fill-green-400 animate-pulse" />
                          </div>
                          <span className="text-xs font-medium sm:hidden">Confirmado</span>
                          <div className="hidden sm:block">
                            <span className="font-semibold text-green-700 dark:text-green-400">Substituto confirmado</span>
                            <p className="text-xs text-muted-foreground">Alguém já aceitou te substituir</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 flex-shrink-0">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium sm:hidden">Com escala</span>
                          <div className="hidden sm:block">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Tem escala</span>
                            <p className="text-xs text-muted-foreground">Clique para ver quem está escalado</p>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 flex-shrink-0">
                        <span className="font-bold text-xs sm:text-sm text-primary">H</span>
                      </div>
                      <span className="text-xs font-medium sm:hidden">Hoje</span>
                      <div className="hidden sm:block">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Hoje</span>
                        <p className="text-xs text-muted-foreground">Data atual</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent border rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium">D</span>
                      </div>
                      <span className="text-xs font-medium sm:hidden">Selecionado</span>
                      <div className="hidden sm:block">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Data selecionada</span>
                        <p className="text-xs text-muted-foreground">Dia que você clicou</p>
                      </div>
                    </div>
                  </div>
                  {currentSchedule.status === "published" && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">Dica: Clique em qualquer dia para ver os detalhes da escala</span>
                        <span className="sm:hidden">Toque para detalhes</span>
                      </p>
                    </div>
                  )}
                </div>
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
                  const dayAssignments = getAssignmentsForDate(day);
                  const isUserScheduled = isUserScheduledOnDate(day);
                  const availableMassTimes = getMassTimesForDate(day);

                  // Não renderizar dias sem missas disponíveis
                  if (availableMassTimes.length === 0) return null;

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
                        {availableMassTimes.map((time) => {
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
                                          <span className="hidden sm:inline">{LITURGICAL_POSITIONS[assignment.position]}</span>
                                          <span className="sm:hidden">{LITURGICAL_POSITIONS[assignment.position].slice(0, 3)}</span>
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
        <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-2rem)] mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              Escala do dia {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              Confira os ministros escalados para as celebrações deste dia
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] -mx-4 px-4 sm:mx-0 sm:px-0">
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
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([massTime, assignments]) => (
                    <div key={massTime} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Clock className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">
                          Missa das {massTime}
                        </h3>
                      </div>

                      <div className="grid gap-2 pl-7">
                        {assignments
                          .sort((a, b) => a.position - b.position)
                          .map((assignment) => {
                            const currentMinister = ministers.find(m => m.id === user?.id);
                            const isCurrentUser = currentMinister && assignment.ministerId === currentMinister.id;

                            return (
                              <div
                                key={assignment.id}
                                className={cn(
                                  "flex flex-col p-3 rounded-lg border bg-card",
                                  isCurrentUser && "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Badge variant={isCurrentUser ? "default" : "secondary"} className="flex-shrink-0">
                                      {LITURGICAL_POSITIONS[assignment.position]}
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                      <p className={cn("font-medium truncate", isCurrentUser && "text-amber-900 dark:text-amber-100")}>
                                        {assignment.ministerName || "Ministro"}
                                      </p>
                                      {isCurrentUser && (
                                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                          Você está escalado nesta posição
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    {assignment.confirmed ? (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <Check className="h-4 w-4" />
                                        <span className="text-xs hidden sm:inline">Confirmado</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-yellow-600">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-xs hidden sm:inline">Pendente</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {isCurrentUser && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-orange-600 hover:text-orange-700 mt-2 text-xs sm:text-sm"
                                    onClick={() => {
                                      setSelectedAssignmentForSubstitution(assignment);
                                      setIsSubstitutionDialogOpen(true);
                                    }}
                                  >
                                    <UserX className="h-3.5 w-3.5 mr-1" />
                                    <span className="hidden sm:inline">Solicitar Substituição</span>
                                    <span className="sm:hidden">Substituir</span>
                                  </Button>
                                )}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewScheduleDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para escalar ministro */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
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
                  {selectedDate && getMassTimesForDate(selectedDate).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
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

            <div>
              <label className="text-sm font-medium">Ministro</label>
              <Select value={selectedMinisterId} onValueChange={setSelectedMinisterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ministro" />
                </SelectTrigger>
                <SelectContent>
                  {ministers.map((minister) => (
                    <SelectItem key={minister.id} value={minister.id}>
                      {minister.name}
                      {minister.preferredPosition && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Pref: {LITURGICAL_POSITIONS[minister.preferredPosition]})
                        </span>
                      )}
                    </SelectItem>
                  ))}
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
                  na missa das <strong>{selectedAssignmentForSubstitution.massTime}</strong> como{" "}
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