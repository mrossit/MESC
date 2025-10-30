import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Calendar,
  Download,
  Save,
  ArrowLeft,
  ArrowRight,
  X,
  Check,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { getMassTimesForDate, LITURGICAL_POSITIONS, getPositionDisplayName } from '@shared/constants';
import * as XLSX from 'xlsx';

interface Minister {
  id: string;
  name: string;
}

interface Assignment {
  id?: string;
  scheduleId: string;
  ministerId: string;
  ministerName: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
}

interface Schedule {
  id: string;
  title: string;
  month: number;
  year: number;
  status: 'draft' | 'published' | 'completed';
}

interface MassSlot {
  date: string;
  dateObj: Date;
  massTime: string;
  dayName: string;
  assignments: Assignment[];
}

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-Feira',
  2: 'Terça-Feira',
  3: 'Quarta-Feira',
  4: 'Quinta-Feira',
  5: 'Sexta-Feira',
  6: 'Sábado',
};

export default function CompactScheduleEditor() {
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [massSlots, setMassSlots] = useState<MassSlot[]>([]);
  const [allMinisters, setAllMinisters] = useState<Minister[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dialog para editar posição
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<MassSlot | null>(null);
  const [editingPosition, setEditingPosition] = useState<number>(0);
  const [selectedMinisterId, setSelectedMinisterId] = useState('');
  const [ministerSearch, setMinisterSearch] = useState('');

  const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar escala
      const scheduleRes = await fetch(
        `/api/schedules?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`,
        { credentials: 'include' }
      );

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        if (scheduleData.schedules.length > 0) {
          const currentSchedule = scheduleData.schedules[0];
          setSchedule(currentSchedule);

          // Buscar assignments
          const assignmentsRes = await fetch(
            `/api/schedules/${currentSchedule.id}/assignments`,
            { credentials: 'include' }
          );

          if (assignmentsRes.ok) {
            const assignmentsData = await assignmentsRes.json();
            buildMassSlots(currentSchedule, assignmentsData.assignments || []);
          }
        } else {
          setSchedule(null);
          setMassSlots([]);
        }
      }

      // Buscar ministros
      const ministersRes = await fetch('/api/ministers', { credentials: 'include' });
      if (ministersRes.ok) {
        const ministersData = await ministersRes.json();
        setAllMinisters(ministersData.ministers || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const buildMassSlots = (sched: Schedule, assignments: Assignment[]) => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });

    const slots: MassSlot[] = [];

    allDays.forEach(day => {
      const massTimes = getMassTimesForDate(day);
      if (massTimes.length > 0) {
        massTimes.forEach(massTime => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayOfWeek = getDay(day);
          const dayName = WEEKDAY_NAMES[dayOfWeek];

          const slotAssignments = assignments.filter(
            a => a.date === dateStr && a.massTime === massTime
          );

          slots.push({
            date: dateStr,
            dateObj: day,
            massTime: massTime,
            dayName,
            assignments: slotAssignments,
          });
        });
      }
    });

    setMassSlots(slots);
  };

  const openEditDialog = (slot: MassSlot, position: number) => {
    setEditingSlot(slot);
    setEditingPosition(position);

    const existing = slot.assignments.find(a => a.position === position);
    setSelectedMinisterId(existing?.ministerId || '');
    setMinisterSearch('');
    setEditDialogOpen(true);
  };

  const saveAssignment = async () => {
    if (!schedule || !editingSlot) return;

    try {
      setSaving(true);

      const existing = editingSlot.assignments.find(a => a.position === editingPosition);

      if (selectedMinisterId === '') {
        // Remover assignment
        if (existing?.id) {
          await fetch(`/api/schedules/assignments/${existing.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        }
      } else {
        // Adicionar ou atualizar
        const minister = allMinisters.find(m => m.id === selectedMinisterId);
        if (!minister) return;

        if (existing?.id) {
          // Atualizar
          await fetch(`/api/schedules/assignments/${existing.id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ministerId: selectedMinisterId,
              position: editingPosition,
            }),
          });
        } else {
          // Criar novo
          await fetch('/api/schedules/assignments', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scheduleId: schedule.id,
              ministerId: selectedMinisterId,
              date: editingSlot.date,
              massTime: editingSlot.massTime,
              position: editingPosition,
              confirmed: false,
            }),
          });
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Escalação salva com sucesso',
      });

      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar escalação',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = () => {
    if (!schedule) return;

    try {
      setExporting(true);

      const data: any[][] = [];

      // Título
      data.push([`SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized.toUpperCase()}`]);
      data.push([]);

      // Header com números das posições
      data.push(['', '', '', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']);

      // Header com nomes das posições
      const positionNames = Object.values(LITURGICAL_POSITIONS).slice(0, 15);
      data.push(['Data', 'Dia', 'Hora', ...positionNames]);

      // Dados
      massSlots.forEach(slot => {
        const day = slot.dateObj.getDate();
        const time = slot.massTime.substring(0, 5);

        const row = [day.toString(), slot.dayName, time];

        for (let pos = 0; pos < 15; pos++) {
          const assignment = slot.assignments.find(a => a.position === pos);
          row.push(assignment?.ministerName || '');
        }

        data.push(row);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Larguras das colunas
      ws['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 8 },
        ...Array(15).fill({ wch: 18 })
      ];

      // Merge do título
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } });

      XLSX.utils.book_append_sheet(wb, ws, 'Escala');
      XLSX.writeFile(wb, `Escala_${monthNameCapitalized.replace('/', '_')}.xlsx`);

      toast({
        title: 'Sucesso',
        description: 'Planilha exportada com sucesso',
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao exportar planilha',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const filteredMinisters = allMinisters.filter(m =>
    m.name.toLowerCase().includes(ministerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <Layout title="Editor de Escalas">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!schedule) {
    return (
      <Layout title="Editor de Escalas">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma escala encontrada</CardTitle>
            <CardDescription>
              Crie uma nova escala para {monthNameCapitalized} na página principal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/schedules')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Escalas
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Editor de Escalas" subtitle={monthNameCapitalized}>
      <div className="space-y-4">
        {/* Header com ações */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">{monthNameCapitalized}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Status: <Badge>{schedule.status === 'draft' ? 'Rascunho' : schedule.status === 'published' ? 'Publicada' : 'Concluída'}</Badge>
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={exportToExcel}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Exportar
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/schedules')}
                >
                  Voltar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabela de escalas */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Data</TableHead>
                      <TableHead className="w-32">Dia</TableHead>
                      <TableHead className="w-16">Hora</TableHead>
                      {Object.values(LITURGICAL_POSITIONS).slice(0, 15).map((pos, idx) => (
                        <TableHead key={idx} className="text-center text-xs">
                          {pos}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {massSlots.map((slot, slotIdx) => (
                      <TableRow key={slotIdx}>
                        <TableCell className="font-medium">
                          {slot.dateObj.getDate()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {slot.dayName}
                        </TableCell>
                        <TableCell className="text-xs">
                          {slot.massTime.substring(0, 5)}
                        </TableCell>
                        {Array.from({ length: 15 }).map((_, posIdx) => {
                          const assignment = slot.assignments.find(a => a.position === posIdx);
                          return (
                            <TableCell
                              key={posIdx}
                              className="text-xs cursor-pointer hover:bg-accent p-1"
                              onClick={() => openEditDialog(slot, posIdx)}
                            >
                              {assignment ? (
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate">{assignment.ministerName}</span>
                                  {assignment.confirmed && (
                                    <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar {getPositionDisplayName(editingPosition + 1)}
            </DialogTitle>
            <DialogDescription>
              {editingSlot && `${format(editingSlot.dateObj, 'dd/MM/yyyy')} - ${editingSlot.massTime.substring(0, 5)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                placeholder="Buscar ministro..."
                value={ministerSearch}
                onChange={(e) => setMinisterSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-1">
                <Button
                  variant={selectedMinisterId === '' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedMinisterId('')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover escalação
                </Button>

                {filteredMinisters.map(minister => (
                  <Button
                    key={minister.id}
                    variant={selectedMinisterId === minister.id ? 'default' : 'outline'}
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedMinisterId(minister.id)}
                  >
                    {minister.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAssignment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
