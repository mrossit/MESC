import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout';

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
                    Gerar Escala Automática
                  </>
                )}
              </Button>
            </div>
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
                  onClick={() => handleGenerate(false)}
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
                              {formatDayOfWeek(schedule.dayOfWeek)} - {format(new Date(schedule.date), 'dd/MM/yyyy')}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {schedule.time}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
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
                              {minister.name}
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

        {/* Instruções para primeira geração */}
        {!generatedData && !isGenerating && (
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
                <Button onClick={() => handleGenerate(false)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Escalas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}