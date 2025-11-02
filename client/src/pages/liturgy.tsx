/**
 * Daily Liturgy Page
 * Full liturgy page with readings from Paulus
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Calendar, Home, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useEffect, useRef } from 'react';

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
  secondReading?: LiturgyReading;
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
  white: 'bg-white dark:bg-gray-100 text-gray-900 border-gray-300',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 border-red-300',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 border-green-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border-purple-300',
  rose: 'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100 border-pink-300',
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

  const firstReadingRef = useRef<HTMLDivElement>(null);
  const secondReadingRef = useRef<HTMLDivElement>(null);
  const psalmRef = useRef<HTMLDivElement>(null);
  const gospelRef = useRef<HTMLDivElement>(null);
  const meditationRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<LiturgyResponse>({
    queryKey: ['/api/saints/today'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
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
      <div className="container mx-auto p-4 max-w-5xl">
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
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => setLocation('/dashboard')}>
          <Home className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://liturgia.cnbb.org.br/', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver no site da CNBB
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Quick Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Navegação Rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {liturgy.firstReading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => scrollToSection(firstReadingRef)}
                >
                  📖 Primeira Leitura
                </Button>
              )}
              {liturgy.responsorialPsalm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => scrollToSection(psalmRef)}
                >
                  🎵 Salmo Responsorial
                </Button>
              )}
              {liturgy.secondReading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => scrollToSection(secondReadingRef)}
                >
                  📖 Segunda Leitura
                </Button>
              )}
              {liturgy.gospel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => scrollToSection(gospelRef)}
                >
                  ✝️ Evangelho
                </Button>
              )}
              {liturgy.collectPrayer && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => scrollToSection(meditationRef)}
                >
                  💬 Meditação
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardHeader className={`${colorClass} pb-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    {liturgy.name}
                  </CardTitle>
                  <CardDescription className={
                    liturgy.liturgicalColor === 'black' || liturgy.liturgicalColor === 'purple'
                      ? 'text-gray-200'
                      : 'text-gray-700'
                  }>
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
              <ScrollArea className="h-auto max-h-[calc(100vh-16rem)]">
                <div className="space-y-8 pr-4">
                  {/* Primeira Leitura */}
                  {liturgy.firstReading && (
                    <div ref={firstReadingRef} className="scroll-mt-4">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-primary mb-3">
                        📖 Primeira Leitura
                      </h3>
                      <p className="font-medium text-muted-foreground mb-3">
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
                    <div ref={psalmRef} className="scroll-mt-4">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-primary mb-3">
                        🎵 Salmo Responsorial
                      </h3>
                      <p className="font-medium text-muted-foreground mb-3">
                        {liturgy.responsorialPsalm.reference}
                      </p>
                      {liturgy.responsorialPsalm.response && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded mb-3">
                          <p className="text-sm italic font-medium">
                            Refrão: "{liturgy.responsorialPsalm.response}"
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

                  {/* Segunda Leitura */}
                  {liturgy.secondReading && (
                    <div ref={secondReadingRef} className="scroll-mt-4">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-primary mb-3">
                        📖 Segunda Leitura
                      </h3>
                      <p className="font-medium text-muted-foreground mb-3">
                        {liturgy.secondReading.reference}
                      </p>
                      {liturgy.secondReading.text && (
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {liturgy.secondReading.text}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evangelho */}
                  {liturgy.gospel && (
                    <div ref={gospelRef} className="scroll-mt-4">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-primary mb-3">
                        ✝️ Evangelho
                      </h3>
                      <p className="font-medium text-muted-foreground mb-3">
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

                  {/* Meditação / Reflexão */}
                  {liturgy.collectPrayer && (
                    <div ref={meditationRef} className="scroll-mt-4">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-primary mb-3">
                        💬 Meditação
                      </h3>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {liturgy.collectPrayer}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer with credits */}
                  <div className="pt-6 border-t">
                    <p className="text-xs text-center text-muted-foreground">
                      Conteúdo litúrgico fornecido por{' '}
                      <a
                        href="https://liturgia.cnbb.org.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground transition-colors"
                      >
                        CNBB
                      </a>
                      {' • '}
                      Conferência Nacional dos Bispos do Brasil
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
