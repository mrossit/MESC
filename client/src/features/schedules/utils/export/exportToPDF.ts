import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduleAssignment } from '../../types';
import { getMassTypeAndColor, getMassTypeLegend } from '../../constants/massTypes';
import { normalizeMassTime } from '../formatters';
import { POSITION_GROUPS, TOTAL_POSITIONS, getLogoBase64 } from './shared';
import { getMassTimesForDate } from '@shared/constants';

export async function exportToPDF(
  currentMonth: Date,
  assignments: ScheduleAssignment[]
): Promise<void> {
  const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const logoBase64 = await getLogoBase64();

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start, end });

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
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : ''}
        <h1>SANTUÁRIO SÃO JUDAS TADEU - ${monthNameCapitalized.toUpperCase()}</h1>
      </div>
      <div class="legend">
        ${getMassTypeLegend().map(mt => `
          <div class="legend-item">
            <div class="legend-color" style="background: ${mt.color};"></div>${mt.type}
          </div>
        `).join('')}
      </div>
      <table>
        <thead>
          <tr class="header-row">
            <th class="date-col" rowspan="2">Data</th>
            <th class="day-col" rowspan="2">Dia</th>
            <th class="time-col" rowspan="2">Hora</th>
            ${POSITION_GROUPS.map(group =>
              `<th colspan="${group.positions.length}">${group.name}</th>`
            ).join('')}
          </tr>
          <tr class="header-row">
            ${POSITION_GROUPS.map(group =>
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

        const massInfo = getMassTypeAndColor(day, normalizedMassTime);

        html += `<tr style="background-color: ${massInfo.color}; color: ${massInfo.textColor};">`;
        html += `<td>${dayNumber}</td><td>${dayName}</td><td>${time}</td>`;

        for (let posKey = 1; posKey <= TOTAL_POSITIONS; posKey++) {
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

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
