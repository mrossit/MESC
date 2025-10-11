import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Users, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Download,
  Shuffle,
  Save,
  Eye,
  Edit,
  X,
  Plus,
  GripVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout';
import { ScheduleEditDialog } from '@/components/ScheduleEditDialog';

interface GeneratedSchedule {
  date: string;
  time: string;
  dayOfWeek: number;
  ministers: Minister[];
  backupMinisters: Minister[];
  confidence: number;
  qualityScore: string;
}

interface Minister {
  id: string;
  name: string;
  role: string;
  totalServices: number;
  availabilityScore: number;
  position?: number; // 🔧 CORREÇÃO: Adicionar campo position
}

interface QualityMetrics {
  uniqueMinistersUsed: number;
  averageMinistersPerMass: number;
  highConfidenceSchedules: number;
  lowConfidenceSchedules: number;
  balanceScore: number;
}

interface GenerationResponse {
  success: boolean;
  message: string;
  data: {
    month: number;
    year: number;
    totalSchedules: number;
    averageConfidence: number;
    qualityMetrics: QualityMetrics;
    schedules: GeneratedSchedule[];
    schedulesByWeek: { [key: string]: GeneratedSchedule[] };
  };
}

export default function AutoScheduleGeneration() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [generatedData, setGeneratedData] = useState<GenerationResponse['data'] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{ date: string; time: string; ministers: { id: string; name: string }[] } | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [showTestResults, setShowTestResults] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Gerar escala automática
  const generateMutation = useMutation({
    mutationFn: async ({ month, year, preview }: { month: number; year: number; preview: boolean }) => {
      if (preview) {
        const response = await apiRequest('GET', `/api/schedules/preview/${year}/${month}`);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/schedules/generate', {
          year,
          month,
          saveToDatabase: false
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
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar escala",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  });

  // Salvar escala no banco
  const saveMutation = useMutation({
    mutationFn: async (schedules: GeneratedSchedule[]) => {
      const schedulesToSave = schedules.flatMap(schedule => 
        schedule.ministers.map(minister => ({
          date: schedule.date,
          time: schedule.time,
          type: 'missa',
          ministerId: minister.id,
          notes: `Gerado automaticamente - ${schedule.qualityScore}`
        }))
      );

      const response = await apiRequest('POST', '/api/schedules/save-generated', {
        schedules: schedulesToSave,
        replaceExisting: true
      });
      return response.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Escalas salvas!",
        description: "As escalas foram salvas no sistema com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar escalas",
        description: error.message || "Erro ao salvar no banco de dados.",
        variant: "destructive"
      });
    }
  });

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

    } catch (error: any) {
      console.error('Erro ao reprocessar:', error);
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

    } catch (error: any) {
      console.error('Erro ao gerar teste:', error);
      toast({
        title: "Erro ao gerar escala de teste",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatDayOfWeek = (dayOfWeek: number) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayOfWeek];
  };

  // Meses para o seletor
  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  // Anos disponíveis
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

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
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Ano</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                variant="outline"
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              <Button
                onClick={() => handleGenerate(true)}
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
                    Gerar Escala Automática
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Missas</p>
                    <p className="text-2xl font-bold">{generatedData.totalSchedules}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ministros Únicos</p>
                    <p className="text-2xl font-bold">{generatedData.qualityMetrics.uniqueMinistersUsed}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Confiança Média</p>
                    <p className={`text-2xl font-bold ${getConfidenceColor(generatedData.averageConfidence)}`}>
                      {Math.round(generatedData.averageConfidence * 100)}%
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Balanceamento</p>
                    <p className="text-2xl font-bold">{Math.round(generatedData.qualityMetrics.balanceScore * 100)}%</p>
                  </div>
                  <div className="h-8 w-8">
                    <Progress value={generatedData.qualityMetrics.balanceScore * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Escalas geradas */}
        {generatedData?.schedules && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Escalas Geradas - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
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
                  <Card key={index} className="border-l-4" style={{
                    borderLeftColor: schedule.confidence >= 0.8 ? '#22c55e' : 
                                   schedule.confidence >= 0.6 ? '#f59e0b' : '#ef4444'
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-semibold">
                              {format(new Date(schedule.date + 'T00:00:00'), 'EEEE', { locale: ptBR })} - {format(new Date(schedule.date + 'T00:00:00'), 'dd/MM/yyyy')}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {schedule.time}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSchedule({
                              date: schedule.date,
                              time: schedule.time,
                              ministers: schedule.ministers.map(m => ({ id: m.id, name: m.name }))
                            })}
                            data-testid={`button-edit-${index}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Badge 
                            variant={getConfidenceBadgeVariant(schedule.confidence)}
                            data-testid={`badge-quality-${index}`}
                          >
                            {schedule.qualityScore}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(schedule.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm font-medium">Ministros:</span>
                          {schedule.ministers.map((minister, idx) => (
                            <Badge key={minister.id} variant="outline" className="text-xs">
                              {minister.position && `${minister.position}. `}{minister.name}
                              <span className="ml-1 text-muted-foreground">
                                ({minister.totalServices}x)
                              </span>
                            </Badge>
                          ))}
                        </div>
                        
                        {schedule.backupMinisters.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Backup:</span>
                            {schedule.backupMinisters.map((minister) => (
                              <Badge key={minister.id} variant="secondary" className="text-xs">
                                {minister.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
                  console.error('Erro ao recarregar escala:', error);
                }
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
}