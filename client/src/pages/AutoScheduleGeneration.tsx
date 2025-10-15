import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  Info,
  Shuffle,
  Save,
  Eye,
  Zap,
  Calendar
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout';
import { ScheduleEditDialog } from '@/components/ScheduleEditDialog';
import { PeriodSelector, MONTHS } from '@/components/schedule-generation/PeriodSelector';
import { GenerationMetrics } from '@/components/schedule-generation/GenerationMetrics';
import { ScheduleCard } from '@/components/schedule-generation/ScheduleCard';
import { useScheduleGeneration } from '@/hooks/useScheduleGeneration';
import type { TestResult, EditingSchedule } from '@/types/schedule';

export default function AutoScheduleGeneration() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EditingSchedule | null>(null);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generatedData, setGeneratedData, hasUnsavedChanges, setHasUnsavedChanges, generateMutation, saveMutation } = useScheduleGeneration();

  const handleGenerate = (preview: boolean = false) => {
    setIsGenerating(true);
    generateMutation.mutate({ 
      month: selectedMonth, 
      year: selectedYear, 
      preview 
    }, {
      onSettled: () => setIsGenerating(false)
    });
  };


  const handleSave = () => {
    if (generatedData?.schedules) {
      saveMutation.mutate(generatedData.schedules);
    }
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

    } catch (error: Error) {
      toast({
        title: "Erro ao atualizar respostas",
        description: error.message || "Ocorreu um erro ao processar as respostas.",
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

    } catch (error: Error) {
      toast({
        title: "Erro ao gerar escala de teste",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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

            <div className="flex gap-3">
              <Button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                variant="outline"
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar Preview
              </Button>

              <Button
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
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
                    Gerar Escala Completa
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
              <div>
                <CardTitle>Escalas Geradas - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                <CardDescription>
                  {generatedData.schedules.length} horários de missa organizados com algoritmo inteligente
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleGenerate(true)}
                  variant="outline"
                  size="sm"
                  data-testid="button-regenerate"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Regerar
                </Button>

                {hasUnsavedChanges && (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
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
                          Salvar Escalas
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Alertas de qualidade */}
              {generatedData.qualityMetrics.lowConfidenceSchedules > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    {generatedData.qualityMetrics.lowConfidenceSchedules} escalas têm baixa confiança. 
                    Revise os horários marcados com baixa qualidade antes de salvar.
                  </AlertDescription>
                </Alert>
              )}

              {/* Lista de escalas */}
              <div className="space-y-3">
                {generatedData.schedules.map((schedule, index) => (
                  <ScheduleCard
                    key={index}
                    date={schedule.date}
                    time={schedule.time}
                    confidence={schedule.confidence}
                    qualityScore={schedule.qualityScore}
                    ministers={schedule.ministers}
                    backupMinisters={schedule.backupMinisters}
                    onEdit={() => setEditingSchedule({
                      date: schedule.date,
                      time: schedule.time,
                      ministers: schedule.ministers.map(m => ({ id: m.id, name: m.name }))
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
                      {testResults.statistics.outliers.slice(0, 5).map((outlier: any, idx: number) => (
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
                  {testResults.schedules.slice(0, 5).map((schedule: any, idx: number) => (
                    <div key={idx} className="border p-2 rounded text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{schedule.date} - {schedule.time}</span>
                        <Badge variant={schedule.ministersAssigned >= schedule.ministersRequired ? "default" : "destructive"}>
                          {schedule.ministersAssigned}/{schedule.ministersRequired}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.ministers.slice(0, 3).map((m: any) => m.name).join(', ')}
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
        {!generatedData && !isGenerating && !showTestResults && (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geração Automática de Escalas</h3>
              <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
                O sistema analisa as respostas dos questionários mensais e distribui os ministros
                de forma inteligente, considerando disponibilidade, histórico de serviços e balanceamento de carga.
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => handleGenerate(true)} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Fazer Preview
                </Button>
                <Button onClick={() => handleGenerate(true)}>
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
                            ministers: updatedSchedule.ministers.map((m: any) => ({
                              id: m.ministerId,
                              name: m.ministerName,
                              role: '',
                              totalServices: 0,
                              availabilityScore: 0
                            }))
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
      </div>
    </Layout>
  );
}