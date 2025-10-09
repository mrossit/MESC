/**
 * Main export orchestrator
 */

import { ExportFormat, ScheduleAssignment } from '../../types';
import { exportToExcel } from './exportToExcel';
import { exportToHTML } from './exportToHTML';
import { exportToPDF } from './exportToPDF';

export async function exportSchedule(
  format: ExportFormat,
  currentMonth: Date,
  assignments: ScheduleAssignment[]
): Promise<void> {
  if (assignments.length === 0) {
    throw new Error('A escala não possui ministros escalados ainda');
  }

  switch (format) {
    case 'excel':
      await exportToExcel(currentMonth, assignments);
      break;
    case 'html':
      await exportToHTML(currentMonth, assignments);
      break;
    case 'pdf':
      await exportToPDF(currentMonth, assignments);
      break;
    default:
      throw new Error(`Formato de exportação não suportado: ${format}`);
  }
}

export * from './exportToExcel';
export * from './exportToHTML';
export * from './exportToPDF';
