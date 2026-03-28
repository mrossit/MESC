import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  Info,
  Shuffle,
  Save,
  Eye,
  Zap,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  FileEdit
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout';
import { ScheduleEditDialog } from '@/components/ScheduleEditDialog';
import { PeriodSelector, MONTHS } from '@/components/schedule-generation/PeriodSelector';
import { GenerationMetrics } from '@/components/schedule-generation/GenerationMetrics';
import { ScheduleCard } from '@/components/schedule-generation/ScheduleCard';
import { DraggableScheduleCard } from '@/components/schedule-generation/DraggableScheduleCard';
import { useScheduleGeneration } from '@/hooks/useScheduleGeneration';
import { usePageLeaveWarning } from '@/hooks/usePageLeaveWarning';
import type { TestResult, EditingSchedule } from '@/types/schedule';

// Interface for outliers in test results
interface Outlier {
  ministerName: string;
  count: number;
  reason: 'too_many_assignments' | 'too_few_assignments';
}

// Interface for test schedule sample
interface TestScheduleItem {
  date: string;
  time: string;
  ministersAssigned: number;
  ministersRequired: number;
  ministers: Array<{ id: string; name: string }>;
}

// Interface for updated minister data from API
interface UpdatedMinister {
  ministerId: string;
  ministerName: string;
}

export default function AutoScheduleGeneration() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EditingSchedule | null>(null);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'generate' | 'preview'; preview: boolean } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    generatedData,
    setGeneratedData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    generateMutation,
    saveMutation,
    publishMutation,
    generationId,
    generationStatus,
    loadExistingGeneration,
    handleExistingGenerationLoaded,
    publishGeneration,
    isLoadingExisting,
    existingGenerationData
  } = useScheduleGeneration();

  // Warn before leaving if there are unsaved changes
  usePageLeaveWarning(hasUnsavedChanges);

  // Load existing generation when month/year changes
  useEffect(() => {
    loadExistingGeneration(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadExistingGeneration]);

  // Handle loaded data
  useEffect(() => {
    if (existingGenerationData !== undefined) {
      handleExistingGenerationLoaded({ success: true, data: existingGenerationData });
    }
  }, [existingGenerationData, handleExistingGenerationLoaded]);

  const handleGenerateRequest = (preview: boolean = false) => {
    // If there's already a generation (draft or published), show confirmation
    if (generatedData && generationId) {
      setPendingAction({ type: preview ? 'preview' : 'generate', preview });
      setShowRegenerateConfirm(true);
      return;
    }

    handleGenerate(preview);
  };

  const handleGenerate = (preview: boolean = false) => {
    setIsGenerating(true);
    setEditingSchedule(null);
    setShowTestResults(false);
    setTestResults(null);
    generateMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      preview
    }, {
      onSettled: () => setIsGenerating(false)
    });
  };

  const handleConfirmRegenerate = () => {
    setShowRegenerateConfirm(false);
    if (pendingAction) {
      handleGenerate(pendingAction.preview);
      setPendingAction(null);
    }
  };

  const handleSave = () => {
    if (generatedData?.schedules) {
      saveMutation.mutate(generatedData.schedules);
    }
  };

  const handlePublish = async () => {
    await publishGeneration();
  };

  const handleReprocessResponses = async () => {
    try {
      setIsGenerating(true);
      toast({
        title: "Atualizando respostas...",
        description: "Processando TODAS as respostas dos questionários. Isso pode levar alguns segundos."
      });

      // Reprocessar TODAS as respostas (não filtrar por questionário específico)
      const response = await apiRequest('POST', '/api/questionnaires/admin/reprocess-responses', {
        // Não enviar questionnaireId para processar todas as respostas
      });

      const result = await response.json();

      const processedCount = result.data?.updated || result.processedCount || 0;

      if (processedCount === 0) {
        toast({
          title: "Nenhuma resposta encontrada",
          description: "Não há respostas de questionários no sistema para processar. Certifique-se de que os ministros já responderam aos questionários.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Respostas atualizadas com sucesso!",
          description: `${processedCount} respostas foram atualizadas. Agora você pode gerar as escalas.`
        });
      }

      // Invalidar cache para forçar recarga dos dados
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires'] });

    } catch (error) {
      toast({
        title: "Erro ao atualizar respostas",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar as respostas.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestGeneration = async () => {
    try {
      setIsGenerating(true);
      setShowTestResults(false);
      toast({
        title: "Gerando escala de teste...",
        description: "Criando escala com 50 ministros fictícios para validar o algoritmo."
      });

      const response = await apiRequest('POST', '/api/schedules/test-generation', {
        ministerCount: 50
      });

      const result = await response.json();

      if (result.success) {
        setTestResults(result.data);
        setShowTestResults(true);
        toast({
          title: "Escala de teste gerada!",
          description: `${result.data.schedules.length} missas escaladas com dados fictícios.`
        });
      } else {
        throw new Error(result.message || 'Erro ao gerar escala de teste');
      }

    } catch (error) {
      toast({
        title: "Erro ao gerar escala de teste",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Get status badge info
  const getStatusBadge = () => {
    if (!generationStatus) return null;

    if (generationStatus === 'published') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Publicada
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Rascunho
      </Badge>
    );
  };


  return (
    <Layout title="Geração Automática de Escalas" subtitle="Sistema inteligente de distribuição de ministros">
      <div className="space-y-6">

        {/* Seleção de período */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período para Geração
            </CardTitle>
            <CardDescription>
              Selecione o mês e ano para gerar a escala automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PeriodSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />

            {/* Status indicator */}
            {isLoadingExisting ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Carregando geração existente...</span>
              </div>
            ) : generationStatus && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {getStatusBadge()}
                <span className="text-sm text-muted-foreground">
                  {generationStatus === 'published'
                    ? 'Esta escala já foi publicada e está visível para os ministros.'
                    : 'Esta escala está em rascunho. Edite e publique quando estiver pronta.'}
                </span>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => handleGenerateRequest(true)}
                disabled={isGenerating || isLoadingExisting}
                variant="outline"
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar Preview
              </Button>

              <Button
                onClick={() => handleGenerateRequest(false)}
                disabled={isGenerating || isLoadingExisting}
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {generatedData ? 'Regenerar Escala' : 'Gerar Escala Completa'}
                  </>
                )}
              </Button>
            </div>

            <Separator className="my-4" />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Primeira vez gerando escalas?</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">Se as escalas não tiverem ministros ou se os ministros não estiverem sendo distribuídos corretamente, clique no botão abaixo para atualizar as respostas dos questionários:</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleReprocessResponses}
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    data-testid="button-reprocess"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Atualizar Respostas dos Questionários
                  </Button>
                  <Button
                    onClick={handleTestGeneration}
                    variant="secondary"
                    size="sm"
                    disabled={isGenerating}
                    data-testid="button-test"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Testar Algoritmo (Dados Fictícios)
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Métricas da geração */}
        {generatedData && (
          <GenerationMetrics
            totalSchedules={generatedData.totalSchedules}
            uniqueMinistersUsed={generatedData.qualityMetrics.uniqueMinistersUsed}
            averageConfidence={generatedData.averageConfidence}
            balanceScore={generatedData.qualityMetrics.balanceScore}
          />
        )}

        {/* Escalas geradas */}
        {generatedData?.schedules && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>Escalas Geradas - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                  <CardDescription>
                    {generatedData.schedules.length} horários de missa organizados com algoritmo inteligente
                  </CardDescription>
                </div>
                {getStatusBadge()}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleGenerateRequest(true)}
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  data-testid="button-regenerate"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Regerar
                </Button>

                {hasUnsavedChanges && (
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    variant="outline"
                    size="sm"
                    data-testid="button-save"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                )}

                {generationStatus === 'draft' && (
                  <Button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending}
                    data-testid="button-publish"
                  >
                    {publishMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Publicar Escala
                      </>
                    )}
                  </Button>
                )}

                {generationStatus === 'published' && (
                  <Badge variant="outline" className="py-2 px-4">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Escala Publicada
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Status alerts */}
              {generationStatus === 'draft' && (
                <Alert>
                  <FileEdit className="h-4 w-4" />
                  <AlertTitle>Escala em Rascunho</AlertTitle>
                  <AlertDescription>
                    Esta escala está salva mas ainda não foi publicada.
                    Faça as edições necessárias e clique em "Publicar Escala" quando estiver pronta.
                  </AlertDescription>
                </Alert>
              )}

              {/* Alertas de qualidade */}
              {generatedData.qualityMetrics.lowConfidenceSchedules > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    {generatedData.qualityMetrics.lowConfidenceSchedules} escalas têm baixa confiança.
                    Revise os horários marcados com baixa qualidade antes de publicar.
                  </AlertDescription>
                </Alert>
              )}

              {/* Lista de escalas */}
              <div className="space-y-3">
                {generatedData.schedules.map((schedule, index) => (
                  <DraggableScheduleCard
                    key={index}
                    date={schedule.date}
                    time={schedule.time}
                    confidence={schedule.confidence}
                    qualityScore={schedule.qualityScore}
                    ministers={schedule.ministers}
                    backupMinisters={schedule.backupMinisters}
                    onMinistersChange={(newMinisters, newBackups) => {
                      const updatedSchedules = [...generatedData.schedules];
                      updatedSchedules[index] = {
                        ...updatedSchedules[index],
                        ministers: newMinisters,
                        backupMinisters: newBackups,
                      };
                      setGeneratedData({
                        ...generatedData,
                        schedules: updatedSchedules,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    onEdit={() => setEditingSchedule({
                      date: schedule.date,
                      time: schedule.time,
                      ministers: schedule.ministers.map(m => ({ id: m.id, name: m.name })),
                      backupMinisters: (schedule.backupMinisters || []).map((b: any) => ({ id: b.id, name: b.name }))
                    })}
                    index={index}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results Display */}
        {showTestResults && testResults && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Resultados do Teste de Algoritmo
              </CardTitle>
              <CardDescription>
                Escala gerada com {testResults.mockData.ministerCount} ministros fictícios para {testResults.month}/{testResults.year}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Missas Geradas</p>
                  <p className="text-2xl font-bold">{testResults.statistics.totalMasses}</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Cobertura</p>
                  <p className="text-2xl font-bold">{testResults.statistics.coverage}%</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Confiança Média</p>
                  <p className="text-2xl font-bold">{Math.round(testResults.statistics.averageConfidence * 100)}%</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Justiça</p>
                  <p className="text-2xl font-bold">{testResults.statistics.fairnessScore}%</p>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Distribuição de Ministros</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Ministros utilizados: {testResults.statistics.uniqueMinistersUsed}/{testResults.statistics.totalMinistersAvailable} ({testResults.statistics.utilizationRate}%)</li>
                    <li>• Média de atribuições: {testResults.statistics.averageAssignmentsPerMinister}</li>
                    <li>• Variância: {testResults.statistics.distributionVariance}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Qualidade das Escalas</h4>
                  <ul className="text-sm space-y-1">
                    <li className="text-green-600">• Alta confiança: {testResults.statistics.highConfidenceSchedules}</li>
                    <li className="text-yellow-600">• Média confiança: {testResults.statistics.mediumConfidenceSchedules}</li>
                    <li className="text-red-600">• Baixa confiança: {testResults.statistics.lowConfidenceSchedules}</li>
                    <li className="text-orange-600">• Incompletas: {testResults.statistics.incompleteSchedules}</li>
                  </ul>
                </div>
              </div>

              {/* Outliers Warning */}
              {testResults.statistics.outliers.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Outliers Detectados</AlertTitle>
                  <AlertDescription>
                    {testResults.statistics.outliers.length} ministros com distribuição irregular:
                    <ul className="mt-2 text-xs">
                      {(testResults.statistics.outliers as Outlier[]).slice(0, 5).map((outlier, idx) => (
                        <li key={idx}>
                          • {outlier.ministerName}: {outlier.count} atribuições ({outlier.reason === 'too_many_assignments' ? 'muitas' : 'poucas'})
                        </li>
                      ))}
                      {testResults.statistics.outliers.length > 5 && (
                        <li>• ... e mais {testResults.statistics.outliers.length - 5} outliers</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Sample Schedules */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Amostra de Escalas (primeiras 5)</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(testResults.schedules as TestScheduleItem[]).slice(0, 5).map((schedule, idx) => (
                    <div key={idx} className="border p-2 rounded text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{schedule.date} - {schedule.time}</span>
                        <Badge variant={schedule.ministersAssigned >= schedule.ministersRequired ? "default" : "destructive"}>
                          {schedule.ministersAssigned}/{schedule.ministersRequired}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.ministers.slice(0, 3).map((m) => m.name).join(', ')}
                        {schedule.ministers.length > 3 && ` +${schedule.ministers.length - 3} mais`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowTestResults(false)} variant="outline" size="sm">
                  Fechar Resultados
                </Button>
                <Button onClick={handleTestGeneration} variant="secondary" size="sm" disabled={isGenerating}>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Gerar Novo Teste
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções para primeira geração */}
        {!generatedData && !isGenerating && !showTestResults && !isLoadingExisting && (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geração Automática de Escalas</h3>
              <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
                O sistema analisa as respostas dos questionários mensais e distribui os ministros
                de forma inteligente, considerando disponibilidade, histórico de serviços e balanceamento de carga.
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => handleGenerateRequest(true)} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Fazer Preview
                </Button>
                <Button onClick={() => handleGenerateRequest(false)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Escalas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de edição de escala */}
        {editingSchedule && (
          <ScheduleEditDialog
            open={!!editingSchedule}
            onOpenChange={(open) => !open && setEditingSchedule(null)}
            date={editingSchedule.date}
            time={editingSchedule.time}
            initialMinisters={editingSchedule.ministers}
            backupMinisters={editingSchedule.backupMinisters}
            onSave={async () => {
              // Após salvar, atualizar apenas a escala específica editada
              if (generatedData && editingSchedule) {
                try {
                  const response = await apiRequest('GET', `/api/schedules/${editingSchedule.date}/${editingSchedule.time}`);
                  const updatedSchedule = await response.json();

                  // Atualizar os dados exibidos com a escala editada
                  setGeneratedData({
                    ...generatedData,
                    schedules: generatedData.schedules.map(s =>
                      s.date === editingSchedule.date && s.time === editingSchedule.time
                        ? {
                            ...s,
                            ministers: (updatedSchedule.ministers as UpdatedMinister[]).map((m) => ({
                              id: m.ministerId,
                              name: m.ministerName,
                              role: '',
                              totalServices: 0,
                              availabilityScore: 0
                            })),
                            // Preservar backups, removendo ministros que agora foram escalados
                            backupMinisters: (s.backupMinisters || []).filter(
                              (b: any) => !(updatedSchedule.ministers as UpdatedMinister[]).some((m) => m.ministerId === b.id)
                            )
                          }
                        : s
                    )
                  });

                  setHasUnsavedChanges(true);
                } catch (error) {
                  // Silently fail - the schedule will be updated on next generation
                }
              }
            }}
          />
        )}

        {/* Confirm regenerate dialog */}
        <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerar Escala?</AlertDialogTitle>
              <AlertDialogDescription>
                Já existe uma geração para {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}.
                {generationStatus === 'published'
                  ? ' A escala já foi publicada. Regenerar irá criar uma nova versão em rascunho.'
                  : ' Regenerar irá substituir a escala atual e todas as edições serão perdidas.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRegenerate}>
                Regenerar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
