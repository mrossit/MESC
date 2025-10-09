import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduleAssignment } from '../../types';
import { getMassTypeAndColor, getMassTypeLegend } from '../../constants/massTypes';
import { normalizeMassTime } from '../formatters';
import { POSITION_GROUPS, TOTAL_POSITIONS, getLogoBase64 } from './shared';
import { getMassTimesForDate } from '@shared/constants';

export async function exportToHTML(
  currentMonth: Date,
  assignments: ScheduleAssignment[]
): Promise<void> {
  const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const logoBase64 = await getLogoBase64();

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start, end });

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
            <th rowspan="2">Data</th>
            <th rowspan="2">Dia</th>
            <th rowspan="2">Hora</th>
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
}
