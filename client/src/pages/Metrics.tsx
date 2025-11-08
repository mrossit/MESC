import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Server,
  Database,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Cpu,
  HardDrive
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MetricsData {
  timestamp: string;
  server: {
    uptime: number;
    uptimeFormatted: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
  };
  resources: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      heapUsagePercent: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    system: {
      totalMemory: number;
      freeMemory: number;
      loadAverage: number[];
      cpuCount: number;
    };
  };
  requests: {
    total: number;
    success: number;
    errors: number;
    successRate: number;
    errorRate: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    lastReset: string;
  };
  database: {
    users: {
      total: number;
      active: number;
      recentSignups: number;
    };
    schedules: {
      total: number;
      published: number;
    };
    responses: number;
    substitutions: {
      total: number;
      pending: number;
    };
  };
}

export default function Metrics() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { data: metrics, isLoading, refetch } = useQuery<MetricsData>({
    queryKey: ['/api/metrics'],
    refetchInterval: autoRefresh ? 5000 : false,
  });
  
  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar as métricas de requisições?')) return;
    
    try {
      const response = await fetch('/api/metrics/reset', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Error resetting metrics:', error);
    }
  };
  
  if (isLoading || !metrics) {
    return (
      <Layout title="Métricas do Sistema" subtitle="Monitoramento de desempenho e recursos">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Carregando métricas...</div>
        </div>
      </Layout>
    );
  }
  
  const memoryUsagePercent = Math.round((metrics.resources.system.totalMemory - metrics.resources.system.freeMemory) / metrics.resources.system.totalMemory * 100);
  
  return (
    <Layout
      title="Métricas do Sistema"
      subtitle="Monitoramento em tempo real de desempenho e recursos"
    >
      <div className="space-y-6">
        {/* Header com controles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Atualização: {autoRefresh ? '5s' : 'Manual'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Última atualização: {new Date(metrics.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="button-toggle-autorefresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Pausar' : 'Retomar'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh-metrics"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
        
        {/* Servidor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Servidor
            </CardTitle>
            <CardDescription>Informações do processo Node.js</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <p className="text-2xl font-bold text-primary">{metrics.server.uptimeFormatted}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Node.js</span>
                </div>
                <p className="text-2xl font-bold">{metrics.server.nodeVersion}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Plataforma</span>
                </div>
                <p className="text-lg font-semibold">{metrics.server.platform} ({metrics.server.arch})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recursos do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Recursos do Sistema
            </CardTitle>
            <CardDescription>Uso de memória e CPU</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Memória do Processo */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Memória do Processo (Heap)</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.resources.memory.heapUsed} MB / {metrics.resources.memory.heapTotal} MB
                  </span>
                </div>
                <Progress value={metrics.resources.memory.heapUsagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {metrics.resources.memory.heapUsagePercent}% utilizado
                </p>
              </div>
              
              {/* Memória do Sistema */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Memória do Sistema</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.resources.system.totalMemory - metrics.resources.system.freeMemory} GB / {metrics.resources.system.totalMemory} GB
                  </span>
                </div>
                <Progress value={memoryUsagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {memoryUsagePercent}% utilizado
                </p>
              </div>
              
              {/* CPU Load */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">CPUs</p>
                  <p className="text-xl font-bold">{metrics.resources.system.cpuCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Load Average (1m)</p>
                  <p className="text-xl font-bold">{metrics.resources.system.loadAverage[0].toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPU Time</p>
                  <p className="text-xl font-bold">{(metrics.resources.cpu.user + metrics.resources.cpu.system) / 1000}s</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Requisições HTTP */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Requisições HTTP
                </CardTitle>
                <CardDescription>Performance das APIs</CardDescription>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReset}
                data-testid="button-reset-metrics"
              >
                Resetar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Estatísticas gerais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{metrics.requests.total}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Sucesso</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{metrics.requests.success}</p>
                  <p className="text-xs text-muted-foreground">{metrics.requests.successRate}%</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Erros</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{metrics.requests.errors}</p>
                  <p className="text-xs text-muted-foreground">{metrics.requests.errorRate}%</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Tempo Médio</span>
                  </div>
                  <p className="text-2xl font-bold">{metrics.requests.avgResponseTime}ms</p>
                </div>
              </div>
              
              {/* Percentis de resposta */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Percentis de Tempo de Resposta</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">P50 (Mediana)</p>
                    <p className="text-lg font-bold">{metrics.requests.p50ResponseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P95</p>
                    <p className="text-lg font-bold">{metrics.requests.p95ResponseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P99</p>
                    <p className="text-lg font-bold">{metrics.requests.p99ResponseTime}ms</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Banco de Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Banco de Dados
            </CardTitle>
            <CardDescription>Estatísticas de dados armazenados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Usuários */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Usuários</span>
                </div>
                <p className="text-3xl font-bold">{metrics.database.users.total}</p>
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ativos</span>
                    <span className="font-medium">{metrics.database.users.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Novos (30d)</span>
                    <span className="font-medium">{metrics.database.users.recentSignups}</span>
                  </div>
                </div>
              </div>
              
              {/* Escalas */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Escalas</span>
                </div>
                <p className="text-3xl font-bold">{metrics.database.schedules.total}</p>
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Publicadas</span>
                    <span className="font-medium">{metrics.database.schedules.published}</span>
                  </div>
                </div>
              </div>
              
              {/* Questionários */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Respostas</span>
                </div>
                <p className="text-3xl font-bold">{metrics.database.responses}</p>
                <p className="text-sm text-muted-foreground pt-2">Questionários respondidos</p>
              </div>
              
              {/* Substituições */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Substituições</span>
                </div>
                <p className="text-3xl font-bold">{metrics.database.substitutions.total}</p>
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pendentes</span>
                    <Badge variant={metrics.database.substitutions.pending > 0 ? "destructive" : "secondary"}>
                      {metrics.database.substitutions.pending}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
