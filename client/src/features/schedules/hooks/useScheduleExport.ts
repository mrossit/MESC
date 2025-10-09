import { useState } from 'react';
import { ExportFormat, ScheduleAssignment } from '../types';
import { exportSchedule } from '../utils/export';
import { toast } from '@/hooks/use-toast';

export function useScheduleExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');

  const handleExport = async (
    format: ExportFormat,
    currentMonth: Date,
    assignments: ScheduleAssignment[]
  ) => {
    try {
      setIsExporting(true);

      await exportSchedule(format, currentMonth, assignments);

      const formatLabels = {
        excel: 'Planilha Excel exportada com sucesso',
        html: 'Arquivo HTML exportado com sucesso',
        pdf: 'Janela de impressão aberta. Salve como PDF'
      };

      toast({
        title: 'Sucesso',
        description: formatLabels[format]
      });
    } catch (error: any) {
      console.error('Error exporting:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao exportar',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportFormat,
    setExportFormat,
    handleExport
  };
}
