import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { invalidateScheduleCache } from "@/lib/cacheManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Send,
  Download,
  FileSpreadsheet,
  List,
  MessageSquare,
  Save
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatMinisterName, parseScheduleDate } from "@/lib/utils";
import { LITURGICAL_POSITIONS, MASS_TIMES_BY_DAY, ALL_MASS_TIMES, getMassTimesForDate } from "@shared/constants";
import { ScheduleExport } from "@/components/ScheduleExport";
import { ScheduleEditDialog } from "@/components/ScheduleEditDialog";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import * as XLSX from 'xlsx';

// Helper function to capitalize first letter of a string
const capitalizeFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to format time from "HH:MM:SS" to "HH:MM"
const formatMassTime = (time: string) => {
  return time.substring(0, 5);
};

// Helper function to normalize mass time formats
// Converts "6h30", "06:30:00", "06:30" to "06:30:00" for comparison
const normalizeMassTime = (time: string): string => {
  // Se já está no formato HH:MM:SS
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time;
  }

  // Se está no formato "6h30", "19h30"
  if (time.includes('h')) {
    const [hours, minutes] = time.split('h');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  }

  // Se está no formato "06:30"
  if (time.match(/^\d{2}:\d{2}$/)) {
    return `${time}:00`;
  }

  return time;
};

interface PositionGroup {
  name: string;
  positions: number[];
}

const POSITION_GROUPS: PositionGroup[] = [
  { name: "AUXILIAR", positions: [1, 2] },
  { name: "RECOLHER", positions: [3, 4] },
  { name: "VELAS", positions: [5, 6] },
  { name: "ADORAÇÃO/FILA", positions: [7, 8] },
  { name: "PURIFICAR/EXPOR", positions: [9, 10, 11, 12] },
  { name: "MEZANINO", positions: [13, 14, 15] },
  { name: "CORREDOR AMBÃO", positions: [16] },
  { name: "CORREDOR CAPELA", positions: [17] },
  { name: "CORREDOR CADEIRAS", positions: [18] },
  { name: "NAVE CENTRAL PE PIO", positions: [19] },
  { name: "NAVE CENTRAL LADO MÚSICOS", positions: [20, 21] },
  { name: "NAVE CENTRAL AMBÃO", positions: [22] },
  { name: "NAVE CENTRAL CAPELA", positions: [23] },
  { name: "ÁTRIO EXTERNO", positions: [24, 25, 26, 27, 28] }
];

const SCHEDULE_LEGEND_ITEMS = [
  { label: "Missa Diária", color: "#c5c6c8", textColor: "#2C2C2C" },
  { label: "Dominical", color: "#ffda9e", textColor: "#8B5A00" },
  { label: "Cura e Libertação", color: "#b2e2f2", textColor: "#0D5F7F" },
  { label: "Sagrado Coração", color: "#fabfb7", textColor: "#8B3A3A" },
  { label: "Imaculado Coração", color: "#e3b1c8", textColor: "#6B2D5C" },
  { label: "Novena Out", color: "#fdf9c4", textColor: "#8B7500" }
];

const getMassTypeAndColor = (date: Date, massTime: string) => {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const isFirstWeek = dayOfMonth >= 1 && dayOfMonth <= 7;
  const isNovena = month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27;

  if (isNovena) {
    return { type: "Novena de Outubro", color: "#fdf9c4", textColor: "#8B7500" };
  }

  if (dayOfWeek === 0) {
    return { type: "Missa Dominical", color: "#ffda9e", textColor: "#8B5A00" };
  }

  if (dayOfWeek === 4 && isFirstWeek && massTime === "19:30:00") {
    return { type: "Cura e Libertação", color: "#b2e2f2", textColor: "#0D5F7F" };
  }

  if (dayOfWeek === 5 && isFirstWeek) {
    return { type: "Sagrado Coração de Jesus", color: "#fabfb7", textColor: "#8B3A3A" };
  }

  if (dayOfWeek === 6 && isFirstWeek) {
    return { type: "Imaculado Coração de Maria", color: "#e3b1c8", textColor: "#6B2D5C" };
  }

  return { type: "Missa Diária", color: "#c5c6c8", textColor: "#2C2C2C" };
};

const TOTAL_POSITIONS = Object.keys(LITURGICAL_POSITIONS).length;

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
  scheduleDisplayName?: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  notes?: string;
}

interface SubstitutionRequest {
  id: string;
  assignmentId: string;
  requestingMinisterId: string;
  substituteMinisterId: string | null;
  status: "pending" | "approved" | "auto_approved";
  reason: string;
}

type ListViewRow = {
  key: string;
  dayNumber: number;
  dayName: string;
  time: string;
  color: string;
  textColor: string;
  assignmentsByPosition: Map<number, ScheduleAssignment>;
};

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
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>("");
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
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [availableSubstitutes, setAvailableSubstitutes] = useState<any[]>([]);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>("");
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false);

  // Estados para o ScheduleEditDialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDialogDate, setEditDialogDate] = useState<string>("");
  const [editDialogTime, setEditDialogTime] = useState<string>("");
  const [editDialogMinisters, setEditDialogMinisters] = useState<{ id: string | null; name: string }[]>([]);

  // Estado para seleção de horário antes de editar
  const [isTimeSelectionDialogOpen, setIsTimeSelectionDialogOpen] = useState(false);

  // Estado para exportação
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'html'>('excel');

  // Estados para edição de observações/comentários pelos Auxiliares 1 e 2
  const [editingNotesForAssignment, setEditingNotesForAssignment] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);

  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";
  const isMinister = user?.role === "ministro";

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
        console.log('[FETCH_SCHEDULES] Received data:', {
          schedules: data.schedules,
          assignmentsCount: data.assignments?.length,
          substitutionsCount: data.substitutions?.length
        });
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
    setIsTimeSelectionDialogOpen(true); // Open selection dialog immediately

    try {
      // Format date as YYYY-MM-DD to avoid timezone issues
      const dateStr = format(date, 'yyyy-MM-dd');
      console.log('[DEBUG] Fetching schedule for date:', dateStr);
      const response = await fetch(`/api/schedules/by-date/${dateStr}`, {
        credentials: "include"
      });

      console.log('[DEBUG] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Received data:', data);
        console.log('[DEBUG] Assignments count:', data.assignments?.length || 0);

        if (data.assignments && data.assignments.length > 0) {
          console.log('[DEBUG] Setting assignments:', data.assignments);
          setSelectedDateAssignments(data.assignments);
        } else {
          console.log('[DEBUG] No assignments found, setting empty array');
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
        setIsTimeSelectionDialogOpen(false); // Close on error
      }
    } catch (error) {
      console.error("Error fetching schedule for date:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar escala para a data",
        variant: "destructive"
      });
      setIsTimeSelectionDialogOpen(false); // Close on error
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
      // Se estamos editando, deletar o assignment antigo primeiro
      if (editingAssignmentId) {

        const deleteResponse = await fetch(`/api/schedules/${editingAssignmentId}`, {
          method: "DELETE",
          credentials: "include"
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorData = await deleteResponse.json().catch(() => ({ message: "Erro ao remover" }));
          console.error('❌ Erro ao deletar:', errorData);
          throw new Error(errorData.message || "Erro ao remover escalação anterior");
        }

      }

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

      // Usar o endpoint correto: /api/schedules/add-minister
      const requestData = {
        date: dateStr,
        time: selectedMassTime,
        ministerId: selectedMinisterId === 'VACANT' ? null : selectedMinisterId,
        position: selectedPosition,
        type: 'missa',
        skipDuplicateCheck: !!editingAssignmentId // NOVO: permitir edição sem verificação de duplicação
      };


      const response = await fetch("/api/schedules/add-minister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(requestData)
      });


      if (response.ok) {
        const action = editingAssignmentId ? "atualizado" : "escalado";
        toast({
          title: "Sucesso",
          description: `Ministro ${action} com sucesso`
        });

        // Atualizar AMBAS as listas - schedule geral E assignments da data selecionada
        await fetchSchedules();

        // Se o modal de visualização estava aberto, atualizar também
        if (isViewScheduleDialogOpen && selectedDate) {
          await fetchScheduleForDate(selectedDate);
        }

        setIsAssignmentDialogOpen(false);
        setSelectedMinisterId("");
        setSelectedMassTime("");
        setIsCustomTime(false);
        setCustomTimeInput("");
        setSelectedPosition(1);
        setEditingAssignmentId(null); // Limpar modo de edição
      } else {
        const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
        console.error("Error response:", errorData);
        toast({
          title: "Erro",
          description: errorData.message || "Erro ao escalar ministro",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error assigning minister:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao escalar ministro",
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
      console.log('[UNPUBLISH] Attempting to unpublish schedule:', scheduleId);
      const response = await fetch(`/api/schedules/${scheduleId}/unpublish`, {
        method: "PATCH",
        credentials: "include"
      });

      console.log('[UNPUBLISH] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[UNPUBLISH] Success response:', data);
        toast({
          title: "Sucesso",
          description: data.message || "Publicação cancelada com sucesso"
        });
        fetchSchedules();
      } else {
        const errorData = await response.json();
        console.error('[UNPUBLISH] Error response:', errorData);
        toast({
          title: "Erro",
          description: errorData.message || "Erro ao cancelar publicação",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("[UNPUBLISH] Exception:", error);
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

  // Função para abrir dialog de exportação
  const handleOpenExportDialog = () => {
    // Ministros só podem exportar PDF
    if (isMinister) {
      setExportFormat('pdf');
    } else {
      setExportFormat('excel');
    }

    setIsExportDialogOpen(true);
  };

  // Função para exportar escala
  const handleExportSchedule = async () => {
    try {
      setIsExporting(true);
      setIsExportDialogOpen(false);


      if (assignments.length === 0) {
        toast({
          title: 'Aviso',
          description: 'A escala não possui ministros escalados ainda',
        });
        setIsExporting(false);
        return;
      }

      const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
      const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      // Definir grupos de posições com células mescladas
      // Logo em base64 (incorporado para funcionar em PDF/HTML)
      const logoBase64 = 'data:image/png;base64,' + (await fetch('/sjtlogo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      })));

      const positionGroups = POSITION_GROUPS;
      const legendItems = SCHEDULE_LEGEND_ITEMS;
      const totalPositions = TOTAL_POSITIONS;
      const positionsArray = Array.from({ length: totalPositions }, (_, i) => {
        const positionKey = i + 1;
        const name = LITURGICAL_POSITIONS[positionKey] || `Posição ${positionKey}`;
        return {
          positionKey: positionKey,
          name: name,
          abbreviation: name.split(' ')[0],
          fullName: `${positionKey} ${name}`, // Ex: "1 Auxiliar 1"
          numberAndName: `${name}\n${positionKey}`, // Para Excel: nome na linha 1, número na linha 2
          htmlNumberAndName: `${name}<br>${positionKey}` // Para HTML/PDF: nome na linha 1, número na linha 2
        };
      });

      const legendHtml = legendItems.map(item =>
        `<div class="legend-item" style="color: ${item.textColor};"><div class="legend-color" style="background: ${item.color};"></div>${item.label}</div>`
      ).join('');

      // Obter todas as missas do mês
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const allDays = eachDayOfInterval({ start, end });


      if (exportFormat === 'pdf') {
        // Exportar para PDF (via print)
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          throw new Error('Não foi possível abrir a janela de impressão');
        }

        let html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Escala - ${monthNameCapitalized}</title>
            <style>
              @page { size: A3 landscape; margin: 0.5cm; }
              body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 0; }
              .header-container { display: flex; align-items: center; justify-content: center; margin: 10px 0; position: relative; }
              .logo { position: absolute; left: 20px; width: 50px; height: auto; }
              h1 { text-align: center; font-size: 14px; margin: 0; flex: 1; }
              .legend { display: flex; justify-content: center; gap: 15px; margin: 10px 0; font-size: 7px; }
              .legend-item { display: flex; align-items: center; gap: 5px; }
              .legend-color { width: 12px; height: 12px; border: 1px solid #666; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; font-size: 7px; }
              th { background-color: #f0f0f0; font-weight: bold; text-align: center; vertical-align: middle; }
              .header-row { background-color: #e0e0e0; }
              .date-col { width: 30px; }
              .day-col { width: 80px; }
              .time-col { width: 35px; }
            </style>
          </head>
          <body>
            <div class="header-container">
              <img src="${logoBase64}" alt="Logo" class="logo">
              <h1>SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized.toUpperCase()}</h1>
            </div>
            <div class="legend">${legendHtml}</div>
            <table>
              <thead>
                <!-- Linha 1: Grupos de posições com células mescladas -->
                <tr class="header-row">
                  <th class="date-col" rowspan="2">Data</th>
                  <th class="day-col" rowspan="2">Dia</th>
                  <th class="time-col" rowspan="2">Hora</th>
                  ${positionGroups.map(group =>
                    `<th colspan="${group.positions.length}">${group.name}</th>`
                  ).join('')}
                </tr>
                <!-- Linha 2: Números das posições -->
                <tr class="header-row">
                  ${positionGroups.map(group =>
                    group.positions.map(pos => `<th>${pos}</th>`).join('')
                  ).join('')}
                </tr>
              </thead>
              <tbody>
        `;

        let rowCount = 0;
        allDays.forEach(day => {
          const massTimes = getMassTimesForDate(day);

          if (massTimes.length > 0) {
            massTimes.forEach(massTime => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayName = format(day, 'EEEE', { locale: ptBR });
              const dayNumber = day.getDate();
              const time = massTime.substring(0, 5);

              // Normalizar formato de hora para comparação
              const normalizedMassTime = normalizeMassTime(massTime);

              // Contar assignments para esta data/hora
              const assignmentsForMass = assignments.filter(
                a => a.date === dateStr && normalizeMassTime(a.massTime) === normalizedMassTime
              );


              // Obter tipo e cor da missa
              const massInfo = getMassTypeAndColor(day, normalizedMassTime);

              html += `<tr style="background-color: ${massInfo.color}; color: ${massInfo.textColor};">`;
              html += `<td>${dayNumber}</td><td>${dayName}</td><td>${time}</td>`;

              // Percorrer todas as posições (1-28)
              for (let posKey = 1; posKey <= totalPositions; posKey++) {
                const assignment = assignments.find(
                  a => a.date === dateStr && normalizeMassTime(a.massTime) === normalizedMassTime && a.position === posKey
                );
                const displayName = assignment?.scheduleDisplayName || assignment?.ministerName || '';
                html += `<td>${displayName}</td>`;
              }

              html += '</tr>';
              rowCount++;
            });
          }
        });


        html += `
              </tbody>
            </table>
          </body>
          </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);

        toast({
          title: 'Sucesso',
          description: 'Janela de impressão aberta. Salve como PDF',
        });
      } else if (exportFormat === 'html') {
        // Exportar para HTML
        let html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Escala - ${monthNameCapitalized}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
              .header-container { display: flex; align-items: center; justify-content: center; margin: 20px 0; position: relative; }
              .logo { position: absolute; left: 20px; width: 60px; height: auto; }
              h1 { text-align: center; font-size: 18px; margin: 0; flex: 1; }
              .legend { display: flex; justify-content: center; gap: 20px; margin: 15px 0; font-size: 11px; flex-wrap: wrap; }
              .legend-item { display: flex; align-items: center; gap: 8px; }
              .legend-color { width: 16px; height: 16px; border: 1px solid #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #000; padding: 6px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; text-align: center; vertical-align: middle; }
              .header-row { background-color: #e0e0e0; }
              @media print {
                @page { size: A3 landscape; margin: 0.5cm; }
                body { font-size: 8px; }
                .logo { width: 50px; }
                .legend { font-size: 7px; gap: 10px; }
                .legend-color { width: 12px; height: 12px; }
                th, td { padding: 2px 3px; font-size: 7px; }
              }
            </style>
          </head>
          <body>
            <div class="header-container">
              <img src="${logoBase64}" alt="Logo" class="logo">
              <h1>SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized.toUpperCase()}</h1>
            </div>
            <div class="legend">${legendHtml}</div>
            <table>
              <thead>
                <!-- Linha 1: Grupos de posições com células mescladas -->
                <tr class="header-row">
                  <th rowspan="2">Data</th>
                  <th rowspan="2">Dia</th>
                  <th rowspan="2">Hora</th>
                  ${positionGroups.map(group =>
                    `<th colspan="${group.positions.length}">${group.name}</th>`
                  ).join('')}
                </tr>
                <!-- Linha 2: Números das posições -->
                <tr class="header-row">
                  ${positionGroups.map(group =>
                    group.positions.map(pos => `<th>${pos}</th>`).join('')
                  ).join('')}
                </tr>
              </thead>
              <tbody>
        `;

        allDays.forEach(day => {
          const massTimes = getMassTimesForDate(day);
          if (massTimes.length > 0) {
            massTimes.forEach(massTime => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayName = format(day, 'EEEE', { locale: ptBR });
              const dayNumber = day.getDate();
              const time = massTime.substring(0, 5);
              const normalizedMassTime = normalizeMassTime(massTime);

              // Obter tipo e cor da missa
              const massInfo = getMassTypeAndColor(day, normalizedMassTime);

              html += `<tr style="background-color: ${massInfo.color}; color: ${massInfo.textColor};">`;
              html += `<td>${dayNumber}</td><td>${dayName}</td><td>${time}</td>`;

              for (let posKey = 1; posKey <= totalPositions; posKey++) {
                const assignment = assignments.find(
                  a => a.date === dateStr && normalizeMassTime(a.massTime) === normalizedMassTime && a.position === posKey
                );
                const displayName = assignment?.scheduleDisplayName || assignment?.ministerName || '';
                html += `<td>${displayName}</td>`;
              }

              html += '</tr>';
            });
          }
        });

        html += `
              </tbody>
            </table>
          </body>
          </html>
        `;

        // Download HTML file
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Escala_${monthNameCapitalized.replace('/', '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Sucesso',
          description: 'Arquivo HTML exportado com sucesso',
        });
      } else {
        // Exportar para Excel
        const data: any[][] = [];

        // Título
        data.push([`SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized.toUpperCase()}`]);
        data.push([]);

        // Header linha 1: Grupos de posições
        const headerRow1 = ['Data', 'Dia', 'Hora'];
        positionGroups.forEach(group => {
          headerRow1.push(group.name);
          // Adicionar células vazias para as colunas adicionais do grupo
          for (let i = 1; i < group.positions.length; i++) {
            headerRow1.push('');
          }
        });
        data.push(headerRow1);

        // Header linha 2: Números das posições
        const headerRow2 = ['', '', ''];
        positionGroups.forEach(group => {
          group.positions.forEach(pos => {
            headerRow2.push(pos.toString());
          });
        });
        data.push(headerRow2);

        // Dados e informações de cores
        const rowColors: Array<{row: number, color: string, textColor: string}> = [];
        let currentDataRow = 4; // Linha 0: título, 1: vazia, 2-3: headers, dados começam em 4

        allDays.forEach(day => {
          const massTimes = getMassTimesForDate(day);
          if (massTimes.length > 0) {
            massTimes.forEach(massTime => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayName = format(day, 'EEEE', { locale: ptBR });
              const dayNumber = day.getDate();
              const time = massTime.substring(0, 5);

              // Normalizar formato de hora para comparação
              const normalizedMassTime = normalizeMassTime(massTime);

              // Obter tipo e cor da missa
              const massInfo = getMassTypeAndColor(day, normalizedMassTime);
              rowColors.push({ row: currentDataRow, color: massInfo.color, textColor: massInfo.textColor });

              const row = [dayNumber.toString(), dayName, time];

              // Adicionar ministros para cada posição (1-28)
              for (let posKey = 1; posKey <= totalPositions; posKey++) {
                const assignment = assignments.find(
                  a => a.date === dateStr && normalizeMassTime(a.massTime) === normalizedMassTime && a.position === posKey
                );
                const displayName = assignment?.scheduleDisplayName || assignment?.ministerName || '';
                row.push(displayName);
              }

              data.push(row);
              currentDataRow++;
            });
          }
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Larguras das colunas (3 iniciais + totalPositions)
        ws['!cols'] = [
          { wch: 6 },   // Data
          { wch: 20 },  // Dia
          { wch: 8 },   // Hora
          ...Array(totalPositions).fill({ wch: 18 }) // Posições
        ];

        // Merge do título (3 colunas iniciais + totalPositions = 3 + 28 = 31)
        const lastCol = 3 + totalPositions - 1;
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } });

        // Merge das colunas Data, Dia e Hora (linhas 2-3, índices 2-3)
        ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }); // Data
        ws['!merges'].push({ s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }); // Dia
        ws['!merges'].push({ s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }); // Hora

        // Merge dos grupos de posições (linha 2, índice 2)
        let currentCol = 3; // Começa depois de Data, Dia, Hora
        positionGroups.forEach(group => {
          if (group.positions.length > 1) {
            ws['!merges']!.push({
              s: { r: 2, c: currentCol },
              e: { r: 2, c: currentCol + group.positions.length - 1 }
            });
          }
          currentCol += group.positions.length;
        });

        // Aplicar estilos nos headers (linhas 2 e 3, índices 2 e 3)
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let row = 2; row <= 3; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellAddress]) continue;
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            ws[cellAddress].s.alignment = { vertical: 'center', horizontal: 'center' };
            ws[cellAddress].s.font = { bold: true };
          }
        }

        // Função para converter hex para RGB (0-255)
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 255, g: 255, b: 255 };
        };

        // Aplicar cores nas linhas de dados
        rowColors.forEach(({ row, color, textColor }) => {
          for (let col = 0; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellAddress]) continue;
            if (!ws[cellAddress].s) ws[cellAddress].s = {};

            // Formato ARGB (Alpha, Red, Green, Blue) em hexadecimal
            const bgColorARGB = 'FF' + color.replace('#', '').toUpperCase();
            const fgColorARGB = 'FF' + textColor.replace('#', '').toUpperCase();

            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: bgColorARGB }
            };
            ws[cellAddress].s.font = {
              color: { rgb: fgColorARGB }
            };
          }
        });

        XLSX.utils.book_append_sheet(wb, ws, 'Escala');
        XLSX.writeFile(wb, `Escala_${monthNameCapitalized.replace('/', '_')}.xlsx`);

        toast({
          title: 'Sucesso',
          description: 'Planilha Excel exportada com sucesso',
        });
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao exportar',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Buscar substitutos disponíveis quando abrir o dialog
  useEffect(() => {
    const fetchAvailableSubstitutes = async () => {
      if (!isSubstitutionDialogOpen || !selectedAssignmentForSubstitution) return;

      setLoadingSubstitutes(true);
      try {
        const response = await fetch(`/api/substitutions/available/${selectedAssignmentForSubstitution.id}`, {
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableSubstitutes(data.data || []);
        }
      } catch (error) {
        console.error("Erro ao buscar substitutos:", error);
      } finally {
        setLoadingSubstitutes(false);
      }
    };

    fetchAvailableSubstitutes();
  }, [isSubstitutionDialogOpen, selectedAssignmentForSubstitution]);

  const handleRequestSubstitution = async () => {
    if (!selectedAssignmentForSubstitution) return;

    // Validação de data passada no frontend ANTES de enviar ao servidor
    const assignmentDate = parseScheduleDate(selectedAssignmentForSubstitution.date);
    const [hours, minutes] = selectedAssignmentForSubstitution.massTime.split(':').map(Number);
    assignmentDate.setHours(hours, minutes, 0, 0);

    const now = new Date();

    if (assignmentDate < now) {
      toast({
        title: "Erro",
        description: "Não é possível solicitar substituição para missa que já passou",
        variant: "destructive",
      });
      return;
    }

    setSubmittingSubstitution(true);
    try {
      const response = await fetch("/api/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scheduleId: selectedAssignmentForSubstitution.id,
          substituteId: selectedSubstituteId || null,
          reason: substitutionReason || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar solicitação");
      }

      toast({
        title: data.isAutoApproved ? "Solicitação Auto-aprovada!" : "Solicitação Enviada!",
        description: data.message,
      });

      setIsSubstitutionDialogOpen(false);
      setSubstitutionReason("");
      setSelectedSubstituteId("");
      setSelectedAssignmentForSubstitution(null);
      setAvailableSubstitutes([]);

      // Recarregar escalas (incluindo substituições para atualizar legendas)
      await fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar solicitação de substituição",
        variant: "destructive",
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
      // CRITICAL: Add T00:00:00 to force local timezone parsing
      const assignmentDate = typeof a.date === 'string'
        ? parseScheduleDate(a.date.split('T')[0]) // Use helper that adds time component
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

    // DEBUG: Log para verificar dados
    if (dayAssignments.length > 0 && substitutions.length > 0) {
    }

    const userSubstitutionRequest = substitutions.find(s => {
      const hasAssignment = dayAssignmentIds.includes(s.assignmentId);
      const isRequester = s.requestingMinisterId === currentMinister.id;


      return hasAssignment && isRequester;
    });

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

  const currentSchedule = schedules.find(s =>
    s.month === currentMonth.getMonth() + 1 &&
    s.year === currentMonth.getFullYear()
  );

  const allMonthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const listViewRows: ListViewRow[] = allMonthDays.flatMap((day) => {
    const massTimes = getMassTimesForDate(day);
    if (massTimes.length === 0) {
      return [];
    }

    return massTimes.map((massTime) => {
      const normalizedMassTime = normalizeMassTime(massTime);
      const dateStr = format(day, "yyyy-MM-dd");
      const assignmentsForMass = assignments.filter(
        (assignment) =>
          assignment.date === dateStr &&
          normalizeMassTime(assignment.massTime) === normalizedMassTime
      );
      const assignmentsByPosition = new Map<number, ScheduleAssignment>();
      assignmentsForMass.forEach((assignment) => {
        assignmentsByPosition.set(assignment.position, assignment);
      });

      const massInfo = getMassTypeAndColor(day, normalizedMassTime);

      return {
        key: `${dateStr}-${normalizedMassTime}`,
        dayNumber: day.getDate(),
        dayName: capitalizeFirst(format(day, "EEEE", { locale: ptBR })),
        time: formatMassTime(normalizedMassTime),
        color: massInfo.color,
        textColor: massInfo.textColor,
        assignmentsByPosition
      };
    });
  });

  console.log('[SCHEDULES_PAGE] Current month:', currentMonth.getMonth() + 1, 'year:', currentMonth.getFullYear());
  console.log('[SCHEDULES_PAGE] Available schedules:', schedules);
  console.log('[SCHEDULES_PAGE] Current schedule found:', currentSchedule);

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

                    {/* Botão de exportação */}
                    {currentSchedule && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleOpenExportDialog}
                        disabled={isExporting}
                        className="text-xs sm:text-sm"
                      >
                        {isExporting ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1" />
                        )}
                        <span className="hidden sm:inline">Exportar</span>
                        <span className="sm:hidden">Exportar</span>
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
            <List className="h-3.5 w-3.5 mr-1 sm:h-4 sm:w-4 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Visualização Lista</span>
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
                      // Usar data selecionada se existir, senão usar data atual
                      if (!selectedDate) {
                        setSelectedDate(new Date());
                      }
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
                        isSelected && !isUserScheduled && "bg-slate-100 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600",
                        // Destaque especial quando usuário está escalado - cores baseadas no status de substituição
                        isUserScheduled && currentSchedule?.status === "published" && !substitutionStatus && "bg-white dark:bg-slate-900 border-2 border-[#959D90] shadow-lg ring-2 ring-[#959D90] ring-offset-1",
                        // Vinho quando tem substituição pendente
                        isUserScheduled && substitutionStatus === 'pending' && "bg-white dark:bg-slate-900 border-2 border-[#610C27] shadow-lg ring-2 ring-[#610C27] ring-offset-1",
                        // Amarelo dourado quando substituição foi aprovada
                        isUserScheduled && substitutionStatus === 'approved' && "bg-white dark:bg-slate-900 border-2 border-[#FDCF76] shadow-lg ring-2 ring-[#FDCF76] ring-offset-1",
                        !isSameMonth(day, currentMonth) && "opacity-50",
                        // Tornar clicável quando há escala publicada
                        currentSchedule?.status === "published" && isSameMonth(day, currentMonth) && !isUserScheduled && "cursor-pointer hover:bg-accent hover:shadow-lg hover:scale-105",
                        // Hover especial baseado no status
                        isUserScheduled && !substitutionStatus && currentSchedule?.status === "published" && isSameMonth(day, currentMonth) && "cursor-pointer hover:bg-[#959D90]/10 hover:dark:bg-[#959D90]/20 hover:scale-110 hover:shadow-xl hover:ring-4",
                        isUserScheduled && substitutionStatus === 'pending' && isSameMonth(day, currentMonth) && "cursor-pointer hover:bg-[#610C27]/10 hover:dark:bg-[#610C27]/20 hover:scale-110 hover:shadow-xl hover:ring-4",
                        isUserScheduled && substitutionStatus === 'approved' && isSameMonth(day, currentMonth) && "cursor-pointer hover:bg-[#FDCF76]/20 hover:dark:bg-[#FDCF76]/30 hover:scale-110 hover:shadow-xl hover:ring-4",
                        // Tornar clicável para coordenador em rascunho
                        isCoordinator && currentSchedule?.status === "draft" && isSameMonth(day, currentMonth) && "cursor-pointer hover:bg-accent"
                      )}
                      onClick={() => {
                        setSelectedDate(day);
                        
                        // Para escalas publicadas ou rascunho, sempre abre visualização/edição das escalas do dia
                        if (currentSchedule?.status === "published" || (isCoordinator && currentSchedule?.status === "draft")) {
                          fetchScheduleForDate(day);
                        }
                      }}>
                      {/* Badge especial quando usuário está escalado */}
                      {isUserScheduled && currentSchedule?.status === "published" && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10">
                          <div className="relative">
                            {!substitutionStatus && (
                              <>
                                <div className="absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse" style={{ backgroundColor: '#959D90' }} />
                                <Star className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse relative" style={{ color: '#959D90', fill: '#959D90' }} />
                              </>
                            )}
                            {substitutionStatus === 'pending' && (
                              <>
                                <div className="absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse" style={{ backgroundColor: '#610C27' }} />
                                <UserX className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse relative" style={{ color: '#610C27', fill: '#610C27' }} />
                              </>
                            )}
                            {substitutionStatus === 'approved' && (
                              <>
                                <div className="absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse" style={{ backgroundColor: '#FDCF76' }} />
                                <Check className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse relative" style={{ color: '#FDCF76', fill: '#FDCF76' }} />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="font-semibold text-xs mb-0.5 sm:text-sm sm:mb-1 flex items-center justify-between">
                        <span className={cn(
                          "transition-all",
                          isUserScheduled && currentSchedule?.status === "published" && !substitutionStatus && "font-bold text-lg",
                          isUserScheduled && substitutionStatus === 'pending' && "font-bold text-lg",
                          isUserScheduled && substitutionStatus === 'approved' && "font-bold text-lg"
                        )}
                        style={
                          isUserScheduled && currentSchedule?.status === "published"
                            ? substitutionStatus === 'pending'
                              ? { color: '#610C27' }
                              : substitutionStatus === 'approved'
                              ? { color: '#FDCF76' }
                              : { color: '#959D90' }
                            : {}
                        }>
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
                                  <UserX className="h-4 w-4" style={{ color: '#610C27', fill: '#610C27' }} />
                                ) : substitutionStatus === 'approved' ? (
                                  <Check className="h-4 w-4" style={{ color: '#FDCF76', fill: '#FDCF76' }} />
                                ) : (
                                  <Star className="h-4 w-4 animate-pulse" style={{ color: '#959D90', fill: '#959D90' }} />
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
                                        <AlertCircle className="h-3 w-3" style={{ color: '#D2691E' }} />
                                        <span className="text-[9px] font-medium" style={{ color: '#D2691E' }}>{toConfirm}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : availableMassTimes.length > 0 ? (
                              <div className="flex items-center justify-center">
                                <AlertCircle className="h-3.5 w-3.5" style={{ color: '#D2691E' }} />
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
                                    <UserX className="h-4 w-4 flex-shrink-0" style={{ color: '#610C27', fill: '#610C27' }} />
                                    <span className="text-[10px] font-bold truncate" style={{ color: '#610C27' }}>Aguardando</span>
                                  </div>
                                ) : substitutionStatus === 'approved' ? (
                                  <div className="flex items-center gap-1">
                                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#FDCF76', fill: '#FDCF76' }} />
                                    <span className="text-[10px] font-bold truncate" style={{ color: '#FDCF76' }}>Substituído</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 animate-pulse flex-shrink-0" style={{ color: '#959D90', fill: '#959D90' }} />
                                    <span className="text-[10px] font-bold truncate" style={{ color: '#959D90' }}>Escalado</span>
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
                                      <div className="flex items-center gap-1" style={{ color: '#D2691E' }}>
                                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="text-[10px] font-medium truncate">{toConfirm} à confirmar</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : availableMassTimes.length > 0 ? (
                              <div className="flex items-center gap-1" style={{ color: '#D2691E' }}>
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
                        <div className="group flex items-center gap-3 p-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-slate-900" style={{ borderColor: '#959D90' }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-all border-2" style={{ backgroundColor: '#959D90', borderColor: '#959D90' }}>
                            <Star className="h-5 w-5 text-white animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight" style={{ color: '#959D90' }}>Você está escalado</p>
                            <p className="text-xs mt-1 text-muted-foreground">Dia com sua participação confirmada</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-slate-900" style={{ borderColor: '#610C27' }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-all border-2" style={{ backgroundColor: '#610C27', borderColor: '#610C27' }}>
                            <UserX className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight" style={{ color: '#610C27' }}>Substituição solicitada</p>
                            <p className="text-xs mt-1 text-muted-foreground">Aguardando confirmação de substituto</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-slate-900" style={{ borderColor: '#FDCF76' }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-all border-2" style={{ backgroundColor: '#FDCF76', borderColor: '#FDCF76' }}>
                            <UserCheck className="h-5 w-5 text-slate-800" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight" style={{ color: '#FDCF76' }}>Substituto confirmado</p>
                            <p className="text-xs mt-1 text-muted-foreground">Substituição já foi aprovada</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-slate-900" style={{ borderColor: '#91AEC4' }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-all border-2" style={{ backgroundColor: '#91AEC4', borderColor: '#91AEC4' }}>
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight" style={{ color: '#91AEC4' }}>Ministros escalados</p>
                            <p className="text-xs mt-1 text-muted-foreground">Quantidade de ministros confirmados</p>
                          </div>
                        </div>
                        <div className="group flex items-center gap-3 p-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-slate-900" style={{ borderColor: '#D2691E' }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-all border-2" style={{ backgroundColor: '#D2691E', borderColor: '#D2691E' }}>
                            <AlertCircle className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight" style={{ color: '#D2691E' }}>Vagas disponíveis</p>
                            <p className="text-xs mt-1 text-muted-foreground">Posições ainda não preenchidas</p>
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
                <p className="text-[10px] text-muted-foreground sm:text-xs text-center sm:text-right">
                  Visualização em tabela reproduzindo o layout de exportação.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 space-y-4">
              <div className="rounded-lg border bg-muted/10 p-3 sm:p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Legenda de tipos de celebração
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-[11px] sm:text-xs">
                  {SCHEDULE_LEGEND_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1"
                      style={{ color: item.textColor }}
                    >
                      <span
                        className="h-3 w-3 rounded-sm border border-border/70"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                {listViewRows.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma celebração configurada para este mês.
                  </div>
                ) : (
                  <table className="w-full border border-border text-[11px] sm:text-xs">
                    <thead>
                      <tr className="bg-muted/60 text-muted-foreground">
                        <th className="border border-border px-2 py-2 text-center font-semibold uppercase" rowSpan={2}>
                          Data
                        </th>
                        <th className="border border-border px-2 py-2 text-center font-semibold uppercase" rowSpan={2}>
                          Dia
                        </th>
                        <th className="border border-border px-2 py-2 text-center font-semibold uppercase" rowSpan={2}>
                          Hora
                        </th>
                        {POSITION_GROUPS.map((group) => (
                          <th
                            key={group.name}
                            className="border border-border px-2 py-2 text-center font-semibold uppercase"
                            colSpan={group.positions.length}
                          >
                            {group.name}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-muted/60 text-muted-foreground">
                        {POSITION_GROUPS.map((group) =>
                          group.positions.map((position) => (
                            <th
                              key={`${group.name}-${position}`}
                              className="border border-border px-2 py-1 text-center font-semibold uppercase"
                            >
                              {position}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {listViewRows.map((row) => (
                        <tr
                          key={row.key}
                          style={{ backgroundColor: row.color, color: row.textColor }}
                          className="border border-border"
                        >
                          <td className="border border-border px-2 py-1 text-center font-semibold">
                            {row.dayNumber}
                          </td>
                          <td className="border border-border px-2 py-1 capitalize text-center font-medium">
                            {row.dayName}
                          </td>
                          <td className="border border-border px-2 py-1 text-center font-medium">
                            {row.time}
                          </td>
                          {Array.from({ length: TOTAL_POSITIONS }, (_, index) => {
                            const position = index + 1;
                            const assignment = row.assignmentsByPosition.get(position);
                            const displayName = assignment?.scheduleDisplayName || assignment?.ministerName || "";
                            return (
                              <td
                                key={`${row.key}-${position}`}
                                className="border border-border px-2 py-1 text-left align-middle"
                              >
                                {displayName}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
              Missa das {selectedMassTime && formatMassTime(selectedMassTime)}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] sm:max-h-[60vh] -mx-3 px-3 sm:-mx-0 sm:px-0">
            <div className="space-y-3 pr-2 sm:pr-4">
              {selectedDateAssignments && selectedDateAssignments.length > 0 ? (
                <>
                  <div className="grid gap-2">
                    {(() => {
                      // Check if current user is Auxiliar 1 or 2 for this mass
                      const currentMinister = ministers.find(m => m.id === user?.id);
                      const userAssignmentsForThisMass = selectedDateAssignments.filter(
                        a => a.ministerId === currentMinister?.id
                      );
                      const isUserAuxiliar1or2 = userAssignmentsForThisMass.some(
                        a => a.position === 1 || a.position === 2
                      );

                      return selectedDateAssignments
                          .sort((a, b) => a.position - b.position)
                          .map((assignment) => {
                            const isCurrentUser = currentMinister && assignment.ministerId === currentMinister.id;

                            return (
                              <div
                                key={assignment.id}
                                className={cn(
                                  "flex flex-col p-2 sm:p-3 rounded-lg border bg-card",
                                  isCurrentUser && "bg-white dark:bg-slate-900 border-2"
                                )}
                                style={isCurrentUser ? { borderColor: '#959D90' } : {}}
                              >
                                <div className="flex items-start gap-2 sm:gap-3 mb-2">
                                  {/* Informações do ministro - lado esquerdo */}
                                  <div className="flex flex-col flex-1 min-w-0 gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge
                                        variant={isCurrentUser ? "default" : "secondary"}
                                        className={cn(
                                          "flex-shrink-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1",
                                          isCurrentUser && "text-white"
                                        )}
                                        style={isCurrentUser ? { backgroundColor: '#959D90' } : {}}
                                      >
                                        <span className="hidden sm:inline">{assignment.position} - {LITURGICAL_POSITIONS[assignment.position]}</span>
                                        <span className="sm:hidden">{assignment.position}</span>
                                      </Badge>
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
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1">
                                        <p
                                          className={cn("font-medium text-xs sm:text-sm truncate", isCurrentUser && "font-bold")}
                                          style={isCurrentUser ? { color: '#959D90' } : {}}
                                        >
                                          {formatMinisterName(assignment.ministerName) || "Ministro"}
                                        </p>
                                        {(() => {
                                          const minister = ministers.find(m => m.id === assignment.ministerId);
                                          if (minister?.familyId) {
                                            return (
                                              <Badge variant="outline" className="ml-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 gap-0.5">
                                                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                <span className="hidden sm:inline">Família</span>
                                              </Badge>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:hidden">
                                        {LITURGICAL_POSITIONS[assignment.position]}
                                      </p>
                                      {isCurrentUser && (
                                        <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: '#959D90' }}>
                                          Você está escalado nesta posição
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Avatar - lado direito */}
                                  {(() => {
                                    const minister = ministers.find(m => m.id === assignment.ministerId);
                                    const ministerPhotoUrl = minister?.photoUrl;
                                    const ministerName = formatMinisterName(assignment.ministerName) || "Ministro";
                                    const initials = ministerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                    return (
                                      <ImageZoomModal
                                        imageUrl={ministerPhotoUrl}
                                        fallbackText={initials}
                                        alt={ministerName}
                                      >
                                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                                          <AvatarImage src={ministerPhotoUrl} alt={ministerName} />
                                          <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                      </ImageZoomModal>
                                    );
                                  })()}
                                </div>

                                {/* Seção de observações/comentários */}
                                {(assignment.notes || isUserAuxiliar1or2 || isCoordinator) && (
                                  <div className="mt-3 pt-3 border-t">
                                    {editingNotesForAssignment === assignment.id ? (
                                      <div className="space-y-2">
                                        <Label className="text-xs sm:text-sm font-medium">
                                          Observações da Missa
                                        </Label>
                                        <Textarea
                                          value={notesText}
                                          onChange={(e) => setNotesText(e.target.value)}
                                          placeholder="Escreva observações sobre a missa (ex: ocorrências, necessidades, etc.)"
                                          className="min-h-[80px] text-xs sm:text-sm"
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="text-xs sm:text-sm h-7 sm:h-8"
                                            disabled={savingNotes}
                                            onClick={async () => {
                                              try {
                                                setSavingNotes(true);
                                                const response = await fetch(`/api/schedule-assignments/${assignment.id}`, {
                                                  method: "PATCH",
                                                  headers: {
                                                    "Content-Type": "application/json"
                                                  },
                                                  credentials: "include",
                                                  body: JSON.stringify({
                                                    notes: notesText
                                                  })
                                                });

                                                if (response.ok) {
                                                  toast({
                                                    title: "Sucesso",
                                                    description: "Observações salvas com sucesso"
                                                  });
                                                  setEditingNotesForAssignment(null);
                                                  setNotesText("");
                                                  await fetchScheduleForDate(selectedDate);
                                                } else {
                                                  const error = await response.json();
                                                  throw new Error(error.message || "Erro ao salvar");
                                                }
                                              } catch (error: any) {
                                                toast({
                                                  title: "Erro",
                                                  description: error.message || "Erro ao salvar observações",
                                                  variant: "destructive"
                                                });
                                              } finally {
                                                setSavingNotes(false);
                                              }
                                            }}
                                          >
                                            {savingNotes ? (
                                              <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 animate-spin" />
                                            ) : (
                                              <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                            )}
                                            Salvar
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs sm:text-sm h-7 sm:h-8"
                                            onClick={() => {
                                              setEditingNotesForAssignment(null);
                                              setNotesText("");
                                            }}
                                          >
                                            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs sm:text-sm font-medium mb-1 flex items-center gap-1">
                                              <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                              Observações
                                            </p>
                                            {assignment.notes ? (
                                              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                                {assignment.notes}
                                              </p>
                                            ) : (
                                              <p className="text-xs text-muted-foreground italic">
                                                Nenhuma observação registrada
                                              </p>
                                            )}
                                          </div>
                                          {(isUserAuxiliar1or2 || isCoordinator) && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="flex-shrink-0 h-7 px-2 text-xs"
                                              onClick={() => {
                                                setEditingNotesForAssignment(assignment.id);
                                                setNotesText(assignment.notes || "");
                                              }}
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  {isCurrentUser && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-orange-600 hover:text-orange-700 text-[11px] sm:text-sm h-8 sm:h-9"
                                      onClick={() => {
                                        // Limpa estados anteriores para evitar exibir erros de requisições passadas
                                        setSubstitutionReason("");
                                        setSelectedSubstituteId("");
                                        setSubmittingSubstitution(false);
                                        setSelectedAssignmentForSubstitution(assignment);
                                        setIsSubstitutionDialogOpen(true);
                                      }}
                                    >
                                      <UserX className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                      <span className="hidden sm:inline">Solicitar Substituição</span>
                                      <span className="sm:hidden">Solicitar Substituto</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma escala encontrada para esta data</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-3 sm:mt-4 flex flex-col gap-2">
            {selectedDateAssignments && selectedDateAssignments.length > 0 && selectedDate && (
              <div className="w-full sm:mr-auto">
                <ScheduleExport
                  date={selectedDate}
                  assignments={selectedDateAssignments}
                />
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewScheduleDialogOpen(false);
                  setIsTimeSelectionDialogOpen(true);
                }}
                className="w-full sm:w-auto text-sm"
              >
                Voltar
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsViewScheduleDialogOpen(false)}
                className="w-full sm:w-auto text-sm"
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para escalar ministro */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={(open) => {
        setIsAssignmentDialogOpen(open);
        if (open) {
          fetchMinisters();
        } else {
          // Limpar estados ao fechar
          setMinisterSearch('');
          setFilterByPreferredPosition(false);
          setEditingAssignmentId(null);
          
          // Recarregar a lista para evitar cache/inconsistências
          if (selectedDate) {
            fetchScheduleForDate(selectedDate);
          }
          fetchSchedules();
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Escalar Ministro</DialogTitle>
            <DialogDescription>
              Selecione a data, ministro, horário e posição
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value + 'T12:00:00'));
                  }
                }}
                className="w-full [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Horário da Missa</label>

              {!isCustomTime ? (
                <div className="space-y-2">
                  <Select
                    value={selectedMassTime}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomTime(true);
                        setSelectedMassTime("");
                        setCustomTimeInput("");
                      } else {
                        setSelectedMassTime(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o horário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:30:00">06:30</SelectItem>
                      <SelectItem value="08:00:00">08:00</SelectItem>
                      <SelectItem value="10:00:00">10:00</SelectItem>
                      <SelectItem value="19:00:00">19:00</SelectItem>
                      <SelectItem value="19:30:00">19:30</SelectItem>
                      <Separator className="my-1" />
                      <SelectItem value="custom" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Edit2 className="h-3 w-3" />
                          Digitar horário personalizado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={customTimeInput}
                      onChange={(e) => {
                        setCustomTimeInput(e.target.value);
                        // Adicionar :00 segundos automaticamente
                        if (e.target.value) {
                          setSelectedMassTime(e.target.value + ":00");
                        }
                      }}
                      placeholder="HH:MM"
                      className="flex-1 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCustomTime(false);
                        setCustomTimeInput("");
                        setSelectedMassTime("");
                      }}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o horário personalizado ou clique em <X className="h-3 w-3 inline" /> para voltar às opções
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Ordem/Posição na Escala</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(parseInt(e.target.value) || 1)}
                placeholder="Digite a posição (1, 2, 3...)"
                data-testid="input-position"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Define a ordem em que o ministro aparece na lista (1 = primeiro)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Ministro</label>
                <Badge variant="secondary" className="text-xs">
                  {ministers.length} ministros
                </Badge>
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
                  {/* Opção VACANTE sempre no topo */}
                  <SelectItem value="VACANT">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium italic text-muted-foreground">VACANTE</span>
                      <Badge variant="outline" className="text-xs">
                        Vaga sem ministro
                      </Badge>
                    </div>
                  </SelectItem>

                  {ministers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  ) : (() => {
                    // Filtrar ministros
                    let filteredMinisters = ministers;

                    // Filtro por busca (não aplicar para VACANTE que já está no topo)
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
                          <span>
                            {minister.name}
                          </span>
                          <div className="flex items-center gap-1 ml-auto">
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
            <Button variant="outline" onClick={() => {
              setIsAssignmentDialogOpen(false);
              setEditingAssignmentId(null);
              setSelectedMinisterId("");
              setSelectedMassTime("");
              setIsCustomTime(false);
              setCustomTimeInput("");
              setSelectedPosition(1);
            }}>
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
                    {format(parseScheduleDate(String(selectedAssignmentForSubstitution.date)), "dd 'de' MMMM", { locale: ptBR })}
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

      {/* Dialog principal - Seleção de horário com ações */}
      <Dialog open={isTimeSelectionDialogOpen} onOpenChange={setIsTimeSelectionDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:w-full mx-auto p-3 sm:p-6">
          <DialogHeader className="space-y-1 sm:space-y-2 pr-8">
            <DialogTitle className="text-base sm:text-lg leading-tight">
              Escala do dia {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isCoordinator ? 'Visualize ou edite os ministros escalados para cada horário' : 'Confira os ministros escalados para as celebrações deste dia'}
            </DialogDescription>
          </DialogHeader>

          {/* Legenda de cores */}
          <div className="flex flex-wrap gap-3 px-3 sm:px-0 py-2 border-b">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#959D90' }}></div>
              <span className="text-muted-foreground">Escalado</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#610C27' }}></div>
              <span className="text-muted-foreground">Subst. Pendente</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FDCF76' }}></div>
              <span className="text-muted-foreground">Subst. Aprovada</span>
            </div>
          </div>

          <ScrollArea className="max-h-[60vh] sm:max-h-[55vh] -mx-3 px-3 sm:-mx-0 sm:px-0">
            <div className="space-y-3 py-2 pr-2 sm:pr-4">
              {loadingDateAssignments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-sm text-muted-foreground">Carregando escalas...</p>
                </div>
              ) : selectedDateAssignments && selectedDateAssignments.length > 0 ? (
                Object.entries(
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
                  const timeToMinutes = (time: string) => {
                    if (time === 'Sem horário') return 9999;
                    const [hours, minutes] = time.split(':').map(Number);
                    return hours * 60 + minutes;
                  };
                  return timeToMinutes(a) - timeToMinutes(b);
                })
                .map(([massTime, assignments]) => {
                  const confirmedCount = assignments.filter(a => a.ministerName && a.ministerName !== 'VACANTE').length;
                  const totalCount = assignments.length;

                  // Verificar se o usuário atual está escalado neste horário
                  const currentMinister = ministers.find(m => m.id === user?.id);
                  const userAssignment = currentMinister
                    ? assignments.find(a => a.ministerId === currentMinister.id)
                    : null;

                  // Verificar status de substituição do usuário neste horário
                  let userSubstitutionStatus = null;
                  if (currentMinister && userAssignment) {
                    const substitutionRequest = substitutions.find(s =>
                      s.assignmentId === userAssignment.id &&
                      s.requestingMinisterId === currentMinister.id
                    );
                    if (substitutionRequest) {
                      userSubstitutionStatus = substitutionRequest.status;
                    }
                  }

                  // Definir estilo do card baseado no status do usuário
                  let cardBorderClass = "border";
                  let statusBadge = null;

                  let cardBorderStyle = {};

                  if (userAssignment) {
                    if (userSubstitutionStatus === 'pending') {
                      cardBorderClass = "border-2 bg-white dark:bg-slate-900";
                      cardBorderStyle = { borderColor: '#610C27' };
                      statusBadge = (
                        <Badge className="text-white text-xs" style={{ backgroundColor: '#610C27' }}>
                          Substituição Pendente
                        </Badge>
                      );
                    } else if (userSubstitutionStatus === 'approved' || userSubstitutionStatus === 'auto_approved') {
                      cardBorderClass = "border-2 bg-white dark:bg-slate-900";
                      cardBorderStyle = { borderColor: '#FDCF76' };
                      statusBadge = (
                        <Badge className="text-slate-800 text-xs" style={{ backgroundColor: '#FDCF76' }}>
                          Substituição Aprovada
                        </Badge>
                      );
                    } else {
                      // Escalado mas sem substituição
                      cardBorderClass = "border-2 bg-white dark:bg-slate-900";
                      cardBorderStyle = { borderColor: '#959D90' };
                      statusBadge = (
                        <Badge className="text-white text-xs" style={{ backgroundColor: '#959D90' }}>
                          Você está escalado
                        </Badge>
                      );
                    }
                  }

                  return (
                    <div key={massTime} className={`p-4 rounded-lg ${cardBorderClass} space-y-3`} style={cardBorderStyle}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base">Missa das {formatMassTime(massTime)}</p>
                              {statusBadge}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {confirmedCount} de {totalCount} ministros escalados
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMassTime(massTime);
                              setSelectedDateAssignments(assignments);
                              setIsTimeSelectionDialogOpen(false);
                              setIsViewScheduleDialogOpen(true);
                            }}
                            className="h-8 px-2 sm:px-3 text-xs"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Ver</span>
                          </Button>
                          {(() => {
                            // Verificar se o usuário é auxiliar 1 ou 2 nesta missa
                            const isUserAuxiliar1or2InThisMass = userAssignment && 
                              (userAssignment.position === 1 || userAssignment.position === 2);
                            
                            // Mostrar botão de editar para coordenador OU auxiliar 1/2
                            if (isCoordinator || isUserAuxiliar1or2InThisMass) {
                              return (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    // Preparar dados para edição
                                    const ministersForEdit = assignments
                                      .sort((a, b) => a.position - b.position)
                                      .map(a => ({
                                        id: a.ministerId,
                                        name: formatMinisterName(a.ministerName) || 'VACANTE'
                                      }));

                                    setEditDialogDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
                                    setEditDialogTime(massTime);
                                    setEditDialogMinisters(ministersForEdit);
                                    setIsTimeSelectionDialogOpen(false);
                                    setIsEditDialogOpen(true);
                                  }}
                                  className="h-8 px-2 sm:px-3 text-xs"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Editar</span>
                                </Button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Preview dos ministros */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                        {assignments
                          .sort((a, b) => a.position - b.position)
                          .slice(0, 4)
                          .map((assignment, idx) => {
                            const isUserAssignment = currentMinister && assignment.ministerId === currentMinister.id;
                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm">
                                <Badge
                                  variant={isUserAssignment ? "default" : "outline"}
                                  className="text-[10px] sm:text-xs px-1.5 py-0.5"
                                  style={isUserAssignment ? { backgroundColor: '#959D90' } : {}}
                                >
                                  {assignment.position}
                                </Badge>
                                <span
                                  className={cn(
                                    "truncate",
                                    isUserAssignment ? "font-semibold" : "text-muted-foreground"
                                  )}
                                  style={isUserAssignment ? { color: '#959D90' } : {}}
                                >
                                  {formatMinisterName(assignment.ministerName) || 'VACANTE'}
                                  {isUserAssignment && " (Você)"}
                                </span>
                              </div>
                            );
                          })}
                        {assignments.length > 4 && (
                          <div className="text-xs text-muted-foreground italic">
                            +{assignments.length - 4} ministros...
                            {userAssignment && !assignments.slice(0, 4).some(a => a.ministerId === currentMinister?.id) && (
                              <span className="font-semibold" style={{ color: '#959D90' }}> (incluindo você)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma escala encontrada para esta data.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição de escala com drag and drop */}
      <ScheduleEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        date={editDialogDate}
        time={editDialogTime}
        initialMinisters={editDialogMinisters}
        onSave={async () => {
          // Recarregar dados após salvar
          await fetchSchedules();
          if (selectedDate) {
            await fetchScheduleForDate(selectedDate);
          }
          setIsEditDialogOpen(false);
          // Voltar para a tela de seleção de horários
          setIsTimeSelectionDialogOpen(true);
        }}
      />

      {/* Dialog de seleção de formato de exportação */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Escala</DialogTitle>
            <DialogDescription>
              Escolha o formato de exportação para a escala de {format(currentMonth, 'MMMM/yyyy', { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isCoordinator ? (
              <div className="space-y-3">
                <Label>Selecione o formato:</Label>
                <div className="grid gap-2">
                  <Button
                    variant={exportFormat === 'excel' ? 'default' : 'outline'}
                    className={cn(
                      "justify-start transition-all duration-200",
                      exportFormat === 'excel' && "ring-2 ring-amber-400 shadow-lg scale-[1.02] bg-amber-50 text-amber-900 hover:bg-amber-100"
                    )}
                    onClick={() => setExportFormat('excel')}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </Button>
                  <Button
                    variant={exportFormat === 'html' ? 'default' : 'outline'}
                    className={cn(
                      "justify-start transition-all duration-200",
                      exportFormat === 'html' && "ring-2 ring-amber-400 shadow-lg scale-[1.02] bg-amber-50 text-amber-900 hover:bg-amber-100"
                    )}
                    onClick={() => setExportFormat('html')}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    HTML (Página Web)
                  </Button>
                  <Button
                    variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                    className={cn(
                      "justify-start transition-all duration-200",
                      exportFormat === 'pdf' && "ring-2 ring-amber-400 shadow-lg scale-[1.02] bg-amber-50 text-amber-900 hover:bg-amber-100"
                    )}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF (Impressão)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Como ministro, você pode exportar apenas em formato PDF
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExportSchedule} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
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
