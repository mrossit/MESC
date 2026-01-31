import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { GenerationData, GenerationResponse, GeneratedSchedule } from '@/types/schedule';

export type GenerationStatus = 'draft' | 'published' | null;

interface ExistingGenerationData {
  generationId: string;
  generationStatus: 'draft' | 'published';
  month: number;
  year: number;
  createdAt: string;
  publishedAt: string | null;
  originalSchedule: unknown;
  finalSchedule: unknown;
  differences: unknown;
  generationMetrics: unknown;
  totalSchedules: number;
  schedules: GeneratedSchedule[];
  currentSchedulesCount: number;
}

interface ExistingGenerationResponse {
  success: boolean;
  data: ExistingGenerationData | null;
  message?: string;
}

interface PublishResponse {
  success: boolean;
  message: string;
  data: {
    generationId: string;
    generationStatus: 'published';
    publishedAt: string;
    differences: {
      summary: {
        totalChanges: number;
        ministersAdded: number;
        ministersRemoved: number;
        ministersReplaced: number;
        positionsChanged: number;
      };
      changes: unknown[];
    };
    schedulesPublished: number;
  };
}

export function useScheduleGeneration() {
  const [generatedData, setGeneratedData] = useState<GenerationData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to load existing generation
  const existingGenerationQuery = useQuery({
    queryKey: ['/api/schedules/generation', selectedPeriod?.year, selectedPeriod?.month],
    queryFn: async () => {
      if (!selectedPeriod) return null;
      const response = await apiRequest('GET', `/api/schedules/generation/${selectedPeriod.year}/${selectedPeriod.month}`);
      return response.json() as Promise<ExistingGenerationResponse>;
    },
    enabled: !!selectedPeriod,
    staleTime: 30000, // 30 seconds
  });

  // Load existing generation when period changes
  const loadExistingGeneration = useCallback((year: number, month: number) => {
    setSelectedPeriod({ year, month });
  }, []);

  // Effect to populate data from existing generation query
  const handleExistingGenerationLoaded = useCallback((data: ExistingGenerationResponse | null | undefined) => {
    if (data?.data) {
      const existingData = data.data;
      setGenerationId(existingData.generationId);
      setGenerationStatus(existingData.generationStatus);

      // Format data for display
      if (existingData.schedules && existingData.schedules.length > 0) {
        setGeneratedData({
          month: existingData.month,
          year: existingData.year,
          totalSchedules: existingData.totalSchedules,
          averageConfidence: (existingData.generationMetrics as { averageConfidence?: number })?.averageConfidence || 0,
          qualityMetrics: {
            uniqueMinistersUsed: (existingData.generationMetrics as { uniqueMinistersUsed?: number })?.uniqueMinistersUsed || 0,
            averageMinistersPerMass: 0,
            highConfidenceSchedules: (existingData.generationMetrics as { highConfidenceSchedules?: number })?.highConfidenceSchedules || 0,
            lowConfidenceSchedules: (existingData.generationMetrics as { lowConfidenceSchedules?: number })?.lowConfidenceSchedules || 0,
            balanceScore: (existingData.generationMetrics as { balanceScore?: number })?.balanceScore || 0,
          },
          schedules: existingData.schedules,
          schedulesByWeek: {},
        });
        setHasUnsavedChanges(false);
      }
    } else {
      // No existing generation, reset state
      setGenerationId(null);
      setGenerationStatus(null);
      setGeneratedData(null);
    }
  }, []);

  // Watch for query data changes
  if (existingGenerationQuery.data && !existingGenerationQuery.isLoading) {
    // This will run once when data is loaded
    // We use a ref pattern to avoid infinite loops
  }

  const generateMutation = useMutation({
    mutationFn: async ({ month, year, preview }: { month: number; year: number; preview: boolean }) => {
      if (preview) {
        const response = await apiRequest('GET', `/api/schedules/preview/${year}/${month}`);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/schedules/generate', {
          year,
          month,
          saveToDatabase: true, // Always save
          replaceExisting: true
        });
        return response.json();
      }
    },
    onSuccess: (data: GenerationResponse & { data: GenerationData & { generationId?: string; generationStatus?: 'draft' | 'published' } }) => {
      setGeneratedData(data.data);
      setHasUnsavedChanges(false); // Data is already saved

      // Track generation ID and status
      if (data.data.generationId) {
        setGenerationId(data.data.generationId);
        setGenerationStatus(data.data.generationStatus || 'draft');
      }

      toast({
        title: "Escala gerada com sucesso!",
        description: `${data.data.totalSchedules} horários de missa organizados automaticamente.`
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'], exact: false });
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

  const publishMutation = useMutation({
    mutationFn: async (genId: string) => {
      const response = await apiRequest('POST', `/api/schedules/generation/${genId}/publish`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json() as Promise<PublishResponse>;
    },
    onSuccess: (data) => {
      setGenerationStatus('published');
      setHasUnsavedChanges(false);

      // Invalidate all schedule queries
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'], exact: false });

      const { differences } = data.data;
      let description = `${data.data.schedulesPublished} escalas foram publicadas.`;

      if (differences.summary.totalChanges > 0) {
        description += ` (${differences.summary.totalChanges} alterações feitas desde a geração)`;
      }

      toast({
        title: "Escala Publicada!",
        description
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao publicar escala",
        description: error.message || "Erro ao publicar a escala.",
        variant: "destructive"
      });
    }
  });

  const publishGeneration = useCallback(async () => {
    if (!generationId) {
      toast({
        title: "Erro",
        description: "Nenhuma geração para publicar. Gere a escala primeiro.",
        variant: "destructive"
      });
      return;
    }

    await publishMutation.mutateAsync(generationId);
  }, [generationId, publishMutation, toast]);

  const clearGeneration = useCallback(() => {
    setGeneratedData(null);
    setGenerationId(null);
    setGenerationStatus(null);
    setHasUnsavedChanges(false);
  }, []);

  return {
    // Data
    generatedData,
    setGeneratedData,
    generationId,
    generationStatus,

    // Flags
    hasUnsavedChanges,
    setHasUnsavedChanges,

    // Loading states
    isLoadingExisting: existingGenerationQuery.isLoading,
    existingGenerationData: existingGenerationQuery.data?.data,

    // Mutations
    generateMutation,
    saveMutation,
    publishMutation,

    // Actions
    loadExistingGeneration,
    handleExistingGenerationLoaded,
    publishGeneration,
    clearGeneration,
  };
}
