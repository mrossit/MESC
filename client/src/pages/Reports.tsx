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
  FileText
} from "lucide-react";
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
                       engagementLoading || formationLoading || familiesLoading;

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Filtros de Período</CardTitle>
                <CardDescription>
                  Selecione o período para análise dos dados
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[180px]">
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

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.location.reload()}
                  title="Atualizar dados"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  title="Exportar relatório"
                  disabled
                >
                  <Download className="h-4 w-4" />
                </Button>
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
          <CardHeader>
            <CardTitle>Análise Detalhada</CardTitle>
            <CardDescription>
              Explore as métricas detalhadas do ministério por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="availability" className="space-y-4">
              <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
                <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                <TabsTrigger value="substitutions">Substituições</TabsTrigger>
                <TabsTrigger value="engagement">Engajamento</TabsTrigger>
                <TabsTrigger value="formation">Formação</TabsTrigger>
                <TabsTrigger value="families">Famílias</TabsTrigger>
              </TabsList>

              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top 10 Ministros Mais Disponíveis</CardTitle>
                    <CardDescription>
                      Ministros com maior número de dias disponíveis no período
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availabilityLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Carregando dados...</p>
                        </div>
                      </div>
                    ) : availabilityChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={availabilityChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="dias" fill="#D4AF37" name="Dias Disponíveis" />
                          <Bar dataKey="respostas" fill="#B87333" name="Questionários Respondidos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-2" />
                        <p>Nenhum dado disponível para o período selecionado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Substitutions Tab */}
              <TabsContent value="substitutions" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Distribuição de Substituições</CardTitle>
                      <CardDescription>Status das substituições no período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {substitutionsLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : substitutionPieData.some(d => d.value > 0) ? (
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
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <RefreshCw className="h-12 w-12 mb-2" />
                          <p>Nenhuma substituição no período</p>
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
              <TabsContent value="engagement" className="space-y-4">
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
              <TabsContent value="formation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progresso de Formação</CardTitle>
                    <CardDescription>
                      Ministros com melhor desempenho nos módulos de formação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {formationLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : formationChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={formationChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="completados" stackId="1" stroke="#D4AF37" fill="#D4AF37" name="Completados" />
                          <Area type="monotone" dataKey="emAndamento" stackId="1" stroke="#B87333" fill="#B87333" name="Em Andamento" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mb-2" />
                        <p>Nenhum dado de formação disponível</p>
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
              <TabsContent value="families" className="space-y-4">
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