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
  const { track, module, lesson } = useParams();
  const [location, navigate] = useLocation();
  const [mapZoom, setMapZoom] = useState(1);
  const [showMapInfo, setShowMapInfo] = useState(false);

  // Se está visualizando uma aula específica
  if (lesson) {
    return <LessonContent module={module} lesson={lesson} />;
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
                    <img 
                      src={churchMapSvg} 
                      alt="Mapa do Santuário São Judas Tadeu" 
                      className="max-w-full h-auto"
                      data-testid="img-church-map"
                    />
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
        <Tabs defaultValue="liturgia" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="liturgia" className="flex items-center gap-2">
              <Cross className="h-4 w-4" />
              Liturgia
            </TabsTrigger>
            <TabsTrigger value="espiritualidade" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Espiritualidade
            </TabsTrigger>
            <TabsTrigger value="pratica" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Prática
            </TabsTrigger>
          </TabsList>

          {/* Módulo Liturgia */}
          <TabsContent value="liturgia">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cross className="h-5 w-5 text-amber-600" />
                  Formação Litúrgica
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fundamentos da celebração eucarística e o papel do ministro extraordinário
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Church className="h-4 w-4" />
                        <span>1. A Sagrada Eucaristia</span>
                        <Badge variant="outline" className="ml-2">30 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Compreender o mistério eucarístico como fonte e ápice da vida cristã.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• A instituição da Eucaristia na Última Ceia</li>
                          <li>• O sacrifício de Cristo presente na Missa</li>
                          <li>• A presença real de Jesus na Eucaristia</li>
                          <li>• A comunhão como participação no Corpo de Cristo</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => navigate('/formation/liturgia/1')}
                            data-testid="button-start-lesson-1"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-4 w-4" />
                        <span>2. Liturgia da Missa</span>
                        <Badge variant="outline" className="ml-2">45 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Estrutura e significado das partes da celebração eucarística.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Ritos iniciais e liturgia da palavra</li>
                          <li>• Liturgia eucarística: ofertório, consagração, comunhão</li>
                          <li>• Ritos finais e envio missionário</li>
                          <li>• Sinais, símbolos e gestos litúrgicos</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => navigate('/formation/liturgia/2')}
                            data-testid="button-start-lesson-2"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>3. Ministério Extraordinário</span>
                        <Badge variant="outline" className="ml-2">40 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          O chamado e a missão do ministro extraordinário da Sagrada Comunhão.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Origem e fundamento teológico do ministério</li>
                          <li>• Diferença entre ministro ordinário e extraordinário</li>
                          <li>• Responsabilidades e limites do ministério</li>
                          <li>• A dignidade e santidade requeridas</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => navigate('/formation/liturgia/3')}
                            data-testid="button-start-lesson-3"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>4. Ano Litúrgico</span>
                        <Badge variant="outline" className="ml-2">25 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Tempos litúrgicos e suas características específicas.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Advento, Natal, Quaresma, Páscoa</li>
                          <li>• Tempo Comum e solenidades</li>
                          <li>• Cores litúrgicas e seus significados</li>
                          <li>• Adaptações sazonais na distribuição</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => navigate('/formation/liturgia/4')}
                            data-testid="button-start-lesson-4"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Módulo Espiritualidade */}
          <TabsContent value="espiritualidade">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Formação Espiritual
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Desenvolvimento da vida espiritual e relacionamento com Cristo Eucarístico
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Cross className="h-4 w-4" />
                        <span>1. Vida de Oração</span>
                        <Badge variant="outline" className="ml-2">35 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          A importância da oração na vida do ministro extraordinário.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Oração pessoal e comunitária</li>
                          <li>• Lectio Divina e meditação</li>
                          <li>• Adoração eucarística</li>
                          <li>• Preparação espiritual para o ministério</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => navigate('/formation/espiritualidade/1')}
                            data-testid="button-start-spiritual-1"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span>2. Virtudes Cristãs</span>
                        <Badge variant="outline" className="ml-2">30 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Cultivar as virtudes necessárias para o serviço eucarístico.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Humildade e serviço</li>
                          <li>• Reverência e respeito</li>
                          <li>• Caridade e compaixão</li>
                          <li>• Prudência e discrição</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => navigate('/formation/espiritualidade/2')}
                            data-testid="button-start-spiritual-2"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>3. Formação Contínua</span>
                        <Badge variant="outline" className="ml-2">25 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          O compromisso com o crescimento espiritual permanente.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Estudo das Escrituras</li>
                          <li>• Leitura espiritual</li>
                          <li>• Participação em retiros</li>
                          <li>• Acompanhamento espiritual</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => navigate('/formation/espiritualidade/3')}
                            data-testid="button-start-spiritual-3"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Módulo Prática */}
          <TabsContent value="pratica">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Formação Prática
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Orientações práticas para o exercício do ministério
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>1. Posicionamento na Igreja</span>
                        <Badge variant="outline" className="ml-2">20 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Como se posicionar adequadamente durante a celebração.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Localização nos bancos durante a Missa</li>
                          <li>• Momento adequado para se aproximar do altar</li>
                          <li>• Formação da procissão de comunhão</li>
                          <li>• Retorno ao lugar após o ministério</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate('/formation/pratica/1')}
                            data-testid="button-start-practical-1"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        <span>2. Distribuição da Comunhão</span>
                        <Badge variant="outline" className="ml-2">40 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Técnicas e cuidados na distribuição da Sagrada Comunhão.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Recebimento do cibório do celebrante</li>
                          <li>• Forma correta de segurar e apresentar a hóstia</li>
                          <li>• Fórmula: "O Corpo de Cristo" - "Amém"</li>
                          <li>• Comunhão na mão e na boca</li>
                          <li>• Cuidados com fragmentos</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate('/formation/pratica/2')}
                            data-testid="button-start-practical-2"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>3. Situações Especiais</span>
                        <Badge variant="outline" className="ml-2">25 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Como lidar com situações específicas durante o ministério.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Crianças pequenas e primeira comunhão</li>
                          <li>• Pessoas com deficiência</li>
                          <li>• Situações de queda da hóstia</li>
                          <li>• Pessoas não católicas na fila</li>
                          <li>• Comunhão aos enfermos</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate('/formation/pratica/3')}
                            data-testid="button-start-practical-3"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>4. Vestimenta e Preparação</span>
                        <Badge variant="outline" className="ml-2">15 min</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Preparação pessoal e apresentação adequada.
                        </p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Vestimenta apropriada e discreta</li>
                          <li>• Higiene das mãos e apresentação pessoal</li>
                          <li>• Jejum eucarístico</li>
                          <li>• Estado de graça e preparação espiritual</li>
                          <li>• Pontualidade e disponibilidade</li>
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate('/formation/pratica/4')}
                            data-testid="button-start-practical-4"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Aula
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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