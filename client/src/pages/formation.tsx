import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormationQuiz } from "@/components/formation-quiz";
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
  AlertCircle
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useCsrfToken, addCsrfHeader } from "@/hooks/useCsrfToken";
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
    orderIndex: number;
  }>;
  progress: LessonProgress;
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

        <Card>
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

        <Card>
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
                  <Card key={lesson.id} className="border-dashed">
                    <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadge.variant as any} className={statusBadge.className}>
                            {status === "not_started" ? <Circle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {statusBadge.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Aula {lesson.lessonNumber}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold">{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground">{lesson.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.estimatedDuration ? `${lesson.estimatedDuration} min` : "Duração variável"}
                          </div>
                          <div>{formatPercentage(percentage)} concluído</div>
                        </div>
                      </div>
                      <Button
                        className={`w-full md:w-auto ${category.button}`}
                        onClick={() => onSelectLesson(lesson)}
                        data-testid={`button-open-lesson-${lesson.id}`}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Acessar conteúdo
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
    onError: (err: any) => {
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
      <div className="space-y-6">
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

        <div className="space-y-4">
          {sections && sections.length > 0 ? (
            sections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                    {section.content}
                  </div>
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
              <CardTitle className="text-lg">Navegação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {navigationHelpers.prev ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      navigate(`/formation/${trackId}/${moduleId}/${navigationHelpers.prev!.lessonNumber}`)
                    }
                  >
                    ← {navigationHelpers.prev.title}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/formation/${trackId}/${moduleId}`)}
                  >
                    ← Voltar ao módulo
                  </Button>
                )}
                {navigationHelpers.next && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      navigate(`/formation/${trackId}/${moduleId}/${navigationHelpers.next!.lessonNumber}`)
                    }
                  >
                    {navigationHelpers.next.title} →
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {sortedLessons.length} aulas neste módulo
              </div>
            </CardContent>
          </Card>

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
  const [adminMode, setAdminMode] = useState(false);

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe()
  });

  const user = authData?.user;
  const isAdmin = user?.role === "coordenador" || user?.role === "gestor";

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError
  } = useQuery<FormationOverview>({
    queryKey: ['/api/formation/overview'],
    queryFn: fetchFormationOverview
  });

  const tracks = overview?.tracks ?? [];
  const summary = overview?.summary;

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

  if (adminMode && isAdmin) {
    return <FormationAdmin />;
  }

  return (
    <Layout
      title="Formação"
      subtitle="Programa de capacitação e desenvolvimento espiritual"
    >
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-neutral-whiteBeige to-neutral-cream dark:from-dark-6 dark:to-dark-5">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-neutral-badgeNeutral dark:bg-dark-5 rounded-full flex items-center justify-center">
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
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdminMode(true)}
                    data-testid="button-open-admin-mode"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Área Administrativa
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel geral */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card>
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
                      ? new Date(summary.lastUpdated).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                  <Card key={track.id} className="border-dashed">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Award className="h-5 w-5 text-amber-600" />
                Certificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Complete todas as trilhas obrigatórias para habilitar a emissão de certificados de formação.
              </p>
              <div className="grid gap-3">
                {tracks.map((track) => (
                  <div key={track.id} className="flex items-start gap-3">
                    {track.stats.completedLessons === track.stats.totalLessons && track.stats.totalLessons > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{track.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {track.stats.completedLessons}/{track.stats.totalLessons} aulas concluídas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" disabled>
                <Award className="h-4 w-4 mr-2" />
                Baixar certificados (em breve)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com trilhas e módulos */}
        <Card>
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
                <div className="overflow-x-auto pb-2">
                  <TabsList className="inline-flex w-auto min-w-full bg-muted p-2 gap-2">
                    {tracks.map((track) => {
                      const category = getCategoryMeta(track);
                      return (
                        <TabsTrigger
                          key={track.id}
                          value={track.id}
                          className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                        >
                          <category.icon className={`h-4 w-4 ${category.accent}`} />
                          <span className="font-medium">{track.title}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

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

                      <Accordion type="single" collapsible className="w-full">
                        {track.modules.map((module) => (
                          <AccordionItem key={module.id} value={module.id}>
                            <AccordionTrigger className="py-4 px-3 text-left">
                              <div className="flex flex-col gap-1 text-left w-full">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  <span className="font-medium">{module.title}</span>
                                  <Badge variant="outline">
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
                                    className={`${category.button}`}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMapZoom((prev) => Math.min(prev + 0.2, 2))}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMapZoom((prev) => Math.max(prev - 0.2, 0.5))}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMapZoom(1)}
                  data-testid="button-zoom-reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMapInfo((prev) => !prev)}
                data-testid="button-toggle-info"
              >
                <Info className="h-4 w-4 mr-2" />
                {showMapInfo ? "Ocultar orientações" : "Mostrar orientações"}
              </Button>
            </div>

            {showMapInfo && (
              <Card className="bg-gradient-to-r from-neutral-whiteBeige to-neutral-cream dark:from-dark-6 dark:to-dark-5">
                <CardContent className="p-4 space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold">Posicionamento dos ministros</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Corredores laterais: distribuição principal da comunhão</li>
                      <li>• Corredor central: apoio e fluidez das filas</li>
                      <li>• Presbitério: início da distribuição e reposição de âmbulas</li>
                      <li>• Capela do Santíssimo: atendimento especial</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mt-2">Numeração dos bancos</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Bancos 1-3: região frontal esquerda</li>
                      <li>• Bancos 16-18: região frontal direita</li>
                      <li>• Bancos 4-12: nave central</li>
                      <li>• Bancos 13-14: mezanino</li>
                      <li>• Cadeiras 24-26: área posterior</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="border rounded-lg bg-white dark:bg-gray-900 p-4 overflow-auto">
              <div
                className="flex justify-center"
                style={{ transform: `scale(${mapZoom})`, transformOrigin: "center top" }}
              >
                <div
                  className="w-full max-w-2xl h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600"
                  data-testid="placeholder-church-map"
                >
                  <div className="text-center">
                    <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Mapa do Santuário</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Em desenvolvimento</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5 text-green-600" />
                    Documentos litúrgicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  Conteúdo em curadoria. Em breve disponibilizaremos materiais oficiais da CNBB e orientações paroquiais.
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <PlayCircle className="h-5 w-5 text-blue-600" />
                    Vídeos formativos
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  Estamos produzindo novos conteúdos audiovisuais para complementar a formação teórica.
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
