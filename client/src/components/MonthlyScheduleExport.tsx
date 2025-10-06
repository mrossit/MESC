import React, { useState } from 'react';
import { Button } from './ui/button';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
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

interface MonthlyScheduleExportProps {
  scheduleId: string;
  month: number;
  year: number;
  assignments: ScheduleAssignment[];
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

// Grupos de posições para organizar a exportação
const POSITION_GROUPS = [
  { start: 1, end: 15, label: 'Posições 1-15' },
  { start: 16, end: 28, label: 'Posições 16-28' },
];

export function MonthlyScheduleExport({
  scheduleId,
  month,
  year,
  assignments
}: MonthlyScheduleExportProps) {
  const [exporting, setExporting] = useState(false);

  const getMassDescription = (date: Date, time: string): string => {
    const dayOfWeek = getDay(date);
    const day = date.getDate();

    // Casos especiais
    if (dayOfWeek === 4 && day <= 7) {
      // Primeira quinta-feira
      if (time === '19:30:00') {
        return 'Missa por cura e libertação';
      }
    }

    if (dayOfWeek === 5 && day <= 7) {
      // Primeira sexta-feira
      if (time === '19:00:00') {
        return 'Missa ao Sagrado Coração de Jesus';
      }
    }

    if (dayOfWeek === 6 && day <= 7) {
      // Primeiro sábado
      if (time === '06:30:00') {
        return 'Missa ao Imaculado Coração de Maria';
      }
      if (time === '16:00:00') {
        return 'Missa das Preciosas do Pai';
      }
    }

    // Durante outubro (mês das novenas)
    if (month === 10) {
      if ([2, 3, 4].includes(dayOfWeek) && time === '16:00:00') {
        return 'Novena de Nossa Senhora Aparecida';
      }
    }

    return '';
  };

  const generateExcel = () => {
    setExporting(true);

    try {
      const currentDate = new Date(year, month - 1, 1);
      const monthName = format(currentDate, 'MMMM/yyyy', { locale: ptBR });
      const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      // Obter todas as datas do mês que têm missas
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const allDays = eachDayOfInterval({ start, end });

      // Filtrar apenas dias que têm missas
      const daysWithMasses = allDays.filter(day => {
        const massTimes = getMassTimesForDate(day);
        return massTimes.length > 0;
      });

      // Preparar dados para o Excel
      const data: any[][] = [];

      // Linha 1: Título
      data.push([`SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized}`]);

      // Linha 2: Números das posições 1-15
      data.push(['', '', '', ...POSITION_GROUPS[0].label.match(/\d+/g)!.map(n => parseInt(n)).filter((_, i) => i < 15).map(n => n.toString())]);

      // Linha 3: Cabeçalhos
      const headers = ['Data', 'Dia', 'Hora'];
      for (let i = 1; i <= 15; i++) {
        const posName = LITURGICAL_POSITIONS[i] || `Posição ${i}`;
        // Simplificar nome para caber melhor
        if (i <= 2) headers.push('Auxiliares');
        else if (i <= 4) headers.push('Recolher');
        else if (i <= 6) headers.push('Velas');
        else if (i <= 8) headers.push('Adoração');
        else if (i <= 12) headers.push('Purificar/Expor');
        else headers.push('Recolher/Mezanino/Web');
      }
      data.push(headers);

      // Processar cada dia com missa
      daysWithMasses.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayNumber = day.getDate();
        const dayOfWeek = getDay(day);
        const dayName = WEEKDAY_NAMES[dayOfWeek];

        const massTimes = getMassTimesForDate(day);

        massTimes.forEach((massTimeInfo, massIndex) => {
          const massTime = massTimeInfo.time;
          const massDescription = getMassDescription(day, massTime);
          const fullDayLabel = massDescription
            ? `${dayName} - ${massDescription}`
            : dayName;

          const timeFormatted = massTime.substring(0, 5); // HH:MM

          // Buscar ministros para esta data/horário
          const ministersForThisMass = assignments.filter(
            a => a.date === dateStr && a.massTime === massTime
          ).sort((a, b) => a.position - b.position);

          // Criar mapa de ministros por posição
          const ministersByPosition: Record<number, string> = {};
          ministersForThisMass.forEach(assignment => {
            ministersByPosition[assignment.position + 1] = assignment.ministerName;
          });

          // Linha principal: Posições 1-15
          const mainRow = [
            dayNumber.toString(),
            fullDayLabel,
            timeFormatted
          ];

          for (let pos = 1; pos <= 15; pos++) {
            mainRow.push(ministersByPosition[pos] || '');
          }

          data.push(mainRow);

          // Se há ministros nas posições 16-28, adicionar linhas extras
          const hasExtraPositions = Object.keys(ministersByPosition).some(
            pos => parseInt(pos) > 15
          );

          if (hasExtraPositions) {
            // Linha com números das posições 16-28
            const posNumbers = ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28'];
            data.push(posNumbers);

            // Linha com nomes dos ministros
            const extraRow = [];
            for (let pos = 16; pos <= 28; pos++) {
              extraRow.push(ministersByPosition[pos] || '');
            }
            data.push(extraRow);
          }
        });
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Ajustar larguras das colunas
      const colWidths = [
        { wch: 6 },  // Data
        { wch: 35 }, // Dia
        { wch: 8 },  // Hora
        ...Array(15).fill({ wch: 18 }) // Posições
      ];
      ws['!cols'] = colWidths;

      // Mesclar células do título
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: 17 }
      });

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Missas');

      // Gerar arquivo
      const filename = `Escala_${monthNameCapitalized.replace('/', '_')}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Exportação concluída!',
        description: `Arquivo ${filename} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo Excel. Tente novamente.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={generateExcel}
      disabled={exporting}
      variant="outline"
      className="gap-2"
    >
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Mês Completo
        </>
      )}
    </Button>
  );
}
