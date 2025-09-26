import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  MapPin,
  Cross,
  Heart,
  Church,
  Star,
  Calendar,
  BookMarked,
  Shield,
  Sparkles
} from "lucide-react";
import { useParams, useLocation, Link } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FormationTrack, FormationLesson, FormationLessonSection, FormationLessonProgress } from "@shared/schema";

// Component to handle lesson content with API data
function LessonContent({ trackId, moduleId, lessonNumber }: { trackId: string; moduleId: string; lessonNumber: string }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const { data: lessonData, isLoading, error } = useQuery({
    queryKey: ['/api/formation', trackId, moduleId, lessonNumber],
  });

  // Fetch all lessons for navigation
  const { data: allLessons = [] } = useQuery<FormationLesson[]>({
    queryKey: ['/api/formation/lessons', trackId],
    enabled: !!trackId,
  });

  // Mutation to mark lesson as completed
  const markCompletedMutation = useMutation({
    mutationFn: (lessonId: string) => 
      apiRequest(`/api/formation/progress/${lessonId}`, {
        method: 'POST',
        body: JSON.stringify({ completed: true, progressPercentage: 100 }),
      }),
    onSuccess: () => {
      toast({
        title: "Aula concluída!",
        description: "Seu progresso foi registrado com sucesso.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/formation'] });
    },
    onError: (error: any) => {
      const isAuthError = error?.status === 401 || error?.message?.includes('401');
      toast({
        title: isAuthError ? "Sessão expirada" : "Erro",
        description: isAuthError 
          ? "Faça login novamente para continuar." 
          : "Não foi possível registrar o progresso. Tente novamente.",
        variant: "destructive",
      });
      
      if (isAuthError) {
        // Redirect to login after a short delay
        setTimeout(() => navigate('/login'), 2000);
      }
    },
  });

  // Helper to find adjacent lessons
  const getAdjacentLessons = () => {
    if (!allLessons || !lessonData?.lesson) return { prev: null, next: null };
    
    const currentIndex = allLessons.findIndex((l: FormationLesson) => 
      l.lessonNumber === parseInt(lessonNumber)
    );
    
    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
    };
  };

  const { prev: prevLesson, next: nextLesson } = getAdjacentLessons();

  if (isLoading) {
    return (
      <Layout title="Carregando..." subtitle="Aguarde">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Carregando conteúdo da aula...</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (error || !lessonData?.lesson) {
    return (
      <Layout title="Erro" subtitle="Não foi possível carregar a aula">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Aula não encontrada</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar o conteúdo desta aula.
              </p>
              <Button 
                onClick={() => window.history.back()} 
                className="mt-4"
                data-testid="button-back"
              >
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const { lesson, sections, progress } = lessonData;

  return (
    <Layout title={lesson.title} subtitle={`Módulo: ${lesson.moduleId}`}>
      <div className="space-y-6">
        {/* Lesson Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{lesson.title}</CardTitle>
                <p className="text-muted-foreground mt-2">{lesson.description}</p>
              </div>
              <Badge variant="outline">
                Aula {lesson.lessonNumber}
              </Badge>
            </div>
            {lesson.objectives && lesson.objectives.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Objetivos da Aula:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {lesson.objectives.map((objective: string, index: number) => (
                    <li key={index}>• {objective}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {lesson.durationMinutes} min
              </div>
              {progress && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {progress.progressPercentage}% concluído
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Lesson Sections */}
        {sections && sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section: FormationLessonSection, index: number) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{section.content}</p>
                  </div>
                  {section.estimatedMinutes && (
                    <div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      ~{section.estimatedMinutes} min
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground">Conteúdo da aula em desenvolvimento.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation and Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lesson Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Navegação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                {prevLesson ? (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/formation/${trackId}/${prevLesson.moduleId}/${prevLesson.lessonNumber}`)}
                    data-testid="button-prev-lesson"
                    className="flex-1 mr-2"
                  >
                    ← {prevLesson.title}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => window.history.back()}
                    data-testid="button-back"
                    className="flex-1 mr-2"
                  >
                    ← Voltar à Trilha
                  </Button>
                )}
                
                {nextLesson && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/formation/${trackId}/${nextLesson.moduleId}/${nextLesson.lessonNumber}`)}
                    data-testid="button-next-lesson"
                    className="flex-1 ml-2"
                  >
                    {nextLesson.title} →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress && progress.completed ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Aula Concluída</span>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => markCompletedMutation.mutate(lesson.id)}
                    disabled={markCompletedMutation.isPending}
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
                        Marcar como Concluída
                      </>
                    )}
                  </Button>
                )}
                
                {nextLesson && progress?.completed && (
                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/formation/${trackId}/${nextLesson.moduleId}/${nextLesson.lessonNumber}`)}
                    data-testid="button-continue-next"
                  >
                    Continuar para Próxima Aula →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default function Formation() {
  const { track, module, lesson } = useParams();
  const [location, navigate] = useLocation();
  const [mapZoom, setMapZoom] = useState(1);
  const [showMapInfo, setShowMapInfo] = useState(false);

  // Fetch formation tracks
  const { data: tracks = [], isLoading: tracksLoading } = useQuery<FormationTrack[]>({
    queryKey: ['/api/formation/tracks'],
  });

  // Fetch modules for specific track if viewing track modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery<FormationModule[]>({
    queryKey: ['/api/formation/modules', track],
    enabled: !!track && track !== 'library',
  });

  // Fetch lessons for specific module if viewing module lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<FormationLesson[]>({
    queryKey: ['/api/formation/lessons', track, module],
    enabled: !!track && !!module && track !== 'library',
  });

  // Se está visualizando uma aula específica
  if (lesson && track && module) {
    return <LessonContent trackId={track} moduleId={module} lessonNumber={lesson} />;
  }

  if (track === 'library') {
    return (
      <Layout 
        title="Biblioteca de Formação" 
        subtitle="Recursos e materiais de apoio para ministros"
      >
        <div className="space-y-6">
          {/* Mapa do Santuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Map className="h-5 w-5 text-neutral-accentWarm dark:text-text-gold" />
                Mapa do Santuário São Judas Tadeu
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Planta baixa para orientação dos ministros durante a distribuição da Sagrada Comunhão
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Controles do Mapa */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMapZoom(prev => Math.min(prev + 0.2, 2))}
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMapZoom(prev => Math.max(prev - 0.2, 0.5))}
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
                    onClick={() => setShowMapInfo(!showMapInfo)}
                    data-testid="button-toggle-info"
                  >
                    <Info className="h-4 w-4" />
                    {showMapInfo ? 'Ocultar' : 'Mostrar'} Orientações
                  </Button>
                </div>

                {/* Informações do Mapa */}
                {showMapInfo && (
                  <Card className="bg-gradient-to-r from-neutral-whiteBeige to-neutral-cream dark:from-dark-6 dark:to-dark-5">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Posicionamento dos Ministros
                          </h4>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• <strong>Corredores A:</strong> Ministros nas laterais dos bancos</li>
                            <li>• <strong>Corredor Central (D/P):</strong> Ministros no corredor principal</li>
                            <li>• <strong>Presbitério:</strong> Coordenação e distribuição inicial</li>
                            <li>• <strong>Capela do Santíssimo:</strong> Área reservada</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Numeração dos Bancos</h4>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• <strong>Bancos 1-3:</strong> Lado esquerdo (frente)</li>
                            <li>• <strong>Bancos 16-18:</strong> Lado direito (frente)</li>
                            <li>• <strong>Bancos 4-12:</strong> Numeração sequencial</li>
                            <li>• <strong>Bancos 13-14:</strong> Mezanino</li>
                            <li>• <strong>Cadeiras 24-26:</strong> Área posterior</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mapa SVG */}
                <div className="border rounded-lg bg-white dark:bg-gray-900 p-4 overflow-auto">
                  <div 
                    className="flex justify-center"
                    style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center top' }}
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
              </div>
            </CardContent>
          </Card>

          {/* Outros Recursos da Biblioteca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Documentos Litúrgicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-3">
                    <FileText className="h-8 w-8 text-green-600/70 dark:text-green-400/70" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">Em desenvolvimento</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Instruções, rubricas e orientações litúrgicas
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Vídeos Formativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-3">
                    <PlayCircle className="h-8 w-8 text-blue-600/70 dark:text-blue-400/70" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">Em desenvolvimento</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Tutoriais e orientações em vídeo
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Formação" 
      subtitle="Programa de capacitação e desenvolvimento espiritual"
    >
      <div className="space-y-6">
        {/* Banner de Status */}
        <Card className="bg-gradient-to-r from-neutral-whiteBeige to-neutral-cream dark:from-dark-6 dark:to-dark-5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
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
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Disponível
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Módulos de Formação */}
        {tracksLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Carregando trilhas de formação...</p>
              </div>
            </CardContent>
          </Card>
        ) : tracks && tracks.length > 0 ? (
          <Tabs defaultValue={tracks[0]?.id || "liturgia"} className="w-full">
            <TabsList className="h-auto min-h-[3rem] items-center justify-center rounded-md bg-muted p-2 text-muted-foreground grid w-full grid-cols-3 gap-1">
              {tracks.map((track: FormationTrack) => (
                <TabsTrigger 
                  key={track.id} 
                  value={track.id} 
                  className="flex flex-col items-center justify-center text-center min-h-[2.8rem] px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap overflow-hidden"
                  data-testid={`tab-${track.id}`}
                >
                  {track.id === 'liturgia' && <Cross className="h-3 w-3 sm:h-4 sm:w-4 mb-1.5 flex-shrink-0" />}
                  {track.id === 'espiritualidade' && <Heart className="h-3 w-3 sm:h-4 sm:w-4 mb-1.5 flex-shrink-0" />}
                  {track.id === 'pratica' && <Users className="h-3 w-3 sm:h-4 sm:w-4 mb-1.5 flex-shrink-0" />}
                  {!['liturgia', 'espiritualidade', 'pratica'].includes(track.id) && <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mb-1.5 flex-shrink-0" />}
                  <span className="text-center leading-tight truncate w-full font-medium">
                    {/* ✨ V3.0 - CORRIGIDO: textos curtos e responsivos */}
                    {track.id === 'liturgia' ? 'Básico' :
                     track.id === 'espiritualidade' ? 'Espiritual' :
                     track.id === 'pratica' ? 'Práticas' :
                     track.title}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Dynamic Track Content */}
            {tracks && tracks.map((track: FormationTrack) => (
              <TabsContent key={track.id} value={track.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {track.id === 'liturgia' && <Cross className="h-5 w-5 text-amber-600" />}
                      {track.id === 'espiritualidade' && <Heart className="h-5 w-5 text-red-600" />}
                      {track.id === 'pratica' && <Users className="h-5 w-5 text-blue-600" />}
                      {!['liturgia', 'espiritualidade', 'pratica'].includes(track.id) && <BookOpen className="h-5 w-5 text-green-600" />}
                      {track.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {track.description}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 pl-[18px] pr-[18px]">
                    {modulesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin h-6 w-6 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-sm text-muted-foreground">Carregando aulas...</p>
                      </div>
                    ) : modules && modules.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {modules.map((module: FormationModule, index: number) => (
                          <AccordionItem key={module.id} value={`item-${module.id}`}>
                            <AccordionTrigger className="flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 pl-[12px] pr-[12px] pt-[12px] pb-[12px]">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                <span>{index + 1}. {module.title}</span>
                                {module.estimatedDuration && (
                                  <Badge variant="outline" className="ml-2">
                                    {module.estimatedDuration} min
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 pt-2">
                                <p className="text-sm text-muted-foreground">
                                  {module.description}
                                </p>
                                <div className="flex gap-2 mt-4">
                                  <Button 
                                    size="sm" 
                                    className={`${
                                      track.id === 'liturgia' ? 'bg-amber-600 hover:bg-amber-700' :
                                      track.id === 'espiritualidade' ? 'bg-red-600 hover:bg-red-700' :
                                      'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                    onClick={() => navigate(`/formation/${track.id}/${module.id}`)}
                                    data-testid={`button-start-module-${track.id}-${module.id}`}
                                  >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Ver Aulas
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Nenhuma aula encontrada para esta trilha.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
        </Tabs>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground">Nenhuma trilha de formação encontrada.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recursos de Formação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Recursos de Formação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Videoaulas */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-3">
                    <PlayCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Videoaulas</h3>
                  <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                </div>
              </div>

              {/* Material de Apoio */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Material de Apoio</h3>
                  <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                </div>
              </div>

              {/* Encontros Presenciais */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Encontros</h3>
                  <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progresso e Avaliação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meu Progresso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-orange-600" />
                Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Liturgia</span>
                  <span className="text-muted-foreground">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Espiritualidade</span>
                  <span className="text-muted-foreground">50%</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Prática</span>
                  <span className="text-muted-foreground">25%</span>
                </div>
                <Progress value={25} className="h-2" />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Concluído</span>
                  <Badge variant="outline">50%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Award className="h-5 w-5 text-amber-600" />
                Certificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">Formação Básica</p>
                    <p className="text-xs text-muted-foreground">Concluída em 15/03/2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Formação Avançada</p>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Certificação Final</p>
                    <p className="text-xs text-muted-foreground">Disponível após conclusão</p>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                <Award className="h-4 w-4 mr-2" />
                Baixar Certificados
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações Importantes */}
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Orientações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Requisitos Básicos</h4>
                  <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• Ser católico praticante</li>
                    <li>• Idade mínima de 16 anos</li>
                    <li>• Participar da Missa dominical</li>
                    <li>• Estar em estado de graça</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Compromissos</h4>
                  <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• Pontualidade nos horários</li>
                    <li>• Participação ativa na formação</li>
                    <li>• Discrição e reverência</li>
                    <li>• Formação contínua</li>
                  </ul>
                </div>
              </div>
              <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Importante:</strong> A conclusão desta formação é obrigatória para todos os ministros extraordinários 
                  do Santuário São Judas Tadeu. O conteúdo está baseado nas diretrizes da CNBB e do Vaticano.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}