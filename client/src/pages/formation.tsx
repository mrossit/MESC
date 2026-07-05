import { Layout } from "@/components/layout";
import { isAdmin as canManageFormationRole } from "@shared/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormationQuiz } from "@/components/formation-quiz";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonNavigation } from "@/components/LessonNavigation";
import {
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  CheckCircle2,
  PlayCircle,
  FileText,
  Users,
  Map,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Cross,
  Heart,
  Shield,
  Sparkles,
  Settings,
  ArrowLeft,
  Circle,
  AlertCircle,
  Video,
  Download,
  Loader2
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useCsrfToken, addCsrfHeader } from "@/hooks/useCsrfToken";
import { getVisibleFormationTracks } from "@/lib/formationVisibility";
import FormationAdmin from "@/pages/FormationAdmin";
import type {
  FormationTrack
} from "@shared/schema";

type LessonProgress = {
  status: "not_started" | "in_progress" | "completed";
  progressPercentage: number;
  timeSpent: number;
  completedSections: string[];
};

type LessonWithProgress = {
  id: string;
  moduleId: string;
  trackId: string | null;
  title: string;
  description: string | null;
  orderIndex: number;
  lessonNumber: number;
  estimatedDuration: number | null;
  contentType: string | null;
  contentUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  progress: LessonProgress;
};

type ModuleWithStats = {
  id: string;
  trackId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  estimatedDuration: number | null;
  durationMinutes: number | null;
  content: string | null;
  videoUrl: string | null;
  isActive?: boolean;
  lessons: LessonWithProgress[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    progressPercentage: number;
  };
};

type TrackOverview = {
  id: string;
  title: string;
  description: string | null;
  category: FormationTrack["category"];
  orderIndex: number;
  isRequired: boolean;
  estimatedDuration: number | null;
  icon: string | null;
  isActive: boolean;
  modules: ModuleWithStats[];
  stats: {
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    progressPercentage: number;
  };
  nextLesson: LessonWithProgress | null;
};

type FormationOverview = {
  tracks: TrackOverview[];
  summary: {
    totalTracks: number;
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    percentageCompleted: number;
    lastUpdated: string;
  };
};

type LessonDetailResponse = {
  lesson: {
    id: string;
    moduleId: string;
    trackId: string | null;
    title: string;
    description: string | null;
    lessonNumber: number;
    estimatedDuration: number | null;
    contentType: string | null;
    contentUrl: string | null;
    videoUrl: string | null;
    documentUrl: string | null;
  };
  sections: Array<{
    id: string;
    title: string;
    content: string | null;
    contentType: string | null;
    estimatedMinutes: number | null;
    videoUrl: string | null;
    audioUrl: string | null;
    documentUrl: string | null;
    quizData: string | null;
    orderIndex: number;
  }>;
  progress: LessonProgress;
};

type CertificateStatus = {
  trackId: string;
  trackTitle: string;
  trackCategory: 'liturgia' | 'espiritualidade' | 'pratica';
  totalLessons: number;
  completedLessons: number;
  totalDurationMinutes: number;
  isCompleted: boolean;
  completionDate?: string;
  hasCertificate: boolean;
  certificateId?: string;
};

type FormationMaterialResponse = {
  title: string;
  subtitle: string;
  version: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    summary: string;
    icon: string;
    sections: string[];
    contentPath: string;
    dataPaths: string[];
  }>;
  assets: {
    maps: Array<{
      mass: string;
      ministers: number;
      particles: number;
      observation: string;
      sourcePath: string;
      assetUrl: string;
    }>;
  };
  data: {
    funcoes_escala: {
      descricao: string;
      fase_legenda: Record<string, string>;
      funcoes: Array<{
        numero: number;
        papel: string;
        categoria: string;
        resumo: string;
        responsabilidades: string[];
        fases: string[];
      }>;
      observacao_geral: string;
    };
    missas_e_particulas: {
      capacidade_igreja: number;
      regra_calculo_particulas: string;
      escala_por_missa: Array<{
        missa: string;
        ministros: number;
        eucaristias: number;
        mapa: string;
        observacao: string;
      }>;
    };
    checklists: {
      checklists: Array<{
        id: string;
        titulo: string;
        descricao: string;
        itens: string[];
      }>;
    };
    oracoes: {
      nota: string;
      oracoes: Array<{
        id: string;
        titulo: string;
        repeticoes: number;
        texto: string;
        complemento?: string;
      }>;
      oracao_na_roda: string;
    };
    cores_e_tempos: {
      cores_liturgicas: Array<{
        cor: string;
        hex: string;
        simbolismo: string;
        uso: string;
      }>;
    };
    glossario_liturgico: {
      espaco_celebrativo: Array<{ termo: string; definicao: string }>;
      vestes: Array<{ termo: string; definicao: string }>;
      objetos: Array<{ termo: string; definicao: string }>;
      montagem_calice: string[];
    };
  };
};

type CategoryMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  button: string;
  pill: string;
};

const CATEGORY_META: Record<FormationTrack["category"], CategoryMeta> = {
  liturgia: {
    label: "Liturgia",
    icon: Cross,
    accent: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700",
    pill: "bg-amber-100 text-amber-700 border-amber-300"
  },
  espiritualidade: {
    label: "Espiritualidade",
    icon: Heart,
    accent: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
    pill: "bg-red-100 text-red-700 border-red-300"
  },
  pratica: {
    label: "Prática Pastoral",
    icon: Users,
    accent: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
    pill: "bg-blue-100 text-blue-700 border-blue-300"
  }
};

function getCategoryMeta(track: { category: FormationTrack["category"] }): CategoryMeta {
  return CATEGORY_META[track.category] ?? {
    label: track.category,
    icon: BookOpen,
    accent: "text-green-600",
    button: "bg-green-600 hover:bg-green-700",
    pill: "bg-green-100 text-green-700 border-green-300"
  };
}

function formatPercentage(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  return `${Math.min(Math.max(Math.round(value), 0), 100)}%`;
}

async function fetchJson<T>(url: string, errorFallback: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include"
  });

  const raw = await response.text();
  let parsed: unknown = undefined;

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && "message" in parsed && parsed.message) ||
      (typeof parsed === "string" ? parsed : null) ||
      errorFallback;
    throw new Error(String(message));
  }

  if (parsed === undefined) {
    if (!response.ok) {
      throw new Error(errorFallback);
    }
    return {} as T;
  }

  return parsed as T;
}

const fetchFormationOverview = () =>
  fetchJson<FormationOverview>("/api/formation/overview", "Não foi possível carregar a formação.");

const fetchLessonDetail = (trackId: string, moduleId: string, lessonNumber: string) =>
  fetchJson<LessonDetailResponse>(
    `/api/formation/${encodeURIComponent(trackId)}/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonNumber)}`,
    "Não foi possível carregar os detalhes da aula."
  );

const fetchCertificateStatus = () =>
  fetchJson<CertificateStatus[]>("/api/certificates/status", "Não foi possível carregar status dos certificados.");

const fetchFormationMaterial = () =>
  fetchJson<FormationMaterialResponse>("/api/formation/material", "Não foi possível carregar a biblioteca de formação.");

interface ModuleDetailProps {
  track: TrackOverview;
  module: ModuleWithStats;
  onBack: () => void;
  onSelectLesson: (lesson: LessonWithProgress) => void;
}

function ModuleDetail({ track, module, onBack, onSelectLesson }: ModuleDetailProps) {
  const category = getCategoryMeta(track);
  const hasLessons = module.lessons.length > 0;

  return (
    <Layout
      title={module.title}
      subtitle={`Trilha: ${track.title}`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Formação
          </Button>
          <Badge variant="outline" className={category.pill}>
            {category.label}
          </Badge>
          <Badge variant="outline" className="border-green-300 text-green-700">
            {formatPercentage(module.stats.progressPercentage)} concluído
          </Badge>
        </div>

        <Card className="ios-material-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <category.icon className={`h-5 w-5 ${category.accent}`} />
              {module.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{module.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Aulas concluídas</span>
                  <span className="text-muted-foreground">
                    {module.stats.completedLessons}/{module.stats.totalLessons}
                  </span>
                </div>
                <Progress value={module.stats.progressPercentage} className="h-2" />
              </div>
              {module.durationMinutes ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Duração estimada</span>
                    <span className="text-muted-foreground">{module.durationMinutes} min</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Lições em andamento</span>
                    <span className="text-muted-foreground">
                      {module.stats.inProgressLessons}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="ios-material-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5" />
              Aulas do módulo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasLessons ? (
              module.lessons.map((lesson) => {
                const status = lesson.progress.status;
                const percentage = lesson.progress.progressPercentage;
                const statusBadge =
                  status === "completed"
                    ? { label: "Concluída", variant: "outline", className: "border-green-300 text-green-700 bg-green-50" }
                    : status === "in_progress"
                    ? { label: "Em andamento", variant: "outline", className: "border-amber-300 text-amber-700 bg-amber-50" }
                    : { label: "Não iniciada", variant: "outline", className: "border-slate-300 text-slate-600 bg-slate-50" };

                return (
                  <Card key={lesson.id} className="border-dashed hover:border-solid transition-all">
                    <CardContent className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusBadge.variant as any} className={`${statusBadge.className} text-xs`}>
                            {status === "not_started" ? <Circle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {statusBadge.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Aula {lesson.lessonNumber}
                          </span>
                        </div>
                        <h3 className="text-sm md:text-base font-semibold truncate">{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {lesson.estimatedDuration ? `${lesson.estimatedDuration} min` : "Variável"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="w-16 h-1.5" />
                            <span className="whitespace-nowrap">{formatPercentage(percentage)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        className={`w-full lg:w-auto ${category.button} flex-shrink-0`}
                        onClick={() => onSelectLesson(lesson)}
                        data-testid={`button-open-lesson-${lesson.id}`}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Acessar conteúdo</span>
                        <span className="sm:hidden">Acessar</span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este módulo ainda não possui aulas cadastradas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface LessonContentProps {
  trackId: string;
  moduleId: string;
  lessonNumber: string;
  lessons: LessonWithProgress[];
  trackTitle: string;
  moduleTitle: string;
}

function LessonContent({
  trackId,
  moduleId,
  lessonNumber,
  lessons,
  trackTitle,
  moduleTitle
}: LessonContentProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClientInstance = useQueryClient();
  const { csrfToken, isLoading: csrfLoading } = useCsrfToken();
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const lessonNumberInt = Number(lessonNumber);
  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.lessonNumber - b.lessonNumber),
    [lessons]
  );

  const { data: lessonData, isLoading, error } = useQuery<LessonDetailResponse>({
    queryKey: ['/api/formation', trackId, moduleId, lessonNumber],
    queryFn: () => fetchLessonDetail(trackId, moduleId, lessonNumber),
    enabled: Boolean(trackId && moduleId && lessonNumber)
  });

  const markCompletedMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!csrfToken) {
        throw new Error("Token CSRF indisponível. Atualize a página e tente novamente.");
      }

      const response = await fetch(`/api/formation/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include'
      });

      if (!response.ok) {
        const message = (await response.text()) || 'Não foi possível registrar o progresso.';
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Aula concluída!",
        description: "Seu progresso foi registrado com sucesso."
      });
      queryClientInstance.invalidateQueries({ queryKey: ['/api/formation/overview'] });
      queryClientInstance.invalidateQueries({ queryKey: ['/api/formation', trackId, moduleId, lessonNumber] });
    },
    onError: (err: Error) => {
      const message = err?.message || "Não foi possível registrar o progresso. Tente novamente.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive"
      });
      if (message.includes("401")) {
        setTimeout(() => navigate('/login'), 2000);
      }
    }
  });

  const navigationHelpers = useMemo(() => {
    const currentIndex = sortedLessons.findIndex(
      (lesson) => lesson.lessonNumber === lessonNumberInt
    );
    return {
      prev: currentIndex > 0 ? sortedLessons[currentIndex - 1] : null,
      next: currentIndex >= 0 && currentIndex < sortedLessons.length - 1
        ? sortedLessons[currentIndex + 1]
        : null
    };
  }, [sortedLessons, lessonNumberInt]);

  const handleQuizComplete = (score: number, passed: boolean) => {
    setQuizScore(score);
    setQuizCompleted(true);

    toast({
      title: passed ? "Quiz concluído!" : "Quiz concluído",
      description: passed
        ? `Parabéns! Você obteve ${score}% de acerto.`
        : `Você obteve ${score}%. Revise o conteúdo e tente novamente.`,
      variant: passed ? "default" : "destructive"
    });
  };

  if (isLoading) {
    return (
      <Layout title="Carregando..." subtitle="Aguarde">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Carregando conteúdo da aula...</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (error || !lessonData?.lesson) {
    return (
      <Layout title="Aula não encontrada" subtitle={`Trilha: ${trackTitle}`}>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Conteúdo indisponível</h2>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar esta aula. Tente novamente mais tarde ou retorne ao módulo.
            </p>
            <Button onClick={() => navigate(`/formation/${trackId}/${moduleId}`)}>
              Voltar ao módulo
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const { lesson, sections, progress } = lessonData;

  return (
    <Layout
      title={lesson.title}
      subtitle={`Trilha: ${trackTitle} • Módulo: ${moduleTitle}`}
    >
      <div className="space-y-6 pb-24 md:pb-28">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{lesson.title}</CardTitle>
                {lesson.description && (
                  <p className="text-muted-foreground mt-2">{lesson.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Aula {lesson.lessonNumber}</Badge>
                <Badge variant="outline">
                  {lesson.estimatedDuration ? `${lesson.estimatedDuration} min` : "Duração variável"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
              <Clock className="h-4 w-4" />
              Progresso: {formatPercentage(progress.progressPercentage)}
            </div>
          </CardHeader>
        </Card>

        {/* Vídeo da Aula */}
        {lesson.videoUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Video className="h-4 w-4 text-blue-600" />
              Vídeo da Aula
            </div>
            <VideoPlayer url={lesson.videoUrl} title={lesson.title} />
          </div>
        )}

        <div className="space-y-4">
          {sections && sections.length > 0 ? (
            sections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vídeo da Seção */}
                  {section.videoUrl && (
                    <VideoPlayer url={section.videoUrl} />
                  )}

                  {section.content && (
                    <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
                      {section.content}
                    </div>
                  )}
                  {section.estimatedMinutes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      ~{section.estimatedMinutes} min
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Conteúdo desta aula em desenvolvimento.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quiz Section */}
        {sections && sections.some(s => s.quizData) && !quizCompleted && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Avaliação de Conhecimento</h2>
            <FormationQuiz
              quizData={sections.find(s => s.quizData)?.quizData as any}
              onComplete={handleQuizComplete}
              onSkip={() => setQuizCompleted(true)}
            />
          </div>
        )}

        {quizCompleted && quizScore !== null && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✅ Quiz concluído com {quizScore}% de acerto
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {progress.status === "completed" ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  Aula concluída com sucesso
                </div>
              ) : (
                <>
                  {sections && sections.some(s => s.quizData) && !quizCompleted && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Complete o quiz de avaliação para marcar esta aula como concluída.
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => markCompletedMutation.mutate(lesson.id)}
                    disabled={
                      markCompletedMutation.isPending ||
                      csrfLoading ||
                      !csrfToken ||
                      (sections && sections.some(s => s.quizData) && !quizCompleted)
                    }
                    data-testid="button-complete-lesson"
                  >
                    {markCompletedMutation.isPending ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como concluída
                      </>
                    )}
                  </Button>
                </>
              )}

              {navigationHelpers.next && progress.status === "completed" && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() =>
                    navigate(`/formation/${trackId}/${moduleId}/${navigationHelpers.next!.lessonNumber}`)
                  }
                >
                  Continuar para próxima aula →
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navegação Flutuante */}
        <LessonNavigation
          prevLesson={navigationHelpers.prev}
          nextLesson={navigationHelpers.next}
          onPrev={navigationHelpers.prev ? () =>
            navigate(`/formation/${trackId}/${moduleId}/${navigationHelpers.prev!.lessonNumber}`)
            : undefined
          }
          onNext={navigationHelpers.next ? () =>
            navigate(`/formation/${trackId}/${moduleId}/${navigationHelpers.next!.lessonNumber}`)
            : undefined
          }
          onBackToModule={() => navigate(`/formation/${trackId}/${moduleId}`)}
          position="fixed"
        />
      </div>
    </Layout>
  );
}

export default function Formation() {
  const { track: trackParam, module: moduleParam, lesson: lessonParam } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [mapZoom, setMapZoom] = useState(1);
  const [showMapInfo, setShowMapInfo] = useState(false);
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [adminMode, setAdminMode] = useState(false);

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe()
  });

  const user = authData?.user;
  const canManageFormation = canManageFormationRole(user?.role);

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError
  } = useQuery<FormationOverview>({
    queryKey: ['/api/formation/overview'],
    queryFn: fetchFormationOverview
  });

  const {
    data: certificateStatus,
    isLoading: certificateStatusLoading
  } = useQuery<CertificateStatus[]>({
    queryKey: ['/api/certificates/status'],
    queryFn: fetchCertificateStatus,
    enabled: !!overview
  });

  const {
    data: formationMaterial,
    isLoading: formationMaterialLoading,
    error: formationMaterialError
  } = useQuery<FormationMaterialResponse>({
    queryKey: ['/api/formation/material'],
    queryFn: fetchFormationMaterial,
    retry: 1
  });

  const allTracks = overview?.tracks ?? [];
  const tracks = useMemo(() => {
    return getVisibleFormationTracks(allTracks, canManageFormation);
  }, [allTracks, canManageFormation]);
  const summary = overview?.summary;
  const selectedFormationMap = formationMaterial?.assets.maps[selectedMapIndex] ?? formationMaterial?.assets.maps[0];

  useEffect(() => {
    if (formationMaterial && selectedMapIndex >= formationMaterial.assets.maps.length) {
      setSelectedMapIndex(0);
    }
  }, [formationMaterial, selectedMapIndex]);

  // Helper to get certificate status for a track
  const getCertificateStatusForTrack = (trackId: string) => {
    return certificateStatus?.find(s => s.trackId === trackId);
  };

  const { csrfToken } = useCsrfToken();
  const queryClientInstance = useQueryClient();

  // Mutation to issue certificate
  const issueCertificateMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await fetch('/api/certificates/issue', {
        method: 'POST',
        credentials: 'include',
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        body: JSON.stringify({ trackId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao emitir certificado');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/certificates/status'] });
      toast({
        title: 'Certificado emitido!',
        description: 'Seu certificado foi gerado com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao emitir certificado',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Function to download certificate PDF
  const downloadCertificate = async (certificateId: string, trackTitle: string) => {
    try {
      const response = await fetch(`/api/certificates/${certificateId}/pdf`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao baixar certificado');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${trackTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download iniciado',
        description: 'Seu certificado está sendo baixado.'
      });
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar o certificado.',
        variant: 'destructive'
      });
    }
  };

  const selectedTrack = trackParam ? tracks.find((t) => t.id === trackParam) : undefined;
  const selectedModule = selectedTrack && moduleParam
    ? selectedTrack.modules.find((m) => m.id === moduleParam)
    : undefined;

  // Handle invalid track redirect (must be in useEffect to avoid render loop)
  useEffect(() => {
    if (trackParam && !selectedTrack) {
      const tracksToShowError = ['spirituality', 'library'];

      if (tracksToShowError.includes(trackParam)) {
        toast({
          title: "Trilha não encontrada",
          description: "Redirecionamos você para a página principal de formação.",
          variant: "destructive"
        });
      }

      navigate('/formation');
    }
  }, [trackParam, selectedTrack, toast, navigate]);

  if (overviewLoading) {
    return (
      <Layout title="Formação" subtitle="Carregando trilhas...">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Carregando conteúdo de formação...</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (overviewError || !overview) {
    return (
      <Layout title="Formação" subtitle="Não foi possível carregar os dados">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Erro ao carregar a formação</h2>
            <p className="text-sm text-muted-foreground">
              Verifique sua conexão ou tente novamente mais tarde.
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/formation/overview'] })}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (lessonParam && selectedTrack && selectedModule) {
    return (
      <LessonContent
        trackId={selectedTrack.id}
        moduleId={selectedModule.id}
        lessonNumber={lessonParam}
        lessons={selectedModule.lessons}
        trackTitle={selectedTrack.title}
        moduleTitle={selectedModule.title}
      />
    );
  }

  if (trackParam && moduleParam && selectedTrack && selectedModule) {
    return (
      <ModuleDetail
        track={selectedTrack}
        module={selectedModule}
        onBack={() => navigate('/formation')}
        onSelectLesson={(lesson) =>
          navigate(`/formation/${selectedTrack.id}/${selectedModule.id}/${lesson.lessonNumber}`)
        }
      />
    );
  }

  if (adminMode && canManageFormation) {
    return <FormationAdmin onExit={() => setAdminMode(false)} />;
  }

  return (
    <Layout
      title="Formação"
      subtitle="Programa de capacitação e desenvolvimento espiritual"
    >
      <div className="space-y-6">
        <Card className="ios-material-card border-0">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="liquid-glass-chip w-12 h-12 rounded-full flex items-center justify-center">
                  <Cross className="h-6 w-6 text-neutral-neutral dark:text-text-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-textDark dark:text-text-light">
                    Formação para Ministros Extraordinários
                  </h2>
                  <p className="text-neutral-textMedium dark:text-text-light/70 text-sm mt-1">
                    Capacitação completa para o serviço da Sagrada Comunhão
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {formatPercentage(summary?.percentageCompleted)} concluído
                </Badge>
                {canManageFormation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdminMode(true)}
                    data-testid="button-open-admin-mode"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar aulas
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel geral */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="ios-material-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                Panorama da Formação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Trilhas ativas</span>
                  <span className="font-medium">{summary?.totalTracks ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Módulos disponíveis</span>
                  <span className="font-medium">{summary?.totalModules ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Aulas concluídas</span>
                  <span className="font-medium">
                    {summary?.completedLessons ?? 0} / {summary?.totalLessons ?? 0}
                  </span>
                </div>
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Progresso geral</span>
                    <span className="text-muted-foreground">
                      {formatPercentage(summary?.percentageCompleted)}
                    </span>
                  </div>
                  <Progress value={summary?.percentageCompleted ?? 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Última atualização:{" "}
                    {summary?.lastUpdated
                      ? new Date(summary.lastUpdated).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ios-material-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Shield className="h-5 w-5 text-blue-600" />
                Próximos passos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tracks.map((track) => {
                const category = getCategoryMeta(track);
                const nextLesson = track.nextLesson;
                return (
                  <Card key={track.id} className="liquid-glass-chip border-0">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <category.icon className={`h-4 w-4 ${category.accent}`} />
                        {track.title}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{formatPercentage(track.stats.progressPercentage)}</span>
                        </div>
                        <Progress value={track.stats.progressPercentage} className="h-1.5" />
                      </div>
                      {nextLesson ? (
                        <Button
                          size="sm"
                          className={`${category.button} w-full`}
                          onClick={() =>
                            navigate(`/formation/${track.id}/${nextLesson.moduleId}/${nextLesson.lessonNumber}`)
                          }
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Continuar: {nextLesson.title}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="justify-center w-full border-green-300 text-green-700">
                          Trilha concluída
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          <Card className="ios-material-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Award className="h-5 w-5 text-amber-600" />
                Certificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Complete as trilhas para emitir certificados de formação.
              </p>
              <div className="grid gap-3">
                {tracks.map((track) => {
                  const certStatus = getCertificateStatusForTrack(track.id);
                  const isCompleted = track.stats.completedLessons === track.stats.totalLessons && track.stats.totalLessons > 0;
                  const hasCertificate = certStatus?.hasCertificate;
                  const isIssuingThis = issueCertificateMutation.isPending &&
                    issueCertificateMutation.variables === track.id;

                  return (
                    <div key={track.id} className="formation-glass-panel flex items-center justify-between gap-3 rounded-xl p-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {hasCertificate ? (
                          <Award className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasCertificate ? (
                              <span className="text-amber-600">Certificado emitido</span>
                            ) : isCompleted ? (
                              <span className="text-green-600">Pronto para certificar</span>
                            ) : (
                              `${track.stats.completedLessons}/${track.stats.totalLessons} aulas`
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {hasCertificate && certStatus?.certificateId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => downloadCertificate(certStatus.certificateId!, track.title)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                        ) : isCompleted ? (
                          <Button
                            size="sm"
                            className="h-8 bg-amber-600 hover:bg-amber-700"
                            disabled={isIssuingThis}
                            onClick={() => issueCertificateMutation.mutate(track.id)}
                          >
                            {isIssuingThis ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Award className="h-3 w-3 mr-1" />
                            )}
                            Emitir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {certificateStatusLoading && (
                <div className="flex items-center justify-center py-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando status...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs com trilhas e módulos */}
        <Card className="ios-material-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Trilhas de formação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tracks.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma trilha de formação disponível no momento.
              </div>
            ) : (
              <Tabs defaultValue={tracks[0].id} className="w-full">
                <TabsList className="formation-native-tabs liquid-glass-chip border-0" data-columns="3">
                  {tracks.map((track) => {
                    const category = getCategoryMeta(track);
                    return (
                      <TabsTrigger
                        key={track.id}
                        value={track.id}
                        className="formation-native-trigger flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm"
                      >
                        <category.icon className={`h-4 w-4 flex-shrink-0 ${category.accent}`} />
                        <span className="min-w-0 text-center font-medium leading-tight">{track.title}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {tracks.map((track) => {
                  const category = getCategoryMeta(track);
                  return (
                    <TabsContent key={track.id} value={track.id} className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={category.pill}>
                          {category.label}
                        </Badge>
                        <Badge variant="outline">
                          {track.stats.totalModules} módulos • {track.stats.totalLessons} aulas
                        </Badge>
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          {formatPercentage(track.stats.progressPercentage)} concluído
                        </Badge>
                      </div>

                      <Accordion type="single" collapsible className="w-full space-y-3">
                        {track.modules.map((module) => (
                          <AccordionItem key={module.id} value={module.id} className="formation-glass-panel rounded-xl border-0">
                            <AccordionTrigger className="px-3 py-4 text-left hover:no-underline">
                              <div className="flex flex-col gap-1 text-left w-full">
                                <div className="flex flex-wrap items-center gap-2">
                                  <BookOpen className="h-4 w-4 flex-shrink-0" />
                                  <span className="min-w-0 font-medium">{module.title}</span>
                                  <Badge variant="outline" className="liquid-glass-chip border-0">
                                    {module.stats.completedLessons}/{module.stats.totalLessons} aulas
                                  </Badge>
                                </div>
                                {module.description && (
                                  <span className="text-xs text-muted-foreground text-left">
                                    {module.description}
                                  </span>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 p-3 pt-0">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Progresso do módulo</span>
                                    <span>{formatPercentage(module.stats.progressPercentage)}</span>
                                  </div>
                                  <Progress value={module.stats.progressPercentage} className="h-1.5" />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    className={`${category.button} w-full sm:w-auto`}
                                    onClick={() => navigate(`/formation/${track.id}/${module.id}`)}
                                    data-testid={`button-open-module-${module.id}`}
                                  >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Ver aulas do módulo
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Biblioteca */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Map className="h-5 w-5 text-neutral-accentWarm dark:text-text-gold" />
              Biblioteca de Formação
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Recursos e materiais de apoio para ministros
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {formationMaterialLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando biblioteca oficial...
              </div>
            ) : formationMaterialError || !formationMaterial ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Biblioteca oficial indisponível no momento.</p>
                    <p className="mt-1">
                      Os módulos de formação continuam disponíveis. A biblioteca de mapas,
                      funções e checklists aparecerá assim que o backend publicado responder.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="liquid-glass-chip border-0 text-amber-700 dark:text-text-gold">
                    {formationMaterial.version}
                  </Badge>
                  <Badge variant="outline" className="liquid-glass-chip border-0">
                    {formationMaterial.modules.length} módulos
                  </Badge>
                  <Badge variant="outline" className="liquid-glass-chip border-0">
                    {formationMaterial.data.funcoes_escala.funcoes.length} funções
                  </Badge>
                  <Badge variant="outline" className="liquid-glass-chip border-0">
                    {formationMaterial.data.checklists.checklists.length} checklists
                  </Badge>
                </div>

                <Tabs defaultValue="maps" className="w-full">
                  <TabsList className="formation-native-tabs liquid-glass-chip border-0">
                    <TabsTrigger value="maps" className="formation-native-trigger flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm">
                      <Map className="h-4 w-4 flex-shrink-0" />
                      <span className="leading-tight">Mapas</span>
                    </TabsTrigger>
                    <TabsTrigger value="masses" className="formation-native-trigger flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm">
                      <Cross className="h-4 w-4 flex-shrink-0" />
                      <span className="leading-tight">Missas</span>
                    </TabsTrigger>
                    <TabsTrigger value="functions" className="formation-native-trigger flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="leading-tight">Funções</span>
                    </TabsTrigger>
                    <TabsTrigger value="checklists" className="formation-native-trigger flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span className="leading-tight">Checklists</span>
                    </TabsTrigger>
                    <TabsTrigger value="reference" className="formation-native-trigger flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm">
                      <BookOpen className="h-4 w-4 flex-shrink-0" />
                      <span className="leading-tight">Referência</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="maps" className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {formationMaterial.assets.maps.map((map, index) => (
                          <Button
                            key={`${map.mass}-${map.sourcePath}`}
                            variant={index === selectedMapIndex ? "default" : "outline"}
                            size="sm"
                            className={index === selectedMapIndex ? "min-w-0" : "liquid-glass-chip min-w-0 border-0"}
                            onClick={() => {
                              setSelectedMapIndex(index);
                              setMapZoom(1);
                            }}
                          >
                            <span className="truncate">{map.mass}</span>
                          </Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="liquid-glass-chip border-0"
                          onClick={() => setMapZoom((prev) => Math.min(prev + 0.2, 2))}
                          data-testid="button-zoom-in"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="liquid-glass-chip border-0"
                          onClick={() => setMapZoom((prev) => Math.max(prev - 0.2, 0.5))}
                          data-testid="button-zoom-out"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="liquid-glass-chip border-0"
                          onClick={() => setMapZoom(1)}
                          data-testid="button-zoom-reset"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="liquid-glass-chip border-0"
                          onClick={() => setShowMapInfo((prev) => !prev)}
                          data-testid="button-toggle-info"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {selectedFormationMap && (
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="formation-glass-panel overflow-hidden rounded-xl p-3 sm:p-4">
                          <div
                            className="flex min-h-[280px] items-start justify-center sm:min-h-[360px]"
                            style={{ transform: `scale(${mapZoom})`, transformOrigin: "center top" }}
                          >
                            <img
                              src={selectedFormationMap.assetUrl}
                              alt={`Mapa de posição - ${selectedFormationMap.mass}`}
                              className="max-h-[560px] w-full max-w-full rounded-lg border border-white/50 bg-white object-contain shadow-sm"
                              data-testid="formation-map-image"
                            />
                          </div>
                        </div>
                        <div className="formation-glass-panel rounded-xl p-4 space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Missa</p>
                            <p className="font-semibold">{selectedFormationMap.mass}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ministros</p>
                              <p className="text-lg font-bold">{selectedFormationMap.ministers}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Partículas</p>
                              <p className="text-lg font-bold">{selectedFormationMap.particles}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{selectedFormationMap.observation}</p>
                          {showMapInfo && (
                            <p className="text-sm text-muted-foreground">
                              {formationMaterial.data.missas_e_particulas.regra_calculo_particulas}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="masses" className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {formationMaterial.data.missas_e_particulas.escala_por_missa.map((mass) => (
                        <div key={mass.missa} className="formation-glass-panel rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{mass.missa}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{mass.observacao}</p>
                            </div>
                            <Badge variant="outline">{mass.ministros} ministros</Badge>
                          </div>
                          <div className="mt-4 flex items-center gap-3 text-sm">
                            <span className="liquid-glass-chip rounded-md border-0 px-2 py-1 font-medium">
                              {mass.eucaristias} partículas
                            </span>
                            <span className="text-muted-foreground">
                              Igreja: {formationMaterial.data.missas_e_particulas.capacidade_igreja} lugares
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="functions" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {formationMaterial.data.funcoes_escala.descricao}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {formationMaterial.data.funcoes_escala.funcoes.map((funcao) => (
                        <div key={funcao.numero} className="formation-glass-panel rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Badge variant="outline" className="mb-2">Nº {funcao.numero}</Badge>
                              <h3 className="font-semibold">{funcao.papel}</h3>
                              <p className="text-sm text-muted-foreground">{funcao.resumo}</p>
                            </div>
                            <Badge variant="outline">{funcao.categoria}</Badge>
                          </div>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {funcao.responsabilidades.slice(0, 3).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="checklists" className="space-y-3">
                    <Accordion type="single" collapsible className="w-full space-y-3">
                      {formationMaterial.data.checklists.checklists.map((checklist) => (
                        <AccordionItem key={checklist.id} value={checklist.id} className="formation-glass-panel rounded-xl border-0">
                          <AccordionTrigger className="px-3 text-left hover:no-underline">
                            <div>
                              <span className="font-medium">{checklist.titulo}</span>
                              <p className="text-xs text-muted-foreground">{checklist.descricao}</p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-2 px-3 pb-3 text-sm text-muted-foreground">
                              {checklist.itens.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>

                  <TabsContent value="reference" className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {formationMaterial.data.cores_e_tempos.cores_liturgicas.map((cor) => (
                        <div key={cor.cor} className="formation-glass-panel rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-8 w-8 rounded-full border shadow-sm"
                              style={{ backgroundColor: cor.hex }}
                            />
                            <div>
                              <h3 className="font-semibold">{cor.cor}</h3>
                              <p className="text-xs text-muted-foreground">{cor.uso}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">{cor.simbolismo}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="formation-glass-panel rounded-xl p-4">
                        <h3 className="font-semibold">Orações</h3>
                        <div className="mt-3 space-y-3">
                          {formationMaterial.data.oracoes.oracoes.map((oracao) => (
                            <div key={oracao.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                              <p className="font-medium">{oracao.titulo}</p>
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{oracao.texto}</p>
                              {oracao.complemento && (
                                <p className="mt-1 text-sm text-muted-foreground">{oracao.complemento}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="formation-glass-panel rounded-xl p-4">
                        <h3 className="font-semibold">Glossário litúrgico</h3>
                        <div className="mt-3 space-y-3">
                          {[
                            ...formationMaterial.data.glossario_liturgico.espaco_celebrativo,
                            ...formationMaterial.data.glossario_liturgico.vestes,
                            ...formationMaterial.data.glossario_liturgico.objetos,
                          ].slice(0, 12).map((termo) => (
                            <div key={`${termo.termo}-${termo.definicao}`}>
                              <p className="font-medium">{termo.termo}</p>
                              <p className="text-sm text-muted-foreground">{termo.definicao}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
