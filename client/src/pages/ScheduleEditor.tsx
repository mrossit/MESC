import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Calendar, Save, Edit, Trash2, Plus, Users, Clock,
  CheckCircle, AlertCircle, ArrowLeft, ArrowRight,
  RefreshCw, Download, Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LITURGICAL_POSITIONS, MASS_TIMES_BY_DAY, WEEKDAY_NAMES } from '@shared/constants';
import { clearEditCache } from '@/lib/cacheManager';

interface ScheduleAssignment {
  id: string;
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
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
}

interface Minister {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  preferredPosition?: number;
  active: boolean;
}

export default function ScheduleEditor() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [loading, setLoading] = useState(true);

  // Função para obter dados da escala
  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      
      // Buscar escala do mês atual
      const scheduleResponse = await fetch(
        `/api/schedules?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`,
        { credentials: 'include' }
      );
      
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        if (scheduleData.schedules.length > 0) {
          setSchedule(scheduleData.schedules[0]);
          setAssignments(scheduleData.assignments || []);
        }
      }

      // Buscar ministros
      const ministersResponse = await fetch('/api/ministers', { credentials: 'include' });
      if (ministersResponse.ok) {
        const ministersData = await ministersResponse.json();
        setMinisters(ministersData);
      }

    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar dados da escala'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [currentMonth]);

  // Limpar cache ao desmontar o componente (quando sair da edição)
  useEffect(() => {
    return () => {
      console.log('[ScheduleEditor] Limpando cache ao sair da edição');
      clearEditCache();
    };
  }, []);

  // Avisar quando estiver editando escala publicada
  useEffect(() => {
    if (schedule && schedule.status === "published") {
      toast({
        title: "Atenção",
        description: "Você está editando uma escala publicada. As alterações serão visíveis para todos os ministros.",
        variant: "default"
      });
    }
  }, [schedule]);

  // Função para obter dias do mês
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  // Função para obter escalações de uma data específica
  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter(a => isSameDay(new Date(a.date), date));
  };

  // Função para obter escalações de um horário específico
  const getAssignmentsForDateAndTime = (date: Date, time: string) => {
    return assignments.filter(a => 
      isSameDay(new Date(a.date), date) && a.massTime === time
    );
  };

  // Função para navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Função para salvar alteração na escalação
  const handleSaveAssignment = async () => {
    if (!editingAssignment) return;

    try {
      const response = await fetch(`/api/schedule-assignments/${editingAssignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ministerId: editingAssignment.ministerId,
          position: editingAssignment.position
        })
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Escalação atualizada com sucesso'
        });
        await fetchScheduleData();
        setIsEditDialogOpen(false);
        setEditingAssignment(null);
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar escalação'
      });
    }
  };

  // Função para remover escalação
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Tem certeza que deseja remover esta escalação?')) return;

    try {
      const response = await fetch(`/api/schedule-assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Escalação removida com sucesso'
        });
        await fetchScheduleData();
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao remover escalação'
      });
    }
  };

  if (loading) {
    return (
      <Layout title="Editor de Escalas" subtitle="Carregando dados da escala...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!schedule) {
    return (
      <Layout title="Editor de Escalas" subtitle="Nenhuma escala encontrada para este mês">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma escala encontrada</h3>
              <p className="text-muted-foreground">
                Crie uma nova escala para {format(currentMonth, 'MMMM yyyy', { locale: ptBR })} primeiro.
              </p>
              <Button 
                className="mt-4"
                onClick={() => window.location.href = "/schedules"}
              >
                Voltar para Escalas
              </Button>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Editor de Escalas" 
      subtitle={`Editar escalas de ${format(currentMonth, 'MMMM yyyy', { locale: ptBR })}`}
    >
      <div className="space-y-6">
        {/* Cabeçalho com navegação e controles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>{schedule.title}</CardTitle>
                  <CardDescription>
                    <Badge variant={schedule.status === 'published' ? 'default' : 'secondary'}>
                      {schedule.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </Badge>
                    {` • ${assignments.length} escalações`}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="table">Tabela</TabsTrigger>
                    <TabsTrigger value="calendar">Calendário</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Visualização em Tabela */}
        {viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Data</TableHead>
                      <TableHead className="min-w-[120px]">Dia</TableHead>
                      <TableHead className="min-w-[80px]">Hora</TableHead>
                      <TableHead className="min-w-[200px]">Auxiliares</TableHead>
                      <TableHead className="min-w-[200px]">Recolher</TableHead>
                      <TableHead className="min-w-[200px]">Velas</TableHead>
                      <TableHead className="min-w-[200px]">Adoração</TableHead>
                      <TableHead className="min-w-[200px]">Purificar/Expor</TableHead>
                      <TableHead className="min-w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getDaysInMonth().map(day => {
                      const dayOfWeek = getDay(day);
                      const massTimes = MASS_TIMES_BY_DAY[dayOfWeek];
                      
                      return massTimes.map((time, timeIndex) => {
                        const timeAssignments = getAssignmentsForDateAndTime(day, time);
                        
                        // Agrupar por posições
                        const auxiliares = timeAssignments.filter(a => a.position <= 2);
                        const recolher = timeAssignments.filter(a => a.position >= 3 && a.position <= 4);
                        const velas = timeAssignments.filter(a => a.position >= 5 && a.position <= 6);
                        const adoracao = timeAssignments.filter(a => a.position >= 7 && a.position <= 9);
                        const purificar = timeAssignments.filter(a => a.position >= 10 && a.position <= 11);
                        
                        return (
                          <TableRow key={`${format(day, 'yyyy-MM-dd')}-${time}`}>
                            {timeIndex === 0 && (
                              <>
                                <TableCell rowSpan={massTimes.length} className="font-medium">
                                  {format(day, 'dd')}
                                </TableCell>
                                <TableCell rowSpan={massTimes.length}>
                                  {format(day, 'EEEE', { locale: ptBR })}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="font-medium">{time}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {auxiliares.map(a => (
                                  <Badge 
                                    key={a.id} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {recolher.map(a => (
                                  <Badge 
                                    key={a.id} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {velas.map(a => (
                                  <Badge 
                                    key={a.id} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {adoracao.map(a => (
                                  <Badge 
                                    key={a.id} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {purificar.map(a => (
                                  <Badge 
                                    key={a.id} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(day);
                                  // Implementar adição de nova escalação
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visualização em Calendário */}
        {viewMode === 'calendar' && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-muted-foreground">
                Visualização em calendário em desenvolvimento...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog para editar escalação */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Escalação</DialogTitle>
              <DialogDescription>
                Altere o ministro ou posição desta escalação
              </DialogDescription>
            </DialogHeader>
            
            {editingAssignment && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Ministro</label>
                  <Select 
                    value={editingAssignment.ministerId} 
                    onValueChange={(value) => 
                      setEditingAssignment({...editingAssignment, ministerId: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ministers.map(minister => (
                        <SelectItem key={minister.id} value={minister.id}>
                          {minister.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Posição Litúrgica</label>
                  <Select 
                    value={editingAssignment.position.toString()} 
                    onValueChange={(value) => 
                      setEditingAssignment({...editingAssignment, position: parseInt(value)})
                    }
                  >
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
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => editingAssignment && handleRemoveAssignment(editingAssignment.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAssignment}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}