import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Download, FileSpreadsheet, FileText, Eye, Loader2, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { LITURGICAL_POSITIONS, getMassTimesForDate } from '@shared/constants';
import * as XLSX from 'xlsx';

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

interface EnhancedScheduleExportProps {
  scheduleId: string;
  month: number;
  year: number;
  assignments: ScheduleAssignment[];
  className?: string;
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

type ExportFormat = 'excel-horizontal' | 'excel-vertical' | 'pdf' | 'csv';

export function EnhancedScheduleExport({
  scheduleId,
  month,
  year,
  assignments,
  className
}: EnhancedScheduleExportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel-horizontal');
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState('summary');

  const currentDate = new Date(year, month - 1, 1);
  const monthName = format(currentDate, 'MMMM/yyyy', { locale: ptBR });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Calcular estatísticas
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const allDays = eachDayOfInterval({ start, end });
  const daysWithMasses = allDays.filter(day => getMassTimesForDate(day).length > 0);

  const totalMasses = daysWithMasses.reduce((sum, day) => {
    return sum + getMassTimesForDate(day).length;
  }, 0);

  const uniqueMinisters = new Set(assignments.map(a => a.ministerId)).size;
  const confirmedCount = assignments.filter(a => a.confirmed).length;
  const confirmationRate = assignments.length > 0
    ? Math.round((confirmedCount / assignments.length) * 100)
    : 0;

  const getMassDescription = (date: Date, time: string): string => {
    const dayOfWeek = getDay(date);
    const day = date.getDate();

    if (dayOfWeek === 4 && day <= 7 && time === '19:30:00') return 'Missa por cura e libertação';
    if (dayOfWeek === 5 && day <= 7 && time === '19:00:00') return 'Missa ao Sagrado Coração de Jesus';
    if (dayOfWeek === 6 && day <= 7) {
      if (time === '06:30:00') return 'Missa ao Imaculado Coração de Maria';
      if (time === '16:00:00') return 'Missa das Preciosas do Pai';
    }
    if (month === 10 && [2, 3, 4].includes(dayOfWeek) && time === '16:00:00') {
      return 'Novena de Nossa Senhora Aparecida';
    }
    return '';
  };

  const exportExcelHorizontal = () => {
    const data: any[][] = [];

    // Linha 1: Título
    data.push([`SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized}`]);
    data.push([]); // Linha vazia

    // Linha 2: Números das posições 1-15
    data.push(['', '', '', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']);

    // Linha 3: Cabeçalhos das categorias
    data.push([
      'Data',
      'Dia',
      'Hora',
      'Aux 1', 'Aux 2',
      'Rec 1', 'Rec 2',
      'Velas 1', 'Velas 2',
      'Ador 1', 'Ador 2',
      'Pur 1', 'Pur 2', 'Pur 3', 'Pur 4',
      'Mez 1', 'Mez 2', 'Mez 3'
    ]);

    // Processar cada dia com missa
    daysWithMasses.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayNumber = day.getDate();
      const dayOfWeek = getDay(day);
      const dayName = WEEKDAY_NAMES[dayOfWeek];
      const massTimes = getMassTimesForDate(day);

      massTimes.forEach(massTimeInfo => {
        const massTime = massTimeInfo.time;
        const massDescription = getMassDescription(day, massTime);
        const fullDayLabel = massDescription ? `${dayName} - ${massDescription}` : dayName;
        const timeFormatted = massTime.substring(0, 5);

        const ministersForThisMass = assignments
          .filter(a => a.date === dateStr && a.massTime === massTime)
          .sort((a, b) => a.position - b.position);

        const ministersByPosition: Record<number, string> = {};
        ministersForThisMass.forEach(assignment => {
          ministersByPosition[assignment.position + 1] = assignment.ministerName;
        });

        // Linha principal (posições 1-15)
        const mainRow = [dayNumber.toString(), fullDayLabel, timeFormatted];
        for (let pos = 1; pos <= 15; pos++) {
          mainRow.push(ministersByPosition[pos] || '');
        }
        data.push(mainRow);

        // Se há posições 16-28
        const hasExtraPositions = Object.keys(ministersByPosition).some(pos => parseInt(pos) > 15);
        if (hasExtraPositions) {
          data.push(['', '', '', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28']);
          const extraRow = ['', '', ''];
          for (let pos = 16; pos <= 28; pos++) {
            extraRow.push(ministersByPosition[pos] || '');
          }
          data.push(extraRow);
          data.push([]); // Linha vazia
        }
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Larguras das colunas
    ws['!cols'] = [
      { wch: 6 },  // Data
      { wch: 40 }, // Dia
      { wch: 8 },  // Hora
      ...Array(28).fill({ wch: 18 }) // Posições
    ];

    // Mesclar título
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } });

    XLSX.utils.book_append_sheet(wb, ws, 'Missas');
    const filename = `Escala_${monthNameCapitalized.replace('/', '_')}_Horizontal.xlsx`;
    XLSX.writeFile(wb, filename);

    return filename;
  };

  const exportExcelVertical = () => {
    const data: any[][] = [];

    // Título
    data.push([`ESCALA DE MISSAS - ${monthNameCapitalized.toUpperCase()}`]);
    data.push([]);

    daysWithMasses.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayNumber = day.getDate();
      const dayFormatted = format(day, "EEEE, d 'de' MMMM", { locale: ptBR });
      const massTimes = getMassTimesForDate(day);

      massTimes.forEach(massTimeInfo => {
        const massTime = massTimeInfo.time;
        const massDescription = getMassDescription(day, massTime);
        const timeFormatted = massTime.substring(0, 5);

        // Cabeçalho da missa
        data.push([]);
        data.push([`${dayFormatted} - ${timeFormatted}${massDescription ? ' - ' + massDescription : ''}`]);
        data.push(['Posição', 'Ministro', 'Status']);

        const ministersForThisMass = assignments
          .filter(a => a.date === dateStr && a.massTime === massTime)
          .sort((a, b) => a.position - b.position);

        ministersForThisMass.forEach(assignment => {
          const posName = LITURGICAL_POSITIONS[assignment.position + 1] || `Posição ${assignment.position + 1}`;
          const status = assignment.confirmed ? '✓ Confirmado' : 'Pendente';
          data.push([posName, assignment.ministerName, status]);
        });

        // Se não há ministros
        if (ministersForThisMass.length === 0) {
          data.push(['—', 'Nenhum ministro escalado', '—']);
        }
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 25 }, // Posição
      { wch: 30 }, // Ministro
      { wch: 15 }  // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Escalas');
    const filename = `Escala_${monthNameCapitalized.replace('/', '_')}_Vertical.xlsx`;
    XLSX.writeFile(wb, filename);

    return filename;
  };

  const exportCSV = () => {
    let csv = `"ESCALA DE MISSAS - ${monthNameCapitalized.toUpperCase()}"\n\n`;
    csv += '"Data","Dia da Semana","Horário","Posição","Ministro","Status"\n';

    daysWithMasses.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dateFormatted = format(day, 'dd/MM/yyyy');
      const dayFormatted = format(day, 'EEEE', { locale: ptBR });
      const massTimes = getMassTimesForDate(day);

      massTimes.forEach(massTimeInfo => {
        const massTime = massTimeInfo.time;
        const timeFormatted = massTime.substring(0, 5);

        const ministersForThisMass = assignments
          .filter(a => a.date === dateStr && a.massTime === massTime)
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
        case 'pdf':
          toast({
            title: 'Em desenvolvimento',
            description: 'Exportação para PDF estará disponível em breve.',
          });
          setExporting(false);
          return;
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

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        variant="default"
        className={className}
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar Escala do Mês
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Exportar Escala do Mês
            </DialogTitle>
            <DialogDescription>
              {monthNameCapitalized} - {uniqueMinisters} ministros - {totalMasses} missas
            </DialogDescription>
          </DialogHeader>

          <Tabs value={previewTab} onValueChange={setPreviewTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="format">Formato</TabsTrigger>
              <TabsTrigger value="preview">Prévia</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Missas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalMasses}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {daysWithMasses.length} dias com celebrações
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
                    <div className="text-2xl font-bold">{uniqueMinisters}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {assignments.length} escalações no total
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Taxa de Confirmação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{confirmationRate}%</div>
                      <div className="flex-1">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${confirmationRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {confirmedCount} de {assignments.length} confirmados
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="format" className="space-y-4">
              <div className="space-y-4">
                <Label>Escolha o formato de exportação:</Label>

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
                          Lista detalhada por missa com status de confirmação. Melhor para análise.
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
                          Formato universal compatível com qualquer planilha e banco de dados.
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer opacity-60">
                    <RadioGroupItem value="pdf" id="pdf" disabled />
                    <Label htmlFor="pdf" className="flex-1 cursor-not-allowed">
                      <div>
                        <div className="font-medium">PDF - Documento Portátil</div>
                        <div className="text-sm text-muted-foreground">
                          Formato ideal para compartilhamento. Em breve.
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">Em breve</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Prévia da Exportação</CardTitle>
                  <CardDescription>
                    Esta é uma prévia de como seus dados serão exportados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg text-xs font-mono">
                    <div className="font-bold mb-2">SANTUÁRIO SÃO JUDAS TADEU - {monthNameCapitalized}</div>
                    <div className="mt-2 text-muted-foreground">
                      {exportFormat === 'excel-horizontal' && (
                        <>
                          Data | Dia | Hora | Aux 1 | Aux 2 | Rec 1 | ...<br />
                          ═══════════════════════════════════════════════<br />
                          {daysWithMasses.slice(0, 3).map(day => {
                            const massTimes = getMassTimesForDate(day);
                            return massTimes.slice(0, 1).map(mt => (
                              <div key={`${day}-${mt.time}`}>
                                {day.getDate()} | {WEEKDAY_NAMES[getDay(day)]} | {mt.time.substring(0, 5)} | ...
                              </div>
                            ));
                          })}
                          ...
                        </>
                      )}
                      {exportFormat === 'excel-vertical' && (
                        <>
                          {daysWithMasses.slice(0, 2).map(day => {
                            const massTimes = getMassTimesForDate(day);
                            const dateFormatted = format(day, "EEEE, d 'de' MMMM", { locale: ptBR });
                            return massTimes.slice(0, 1).map(mt => (
                              <div key={`${day}-${mt.time}`} className="mb-2">
                                <strong>{dateFormatted} - {mt.time.substring(0, 5)}</strong><br />
                                Posição | Ministro | Status<br />
                                ════════════════════<br />
                                Auxiliar 1 | [Nome] | Confirmado<br />
                                ...<br /><br />
                              </div>
                            ));
                          })}
                        </>
                      )}
                      {exportFormat === 'csv' && (
                        <>
                          "Data","Dia","Horário","Posição","Ministro","Status"<br />
                          {daysWithMasses.slice(0, 3).map(day => {
                            const dateFormatted = format(day, 'dd/MM/yyyy');
                            const dayName = format(day, 'EEEE', { locale: ptBR });
                            const massTimes = getMassTimesForDate(day);
                            return massTimes.slice(0, 1).map(mt => (
                              <div key={`${day}-${mt.time}`}>
                                "{dateFormatted}","{dayName}","{mt.time.substring(0, 5)}","...","...","..."
                              </div>
                            ));
                          })}
                          ...
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
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
