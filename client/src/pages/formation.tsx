import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  Award, 
  Clock, 
  CheckCircle2,
  PlayCircle,
  FileText,
  Users
} from "lucide-react";

export default function Formation() {
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
                  <GraduationCap className="h-6 w-6 text-neutral-neutral dark:text-text-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-textDark dark:text-text-light">
                    Programa de Formação MESC
                  </h2>
                  <p className="text-neutral-textMedium dark:text-text-light/70 text-sm mt-1">
                    Desenvolvimento contínuo para ministros extraordinários
                  </p>
                </div>
              </div>
              <Badge variant="gold">
                Em Desenvolvimento
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Módulos de Formação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Módulo Básico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BookOpen className="h-5 w-5 text-neutral-accentWarm dark:text-text-gold" />
                Módulo Básico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-20 h-20 bg-neutral-accentWarm/10 dark:bg-dark-gold/20 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-10 w-10 text-neutral-accentWarm/50 dark:text-gray-600" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">Em desenvolvimento</p>
                <p className="text-sm text-muted-foreground/70 max-w-sm">
                  Fundamentos da Eucaristia e do ministério extraordinário
                </p>
                <div className="mt-4 flex gap-2">
                  <Badge variant="outline" className="text-xs">8 aulas</Badge>
                  <Badge variant="outline" className="text-xs">16 horas</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Módulo Avançado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Award className="h-5 w-5 text-neutral-accentSoft dark:text-text-gold" />
                Módulo Avançado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-20 h-20 bg-neutral-badgeSoft dark:bg-dark-3 rounded-full flex items-center justify-center mb-4">
                  <Award className="h-10 w-10 text-neutral-accentSoft/70 dark:text-gray-600" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">Em desenvolvimento</p>
                <p className="text-sm text-muted-foreground/70 max-w-sm">
                  Aprofundamento teológico e litúrgico
                </p>
                <div className="mt-4 flex gap-2">
                  <Badge variant="outline" className="text-xs">12 aulas</Badge>
                  <Badge variant="outline" className="text-xs">24 horas</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Progresso e Certificação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meu Progresso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-neutral-peanut dark:text-text-gold" />
                Meu Progresso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-orange-500/70" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">Em desenvolvimento</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">
                  Acompanhe seu avanço nos módulos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Certificados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-neutral-neutral dark:text-text-gold" />
                Certificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500/70" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">Em desenvolvimento</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">
                  Certificados de conclusão dos módulos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informativo */}
        <Card className="bg-gradient-to-r from-neutral-peachCream to-neutral-badgeWarm dark:from-dark-5 dark:to-dark-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-textDark dark:text-text-light">
              Sobre o Programa de Formação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-amber-900 dark:text-amber-400 font-medium">Formação Contínua</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
                    O programa está sendo desenvolvido para oferecer formação completa e atualizada
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-amber-900 dark:text-amber-400 font-medium">Conteúdo Digital</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
                    Todo o material será disponibilizado online para acesso a qualquer momento
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-amber-900 dark:text-amber-400 font-medium">Lançamento em Breve</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
                    Aguarde novidades sobre o início das turmas de formação
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}