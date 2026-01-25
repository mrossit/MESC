import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import {
  Users,
  Calendar,
  TrendingUp,
  Award,
  Activity,
  Clock,
  RefreshCw,
  Download,
  ChartBar,
  Trophy,
  Heart,
  BookOpen,
  UserCheck,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// Color palette for charts
const COLORS = ["#D4AF37", "#B87333", "#CC7766", "#8B4513", "#8B5A2B", "#8B6914"];

export default function Reports() {
  const [period, setPeriod] = useState("current_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case "current_month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last_month":
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case "last_3_months":
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case "last_6_months":
        startDate = startOfMonth(subMonths(now, 5));
        endDate = endOfMonth(now);
        break;
      case "custom":
        return {
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined
        };
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd")
    };
  };

  const dateRange = getDateRange();

  // Fetch summary metrics
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ["/api/reports/summary"],
    queryFn: async () => {
      const response = await fetch("/api/reports/summary", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    }
  });

  // Fetch availability metrics
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["/api/reports/availability", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || '',
        limit: '10'
      });
      const response = await fetch(`/api/reports/availability?${params}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    }
  });

  // Fetch substitution metrics
  const { data: substitutions, isLoading: substitutionsLoading } = useQuery({
    queryKey: ["/api/reports/substitutions", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || ''
      });
      const response = await fetch(`/api/reports/substitutions?${params}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch substitutions");
      return response.json();
    }
  });

  // Fetch engagement metrics
  const { data: engagement, isLoading: engagementLoading } = useQuery({
    queryKey: ["/api/reports/engagement", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || ''
      });
      const response = await fetch(`/api/reports/engagement?${params}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch engagement");
      return response.json();
    }
  });

  // Fetch formation metrics
  const { data: formation, isLoading: formationLoading } = useQuery({
    queryKey: ["/api/reports/formation"],
    queryFn: async () => {
      const response = await fetch("/api/reports/formation", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch formation");
      return response.json();
    }
  });

  // Fetch family metrics
  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/reports/families"],
    queryFn: async () => {
      const response = await fetch("/api/reports/families", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch families");
      return response.json();
    }
  });

  // Fetch trends data
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/reports/trends"],
    queryFn: async () => {
      const response = await fetch("/api/reports/trends?months=6", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch trends");
      return response.json();
    }
  });

  // Fetch availability patterns
  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ["/api/reports/trends/availability-patterns"],
    queryFn: async () => {
      const response = await fetch("/api/reports/trends/availability-patterns", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch patterns");
      return response.json();
    }
  });

  // Fetch attendance data
  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/reports/attendance", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || ''
      });
      const response = await fetch(`/api/reports/attendance?${params}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json();
    }
  });

  // Fetch comprehensive availability analysis (FR-8.3)
  const { data: availabilityAnalysis, isLoading: availabilityAnalysisLoading } = useQuery({
    queryKey: ["/api/reports/availability-analysis"],
    queryFn: async () => {
      const response = await fetch("/api/reports/availability-analysis?months=6", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch availability analysis");
      return response.json();
    }
  });

  // Format data for charts
  const availabilityChartData = availability?.topAvailable?.map((item: any) => ({
    name: item.userName?.split(" ")[0] || "N/A",
    dias: item.availableDays || 0,
    respostas: item.totalResponses || 0
  })) || [];

  const substitutionPieData = [
    { name: "Solicitadas", value: substitutions?.mostRequests?.reduce((acc: number, curr: any) => acc + curr.totalRequests, 0) || 0 },
    { name: "Aprovadas", value: substitutions?.mostRequests?.reduce((acc: number, curr: any) => acc + curr.approvedRequests, 0) || 0 },
    { name: "Pendentes", value: substitutions?.mostRequests?.reduce((acc: number, curr: any) => acc + curr.pendingRequests, 0) || 0 }
  ];

  const formationChartData = formation?.topPerformers?.map((item: any) => ({
    name: item.userName?.split(" ")[0] || "N/A",
    completados: item.completedModules || 0,
    emAndamento: item.inProgressModules || 0,
    progresso: item.avgProgress || 0
  })) || [];

  // Check for any loading or error state
  const isAnyLoading = summaryLoading || availabilityLoading || substitutionsLoading ||
                       engagementLoading || formationLoading || familiesLoading ||
                       trendsLoading || patternsLoading || attendanceLoading || availabilityAnalysisLoading;

  // Export function
  const handleExport = async (reportType: string, format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({
        format,
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || ''
      });

      const response = await fetch(`/api/reports/export/${reportType}?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar relatório');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Relatório exportado",
        description: `O arquivo ${filename} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Handle error state
  if (summaryError) {
    return (
      <Layout title="Relatórios e Analytics" subtitle="Acompanhe as métricas e o desempenho do ministério">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar os relatórios. Por favor, tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios e Analytics" subtitle="Acompanhe as métricas e o desempenho do ministério">
      <div className="space-y-6">
        {/* Filters Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle>Filtros de Período</CardTitle>
                <CardDescription>
                  Selecione o período para análise dos dados
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mês Atual</SelectItem>
                    <SelectItem value="last_month">Mês Anterior</SelectItem>
                    <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="last_6_months">Últimos 6 Meses</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.location.reload()}
                    title="Atualizar dados"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" title="Exportar relatórios">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Exportar Relatórios</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Resumo Geral</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleExport('summary', 'xlsx')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Resumo (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('summary', 'pdf')}>
                        <FileDown className="h-4 w-4 mr-2 text-red-600" />
                        Resumo (PDF)
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Disponibilidade</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleExport('availability', 'xlsx')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Disponibilidade (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('availability', 'pdf')}>
                        <FileDown className="h-4 w-4 mr-2 text-red-600" />
                        Disponibilidade (PDF)
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Substituições</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleExport('substitutions', 'xlsx')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Substituições (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('substitutions', 'pdf')}>
                        <FileDown className="h-4 w-4 mr-2 text-red-600" />
                        Substituições (PDF)
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Outros</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleExport('engagement', 'xlsx')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Engajamento (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('formation', 'xlsx')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Formação (Excel)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ministros Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {summary?.activeMinisters || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Total cadastrado</p>
                    </>
                  )}
                </div>
                <Users className="h-8 w-8 text-neutral-accentWarm opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Disponibilidade Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {summary?.avgAvailabilityDays || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Dias por mês</p>
                    </>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-dark-gold opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Substituições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {summary?.monthSubstitutions?.total || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {summary?.monthSubstitutions?.approved || 0} aprovadas
                      </p>
                    </>
                  )}
                </div>
                <RefreshCw className="h-8 w-8 text-dark-terracotta opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Formação Concluída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {summary?.formationCompleted || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Módulos este mês</p>
                    </>
                  )}
                </div>
                <BookOpen className="h-8 w-8 text-dark-copper opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg">Análise Detalhada</CardTitle>
            <CardDescription className="text-sm">
              Explore as métricas detalhadas do ministério por categoria
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <Tabs defaultValue="trends" className="space-y-4">
              <div className="overflow-x-auto pb-2">
                <TabsList className="inline-flex h-auto w-max lg:w-full lg:grid lg:grid-cols-7 gap-1 p-1">
                  <TabsTrigger value="trends" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Tendências
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Presença
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">Disponibilidade</TabsTrigger>
                  <TabsTrigger value="substitutions" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">Substituições</TabsTrigger>
                  <TabsTrigger value="engagement" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">Engajamento</TabsTrigger>
                  <TabsTrigger value="formation" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">Formação</TabsTrigger>
                  <TabsTrigger value="families" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">Famílias</TabsTrigger>
                </TabsList>
              </div>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4 mt-4">
                {/* Growth Indicators */}
                {trends?.growth && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Substituições</p>
                            <p className="text-lg font-semibold">{trends.growth.substitutions > 0 ? '+' : ''}{trends.growth.substitutions}%</p>
                          </div>
                          <TrendingUp className={`h-5 w-5 ${trends.growth.substitutions >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Respostas</p>
                            <p className="text-lg font-semibold">{trends.growth.responses > 0 ? '+' : ''}{trends.growth.responses}%</p>
                          </div>
                          <TrendingUp className={`h-5 w-5 ${trends.growth.responses >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Atividades</p>
                            <p className="text-lg font-semibold">{trends.growth.activities > 0 ? '+' : ''}{trends.growth.activities}%</p>
                          </div>
                          <Activity className={`h-5 w-5 ${trends.growth.activities >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                            <p className="text-lg font-semibold">{trends.growth.activeUsers > 0 ? '+' : ''}{trends.growth.activeUsers}%</p>
                          </div>
                          <Users className={`h-5 w-5 ${trends.growth.activeUsers >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Main Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Evolução Mensal</CardTitle>
                    <CardDescription>
                      Comparativo dos últimos 6 meses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    {trendsLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : trends?.trends?.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[500px]">
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={trends.trends} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="substitutions" stroke="#D4AF37" strokeWidth={2} name="Substituições" dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="responses" stroke="#B87333" strokeWidth={2} name="Respostas" dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="activeUsers" stroke="#8B5A2B" strokeWidth={2} name="Usuários Ativos" dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mb-2" />
                        <p>Dados insuficientes para análise de tendências</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Patterns Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Schedules by Day of Week */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Escalas por Dia da Semana</CardTitle>
                      <CardDescription>Distribuição de escalas publicadas</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {patternsLoading ? (
                        <div className="flex items-center justify-center h-48">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : patterns?.byDayOfWeek?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={patterns.byDayOfWeek} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="schedules" fill="#D4AF37" name="Escalas" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                          <p>Sem dados disponíveis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Schedules by Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Escalas por Horário</CardTitle>
                      <CardDescription>Distribuição por horário de missa</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {patternsLoading ? (
                        <div className="flex items-center justify-center h-48">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : patterns?.byTime?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={patterns.byTime} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="schedules" fill="#B87333" name="Escalas" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                          <p>Sem dados disponíveis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Atividade do Sistema</CardTitle>
                    <CardDescription>Total de ações e formações concluídas por mês</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    {trendsLoading ? (
                      <div className="flex items-center justify-center h-48">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : trends?.trends?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={trends.trends} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="activities" stroke="#CC7766" fill="#CC7766" fillOpacity={0.3} name="Atividades" />
                          <Area type="monotone" dataKey="formationCompleted" stroke="#8B4513" fill="#8B4513" fillOpacity={0.3} name="Formações Concluídas" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        <p>Sem dados disponíveis</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="space-y-4 mt-4">
                {/* Attendance Summary Cards */}
                {attendance?.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{attendance.summary.periodStats.present}</p>
                          <p className="text-xs text-muted-foreground">Presenças</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{attendance.summary.periodStats.late}</p>
                          <p className="text-xs text-muted-foreground">Atrasos</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{attendance.summary.periodStats.absent}</p>
                          <p className="text-xs text-muted-foreground">Ausências</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {attendance.summary.periodStats.attendanceRate !== null
                              ? `${attendance.summary.periodStats.attendanceRate}%`
                              : '-'}
                          </p>
                          <p className="text-xs text-muted-foreground">Taxa de Presença</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Attendance Pie Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Distribuição de Presença</CardTitle>
                      <CardDescription>Status de presença no período</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {attendanceLoading ? (
                        <div className="flex items-center justify-center h-48">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : attendance?.summary?.periodStats?.total > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Presentes', value: attendance.summary.periodStats.present, color: '#22c55e' },
                                { name: 'Atrasados', value: attendance.summary.periodStats.late, color: '#eab308' },
                                { name: 'Ausentes', value: attendance.summary.periodStats.absent, color: '#ef4444' }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              <Cell fill="#22c55e" />
                              <Cell fill="#eab308" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                          <p>Sem dados de presença no período</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Reliable Ministers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ministros Mais Assíduos</CardTitle>
                      <CardDescription>Maior total de serviços realizados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {attendanceLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : attendance?.ministers?.length > 0 ? (
                        <div className="space-y-2">
                          {attendance.ministers
                            .filter((m: any) => m.status === 'active')
                            .slice(0, 5)
                            .map((minister: any, index: number) => (
                              <div key={minister.odministerIdl} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-500 text-white' :
                                    index === 1 ? 'bg-gray-400 text-white' :
                                    index === 2 ? 'bg-orange-600 text-white' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <span className="font-medium text-sm">{minister.ministerName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{minister.totalServices} serviços</Badge>
                                  {minister.noShowCount > 0 && (
                                    <Badge variant="destructive" className="text-xs">{minister.noShowCount} faltas</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                          <p>Nenhum dado disponível</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Full Ministers Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Lista Completa de Presença</CardTitle>
                        <CardDescription>Todos os ministros e suas estatísticas</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('attendance', 'xlsx')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {attendanceLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : attendance?.ministers?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-medium">Nome</th>
                              <th className="text-center py-2 px-2 font-medium">Total</th>
                              <th className="text-center py-2 px-2 font-medium text-green-600">Pres.</th>
                              <th className="text-center py-2 px-2 font-medium text-yellow-600">Atra.</th>
                              <th className="text-center py-2 px-2 font-medium text-red-600">Aus.</th>
                              <th className="text-center py-2 px-2 font-medium">Taxa</th>
                              <th className="text-center py-2 px-2 font-medium">Conf.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.ministers
                              .filter((m: any) => m.status === 'active')
                              .map((minister: any) => (
                                <tr key={minister.odministerIdl} className="border-b hover:bg-muted/50">
                                  <td className="py-2 px-2">{minister.ministerName}</td>
                                  <td className="text-center py-2 px-2">{minister.totalServices}</td>
                                  <td className="text-center py-2 px-2 text-green-600">{minister.periodStats.present}</td>
                                  <td className="text-center py-2 px-2 text-yellow-600">{minister.periodStats.late}</td>
                                  <td className="text-center py-2 px-2 text-red-600">{minister.periodStats.absent}</td>
                                  <td className="text-center py-2 px-2">
                                    {minister.periodStats.attendanceRate !== null
                                      ? `${minister.periodStats.attendanceRate}%`
                                      : '-'}
                                  </td>
                                  <td className="text-center py-2 px-2">
                                    <Badge variant={minister.reliabilityScore >= 80 ? 'default' : minister.reliabilityScore >= 50 ? 'secondary' : 'destructive'}>
                                      {minister.reliabilityScore}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <UserCheck className="h-12 w-12 mb-2" />
                        <p>Nenhum dado de presença disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Availability Analysis Tab (FR-8.3) */}
              <TabsContent value="availability" className="space-y-4 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Ministros Ativos</p>
                          <p className="text-2xl font-bold">{availabilityAnalysis?.summary?.totalMinisters || 0}</p>
                        </div>
                        <Users className="h-8 w-8 text-primary/20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Taxa de Resposta</p>
                          <p className="text-2xl font-bold">{availabilityAnalysis?.summary?.avgResponseRate || 0}%</p>
                        </div>
                        <Activity className="h-8 w-8 text-primary/20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Horários Críticos</p>
                          <p className="text-2xl font-bold text-red-500">{availabilityAnalysis?.summary?.criticalTimeSlots || 0}</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-red-200" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Suplentes Disponíveis</p>
                          <p className="text-2xl font-bold">{availabilityAnalysis?.summary?.availableSubstitutes || 0}</p>
                        </div>
                        <RefreshCw className="h-8 w-8 text-primary/20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                {availabilityAnalysis?.recommendations && availabilityAnalysis.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recomendações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {availabilityAnalysis.recommendations.map((rec: string, idx: number) => (
                          <Alert key={idx} variant={rec.includes('⚠️') || rec.includes('📉') ? 'destructive' : 'default'}>
                            <AlertDescription className="text-sm">{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Time Analysis Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base sm:text-lg">Cobertura por Horário</CardTitle>
                          <CardDescription>Disponibilidade de ministros por horário de missa</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Exportar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExport('availability-analysis', 'xlsx')}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('availability-analysis', 'pdf')}>
                              <FileDown className="h-4 w-4 mr-2" />
                              PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('availability-analysis', 'csv')}>
                              <FileText className="h-4 w-4 mr-2" />
                              CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {availabilityAnalysisLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : availabilityAnalysis?.timeAnalysis?.length > 0 ? (
                        <div className="w-full overflow-x-auto">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={availabilityAnalysis.timeAnalysis.slice(0, 10).map((t: any) => ({
                                name: `${t.dayName?.substring(0, 3)} ${t.time}`,
                                cobertura: t.coverage,
                                preferidos: t.preferredCount,
                                alternativos: t.alternativeCount,
                                minimo: t.minRequired
                              }))}
                              margin={{ top: 5, right: 5, left: 5, bottom: 60 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={12} />
                              <YAxis />
                              <Tooltip />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                              <Bar dataKey="preferidos" stackId="a" fill="#D4AF37" name="Preferido" />
                              <Bar dataKey="alternativos" stackId="a" fill="#B87333" name="Alternativo" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <Clock className="h-12 w-12 mb-2" />
                          <p className="text-center">Nenhum dado de horário disponível</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trend Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg">Tendência de Disponibilidade</CardTitle>
                      <CardDescription>Evolução mensal da disponibilidade</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {availabilityAnalysisLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : availabilityAnalysis?.monthTrends?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={availabilityAnalysis.monthTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="avgAvailability"
                              stroke="#D4AF37"
                              fill="#D4AF37"
                              fillOpacity={0.3}
                              name="Média de Dias"
                            />
                            <Area
                              type="monotone"
                              dataKey="substitutesAvailable"
                              stroke="#B87333"
                              fill="#B87333"
                              fillOpacity={0.3}
                              name="Suplentes"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <TrendingUp className="h-12 w-12 mb-2" />
                          <p className="text-center">Nenhum dado de tendência disponível</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Ministers Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Ranking de Disponibilidade</CardTitle>
                    <CardDescription>Top ministros por disponibilidade média</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availabilityAnalysisLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : availabilityAnalysis?.ministerAnalysis?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Ministro</th>
                              <th className="text-center p-2">Média Dias</th>
                              <th className="text-center p-2">Horários</th>
                              <th className="text-center p-2">Suplente</th>
                              <th className="text-center p-2">Taxa Resposta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availabilityAnalysis.ministerAnalysis.slice(0, 10).map((minister: any, idx: number) => (
                              <tr key={minister.odministerIdl || idx} className="border-b hover:bg-muted/50">
                                <td className="p-2 font-medium">{minister.name}</td>
                                <td className="text-center p-2">{minister.avgAvailableDays}</td>
                                <td className="text-center p-2">{minister.preferredTimesCount}</td>
                                <td className="text-center p-2">
                                  {minister.canSubstitute ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">Sim</Badge>
                                  ) : (
                                    <Badge variant="secondary">Não</Badge>
                                  )}
                                </td>
                                <td className="text-center p-2">
                                  <Badge
                                    variant={minister.reliabilityScore >= 80 ? 'default' : minister.reliabilityScore >= 50 ? 'secondary' : 'destructive'}
                                    className={minister.reliabilityScore >= 80 ? 'bg-green-100 text-green-800' : ''}
                                  >
                                    {minister.reliabilityScore}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Users className="h-8 w-8 mb-2" />
                        <p className="text-center text-sm">Nenhum dado de ministro disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Critical Time Slots */}
                {availabilityAnalysis?.timeAnalysis?.filter((t: any) => t.status === 'critical' || t.status === 'warning').length > 0 && (
                  <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-orange-700">
                        <AlertCircle className="h-5 w-5" />
                        Horários com Atenção
                      </CardTitle>
                      <CardDescription>Horários com cobertura abaixo do ideal</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {availabilityAnalysis.timeAnalysis
                          .filter((t: any) => t.status === 'critical' || t.status === 'warning')
                          .map((t: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{t.dayName} {t.time}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t.totalAvailable} disponíveis / {t.minRequired} mínimo
                                  </p>
                                </div>
                                <Badge variant={t.status === 'critical' ? 'destructive' : 'secondary'}>
                                  {t.coverage}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Substitutions Tab */}
              <TabsContent value="substitutions" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Distribuição de Substituições</CardTitle>
                      <CardDescription>Status das substituições no período</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {substitutionsLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : substitutionPieData.some(d => d.value > 0) ? (
                        <div className="w-full overflow-x-auto">
                          <div className="min-w-[300px]">
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={substitutionPieData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value }) => `${name}: ${value}`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {substitutionPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <RefreshCw className="h-12 w-12 mb-2" />
                          <p className="text-center">Nenhuma substituição no período</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ministros Mais Confiáveis</CardTitle>
                      <CardDescription>
                        Servem regularmente sem pedir substituições
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {substitutionsLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : substitutions?.reliableServers?.length > 0 ? (
                        <div className="space-y-2">
                          {substitutions.reliableServers.slice(0, 5).map((minister: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Trophy className={`h-5 w-5 ${
                                  index === 0 ? 'text-yellow-500' :
                                  index === 1 ? 'text-gray-400' :
                                  index === 2 ? 'text-orange-600' :
                                  'text-muted-foreground'
                                }`} />
                                <span className="font-medium">{minister.userName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {minister.totalAssignments} serviços
                                </Badge>
                                <Badge variant={minister.substitutionRequests === 0 ? "default" : "outline"}>
                                  {minister.substitutionRequests} subst.
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <Users className="h-12 w-12 mb-2" />
                          <p>Nenhum dado disponível</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ministros Mais Engajados</CardTitle>
                      <CardDescription>
                        Baseado em interações com o sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {engagementLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : engagement?.mostActive?.length > 0 ? (
                        <div className="space-y-2">
                          {engagement.mostActive.map((user: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  index === 0 ? 'bg-yellow-500/20' : 'bg-muted'
                                }`}>
                                  <Activity className={`h-5 w-5 ${
                                    index === 0 ? 'text-yellow-500' : 'text-muted-foreground'
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-medium">{user.userName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Última atividade: {user.lastActivity ?
                                      format(new Date(user.lastActivity), "dd/MM HH:mm", { locale: ptBR }) :
                                      'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{user.totalActions} ações</p>
                                <p className="text-xs text-muted-foreground">{user.uniqueDays} dias ativos</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <Activity className="h-12 w-12 mb-2" />
                          <p>Nenhum dado de engajamento</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Taxa de Resposta aos Questionários</CardTitle>
                      <CardDescription>Participação nas pesquisas de disponibilidade</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold">
                            {engagement?.responseRates?.responseRate || 0}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {engagement?.responseRates?.respondedMinisters || 0} de{" "}
                            {engagement?.responseRates?.totalMinisters || 0} ministros
                          </p>
                        </div>
                        <UserCheck className="h-12 w-12 text-green-600 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Formation Tab */}
              <TabsContent value="formation" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progresso de Formação</CardTitle>
                    <CardDescription>
                      Ministros com melhor desempenho nos módulos de formação
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    {formationLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : formationChartData.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[400px]">
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={formationChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                              <YAxis />
                              <Tooltip />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                              <Area type="monotone" dataKey="completados" stackId="1" stroke="#D4AF37" fill="#D4AF37" name="Completados" />
                              <Area type="monotone" dataKey="emAndamento" stackId="1" stroke="#B87333" fill="#B87333" name="Em Andamento" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mb-2" />
                        <p className="text-center">Nenhum dado de formação disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total de Módulos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formation?.stats?.totalModules || 0}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Ministros Inscritos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formation?.stats?.totalEnrolled || 0}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Taxa Média de Conclusão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {Math.round(formation?.stats?.avgCompletionRate || 0)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Families Tab */}
              <TabsContent value="families" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Famílias MESC Mais Ativas</CardTitle>
                    <CardDescription>
                      Famílias com maior participação no ministério
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {familiesLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : families?.activeFamilies?.length > 0 ? (
                      <div className="space-y-2">
                        {families.activeFamilies.map((family: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <Heart className={`h-5 w-5 ${
                                index === 0 ? 'text-red-500' : 'text-muted-foreground'
                              }`} />
                              <div>
                                <p className="font-medium">{family.familyName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {family.activeMembers} membros ativos de {family.totalMembers}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {family.totalServices} serviços
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Heart className="h-12 w-12 mb-2" />
                        <p>Nenhuma família cadastrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}