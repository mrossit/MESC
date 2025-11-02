/**
 * Daily Liturgy Component
 * Displays the daily liturgy from CNBB official API
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Heart, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Saint {
  id: string;
  name: string;
  feastDay: string;
  title?: string;
  patronOf?: string;
  biography: string;
  isBrazilian: boolean;
  rank: 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'OPTIONAL_MEMORIAL' | 'FERIAL';
  liturgicalColor: 'white' | 'red' | 'green' | 'purple' | 'rose' | 'black';
  collectPrayer?: string;
  firstReading?: { reference: string; text?: string };
  responsorialPsalm?: { reference: string; response?: string; text?: string };
  gospel?: { reference: string; text?: string };
  attributes?: string[];
  quotes?: string[];
}

interface SaintsOfDayResponse {
  success: boolean;
  data: {
    date: string;
    feastDay: string;
    saints: Saint[];
  };
}

const rankLabels: Record<Saint['rank'], string> = {
  SOLEMNITY: 'Solenidade',
  FEAST: 'Festa',
  MEMORIAL: 'Memória',
  OPTIONAL_MEMORIAL: 'Memória Facultativa',
  FERIAL: 'Feria',
};

const colorStyles: Record<Saint['liturgicalColor'], string> = {
  white: 'bg-white text-gray-900 border-gray-300',
  red: 'bg-red-100 text-red-900 border-red-300',
  green: 'bg-green-100 text-green-900 border-green-300',
  purple: 'bg-purple-100 text-purple-900 border-purple-300',
  rose: 'bg-pink-100 text-pink-900 border-pink-300',
  black: 'bg-gray-800 text-white border-gray-900',
};

export function SaintOfTheDay() {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error } = useQuery<SaintsOfDayResponse>({
    queryKey: ['/api/saints/today'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Liturgia do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success || !data?.data?.saints || data.data.saints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Liturgia do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <BookOpen className="h-6 w-6 text-blue-500/70" />
            </div>
            <p className="text-sm text-muted-foreground">
              {error ? 'Erro ao carregar liturgia' : 'Carregando liturgia...'}
            </p>
            {error && (
              <p className="text-xs text-red-500 mt-2">
                Tente novamente mais tarde
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const saints = data.data.saints;
  const primarySaint = saints[0];

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <Card className="overflow-hidden border border-neutral-border/30 dark:border-border">
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3 hover:bg-accent/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Liturgia do Dia
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </CardDescription>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <ScrollArea className="h-auto max-h-[600px]">
              <div className="space-y-6">
                {saints.map((saint) => (
                  <div key={saint.id} className="space-y-4">
                    <div className="border-b pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-xl leading-tight">
                          {saint.name}
                          {saint.isBrazilian && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              🇧🇷 Brasil
                            </Badge>
                          )}
                        </h3>
                        <Badge variant="secondary" className="shrink-0">
                          {rankLabels[saint.rank]}
                        </Badge>
                      </div>
                      {saint.title && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {saint.title}
                        </p>
                      )}
                    </div>

                    {/* Leituras principais */}
                    {saint.firstReading && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-1 text-blue-900 dark:text-blue-100">
                          <BookOpen className="h-4 w-4" />
                          Primeira Leitura
                        </h4>
                        <p className="text-sm font-medium">{saint.firstReading.reference}</p>
                        {saint.firstReading.text && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                            {saint.firstReading.text}
                          </p>
                        )}
                      </div>
                    )}

                    {saint.responsorialPsalm && (
                      <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-1 text-purple-900 dark:text-purple-100">
                          📿 Salmo Responsorial
                        </h4>
                        <p className="text-sm font-medium">{saint.responsorialPsalm.reference}</p>
                        {saint.responsorialPsalm.response && (
                          <blockquote className="text-sm italic bg-purple-100 dark:bg-purple-900/30 p-3 rounded border-l-4 border-purple-400 mt-2">
                            <strong>Refrão:</strong> "{saint.responsorialPsalm.response}"
                          </blockquote>
                        )}
                        {saint.responsorialPsalm.text && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                            {saint.responsorialPsalm.text}
                          </p>
                        )}
                      </div>
                    )}

                    {saint.secondReading && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-1 text-green-900 dark:text-green-100">
                          <BookOpen className="h-4 w-4" />
                          Segunda Leitura
                        </h4>
                        <p className="text-sm font-medium">{saint.secondReading.reference}</p>
                        {saint.secondReading.text && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                            {saint.secondReading.text}
                          </p>
                        )}
                      </div>
                    )}

                    {saint.gospel && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-1 text-amber-900 dark:text-amber-100">
                          ✝️ Evangelho
                        </h4>
                        <p className="text-sm font-medium">{saint.gospel.reference}</p>
                        {saint.gospel.text && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                            {saint.gospel.text}
                          </p>
                        )}
                      </div>
                    )}

                    {saint.collectPrayer && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">
                          🙏 Oração
                        </h4>
                        <p className="text-sm italic leading-relaxed">
                          {saint.collectPrayer}
                        </p>
                      </div>
                    )}

                    {/* Fonte */}
                    <div className="text-center pt-2">
                      <a
                        href="https://liturgia.cnbb.org.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Fonte: CNBB - Conferência Nacional dos Bispos do Brasil
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
