import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  RefreshCw,
  Download,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  Search,
  FileDown,
  AlertCircle,
  ChartBar,
  Eye,
  PieChart,
  TrendingUp,
  Activity,
  FileText,
  MessageSquare,
  List,
  Grid3x3
} from 'lucide-react';

interface MinisterResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  responded: boolean;
  respondedAt: string | null;
  availability: string | null;
}

interface ResponseStatus {
  month: number;
  year: number;
  templateExists: boolean;
  templateId?: string;
  templateStatus?: string;
  totalMinisters: number;
  respondedCount: number;
  pendingCount: number;
  responseRate: string;
  responses: MinisterResponse[];
}

interface DetailedResponse {
  user: {
    name: string;
    email: string;
    phone: string;
  };
  response: {
    submittedAt: string;
    responses: any[];
    availabilities: any[];
  };
  template: {
    questions: any[];
    month: number;
    year: number;
  };
}

interface ResponseSummary {
  totalResponses: number;
  questions: any[];
  summary: Record<string, Record<string, number>>;
}

export default function QuestionnaireResponses() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<ResponseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');
  
  // Modal states
  const [selectedMinister, setSelectedMinister] = useState<MinisterResponse | null>(null);
  const [detailedResponse, setDetailedResponse] = useState<DetailedResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Summary state
  const [responseSummary, setResponseSummary] = useState<ResponseSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const fetchResponseStatus = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `/api/questionnaires/admin/responses-status/${selectedYear}/${selectedMonth}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Não foi possível carregar o acompanhamento. Aguarde até que os ministros comecem a responder.');
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      toast({
        title: 'Ops! Algo deu errado',
        description: err instanceof Error ? err.message : 'Não foi possível carregar os dados. Por favor, tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponseSummary = async () => {
    setLoadingSummary(true);
    
    try {
      const response = await fetch(
        `/api/questionnaires/admin/responses-summary/${selectedYear}/${selectedMonth}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Não foi possível carregar o resumo das respostas.');
      }
      
      const data = await response.json();
      setResponseSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao carregar resumo',
        variant: 'destructive'
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchDetailedResponse = async (minister: MinisterResponse) => {
    if (!status?.templateId) return;
    
    setSelectedMinister(minister);
    setLoadingDetails(true);
    
    try {
      const response = await fetch(
        `/api/questionnaires/admin/responses/${status.templateId}/${minister.id}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Não foi possível carregar os detalhes da resposta.');
      }
      
      const data = await response.json();
      console.log('Detailed response data:', data);
      setDetailedResponse(data);
    } catch (err) {
      console.error('Error loading details:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao carregar detalhes',
        variant: 'destructive'
      });
      setSelectedMinister(null);
      setDetailedResponse(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchResponseStatus();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (viewMode === 'summary' && status?.templateExists) {
      fetchResponseSummary();
    }
  }, [viewMode, selectedMonth, selectedYear]);

  const filteredResponses = status?.responses.filter(minister => {
    const matchesSearch = minister.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         minister.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterTab === 'responded') return matchesSearch && minister.responded;
    if (filterTab === 'pending') return matchesSearch && !minister.responded;
    if (filterTab === 'available') return matchesSearch && minister.availability === 'Disponível';
    if (filterTab === 'unavailable') return matchesSearch && minister.availability === 'Indisponível';
    
    return matchesSearch;
  }) || [];

  const exportToCSV = async () => {
    if (!status) return;

    try {
      // Use the new API endpoint to export CSV with full questionnaire data
      const response = await fetch(`/api/questionnaires/export/${selectedYear}/${selectedMonth}/csv?format=detailed`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : `respostas_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Exportação completa realizada',
          description: 'O arquivo CSV com todas as perguntas e respostas foi baixado com sucesso.',
        });
      } else {
        // Fallback to basic export if API fails
        const csvContent = [
          ['Nome', 'Email', 'Telefone', 'Respondido', 'Data Resposta', 'Disponibilidade'],
          ...status.responses.map(r => [
            r.name,
            r.email,
            r.phone || '',
            r.responded ? 'Sim' : 'Não',
            r.respondedAt ? new Date(r.respondedAt).toLocaleDateString('pt-BR') : '',
            r.availability || ''
          ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `respostas_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;
        link.click();

        toast({
          title: 'Exportação básica realizada',
          description: 'Foi exportada uma versão simplificada dos dados.',
        });
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);

      // Fallback to basic export on error
      const csvContent = [
        ['Nome', 'Email', 'Telefone', 'Respondido', 'Data Resposta', 'Disponibilidade'],
        ...status.responses.map(r => [
          r.name,
          r.email,
          r.phone || '',
          r.responded ? 'Sim' : 'Não',
          r.respondedAt ? new Date(r.respondedAt).toLocaleDateString('pt-BR') : '',
          r.availability || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `respostas_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;
      link.click();

      toast({
        title: 'Exportação básica realizada',
        description: 'Não foi possível exportar os dados completos, mas uma versão simplificada foi baixada.',
        variant: 'default',
      });
    }
  };

  const formatAnswer = (answer: any): string => {
    if (typeof answer === 'object' && answer.answer) {
      let result = answer.answer;
      if (answer.sub) {
        result += ` (${answer.sub})`;
      }
      return result;
    }
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return answer?.toString() || 'Não respondido';
  };

  const renderSummaryChart = (questionId: string, data: Record<string, number>) => {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    
    return (
      <div className="space-y-3">
        {sortedEntries.map(([option, count]) => {
          const percentage = ((count / total) * 100).toFixed(1);
          return (
            <div key={option} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]">{option}</span>
                <span className="font-medium ml-2">
                  {count} ({percentage}%)
                </span>
              </div>
              <Progress value={Number(percentage)} className="h-2" />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout
      title="Acompanhamento de Respostas"
      subtitle="Monitore as respostas dos ministros ao questionário de disponibilidade"
    >
      <div className="max-w-7xl mx-auto p-6 ml-[-4px] mr-[-4px] pl-[8px] pr-[8px] pt-[14px] pb-[14px] space-y-6">

        {/* Filters */}
        <Card className="border-opacity-30">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Período de Análise</CardTitle>
                <CardDescription className="mt-1">
                  Selecione o período e visualize as respostas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Lista
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                >
                  <ChartBar className="h-4 w-4 mr-2" />
                  Resumo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2 ml-auto">
                <Button 
                  onClick={fetchResponseStatus} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Atualizar
                </Button>
                
                <Button
                  onClick={exportToCSV}
                  disabled={!status || !status.templateExists}
                  variant="outline"
                  size="sm"
                  title="Exporta o CSV com todas as perguntas e respostas"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informative State */}
        {!loading && status && !status.templateExists && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <div className="space-y-2">
                <p className="font-medium">
                  Ainda não há questionário criado para {monthNames[selectedMonth - 1]} de {selectedYear}.
                </p>
                <p className="text-sm">
                  Para começar a acompanhar as respostas:
                </p>
                <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                  <li>Acesse a página "Questionários" no menu lateral</li>
                  <li>Clique em "Criar Questionário" para {monthNames[selectedMonth - 1]}/{selectedYear}</li>
                  <li>Configure as perguntas e envie para os ministros</li>
                  <li>Volte aqui para acompanhar as respostas em tempo real</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        {status && status.templateExists && (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card 
                className="overflow-hidden border-opacity-30 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setViewMode('list');
                  setFilterTab('all');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <CardTitle className="text-sm font-medium">
                    Total de Ministros
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{status.totalMinisters}</div>
                  <p className="text-xs text-muted-foreground">
                    Ministros ativos
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="overflow-hidden border-opacity-30 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setViewMode('list');
                  setFilterTab('responded');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardTitle className="text-sm font-medium">
                    Responderam
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">
                    {status.respondedCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Respostas recebidas
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="overflow-hidden border-opacity-30 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setViewMode('list');
                  setFilterTab('pending');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-orange-50 to-orange-100/50">
                  <CardTitle className="text-sm font-medium">
                    Pendentes
                  </CardTitle>
                  <UserX className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {status.pendingCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando resposta
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="overflow-hidden border-opacity-30 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setViewMode('list');
                  setFilterTab('all');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Resposta
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{status.responseRate.replace('%%', '%')}</div>
                  <Progress 
                    value={Number(status.responseRate)} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'list' ? (
              <Card className="border-opacity-30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detalhes das Respostas
                  </CardTitle>
                  <CardDescription>
                    Clique no badge de disponibilidade para ver as respostas detalhadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pl-[10px] pr-[10px] pt-[8px] pb-[8px]">
                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 max-w-sm"
                      />
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs value={filterTab} onValueChange={setFilterTab}>
                    <TabsList className="grid w-full max-w-2xl grid-cols-3 sm:grid-cols-5">
                      <TabsTrigger value="all" className="text-xs sm:text-sm">
                        Todos ({status.responses.length})
                      </TabsTrigger>
                      <TabsTrigger value="responded" className="text-xs sm:text-sm">
                        <span className="hidden sm:inline">Respondidos</span>
                        <span className="sm:hidden">Resp.</span>
                        ({status.respondedCount})
                      </TabsTrigger>
                      <TabsTrigger value="pending" className="text-xs sm:text-sm">
                        <span className="hidden sm:inline">Pendentes</span>
                        <span className="sm:hidden">Pend.</span>
                        ({status.pendingCount})
                      </TabsTrigger>
                      <TabsTrigger value="available" className="hidden sm:flex text-xs sm:text-sm">
                        Disponíveis
                      </TabsTrigger>
                      <TabsTrigger value="unavailable" className="hidden sm:flex text-xs sm:text-sm">
                        Indisponíveis
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value={filterTab} className="mt-4">
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Status</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead className="hidden sm:table-cell">Email</TableHead>
                              <TableHead className="hidden md:table-cell">Telefone</TableHead>
                              <TableHead>Disponibilidade</TableHead>
                              <TableHead className="hidden lg:table-cell">Data Resposta</TableHead>
                              <TableHead className="w-12">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredResponses.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                  <div className="space-y-2">
                                    <p className="text-muted-foreground">
                                      {status.totalMinisters === 0 
                                        ? "Ainda não há ministros ou coordenadores cadastrados no sistema."
                                        : searchTerm 
                                          ? "Nenhum resultado encontrado para sua busca."
                                          : filterTab !== 'all' 
                                            ? "Nenhum resultado para o filtro selecionado."
                                            : "Nenhum ministro ou coordenador encontrado."}
                                    </p>
                                    {status.totalMinisters === 0 && (
                                      <p className="text-sm text-muted-foreground">
                                        Cadastre os ministros e coordenadores na página "Usuários" para começar.
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredResponses.map((minister) => (
                                <TableRow key={minister.id}>
                                  <TableCell>
                                    {minister.responded ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Clock className="h-5 w-5 text-orange-500" />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {minister.name}
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <a 
                                      href={`mailto:${minister.email}`} 
                                      className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                      <Mail className="h-3 w-3" />
                                      <span className="text-xs">{minister.email}</span>
                                    </a>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {minister.phone ? (
                                      <a 
                                        href={`tel:${minister.phone}`} 
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <Phone className="h-3 w-3" />
                                        <span className="text-xs">{minister.phone}</span>
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {minister.availability ? (
                                      <Badge 
                                        variant={minister.availability === 'Disponível' ? 'default' : 'secondary'}
                                        className={cn(
                                          "cursor-pointer transition-all hover:scale-105",
                                          minister.availability === 'Disponível' 
                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 
                                            : 'bg-red-100 text-red-800 hover:bg-red-200
                                        )}
                                        onClick={() => minister.responded && fetchDetailedResponse(minister)}
                                      >
                                        {minister.availability}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                                    {minister.respondedAt ? (
                                      <span className="inline-flex items-center gap-1 text-xs">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(minister.respondedAt).toLocaleDateString('pt-BR')}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {minister.responded && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => fetchDetailedResponse(minister)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-opacity-30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Resumo Acumulado das Respostas
                  </CardTitle>
                  <CardDescription>
                    Visualização consolidada de todas as respostas recebidas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pl-[10px] pr-[10px] pt-[8px] pb-[8px]">
                  {loadingSummary ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Carregando resumo...</p>
                    </div>
                  ) : responseSummary ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          <span className="font-medium">Total de Respostas:</span>
                        </div>
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {responseSummary.totalResponses}
                        </Badge>
                      </div>
                      
                      {responseSummary.questions.map((question) => {
                        const summaryData = responseSummary.summary[question.id];
                        if (!summaryData || Object.keys(summaryData).length === 0) return null;
                        
                        return (
                          <Card key={question.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/30">
                              <CardTitle className="text-base">
                                {question.question}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              {renderSummaryChart(question.id, summaryData)}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma resposta disponível para resumo
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Modal for detailed responses */}
      <Dialog
        open={!!selectedMinister}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMinister(null);
            setDetailedResponse(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Respostas Detalhadas
            </DialogTitle>
            <DialogDescription>
              {selectedMinister?.name} - {selectedMinister?.email}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {loadingDetails ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Carregando respostas...</p>
              </div>
            ) : detailedResponse ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Data de envio:</span>
                  <Badge variant="outline">
                    {new Date(detailedResponse.response.submittedAt).toLocaleString('pt-BR')}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  {(() => {
                    try {
                      console.log('DetailedResponse:', detailedResponse);
                      console.log('Questions:', detailedResponse?.template?.questions);
                      console.log('Responses:', detailedResponse?.response?.responses);

                      // Verificar estrutura dos dados
                      if (!detailedResponse?.template?.questions || !Array.isArray(detailedResponse.template.questions)) {
                        console.log('No questions found in template');
                        return (
                          <div className="text-center py-4 text-muted-foreground">
                            Nenhuma pergunta disponível
                          </div>
                        );
                      }

                      // Converter respostas para formato de objeto se estiverem em array
                      let responsesObj = {};
                      const rawResponses = detailedResponse?.response?.responses;

                      if (Array.isArray(rawResponses)) {
                        // Se for array de objetos {questionId, answer}
                        rawResponses.forEach(r => {
                          if (r.questionId) {
                            responsesObj[r.questionId] = r.answer;
                          }
                        });
                      } else if (typeof rawResponses === 'object') {
                        // Se já for objeto
                        responsesObj = rawResponses || {};
                      }

                      console.log('Converted responses:', responsesObj);
                      const questionElements = [];

                      for (let i = 0; i < detailedResponse.template.questions.length; i++) {
                        const question = detailedResponse.template.questions[i];
                        const answer = responsesObj[question.id];

                        console.log(`Question ${i}:`, question);
                        console.log(`Answer for question ${question.id}:`, answer);

                        // Pular perguntas condicionais não aplicáveis
                        if (question.conditional) {
                          const parentAnswer = responsesObj[question.conditional.questionId];
                          console.log(`Conditional check - parent answer: ${parentAnswer}, expected: ${question.conditional.value}`);
                          if (parentAnswer !== question.conditional.value) {
                            continue;
                          }
                        }

                        // Pular se não houver resposta (mas permitir false e 0)
                        if (answer === undefined || answer === null || answer === '') {
                          console.log(`Skipping question ${question.id} - no answer`);
                          continue;
                        }

                        questionElements.push(
                          <div key={question.id || `q-${i}`} className="space-y-2">
                            <div className="font-medium text-sm">
                              {question.text || question.question || `Pergunta ${i + 1}`}
                            </div>
                            <div className="p-3 bg-muted/30 rounded-md">
                              <span className="text-sm">{formatAnswer(answer)}</span>
                            </div>
                          </div>
                        );
                      }

                      return questionElements.length > 0 ? questionElements : (
                        <div className="text-center py-4 text-muted-foreground">
                          Nenhuma resposta encontrada
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering responses:', error);
                      return (
                        <div className="text-center py-4 text-red-500">
                          Erro ao exibir respostas. Por favor, tente novamente.
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Erro ao carregar respostas
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}