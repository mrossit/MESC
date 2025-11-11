import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { GenerationData, GenerationResponse, GeneratedSchedule } from '@/types/schedule';

export function useScheduleGeneration() {
  const [generatedData, setGeneratedData] = useState<GenerationData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async ({ month, year, preview }: { month: number; year: number; preview: boolean }) => {
      if (preview) {
        const response = await apiRequest('GET', `/api/schedules/preview/${year}/${month}`);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/schedules/generate', {
          year,
          month,
          saveToDatabase: false,
          replaceExisting: true
        });
        return response.json();
      }
    },
    onSuccess: (data: GenerationResponse) => {
      setGeneratedData(data.data);
      setHasUnsavedChanges(true);
      toast({
        title: "Escala gerada com sucesso!",
        description: `${data.data.totalSchedules} horários de missa organizados automaticamente.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar escala",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (schedules: GeneratedSchedule[]) => {
      if (!schedules || schedules.length === 0) {
        throw new Error('Nenhuma escala para salvar');
      }

      const schedulesToSave = schedules.flatMap(schedule =>
        schedule.ministers.map((minister, idx) => ({
          date: schedule.date,
          time: schedule.time,
          type: 'missa',
          ministerId: minister.id,
          position: minister.position !== undefined ? minister.position : (idx + 1),
          notes: `Gerado automaticamente - ${schedule.qualityScore}`
        }))
      );

      const response = await apiRequest('POST', '/api/schedules/save-generated', {
        schedules: schedulesToSave,
        replaceExisting: true
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setHasUnsavedChanges(false);
      // Invalidar todos os caches de schedules (hierárquicos e não-hierárquicos)
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'], exact: false });

      if (data.data?.failedCount > 0) {
        const errorSummary = data.data.errorSummary;
        let errorMessage = `${data.data.savedCount} salvas, ${data.data.failedCount} falharam.`;

        if (errorSummary?.uniqueErrors?.length > 0) {
          errorMessage += `\n\nErros encontrados:\n${errorSummary.uniqueErrors.join('\n')}`;
        }

        toast({
          title: "Erro ao salvar escalas",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Escalas salvas!",
          description: `${data.data?.savedCount || 0} escalas foram salvas no sistema com sucesso.`
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar escalas",
        description: error.message || "Erro desconhecido ao salvar no banco de dados.",
        variant: "destructive"
      });
    }
  });

  return {
    generatedData,
    setGeneratedData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    generateMutation,
    saveMutation
  };
}
