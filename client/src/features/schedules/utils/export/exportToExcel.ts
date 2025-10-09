import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduleAssignment } from '../../types';
import { getMassTypeAndColor } from '../../constants/massTypes';
import { normalizeMassTime } from '../formatters';
import { POSITION_GROUPS, TOTAL_POSITIONS } from './shared';
import { getMassTimesForDate } from '@shared/constants';

export async function exportToExcel(
  currentMonth: Date,
  assignments: ScheduleAssignment[]
): Promise<void> {
  const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start, end });

  const data: any[][] = [];

  // Título
  data.push([`SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized.toUpperCase()}`]);
  data.push([]);

  // Header linha 1: Grupos de posições
  const headerRow1 = ['Data', 'Dia', 'Hora'];
  POSITION_GROUPS.forEach(group => {
    headerRow1.push(group.name);
    for (let i = 1; i < group.positions.length; i++) {
      headerRow1.push('');
    }
  });
  data.push(headerRow1);

  // Header linha 2: Números das posições
  const headerRow2 = ['', '', ''];
  POSITION_GROUPS.forEach(group => {
    group.positions.forEach(pos => {
      headerRow2.push(pos.toString());
    });
  });
  data.push(headerRow2);

  // Dados e informações de cores
  const rowColors: Array<{ row: number; color: string; textColor: string }> = [];
  let currentDataRow = 4;

  allDays.forEach(day => {
    const massTimes = getMassTimesForDate(day);
    if (massTimes.length > 0) {
      massTimes.forEach(massTime => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayName = format(day, 'EEEE', { locale: ptBR });
        const dayNumber = day.getDate();
        const time = massTime.substring(0, 5);
        const normalizedMassTime = normalizeMassTime(massTime);

        const massInfo = getMassTypeAndColor(day, normalizedMassTime);
        rowColors.push({ row: currentDataRow, color: massInfo.color, textColor: massInfo.textColor });

        const row = [dayNumber.toString(), dayName, time];

        for (let posKey = 1; posKey <= TOTAL_POSITIONS; posKey++) {
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

  // Larguras das colunas
  ws['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 8 },
    ...Array(TOTAL_POSITIONS).fill({ wch: 18 })
  ];

  // Merge do título
  const lastCol = 3 + TOTAL_POSITIONS - 1;
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } });

  // Merge das colunas Data, Dia e Hora
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } });
  ws['!merges'].push({ s: { r: 2, c: 1 }, e: { r: 3, c: 1 } });
  ws['!merges'].push({ s: { r: 2, c: 2 }, e: { r: 3, c: 2 } });

  // Merge dos grupos de posições
  let currentCol = 3;
  POSITION_GROUPS.forEach(group => {
    if (group.positions.length > 1) {
      ws['!merges']!.push({
        s: { r: 2, c: currentCol },
        e: { r: 2, c: currentCol + group.positions.length - 1 }
      });
    }
    currentCol += group.positions.length;
  });

  // Aplicar estilos nos headers
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

  // Aplicar cores nas linhas de dados
  rowColors.forEach(({ row, color, textColor }) => {
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      if (!ws[cellAddress].s) ws[cellAddress].s = {};

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
}
