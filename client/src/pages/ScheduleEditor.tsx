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
  RefreshCw, Download, Eye, X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LITURGICAL_POSITIONS, MASS_TIMES_BY_DAY, WEEKDAY_NAMES, getMassTimesForDate } from '@shared/constants';
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
  const [showOnlyVacant, setShowOnlyVacant] = useState(false);
  const [ministerSearch, setMinisterSearch] = useState('');
  const [filterByPreferredPosition, setFilterByPreferredPosition] = useState(false);

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

      // Buscar TODOS os ministros (ativos e inativos) para permitir edição completa
      const ministersResponse = await fetch('/api/ministers', { credentials: 'include' });
      if (ministersResponse.ok) {
        const ministersData = await ministersResponse.json();
        // Ordenar por nome
        const sortedMinisters = ministersData.sort((a: Minister, b: Minister) =>
          a.user.name.localeCompare(b.user.name)
        );
        setMinisters(sortedMinisters);
        console.log(`📋 Carregados ${sortedMinisters.length} ministros (ativos + inativos)`);
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
                  <CardDescription className="flex items-center gap-2 flex-wrap">
                    <Badge variant={schedule.status === 'published' ? 'default' : 'secondary'}>
                      {schedule.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </Badge>
                    <span>•</span>
                    <span>{assignments.length} escalações</span>
                    {assignments.filter(a => a.ministerName === 'VACANT').length > 0 && (
                      <>
                        <span>•</span>
                        <Badge variant="destructive" className="animate-pulse">
                          {assignments.filter(a => a.ministerName === 'VACANT').length} vagas
                        </Badge>
                      </>
                    )}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={showOnlyVacant ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyVacant(!showOnlyVacant)}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {showOnlyVacant ? 'Mostrar Todos' : 'Apenas Vagas'}
                </Button>
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
                      const massTimes = getMassTimesForDate(day);

                      // Não renderizar dias sem missas
                      if (massTimes.length === 0) return null;

                      return massTimes.map((time, timeIndex) => {
                        const timeAssignments = getAssignmentsForDateAndTime(day, time);

                        // Filtrar por VACANT se ativado
                        if (showOnlyVacant && !timeAssignments.some(a => a.ministerName === 'VACANT')) {
                          return null;
                        }

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
                                    variant={a.ministerName === 'VACANT' ? 'destructive' : 'outline'}
                                    className={cn(
                                      "cursor-pointer hover:bg-accent transition-all",
                                      a.ministerName === 'VACANT' && "animate-pulse bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                                    )}
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName === 'VACANT' ? '⚠️ VAGA' : a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {recolher.map(a => (
                                  <Badge
                                    key={a.id}
                                    variant={a.ministerName === 'VACANT' ? 'destructive' : 'outline'}
                                    className={cn(
                                      "cursor-pointer hover:bg-accent transition-all",
                                      a.ministerName === 'VACANT' && "animate-pulse bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                                    )}
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName === 'VACANT' ? '⚠️ VAGA' : a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {velas.map(a => (
                                  <Badge
                                    key={a.id}
                                    variant={a.ministerName === 'VACANT' ? 'destructive' : 'outline'}
                                    className={cn(
                                      "cursor-pointer hover:bg-accent transition-all",
                                      a.ministerName === 'VACANT' && "animate-pulse bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                                    )}
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName === 'VACANT' ? '⚠️ VAGA' : a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {adoracao.map(a => (
                                  <Badge
                                    key={a.id}
                                    variant={a.ministerName === 'VACANT' ? 'destructive' : 'outline'}
                                    className={cn(
                                      "cursor-pointer hover:bg-accent transition-all",
                                      a.ministerName === 'VACANT' && "animate-pulse bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                                    )}
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName === 'VACANT' ? '⚠️ VAGA' : a.ministerName}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {purificar.map(a => (
                                  <Badge
                                    key={a.id}
                                    variant={a.ministerName === 'VACANT' ? 'destructive' : 'outline'}
                                    className={cn(
                                      "cursor-pointer hover:bg-accent transition-all",
                                      a.ministerName === 'VACANT' && "animate-pulse bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                                    )}
                                    onClick={() => {
                                      setEditingAssignment(a);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    {a.ministerName === 'VACANT' ? '⚠️ VAGA' : a.ministerName}
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
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            // Limpar estados ao fechar
            setMinisterSearch('');
            setFilterByPreferredPosition(false);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAssignment?.ministerName === 'VACANT' ? '⚠️ Preencher Vaga' : 'Editar Escalação'}
              </DialogTitle>
              <DialogDescription>
                {editingAssignment && (
                  <div className="mt-2 space-y-1">
                    <p>📅 Data: {format(new Date(editingAssignment.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                    <p>⏰ Horário: {editingAssignment.massTime}</p>
                    <p>📍 Posição: {LITURGICAL_POSITIONS[editingAssignment.position]}</p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            {editingAssignment && (
              <div className="space-y-4">
                {editingAssignment.ministerName === 'VACANT' && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-100">Vaga Disponível</p>
                        <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                          Selecione um ministro da lista completa. Use a busca para filtrar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                        <X className="h-4 w-4" />
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
                    value={editingAssignment.ministerId}
                    onValueChange={(value) => {
                      setEditingAssignment({...editingAssignment, ministerId: value});
                      setMinisterSearch(''); // Limpar busca ao selecionar
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ministro" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {(() => {
                        // Filtrar ministros
                        let filteredMinisters = ministers;

                        // Filtro por busca
                        if (ministerSearch.trim()) {
                          filteredMinisters = filteredMinisters.filter(m =>
                            m.user.name.toLowerCase().includes(ministerSearch.toLowerCase())
                          );
                        }

                        // Filtro por posição preferida
                        if (filterByPreferredPosition && editingAssignment.position) {
                          filteredMinisters = filteredMinisters.filter(m =>
                            m.preferredPosition === editingAssignment.position
                          );
                        }

                        // Ordenar: ativos primeiro, depois por nome
                        const sortedFiltered = filteredMinisters.sort((a, b) => {
                          if (a.active && !b.active) return -1;
                          if (!a.active && b.active) return 1;
                          return a.user.name.localeCompare(b.user.name);
                        });

                        if (sortedFiltered.length === 0) {
                          return (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Nenhum ministro encontrado
                            </div>
                          );
                        }

                        return sortedFiltered.map(minister => (
                          <SelectItem key={minister.id} value={minister.id}>
                            <div className="flex items-center gap-2 w-full">
                              <span className={cn(!minister.active && "text-muted-foreground")}>
                                {minister.user.name}
                              </span>
                              <div className="flex items-center gap-1 ml-auto">
                                {!minister.active && (
                                  <Badge variant="outline" className="text-xs bg-slate-100">
                                    Inativo
                                  </Badge>
                                )}
                                {minister.preferredPosition && (
                                  <Badge
                                    variant={minister.preferredPosition === editingAssignment.position ? "default" : "outline"}
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