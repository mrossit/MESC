import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Calendar,
  Save,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';
import {
  DraggableScheduleEditor,
  ScheduleAssignment,
  Minister,
  MassTimeSlot,
} from '../components/DraggableScheduleEditor';
import { SelectiveScheduleExport } from '../components/SelectiveScheduleExport';
import { getMassTimesForDate } from '@shared/constants';

interface Schedule {
  id: string;
  title: string;
  month: number;
  year: number;
  status: 'draft' | 'published' | 'completed';
}

export default function ScheduleEditorDnD() {
  const [, setLocation] = useLocation();

  // Obter parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date');
  const timeParam = urlParams.get('time');

  const [currentMonth, setCurrentMonth] = useState(
    dateParam ? new Date(dateParam) : new Date()
  );
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [allMinisters, setAllMinisters] = useState<Minister[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    dateParam ? new Date(dateParam) : null
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(timeParam);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Dialog para adicionar ministro
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MassTimeSlot | null>(null);
  const [selectedMinisterId, setSelectedMinisterId] = useState('');
  const [ministerSearch, setMinisterSearch] = useState('');

  // Carregar dados
  useEffect(() => {
    fetchScheduleData();
  }, [currentMonth]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);

      // Buscar escala do mês
      const scheduleResponse = await fetch(
        `/api/schedules?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`,
        { credentials: 'include' }
      );

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        if (scheduleData.schedules.length > 0) {
          setSchedule(scheduleData.schedules[0]);

          // Converter assignments para formato compatível
          const formattedAssignments: ScheduleAssignment[] = scheduleData.assignments.map(
            (a: any) => ({
              id: a.id,
              scheduleId: a.scheduleId,
              ministerId: a.ministerId,
              ministerName: a.ministerName || a.user?.name || 'Ministro',
              ministerEmail: a.user?.email,
              ministerPhoto: a.user?.photoUrl,
              date: a.date,
              massTime: a.massTime || a.time,
              position: a.position || 0,
              confirmed: a.confirmed || false,
            })
          );
          setAssignments(formattedAssignments);
        }
      }

      // Buscar ministros
      const ministersResponse = await fetch('/api/users/active', { credentials: 'include' });
      if (ministersResponse.ok) {
        const ministersData = await ministersResponse.json();
        const formattedMinisters: Minister[] = ministersData
          .filter((u: any) => u.role === 'ministro' && u.status === 'active')
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            photoUrl: u.photoUrl,
            preferredPosition: u.preferredPosition,
          }))
          .sort((a: Minister, b: Minister) => a.name.localeCompare(b.name));

        setAllMinisters(formattedMinisters);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar dados da escala',
      });
    } finally {
      setLoading(false);
    }
  };

  // Navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
    setHasUnsavedChanges(false);
  };

  // Obter todos os dias do mês que tem missa (domingos)
  const getSundaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });

    return allDays.filter((day) => getDay(day) === 0); // 0 = domingo
  };

  // Gerar slots para o editor drag & drop
  const generateSlots = (): MassTimeSlot[] => {
    // Se temos data e horário específicos, filtrar apenas esse slot
    if (selectedDate && selectedTime) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const massTimesForDay = getMassTimesForDate(selectedDate);
      const massTime = massTimesForDay.find(mt => mt.time === selectedTime);

      if (massTime) {
        const slotAssignments = assignments.filter(
          (a) => a.date === dateStr && a.massTime === selectedTime
        );

        return [{
          time: massTime.time,
          date: dateStr,
          assignments: slotAssignments,
          maxMinisters: massTime.minMinisters || 15,
        }];
      }
      return [];
    }

    // Caso contrário, mostrar todos os domingos do mês
    const sundays = getSundaysInMonth();
    const slots: MassTimeSlot[] = [];

    sundays.forEach((sunday) => {
      const massTimesForDay = getMassTimesForDate(sunday);

      massTimesForDay.forEach((massTime) => {
        const dateStr = format(sunday, 'yyyy-MM-dd');
        const slotAssignments = assignments.filter(
          (a) => a.date === dateStr && a.massTime === massTime.time
        );

        slots.push({
          time: massTime.time,
          date: dateStr,
          assignments: slotAssignments,
          maxMinisters: massTime.minMinisters || 15,
        });
      });
    });

    return slots;
  };

  const slots = generateSlots();

  // Salvar alterações
  const handleSave = async () => {
    if (!schedule) return;

    setSaving(true);
    try {
      // Salvar cada assignment modificado
      const savePromises = assignments.map(async (assignment) => {
        const response = await fetch(`/api/schedules/${schedule.id}/assignments/${assignment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ministerId: assignment.ministerId,
            position: assignment.position,
            massTime: assignment.massTime,
            date: assignment.date,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update assignment ${assignment.id}`);
        }
      });

      await Promise.all(savePromises);

      toast({
        title: 'Sucesso!',
        description: 'Todas as alterações foram salvas',
      });

      setHasUnsavedChanges(false);
      await fetchScheduleData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar alterações. Algumas mudanças podem não ter sido salvas.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Atualizar assignments após drag & drop
  const handleAssignmentsChange = (newAssignments: ScheduleAssignment[]) => {
    setAssignments(newAssignments);
    setHasUnsavedChanges(true);
  };

  // Remover assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Tem certeza que deseja remover este ministro da escala?')) return;

    try {
      const response = await fetch(`/api/schedule-assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        setHasUnsavedChanges(true);
        toast({
          title: 'Sucesso',
          description: 'Ministro removido da escala',
        });
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao remover ministro',
      });
    }
  };

  // Abrir dialog para adicionar ministro
  const handleAddMinister = (slot: MassTimeSlot) => {
    setSelectedSlot(slot);
    setIsAddDialogOpen(true);
    setSelectedMinisterId('');
    setMinisterSearch('');
  };

  // Confirmar adição de ministro
  const handleConfirmAddMinister = async () => {
    if (!selectedSlot || !selectedMinisterId || !schedule) return;

    const minister = allMinisters.find((m) => m.id === selectedMinisterId);
    if (!minister) return;

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ministerId: minister.id,
          date: selectedSlot.date,
          massTime: selectedSlot.time,
          position: selectedSlot.assignments.length,
        }),
      });

      if (response.ok) {
        const newAssignment = await response.json();

        const formattedAssignment: ScheduleAssignment = {
          id: newAssignment.id,
          scheduleId: schedule.id,
          ministerId: minister.id,
          ministerName: minister.name,
          ministerEmail: minister.email,
          ministerPhoto: minister.photoUrl,
          date: selectedSlot.date,
          massTime: selectedSlot.time,
          position: selectedSlot.assignments.length,
          confirmed: false,
        };

        setAssignments((prev) => [...prev, formattedAssignment]);
        setHasUnsavedChanges(true);

        toast({
          title: 'Sucesso!',
          description: `${minister.name} adicionado à escala`,
        });

        setIsAddDialogOpen(false);
        setSelectedSlot(null);
      }
    } catch (error) {
      console.error('Error adding minister:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao adicionar ministro',
      });
    }
  };

  // Filtrar ministros disponíveis (não escalados nesse horário)
  const availableMinisters = selectedSlot
    ? allMinisters.filter(
        (m) => !selectedSlot.assignments.some((a) => a.ministerId === m.id)
      )
    : [];

  const filteredMinisters = ministerSearch
    ? availableMinisters.filter((m) =>
        m.name.toLowerCase().includes(ministerSearch.toLowerCase())
      )
    : availableMinisters;

  if (loading) {
    return (
      <Layout title="Editor de Escalas (Drag & Drop)" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!schedule) {
    return (
      <Layout title="Editor de Escalas (Drag & Drop)" subtitle="Nenhuma escala encontrada">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma escala encontrada</h3>
              <p className="text-muted-foreground">
                Crie uma escala para{' '}
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })} primeiro.
              </p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const handleBackToSelector = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setLocation('/schedule-editor-dnd');
  };

  const handleSelectMassTime = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    // Atualizar URL
    const dateStr = format(date, 'yyyy-MM-dd');
    setLocation(`/schedule-editor-dnd?date=${dateStr}&time=${time}`);
  };

  // Agrupar slots por data para a visão de seleção
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, MassTimeSlot[]>);

  return (
    <Layout
      title="Editor de Escalas (Drag & Drop)"
      subtitle={
        selectedDate && selectedTime
          ? `Editando: ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })} às ${selectedTime.substring(0, 5)}`
          : 'Arraste ministros para reorganizar as escalas'
      }
    >
      {/* Botão Voltar quando em modo de edição específica */}
      {selectedDate && selectedTime && (
        <Button
          onClick={handleBackToSelector}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Visão Geral
        </Button>
      )}

      {/* Header com navegação */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!selectedDate && !selectedTime && (
                <>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={schedule.status === 'published' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {schedule.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </Badge>
                      {hasUnsavedChanges && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Alterações não salvas
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              {selectedDate && selectedTime && (
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedTime.substring(0, 5)}
                    </Badge>
                    <Badge
                      variant={schedule.status === 'published' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {schedule.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </Badge>
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Alterações não salvas
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {schedule && !selectedDate && !selectedTime && (
                <SelectiveScheduleExport
                  scheduleId={schedule.id}
                  month={currentMonth.getMonth() + 1}
                  year={currentMonth.getFullYear()}
                  assignments={assignments}
                />
              )}
              <Button variant="outline" onClick={fetchScheduleData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Tudo
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dica de uso */}
      {!selectedDate && !selectedTime && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Selecione uma data para editar:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em uma das datas abaixo para editar os ministros daquele horário de missa.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDate && selectedTime && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Como usar o editor drag & drop:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Arraste ministros para reordenar dentro do mesmo horário</li>
                  <li>• Arraste entre colunas para mover ministros entre horários diferentes</li>
                  <li>• Clique no ✕ para remover um ministro da escala</li>
                  <li>• Use "Adicionar ministro" para incluir novos ministros</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seletor de Data/Horário - Visão Geral */}
      {!selectedDate && !selectedTime && slots.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(slotsByDate)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([dateStr, dateSlots]) => {
              const date = new Date(dateStr);
              const hasMultipleMasses = dateSlots.length > 1;

              return (
                <Card key={dateStr} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(date, "EEEE", { locale: ptBR })}
                    </CardTitle>
                    <CardDescription className="text-lg font-semibold">
                      {format(date, "d 'de' MMMM", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dateSlots.map((slot) => {
                      const assignmentCount = slot.assignments.length;
                      const maxMinisters = slot.maxMinisters || 15;
                      const isFull = assignmentCount >= maxMinisters;
                      const isEmpty = assignmentCount === 0;

                      return (
                        <Button
                          key={slot.time}
                          variant="outline"
                          className="w-full justify-between h-auto py-3"
                          onClick={() => handleSelectMassTime(date, slot.time)}
                        >
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">{slot.time.substring(0, 5)}</span>
                            <span className="text-xs text-muted-foreground">
                              {assignmentCount} / {maxMinisters} ministros
                            </span>
                          </div>
                          <Badge
                            variant={isEmpty ? "destructive" : isFull ? "default" : "secondary"}
                          >
                            {isEmpty ? "Vazia" : isFull ? "Completa" : "Parcial"}
                          </Badge>
                        </Button>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Editor drag & drop - Quando data/horário selecionado */}
      {selectedDate && selectedTime && slots.length > 0 && (
        <DraggableScheduleEditor
          slots={slots}
          onAssignmentsChange={handleAssignmentsChange}
          onRemoveAssignment={handleRemoveAssignment}
          onAddMinister={handleAddMinister}
        />
      )}

      {/* Mensagem quando não há slots */}
      {!selectedDate && !selectedTime && slots.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum domingo encontrado neste mês ou escala vazia.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para adicionar ministro */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Ministro</DialogTitle>
            <DialogDescription>
              {selectedSlot &&
                `Selecione um ministro para ${format(
                  new Date(selectedSlot.date),
                  "d 'de' MMMM",
                  { locale: ptBR }
                )} às ${selectedSlot.time}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minister-search">Buscar ministro</Label>
              <Input
                id="minister-search"
                placeholder="Digite o nome..."
                value={ministerSearch}
                onChange={(e) => setMinisterSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minister-select">Ministro</Label>
              <Select value={selectedMinisterId} onValueChange={setSelectedMinisterId}>
                <SelectTrigger id="minister-select">
                  <SelectValue placeholder="Selecione um ministro" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMinisters.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum ministro disponível
                    </div>
                  ) : (
                    filteredMinisters.map((minister) => (
                      <SelectItem key={minister.id} value={minister.id}>
                        {minister.name}
                        {minister.preferredPosition !== undefined && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Pref: {minister.preferredPosition + 1})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAddMinister} disabled={!selectedMinisterId}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
