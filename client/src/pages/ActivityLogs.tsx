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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  Activity,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Filter,
  LogIn,
  LogOut,
  CalendarCheck,
  ArrowLeftRight,
  BookOpen,
  Settings,
  ClipboardList
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Type definitions for API responses
interface ActivityLog {
  id: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description?: string;
  ipAddress?: string;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface TopUser {
  userId: string;
  userName?: string;
  count: number;
}

interface DailyStat {
  date: string;
  count: number;
}

interface LogsData {
  logs: ActivityLog[];
  categories?: string[];
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
}

interface SummaryData {
  byCategory?: CategoryStat[];
  topUsers?: TopUser[];
  daily?: DailyStat[];
  byDay?: DailyStat[];
  total?: number;
  totalActivities?: number;
  loginStats?: {
    logins?: number;
    logouts?: number;
    failedLogins?: number;
  };
}

const COLORS = ["#D4AF37", "#B87333", "#CC7766", "#8B4513", "#8B5A2B", "#8B6914", "#6B8E23", "#2E8B57"];

const categoryLabels: Record<string, string> = {
  auth: "Autenticação",
  schedule: "Escalas",
  questionnaire: "Questionários",
  substitution: "Substituições",
  user_management: "Gestão de Usuários",
  formation: "Formação",
  reports: "Relatórios",
  config: "Configurações",
  profile: "Perfil",
  notifications: "Notificações",
  dashboard: "Dashboard"
};

const categoryIcons: Record<string, React.ReactNode> = {
  auth: <LogIn className="h-4 w-4" />,
  schedule: <CalendarCheck className="h-4 w-4" />,
  questionnaire: <ClipboardList className="h-4 w-4" />,
  substitution: <ArrowLeftRight className="h-4 w-4" />,
  formation: <BookOpen className="h-4 w-4" />,
  config: <Settings className="h-4 w-4" />
};

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 500);
  };

  // Build query params
  const buildParams = () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "25"
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("category", category);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  };

  // Fetch activity logs
  const { data: logsData, isLoading: logsLoading, refetch } = useQuery<LogsData>({
    queryKey: ["/api/activity", page, debouncedSearch, category, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/activity?${buildParams()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    }
  });

  // Fetch summary stats
  const { data: summaryData, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["/api/activity/summary"],
    queryFn: async () => {
      const response = await fetch("/api/activity/summary?days=7", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    }
  });

  // Handle export
  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({ format });
      if (category) params.set("category", category);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/activity/export?${params}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs_atividade_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Exportação concluída", description: `Logs exportados em formato ${format.toUpperCase()}` });
    } catch (error) {
      toast({ title: "Erro na exportação", description: "Não foi possível exportar os logs", variant: "destructive" });
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Get action badge color
  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("login") || action.includes("logout")) return "default";
    if (action.includes("create") || action.includes("approve")) return "default";
    if (action.includes("delete") || action.includes("reject")) return "destructive";
    if (action.includes("update") || action.includes("view")) return "secondary";
    return "outline";
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Logs de Atividade
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe todas as ações realizadas no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Atividades (7 dias)</p>
                  <p className="text-2xl font-bold">{summaryData?.totalActivities || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Logins</p>
                  <p className="text-2xl font-bold text-green-600">{summaryData?.loginStats?.logins || 0}</p>
                </div>
                <LogIn className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Logouts</p>
                  <p className="text-2xl font-bold">{summaryData?.loginStats?.logouts || 0}</p>
                </div>
                <LogOut className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Falhas de Login</p>
                  <p className="text-2xl font-bold text-red-500">{summaryData?.loginStats?.failedLogins || 0}</p>
                </div>
                <LogIn className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity by Day */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Atividade por Dia</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : summaryData?.byDay && summaryData.byDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={summaryData.byDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => {
                        try {
                          return format(new Date(val), "dd/MM", { locale: ptBR });
                        } catch {
                          return val;
                        }
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(val) => {
                        try {
                          return format(new Date(val), "dd/MM/yyyy", { locale: ptBR });
                        } catch {
                          return val;
                        }
                      }}
                    />
                    <Bar dataKey="count" fill="#D4AF37" name="Atividades" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity by Category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Categoria</CardTitle>
              <CardDescription>Distribuição de ações</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : summaryData?.byCategory && summaryData.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={summaryData.byCategory.map((c) => ({
                        name: categoryLabels[c.category] || c.category,
                        value: c.count
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {summaryData.byCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {logsData?.categories?.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Data início"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Data fim"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setCategory("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Registros de Atividade</CardTitle>
              <span className="text-sm text-muted-foreground">
                {logsData?.pagination?.total || 0} registros
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logsData?.logs && logsData.logs.length > 0 ? (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead className="hidden md:table-cell">Descrição</TableHead>
                        <TableHead className="hidden lg:table-cell">IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[120px]">
                                {log.userName || log.userEmail || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {log.description}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                            {log.ipAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {logsData?.pagination && logsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {logsData.pagination.page} de {logsData.pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(logsData.pagination?.totalPages ?? 1, page + 1))}
                        disabled={page === (logsData.pagination?.totalPages ?? 1)}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado</p>
                <p className="text-sm">Tente ajustar os filtros</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        {summaryData?.topUsers && summaryData.topUsers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Usuários Mais Ativos</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {summaryData.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-bold text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{user.userName || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{user.count} ações</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
