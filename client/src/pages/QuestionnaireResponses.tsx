import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Grid3x3,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { authAPI } from '@/lib/auth';
import {
  mobileGetAdminCommunityHome,
  mobileGetAdminQuestionnaireResponses,
  shouldUseMobileAuth,
} from '@/lib/mobile-auth-session';
import { isAdmin as isAdminRole } from '@shared/roles';
import type {
  MobileAdminQuestionnaireResponsesResponse,
  MobileAdminQuestionnaireTargetMinister,
} from '@shared/mobileClient';
import type { MobileProfileReadinessStatus } from '@shared/mobileDataReadiness';

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

interface QuestionResponseItem {
  questionId: string;
  answer: string | string[] | boolean | Record<string, unknown>;
}

interface AvailabilityItem {
  date: string;
  time?: string;
  available?: boolean;
}

interface QuestionItem {
  id: string;
  question: string;
  text?: string;
  type: string;
  options?: string[];
  category?: string;
  required?: boolean;
  conditional?: {
    questionId: string;
    value?: string;
  };
}

interface DetailedResponse {
  user: {
    name: string;
    email: string;
    phone: string;
  };
  response: {
    submittedAt: string;
    responses: QuestionResponseItem[];
    availabilities: AvailabilityItem[];
  };
  template: {
    questions: QuestionItem[];
    month: number;
    year: number;
  };
}

interface ResponseSummary {
  totalResponses: number;
  questions: QuestionItem[];
  summary: Record<string, Record<string, number>>;
}

function toIsoMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function readinessBadge(status: MobileProfileReadinessStatus) {
  if (status === 'ready') {
    return {
      label: 'Pronto',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
    };
  }

  if (status === 'blocked') {
    return {
      label: 'Bloqueado',
      className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
    };
  }

  return {
    label: 'Atenção',
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
  };
}

function NativeCoordinatorResponses({
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  monthNames,
}: {
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (value: number) => void;
  setSelectedYear: (value: number) => void;
  monthNames: string[];
}) {
  const [nativeSearch, setNativeSearch] = useState('');
  const isoMonth = toIsoMonth(selectedYear, selectedMonth);

  const homeQuery = useQuery({
    queryKey: ['mobile', 'admin-community-home', isoMonth],
    queryFn: () => mobileGetAdminCommunityHome({ month: isoMonth }),
  });
  const questionnaireId = homeQuery.data?.questionnaire?.id ?? null;
  const responsesQuery = useQuery({
    queryKey: ['mobile', 'admin-questionnaire-responses', questionnaireId],
    enabled: Boolean(questionnaireId),
    queryFn: () => mobileGetAdminQuestionnaireResponses(questionnaireId!),
  });

  useEffect(() => {
    const questionnaire = homeQuery.data?.questionnaire;
    if (!questionnaire) return;

    if (questionnaire.month !== selectedMonth) {
      setSelectedMonth(questionnaire.month);
    }
    if (questionnaire.year !== selectedYear) {
      setSelectedYear(questionnaire.year);
    }
  }, [
    homeQuery.data?.questionnaire?.month,
    homeQuery.data?.questionnaire?.year,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
  ]);

  const payload = responsesQuery.data;
  const responseByUserId = useMemo(() => {
    const map = new Map<string, MobileAdminQuestionnaireResponsesResponse['responses'][number]>();
    for (const response of payload?.responses ?? []) {
      map.set(response.userId, response);
    }
    return map;
  }, [payload?.responses]);

  const filteredMinisters = useMemo(() => {
    const normalizedSearch = nativeSearch.trim().toLowerCase();
    const ministers = payload?.ministers ?? [];
    if (!normalizedSearch) return ministers;

    return ministers.filter((minister) =>
      minister.name.toLowerCase().includes(normalizedSearch) ||
      minister.email.toLowerCase().includes(normalizedSearch) ||
      (minister.phone ?? '').toLowerCase().includes(normalizedSearch) ||
      (minister.whatsapp ?? '').toLowerCase().includes(normalizedSearch),
    );
  }, [nativeSearch, payload?.ministers]);

  const isLoading = homeQuery.isLoading || responsesQuery.isLoading;
  const hasQuestionnaire = Boolean(homeQuery.data?.questionnaire);
  const summary = payload?.summary;

  const renderMinister = (minister: MobileAdminQuestionnaireTargetMinister) => {
    const response = responseByUserId.get(minister.id);
    const badge = readinessBadge(minister.dataQuality.status);
    const criticalMissing = minister.dataQuality.missing.filter((issue) => issue.severity === 'critical');
    const recommendedMissing = minister.dataQuality.missing.filter((issue) => issue.severity === 'recommended');

    return (
      <div
        key={minister.id}
        className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-md dark:bg-dark-8/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold">{minister.displayName || minister.name}</h3>
              <Badge variant={minister.responded ? 'default' : 'secondary'}>
                {minister.responded ? 'Respondido' : 'Pendente'}
              </Badge>
              <Badge variant="outline" className={badge.className}>
                {badge.label} {minister.dataQuality.score}%
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{minister.name}</p>
          </div>
          {minister.responded ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <Clock className="h-5 w-5 shrink-0 text-amber-600" />
          )}
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <a href={`mailto:${minister.email}`} className="flex min-w-0 items-center gap-2 text-primary">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{minister.email}</span>
          </a>
          {(minister.whatsapp || minister.phone) && (
            <a href={`tel:${minister.whatsapp || minister.phone}`} className="flex min-w-0 items-center gap-2 text-primary">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="truncate">{minister.whatsapp || minister.phone}</span>
            </a>
          )}
        </div>

        {response && (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <span className="block text-xs text-muted-foreground">Disponibilidade</span>
                <span className="font-medium">{minister.availability ?? 'Não informado'}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Domingos</span>
                <span className="font-medium">
                  {response.availableSundays.length > 0 ? response.availableSundays.join(', ') : '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Horários</span>
                <span className="font-medium">
                  {response.preferredMassTimes.length > 0 ? response.preferredMassTimes.join(', ') : '-'}
                </span>
              </div>
            </div>
            {response.processingWarnings.length > 0 && (
              <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {response.processingWarnings.length} aviso(s) de processamento nesta resposta.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {(criticalMissing.length > 0 || recommendedMissing.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[...criticalMissing, ...recommendedMissing].slice(0, 4).map((issue) => (
              <Badge key={issue.field} variant="outline" className="text-xs">
                {issue.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout
      title="Respostas"
      subtitle="Questionário, pendências e cadastro"
    >
      <div className="mx-auto w-full max-w-5xl space-y-4 px-0 py-1 sm:px-2">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md dark:bg-dark-8/80">
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
              <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                <SelectTrigger>
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={name} value={String(index + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2026, 2027, 2028].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  homeQuery.refetch();
                  responsesQuery.refetch();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {!hasQuestionnaire && !isLoading ? (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Não há questionário publicado para {monthNames[selectedMonth - 1]} de {selectedYear}.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Alvo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.targetCount ?? homeQuery.data?.questionnaire?.target ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4" />
                    Respostas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.respondedCount ?? homeQuery.data?.questionnaire?.responses ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <UserX className="h-4 w-4" />
                    Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.pendingCount ?? homeQuery.data?.questionnaire?.pending ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    Cadastros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.dataQuality.blocked ?? homeQuery.data?.metrics.profileBlocked ?? 0}</div>
                  <p className="text-xs text-muted-foreground">bloqueados</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{payload?.questionnaire.title ?? homeQuery.data?.questionnaire?.title ?? 'Questionário'}</h2>
                    <p className="text-sm text-muted-foreground">
                      {summary?.responseRate ?? homeQuery.data?.questionnaire?.responseRate ?? 0}% respondido
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={nativeSearch}
                      onChange={(event) => setNativeSearch(event.target.value)}
                      placeholder="Buscar ministro"
                      className="pl-9"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
                    Carregando acompanhamento...
                  </div>
                ) : filteredMinisters.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhum ministro encontrado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMinisters.map(renderMinister)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCog className="h-4 w-4" />
                  Qualidade cadastral
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xl font-bold">{summary?.dataQuality.ready ?? homeQuery.data?.metrics.profileReady ?? 0}</div>
                  <p className="text-sm text-muted-foreground">prontos</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xl font-bold">{summary?.dataQuality.needsAttention ?? homeQuery.data?.metrics.profileNeedsAttention ?? 0}</div>
                  <p className="text-sm text-muted-foreground">em atenção</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xl font-bold">{summary?.dataQuality.blocked ?? homeQuery.data?.metrics.profileBlocked ?? 0}</div>
                  <p className="text-sm text-muted-foreground">bloqueados</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
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
  
  // Ref para scroll automático
  const listSectionRef = useRef<HTMLDivElement>(null);
  const authQuery = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: authAPI.getMe,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const canUseNativeAdminResponses = authQuery.data?.user
    ? isAdminRole(authQuery.data.user.role)
    : true;
  const useNativeAdminResponses = shouldUseMobileAuth() && canUseNativeAdminResponses;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const fetchResponseStatus = async () => {
    if (shouldUseMobileAuth()) return;

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
    if (shouldUseMobileAuth()) return;

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
    if (shouldUseMobileAuth()) return;
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
    if (useNativeAdminResponses) return;
    fetchResponseStatus();
  }, [selectedMonth, selectedYear, useNativeAdminResponses]);

  useEffect(() => {
    if (useNativeAdminResponses) return;
    if (viewMode === 'summary' && status?.templateExists) {
      fetchResponseSummary();
    }
  }, [viewMode, selectedMonth, selectedYear, useNativeAdminResponses]);

  if (useNativeAdminResponses) {
    return (
      <NativeCoordinatorResponses
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        monthNames={monthNames}
      />
    );
  }

  const filteredResponses = status?.responses.filter(minister => {
    const matchesSearch = minister.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         minister.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterTab === 'responded') return matchesSearch && minister.responded;
    if (filterTab === 'pending') return matchesSearch && !minister.responded;
    if (filterTab === 'available') return matchesSearch && minister.availability === 'Disponível';
    if (filterTab === 'unavailable') return matchesSearch && minister.availability === 'Indisponível';
    
    return matchesSearch;
  }) || [];

  const scrollToList = () => {
    // Scroll automático para a lista em modo mobile
    if (window.innerWidth < 768 && listSectionRef.current) {
      setTimeout(() => {
        listSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  const exportToCSV = async () => {
    if (!status) return;

    // Usar filteredResponses ao invés de status.responses
    const dataToExport = filteredResponses;
    
    const filterDescription = filterTab === 'all' ? 'todos' : 
                             filterTab === 'responded' ? 'respondidos' :
                             filterTab === 'pending' ? 'pendentes' :
                             filterTab === 'available' ? 'disponíveis' :
                             'indisponíveis';

    try {
      // Fallback to basic export with filtered data
      const csvContent = [
        ['Nome', 'Email', 'Telefone', 'Respondido', 'Data Resposta', 'Disponibilidade'],
        ...dataToExport.map(r => [
          r.name,
          r.email,
          r.phone || '',
          r.responded ? 'Sim' : 'Não',
          r.respondedAt ? new Date(r.respondedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
          r.availability || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `respostas_${filterDescription}_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;
      link.click();

      toast({
        title: 'Exportação realizada',
        description: `Exportados ${dataToExport.length} ministro(s) com filtro: ${filterDescription}`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);

      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os dados. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const exportSpecificList = async (type: 'responded' | 'pending') => {
    if (!status) return;

    // Filtrar por tipo específico
    const dataToExport = status.responses.filter(minister => 
      type === 'responded' ? minister.responded : !minister.responded
    );
    
    const filterDescription = type === 'responded' ? 'respondidos' : 'nao_respondidos';
    const title = type === 'responded' ? 'Respondidos' : 'Não Respondidos';

    try {
      const csvContent = [
        ['Nome', 'Email', 'Telefone', 'Respondido', 'Data Resposta', 'Disponibilidade'],
        ...dataToExport.map(r => [
          r.name,
          r.email,
          r.phone || '',
          r.responded ? 'Sim' : 'Não',
          r.respondedAt ? new Date(r.respondedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
          r.availability || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ministros_${filterDescription}_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;
      link.click();

      toast({
        title: 'Exportação realizada',
        description: `Exportados ${dataToExport.length} ministro(s) - ${title}`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);

      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os dados. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const formatAnswer = (answer: unknown): string => {
    // Verificar null/undefined primeiro
    if (answer === null || answer === undefined) {
      return 'Não respondido';
    }

    // Verificar se é objeto (mas não array)
    if (typeof answer === 'object' && !Array.isArray(answer)) {
      const answerObj = answer as Record<string, unknown>;
      if (answerObj.answer) {
        let result = String(answerObj.answer);
        if (answerObj.sub) {
          result += ` (${answerObj.sub})`;
        }
        return result;
      }
    }

    // Se for array
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    
    // Qualquer outro tipo
    return answer.toString();
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
              
              <div className="flex flex-wrap gap-2 ml-auto">
                <Button 
                  onClick={fetchResponseStatus} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  data-testid="button-refresh"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
                
                <Button
                  onClick={() => exportSpecificList('responded')}
                  disabled={!status || !status.templateExists || status.respondedCount === 0}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border-green-200 dark:border-green-800"
                  title="Exportar lista de ministros que responderam"
                  data-testid="button-export-responded"
                >
                  <Download className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                  <span className="hidden sm:inline">Respondidos</span>
                  <span className="sm:hidden">Resp.</span>
                </Button>

                <Button
                  onClick={() => exportSpecificList('pending')}
                  disabled={!status || !status.templateExists || status.pendingCount === 0}
                  variant="outline"
                  size="sm"
                  className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900 border-orange-200 dark:border-orange-800"
                  title="Exportar lista de ministros que não responderam"
                  data-testid="button-export-pending"
                >
                  <Download className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                  <span className="hidden sm:inline">Não Resp.</span>
                  <span className="sm:hidden">Pend.</span>
                </Button>
                
                <Button
                  onClick={exportToCSV}
                  disabled={!status || !status.templateExists}
                  variant="outline"
                  size="sm"
                  title="Exporta o CSV com todas as perguntas e respostas (respeita o filtro ativo)"
                  data-testid="button-export-csv"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informative State */}
        {!loading && status && !status.templateExists && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
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
                  scrollToList();
                }}
                data-testid="card-total-ministros"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50">
                  <CardTitle className="text-sm font-medium">
                    Total de Ministros
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                  scrollToList();
                }}
                data-testid="card-responderam"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/50">
                  <CardTitle className="text-sm font-medium">
                    Responderam
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
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
                  scrollToList();
                }}
                data-testid="card-pendentes"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950 dark:to-orange-900/50">
                  <CardTitle className="text-sm font-medium">
                    Pendentes
                  </CardTitle>
                  <UserX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
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
                  scrollToList();
                }}
                data-testid="card-taxa-resposta"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900/50">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Resposta
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
              <Card className="border-opacity-30" ref={listSectionRef}>
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
                      {filteredResponses.length === 0 ? (
                        <div className="text-center py-8 border rounded-md">
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
                        </div>
                      ) : (
                        <>
                          {/* Desktop: Table view */}
                          <div className="hidden md:block rounded-md border overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">Status</TableHead>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Telefone</TableHead>
                                  <TableHead>Disponibilidade</TableHead>
                                  <TableHead className="hidden lg:table-cell">Data Resposta</TableHead>
                                  <TableHead className="w-12">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredResponses.map((minister) => (
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
                                    <TableCell>
                                      <a 
                                        href={`mailto:${minister.email}`} 
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <Mail className="h-3 w-3" />
                                        <span className="text-xs">{minister.email}</span>
                                      </a>
                                    </TableCell>
                                    <TableCell>
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
                                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100' 
                                              : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
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
                                          {new Date(minister.respondedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
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
                                          data-testid={`button-preview-${minister.id}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile: Card view */}
                          <div className="md:hidden space-y-3">
                            {filteredResponses.map((minister) => (
                              <Card 
                                key={minister.id} 
                                className={cn(
                                  "overflow-hidden transition-all",
                                  minister.responded && "cursor-pointer hover:shadow-md"
                                )}
                                onClick={() => minister.responded && fetchDetailedResponse(minister)}
                                data-testid={`card-minister-${minister.id}`}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-2">
                                        {minister.responded ? (
                                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                        ) : (
                                          <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <h3 className="font-medium truncate">{minister.name}</h3>
                                        </div>
                                      </div>
                                      {minister.responded && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            fetchDetailedResponse(minister);
                                          }}
                                          data-testid={`button-preview-mobile-${minister.id}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>

                                    {/* Disponibilidade */}
                                    {minister.availability && (
                                      <div>
                                        <Badge 
                                          variant={minister.availability === 'Disponível' ? 'default' : 'secondary'}
                                          className={cn(
                                            minister.availability === 'Disponível' 
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                          )}
                                        >
                                          {minister.availability}
                                        </Badge>
                                      </div>
                                    )}

                                    {/* Contact info */}
                                    <div className="space-y-2 text-sm">
                                      <a 
                                        href={`mailto:${minister.email}`} 
                                        className="flex items-center gap-2 text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Mail className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{minister.email}</span>
                                      </a>
                                      
                                      {minister.phone && (
                                        <a 
                                          href={`tel:${minister.phone}`} 
                                          className="flex items-center gap-2 text-primary hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Phone className="h-4 w-4 flex-shrink-0" />
                                          <span>{minister.phone}</span>
                                        </a>
                                      )}

                                      {minister.respondedAt && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Calendar className="h-4 w-4 flex-shrink-0" />
                                          <span>Respondido em {new Date(minister.respondedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      )}
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
                    {new Date(detailedResponse.response.submittedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  {(() => {
                    try {
                      // Verificar estrutura dos dados
                      if (!detailedResponse?.template?.questions || !Array.isArray(detailedResponse.template.questions)) {
                        console.warn('[PREVIEW] No questions in template');
                        return (
                          <div className="text-center py-4 text-muted-foreground">
                            Nenhuma pergunta disponível
                          </div>
                        );
                      }

                      // Converter respostas para formato de objeto se estiverem em array
                      let responsesObj: Record<string, unknown> = {};
                      const rawResponses = detailedResponse?.response?.responses;

                      console.log('[PREVIEW] Raw responses:', rawResponses);
                      console.log('[PREVIEW] Template questions count:', detailedResponse.template.questions.length);

                      if (Array.isArray(rawResponses)) {
                        // Se for array de objetos {questionId, answer}
                        rawResponses.forEach((r: QuestionResponseItem) => {
                          if (r.questionId) {
                            responsesObj[r.questionId] = r.answer;
                          }
                        });
                      } else if (typeof rawResponses === 'object' && rawResponses !== null) {
                        // Se já for objeto
                        responsesObj = rawResponses;
                      }

                      console.log('[PREVIEW] Processed responses:', responsesObj);

                      // Mapear todas as perguntas com suas respostas
                      const questionElements = detailedResponse.template.questions
                        .map((question: QuestionItem, i: number) => {
                          // Usar question.id para buscar a resposta
                          const answer = responsesObj[question.id];

                          // Debug
                          console.log(`[PREVIEW] Question ${i}:`, {
                            id: question.id,
                            question: question.text || question.question,
                            hasAnswer: answer !== undefined && answer !== null && answer !== '',
                            answer
                          });

                          // Pular perguntas condicionais não aplicáveis
                          if (question.conditional) {
                            const parentAnswer = responsesObj[question.conditional.questionId];
                            if (parentAnswer !== question.conditional.value) {
                              console.log(`[PREVIEW] Skipping conditional question ${i} - condition not met`);
                              return null;
                            }
                          }

                          // Pular se não houver resposta (mas permitir false e 0)
                          if (answer === undefined || answer === null || answer === '') {
                            console.log(`[PREVIEW] Skipping question ${i} - no answer`);
                            return null;
                          }

                          return (
                            <div key={question.id || `q-${i}`} className="space-y-2">
                              <div className="font-medium text-sm">
                                {question.text || question.question || `Pergunta ${i + 1}`}
                              </div>
                              <div className="p-3 bg-muted/30 rounded-md">
                                <span className="text-sm">{formatAnswer(answer)}</span>
                              </div>
                            </div>
                          );
                        })
                        .filter((element): element is JSX.Element => element !== null);

                      console.log('[PREVIEW] Final question elements count:', questionElements.length);

                      return questionElements.length > 0 ? questionElements : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>Nenhuma resposta encontrada</p>
                          <p className="text-xs mt-2">
                            Total de perguntas: {detailedResponse.template.questions.length}
                          </p>
                        </div>
                      );
                    } catch (error) {
                      console.error('[PREVIEW] Error rendering responses:', error);
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
