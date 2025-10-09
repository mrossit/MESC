import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Download, FileSpreadsheet, Loader2, Calendar as CalendarIcon, Users, CheckSquare, Square } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { LITURGICAL_POSITIONS, getMassTimesForDate } from '@shared/constants';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

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

interface SelectiveScheduleExportProps {
  scheduleId: string;
  month: number;
  year: number;
  assignments: ScheduleAssignment[];
  className?: string;
}

interface MassIdentifier {
  date: string;
  time: string;
  dateObj: Date;
  dayOfWeek: number;
  label: string;
}

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

type ExportFormat = 'excel-horizontal' | 'excel-vertical' | 'csv';

export function SelectiveScheduleExport({
  scheduleId,
  month,
  year,
  assignments,
  className
}: SelectiveScheduleExportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel-horizontal');
  const [exporting, setExporting] = useState(false);
  const [currentTab, setCurrentTab] = useState('select');

  const currentDate = new Date(year, month - 1, 1);
  const monthName = format(currentDate, 'MMMM/yyyy', { locale: ptBR });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Função auxiliar para descrição de missas (deve vir antes do useMemo)
  const getMassDescription = useCallback((date: Date, time: string): string => {
    const dayOfWeek = getDay(date);
    const day = date.getDate();

    if (dayOfWeek === 4 && day <= 7 && time === '19:30:00') return 'Cura e Libertação';
    if (dayOfWeek === 5 && day <= 7 && time === '19:00:00') return 'Sagrado Coração';
    if (dayOfWeek === 6 && day <= 7) {
      if (time === '06:30:00') return 'Imaculado Coração';
      if (time === '16:00:00') return 'Preciosas do Pai';
    }
    if (month === 10 && [2, 3, 4].includes(dayOfWeek) && time === '16:00:00') {
      return 'Novena N.Sra.';
    }
    return '';
  }, [month]);

  // Obter todas as missas do mês
  const allMasses = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start, end });

    const masses: MassIdentifier[] = [];

    allDays.forEach(day => {
      const massTimes = getMassTimesForDate(day);
      if (massTimes.length > 0) {
        massTimes.forEach(massTime => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayOfWeek = getDay(day);
          const massDescription = getMassDescription(day, massTime);

          masses.push({
            date: dateStr,
            time: massTime,
            dateObj: day,
            dayOfWeek,
            label: `${format(day, 'd/MM')} (${WEEKDAY_NAMES[dayOfWeek]}) - ${massTime.substring(0, 5)}${massDescription ? ' - ' + massDescription : ''}`
          });
        });
      }
    });

    return masses;
  }, [currentDate, getMassDescription]);

  // State para missas selecionadas - inicializa vazio e preenche com useEffect
  const [selectedMasses, setSelectedMasses] = useState<Set<string>>(new Set());

  // Inicializar missas selecionadas quando allMasses mudar
  useEffect(() => {
    setSelectedMasses(new Set(allMasses.map(m => `${m.date}|${m.time}`)));
  }, [allMasses]);

  const toggleMass = (massKey: string) => {
    const newSelected = new Set(selectedMasses);
    if (newSelected.has(massKey)) {
      newSelected.delete(massKey);
    } else {
      newSelected.add(massKey);
    }
    setSelectedMasses(newSelected);
  };

  const selectAll = () => {
    setSelectedMasses(new Set(allMasses.map(m => `${m.date}|${m.time}`)));
  };

  const selectNone = () => {
    setSelectedMasses(new Set());
  };

  const selectByDay = (dayOfWeek: number) => {
    const newSelected = new Set(selectedMasses);
    allMasses.forEach(mass => {
      const key = `${mass.date}|${mass.time}`;
      if (mass.dayOfWeek === dayOfWeek) {
        newSelected.add(key);
      }
    });
    setSelectedMasses(newSelected);
  };

  // Filtrar assignments pelas missas selecionadas
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => selectedMasses.has(`${a.date}|${a.massTime}`));
  }, [assignments, selectedMasses]);

  const stats = useMemo(() => {
    const uniqueMinisters = new Set(filteredAssignments.map(a => a.ministerId)).size;
    const confirmedCount = filteredAssignments.filter(a => a.confirmed).length;
    const confirmationRate = filteredAssignments.length > 0
      ? Math.round((confirmedCount / filteredAssignments.length) * 100)
      : 0;

    return {
      totalMasses: selectedMasses.size,
      uniqueMinisters,
      totalAssignments: filteredAssignments.length,
      confirmedCount,
      confirmationRate
    };
  }, [filteredAssignments, selectedMasses]);

  const exportExcelHorizontal = () => {
    const data: any[][] = [];

    data.push([`SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized}`]);
    data.push([]);
    data.push(['', '', '', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']);
    data.push([
      'Data', 'Dia', 'Hora',
      'Aux 1', 'Aux 2', 'Rec 1', 'Rec 2',
      'Velas 1', 'Velas 2', 'Ador 1', 'Ador 2',
      'Pur 1', 'Pur 2', 'Pur 3', 'Pur 4',
      'Mez 1', 'Mez 2', 'Mez 3'
    ]);

    // Ordenar masses selecionadas por data
    const selectedMassesList = allMasses.filter(m => selectedMasses.has(`${m.date}|${m.time}`));

    selectedMassesList.forEach(mass => {
      const dayNumber = mass.dateObj.getDate();
      const dayName = WEEKDAY_NAMES[mass.dayOfWeek];
      const massDescription = getMassDescription(mass.dateObj, mass.time);
      const fullDayLabel = massDescription ? `${dayName} - ${massDescription}` : dayName;
      const timeFormatted = mass.time.substring(0, 5);

      const ministersForThisMass = filteredAssignments
        .filter(a => a.date === mass.date && a.massTime === mass.time)
        .sort((a, b) => a.position - b.position);

      const ministersByPosition: Record<number, string> = {};
      ministersForThisMass.forEach(assignment => {
        ministersByPosition[assignment.position + 1] = assignment.ministerName;
      });

      const mainRow = [dayNumber.toString(), fullDayLabel, timeFormatted];
      for (let pos = 1; pos <= 15; pos++) {
        mainRow.push(ministersByPosition[pos] || '');
      }
      data.push(mainRow);

      const hasExtraPositions = Object.keys(ministersByPosition).some(pos => parseInt(pos) > 15);
      if (hasExtraPositions) {
        data.push(['', '', '', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28']);
        const extraRow = ['', '', ''];
        for (let pos = 16; pos <= 28; pos++) {
          extraRow.push(ministersByPosition[pos] || '');
        }
        data.push(extraRow);
        data.push([]);
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 6 }, { wch: 40 }, { wch: 8 },
      ...Array(28).fill({ wch: 18 })
    ];

    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } });

    XLSX.utils.book_append_sheet(wb, ws, 'Missas');
    const filename = `Escala_${monthNameCapitalized.replace('/', '_')}_Selecionadas.xlsx`;
    XLSX.writeFile(wb, filename);

    return filename;
  };

  const exportExcelVertical = () => {
    const data: any[][] = [];

    data.push([`ESCALA DE MISSAS - ${monthNameCapitalized.toUpperCase()}`]);
    data.push([]);

    const selectedMassesList = allMasses.filter(m => selectedMasses.has(`${m.date}|${m.time}`));

    selectedMassesList.forEach(mass => {
      const dayFormatted = format(mass.dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
      const massDescription = getMassDescription(mass.dateObj, mass.time);
      const timeFormatted = mass.time.substring(0, 5);

      data.push([]);
      data.push([`${dayFormatted} - ${timeFormatted}${massDescription ? ' - ' + massDescription : ''}`]);
      data.push(['Posição', 'Ministro', 'Status']);

      const ministersForThisMass = filteredAssignments
        .filter(a => a.date === mass.date && a.massTime === mass.time)
        .sort((a, b) => a.position - b.position);

      if (ministersForThisMass.length > 0) {
        ministersForThisMass.forEach(assignment => {
          const posName = LITURGICAL_POSITIONS[assignment.position + 1] || `Posição ${assignment.position + 1}`;
          const status = assignment.confirmed ? '✓ Confirmado' : 'Pendente';
          data.push([posName, assignment.ministerName, status]);
        });
      } else {
        data.push(['—', 'Nenhum ministro escalado', '—']);
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Escalas');
    const filename = `Escala_${monthNameCapitalized.replace('/', '_')}_Vertical.xlsx`;
    XLSX.writeFile(wb, filename);

    return filename;
  };

  const exportCSV = () => {
    let csv = `"ESCALA DE MISSAS - ${monthNameCapitalized.toUpperCase()}"\n\n`;
    csv += '"Data","Dia","Horário","Posição","Ministro","Status"\n';

    const selectedMassesList = allMasses.filter(m => selectedMasses.has(`${m.date}|${m.time}`));

    selectedMassesList.forEach(mass => {
      const dateFormatted = format(mass.dateObj, 'dd/MM/yyyy');
      const dayFormatted = format(mass.dateObj, 'EEEE', { locale: ptBR });
      const timeFormatted = mass.time.substring(0, 5);

      const ministersForThisMass = filteredAssignments
        .filter(a => a.date === mass.date && a.massTime === mass.time)
        .sort((a, b) => a.position - b.position);

      if (ministersForThisMass.length > 0) {
        ministersForThisMass.forEach(assignment => {
          const posName = LITURGICAL_POSITIONS[assignment.position + 1] || `Posição ${assignment.position + 1}`;
          const status = assignment.confirmed ? 'Confirmado' : 'Pendente';
          csv += `"${dateFormatted}","${dayFormatted}","${timeFormatted}","${posName}","${assignment.ministerName}","${status}"\n`;
        });
      } else {
        csv += `"${dateFormatted}","${dayFormatted}","${timeFormatted}","—","Sem escalação","—"\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Escala_${monthNameCapitalized.replace('/', '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return `Escala_${monthNameCapitalized.replace('/', '_')}.csv`;
  };

  const handleExport = () => {
    if (selectedMasses.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma missa selecionada',
        description: 'Selecione pelo menos uma missa para exportar.',
      });
      return;
    }

    setExporting(true);

    try {
      let filename = '';

      switch (exportFormat) {
        case 'excel-horizontal':
          filename = exportExcelHorizontal();
          break;
        case 'excel-vertical':
          filename = exportExcelVertical();
          break;
        case 'csv':
          filename = exportCSV();
          break;
      }

      toast({
        title: 'Exportação concluída!',
        description: `Arquivo ${filename} foi baixado com sucesso.`,
      });

      // Pequeno delay antes de fechar o dialog para evitar problemas com viewport mobile
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 100);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo. Tente novamente.',
      });
    } finally {
      setExporting(false);
    }
  };

  // Agrupar missas por dia da semana
  const massesByDayOfWeek = useMemo(() => {
    const grouped: Record<number, MassIdentifier[]> = {};
    allMasses.forEach(mass => {
      if (!grouped[mass.dayOfWeek]) {
        grouped[mass.dayOfWeek] = [];
      }
      grouped[mass.dayOfWeek].push(mass);
    });
    return grouped;
  }, [allMasses]);

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        variant="default"
        className={className}
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar Escalas
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={false}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Exportar Escalas Selecionadas
            </DialogTitle>
            <DialogDescription>
              {monthNameCapitalized} - {stats.totalMasses} missas selecionadas
            </DialogDescription>
          </DialogHeader>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="select">
                <CheckSquare className="h-4 w-4 mr-2" />
                Selecionar Missas
              </TabsTrigger>
              <TabsTrigger value="format">Formato</TabsTrigger>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-4">
              {/* Ações rápidas */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Selecionar Todas
                </Button>
                <Button size="sm" variant="outline" onClick={selectNone}>
                  Desmarcar Todas
                </Button>
                <div className="border-l mx-2" />
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <Button
                    key={day}
                    size="sm"
                    variant="ghost"
                    onClick={() => selectByDay(day)}
                  >
                    {WEEKDAY_NAMES[day]}s
                  </Button>
                ))}
              </div>

              {/* Lista de missas */}
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-2">
                  {Object.entries(massesByDayOfWeek).map(([dayOfWeek, masses]) => (
                    <div key={dayOfWeek} className="space-y-2">
                      <div className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-1">
                        {WEEKDAY_NAMES[parseInt(dayOfWeek)]}
                      </div>
                      {masses.map(mass => {
                        const massKey = `${mass.date}|${mass.time}`;
                        const isSelected = selectedMasses.has(massKey);
                        const assignmentCount = assignments.filter(
                          a => a.date === mass.date && a.massTime === mass.time
                        ).length;

                        return (
                          <div
                            key={massKey}
                            className={cn(
                              "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors",
                              isSelected ? "bg-primary/10 border-primary" : "hover:bg-accent"
                            )}
                            onClick={() => toggleMass(massKey)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMass(massKey)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{mass.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {assignmentCount} ministro{assignmentCount !== 1 ? 's' : ''} escalado{assignmentCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="default">Selecionada</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="format" className="space-y-4">
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="excel-horizontal" id="excel-horizontal" />
                  <Label htmlFor="excel-horizontal" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Excel - Formato Horizontal (Tradicional)</div>
                      <div className="text-sm text-muted-foreground">
                        Modelo antigo com datas em linhas e posições em colunas. Ideal para impressão.
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2">Recomendado</Badge>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="excel-vertical" id="excel-vertical" />
                  <Label htmlFor="excel-vertical" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Excel - Formato Vertical (Moderno)</div>
                      <div className="text-sm text-muted-foreground">
                        Lista detalhada por missa com status de confirmação.
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">CSV - Valores Separados por Vírgula</div>
                      <div className="text-sm text-muted-foreground">
                        Formato universal compatível com qualquer planilha.
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Missas Selecionadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalMasses}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      de {allMasses.length} missas totais
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Ministros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueMinisters}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.totalAssignments} escalações
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Taxa de Confirmação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{stats.confirmationRate}%</div>
                      <div className="flex-1">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${stats.confirmationRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.confirmedCount} de {stats.totalAssignments} confirmados
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <div className="flex items-center gap-2 flex-1">
              <Badge variant="outline">
                {selectedMasses.size} missa{selectedMasses.size !== 1 ? 's' : ''} selecionada{selectedMasses.size !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exporting || selectedMasses.size === 0}>
              {exporting ? (
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
    </>
  );
}
