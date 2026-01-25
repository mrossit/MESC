import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Calendar,
  Target,
  Lightbulb,
  Shield,
  Activity,
  BarChart3,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";

interface MinisterRisk {
  ministerId: string;
  ministerName: string;
  reliabilityScore: number;
  noShowRisk: 'low' | 'medium' | 'high' | 'critical';
  substitutionLikelihood: number;
  engagementLevel: string;
  factors: string[];
  recommendation: string;
}

interface TimeSlotInsight {
  dayOfWeek: number;
  time: string;
  coverageStatus: 'critical' | 'warning' | 'healthy' | 'excellent';
  availableCount: number;
  requiredCount: number;
  coveragePercentage: number;
}

interface SeasonalPattern {
  month: number;
  monthName: string;
  avgAvailability: number;
  avgSubstitutionRequests: number;
  isHighRisk: boolean;
  notes: string[];
}

interface EngagementTrend {
  period: string;
  activeUsers: number;
  questionnaireResponseRate: number;
  avgReliabilityScore: number;
  trend: string;
}

interface InsightsData {
  generatedAt: string;
  summary: {
    totalMinisters: number;
    atRiskCount: number;
    healthyCount: number;
    criticalTimeSlots: number;
    upcomingRisks: string[];
  };
  ministerRisks: MinisterRisk[];
  timeSlotInsights: TimeSlotInsight[];
  seasonalPatterns: SeasonalPattern[];
  engagementTrends: EngagementTrend[];
  recommendations: string[];
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const riskColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
};

const riskBadgeColors = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
};

const coverageColors = {
  critical: '#ef4444',
  warning: '#f59e0b',
  healthy: '#22c55e',
  excellent: '#3b82f6'
};

export default function Insights() {
  const { data: insights, isLoading, refetch } = useQuery<InsightsData>({
    queryKey: ['/api/insights'],
    queryFn: async () => {
      const res = await fetch('/api/insights', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao carregar insights');
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Layout title="Insights Preditivos" subtitle="Carregando analises...">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!insights) {
    return (
      <Layout title="Insights Preditivos" subtitle="Erro ao carregar">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-red-500 mb-4" />
            <p>Nao foi possivel carregar os insights.</p>
            <Button onClick={() => refetch()} className="mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const { summary, ministerRisks, timeSlotInsights, seasonalPatterns, engagementTrends, recommendations } = insights;

  // Prepare chart data
  const engagementChartData = engagementTrends.map(t => ({
    period: t.period,
    usuarios: t.activeUsers,
    respostas: t.questionnaireResponseRate,
    score: t.avgReliabilityScore
  }));

  const seasonalChartData = seasonalPatterns.map(p => ({
    mes: p.monthName.substring(0, 3),
    disponibilidade: p.avgAvailability,
    substituicoes: p.avgSubstitutionRequests,
    risco: p.isHighRisk
  }));

  const riskDistribution = [
    { name: 'Baixo', value: ministerRisks.filter(m => m.noShowRisk === 'low').length, color: '#22c55e' },
    { name: 'Medio', value: ministerRisks.filter(m => m.noShowRisk === 'medium').length, color: '#f59e0b' },
    { name: 'Alto', value: ministerRisks.filter(m => m.noShowRisk === 'high').length, color: '#f97316' },
    { name: 'Critico', value: ministerRisks.filter(m => m.noShowRisk === 'critical').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <Layout
      title="Insights Preditivos"
      subtitle="Analise de padroes e recomendacoes"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Ministros</p>
                  <p className="text-2xl font-bold">{summary.totalMinisters}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={summary.atRiskCount > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Risco</p>
                  <p className="text-2xl font-bold">{summary.atRiskCount}</p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${summary.atRiskCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saudaveis</p>
                  <p className="text-2xl font-bold">{summary.healthyCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={summary.criticalTimeSlots > 0 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Horarios Criticos</p>
                  <p className="text-2xl font-bold">{summary.criticalTimeSlots}</p>
                </div>
                <Clock className={`h-8 w-8 ${summary.criticalTimeSlots > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Risks Alert */}
        {summary.upcomingRisks.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Alertas de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.upcomingRisks.map((risk, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-amber-600" />
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Visao Geral</TabsTrigger>
            <TabsTrigger value="ministers">Ministros</TabsTrigger>
            <TabsTrigger value="coverage">Cobertura</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Recommendations Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Recomendacoes
                  </CardTitle>
                  <CardDescription>Acoes sugeridas baseadas na analise</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendations.slice(0, 5).map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                    {recommendations.length === 0 && (
                      <li className="text-muted-foreground text-sm">
                        Nenhuma recomendacao no momento. Sistema saudavel!
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Distribuicao de Risco
                  </CardTitle>
                  <CardDescription>Nivel de risco dos ministros</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Tendencia de Engajamento
                </CardTitle>
                <CardDescription>Evolucao nos ultimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={engagementChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="score"
                        name="Score Medio"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="respostas"
                        name="Taxa Resposta %"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ministers Tab */}
          <TabsContent value="ministers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Perfil de Risco dos Ministros
                </CardTitle>
                <CardDescription>Ministros ordenados por nivel de risco</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ministerRisks.slice(0, 15).map((minister) => (
                    <div
                      key={minister.ministerId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${riskColors[minister.noShowRisk]}`} />
                        <div>
                          <p className="font-medium">{minister.ministerName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Score: {minister.reliabilityScore}</span>
                            <span>|</span>
                            <span>Subst: {minister.substitutionLikelihood}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={riskBadgeColors[minister.noShowRisk]}>
                          {minister.noShowRisk === 'low' ? 'Baixo' :
                           minister.noShowRisk === 'medium' ? 'Medio' :
                           minister.noShowRisk === 'high' ? 'Alto' : 'Critico'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coverage Tab */}
          <TabsContent value="coverage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cobertura por Horario
                </CardTitle>
                <CardDescription>Status de cobertura de cada horario de missa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {timeSlotInsights.map((slot, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${
                        slot.coverageStatus === 'critical' ? 'border-red-200 bg-red-50/50' :
                        slot.coverageStatus === 'warning' ? 'border-amber-200 bg-amber-50/50' :
                        'bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {dayNames[slot.dayOfWeek]} {slot.time.substring(0, 5)}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: coverageColors[slot.coverageStatus] }}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cobertura</span>
                          <span>{slot.coveragePercentage}%</span>
                        </div>
                        <Progress
                          value={Math.min(slot.coveragePercentage, 100)}
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {slot.availableCount} disponiveis / {slot.requiredCount} necessarios
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Padroes Sazonais
                </CardTitle>
                <CardDescription>Disponibilidade e substituicoes ao longo do ano</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonalChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="disponibilidade"
                        name="Disponibilidade %"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="substituicoes"
                        name="Substituicoes"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* High Risk Months */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Meses de Alto Risco:</p>
                  <div className="flex flex-wrap gap-2">
                    {seasonalPatterns.filter(p => p.isHighRisk).map(p => (
                      <Badge key={p.month} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {p.monthName}
                        {p.notes.length > 0 && (
                          <span title={p.notes.join(', ')}>
                            <Info className="h-3 w-3 ml-1" />
                          </span>
                        )}
                      </Badge>
                    ))}
                    {seasonalPatterns.filter(p => p.isHighRisk).length === 0 && (
                      <span className="text-sm text-muted-foreground">Nenhum mes de alto risco identificado</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Atualizado em: {new Date(insights.generatedAt).toLocaleString('pt-BR')}
          </span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>
    </Layout>
  );
}
