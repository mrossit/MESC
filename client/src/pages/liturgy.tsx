/**
 * Daily Liturgy Page
 * Full liturgy page with readings, psalm, gospel and reflections
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Calendar, ExternalLink, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface LiturgyReading {
  reference: string;
  text?: string;
}

interface LiturgyData {
  id: string;
  name: string;
  feastDay: string;
  biography: string;
  rank: string;
  liturgicalColor: string;
  title: string;
  collectPrayer?: string;
  firstReading?: LiturgyReading;
  responsorialPsalm?: { reference: string; response?: string; text?: string };
  gospel?: LiturgyReading;
  quotes?: string[];
}

interface LiturgyResponse {
  success: boolean;
  data: {
    date: string;
    feastDay: string;
    saints: LiturgyData[];
    source: string;
  };
}

const colorStyles: Record<string, string> = {
  white: 'bg-white text-gray-900 border-gray-300',
  red: 'bg-red-100 text-red-900 border-red-300',
  green: 'bg-green-100 text-green-900 border-green-300',
  purple: 'bg-purple-100 text-purple-900 border-purple-300',
  rose: 'bg-pink-100 text-pink-900 border-pink-300',
  black: 'bg-gray-800 text-white border-gray-900',
};

const rankLabels: Record<string, string> = {
  SOLEMNITY: 'Solenidade',
  FEAST: 'Festa',
  MEMORIAL: 'Memória',
  OPTIONAL_MEMORIAL: 'Memória Facultativa',
  FERIAL: 'Feria do Tempo Comum',
};

export default function LiturgyPage() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<LiturgyResponse>({
    queryKey: ['/api/saints/today'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.success || !data?.data?.saints || data.data.saints.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Liturgia do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Erro ao carregar a liturgia do dia.
              </p>
              <Button onClick={() => setLocation('/dashboard')}>
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const liturgy = data.data.saints[0];
  const colorClass = colorStyles[liturgy.liturgicalColor] || colorStyles.green;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation('/dashboard')}>
          <Home className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('https://padrepauloricardo.org/liturgia', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver no Site
        </Button>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden">
        <CardHeader className={`${colorClass} pb-4`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                {liturgy.name}
              </CardTitle>
              <CardDescription className={liturgy.liturgicalColor === 'black' || liturgy.liturgicalColor === 'purple' ? 'text-gray-200' : 'text-gray-700'}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {rankLabels[liturgy.rank] || liturgy.title}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <ScrollArea className="h-auto max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Primeira Leitura */}
              {liturgy.firstReading && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                    📖 Primeira Leitura
                  </h3>
                  <p className="font-medium text-muted-foreground">
                    {liturgy.firstReading.reference}
                  </p>
                  {liturgy.firstReading.text && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {liturgy.firstReading.text}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Salmo Responsorial */}
              {liturgy.responsorialPsalm && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                    🎵 Salmo Responsorial
                  </h3>
                  <p className="font-medium text-muted-foreground">
                    {liturgy.responsorialPsalm.reference}
                  </p>
                  {liturgy.responsorialPsalm.response && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-sm italic font-medium">
                        "{liturgy.responsorialPsalm.response}"
                      </p>
                    </div>
                  )}
                  {liturgy.responsorialPsalm.text && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {liturgy.responsorialPsalm.text}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Evangelho */}
              {liturgy.gospel && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                    ✝️ Evangelho
                  </h3>
                  <p className="font-medium text-muted-foreground">
                    {liturgy.gospel.reference}
                  </p>
                  {liturgy.gospel.text && (
                    <div className="bg-muted p-4 rounded-lg border-l-4 border-primary">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {liturgy.gospel.text}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reflexão / Homilia */}
              {liturgy.collectPrayer && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                    💬 Reflexão
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {liturgy.collectPrayer}
                    </p>
                  </div>
                </div>
              )}

              {/* Biografia (conteúdo adicional) */}
              {liturgy.biography && (
                <div className="space-y-2">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {liturgy.biography}
                    </p>
                  </div>
                </div>
              )}

              {/* Link para conteúdo completo */}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open('https://padrepauloricardo.org/liturgia', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar leituras completas e homilia no site do Padre Paulo Ricardo
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
