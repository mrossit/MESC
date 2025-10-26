/**
 * Saint of the Day Component
 * Displays the saint(s) being celebrated today with their feast day information
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, BookOpen, Heart, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
            <Sparkles className="h-5 w-5" />
            Santo do Dia
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
            <Sparkles className="h-5 w-5" />
            Santo do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-orange-500/70" />
            </div>
            <p className="text-sm text-muted-foreground">
              {error ? 'Erro ao carregar santo do dia' : 'Carregando santo do dia...'}
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
    <Card className="overflow-hidden">
      <CardHeader className={`pb-3 ${colorStyles[primarySaint.liturgicalColor]}`}>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Santo do Dia
        </CardTitle>
        <CardDescription className={primarySaint.liturgicalColor === 'black' || primarySaint.liturgicalColor === 'purple' ? 'text-gray-200' : 'text-gray-600'}>
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-auto max-h-64">
          <div className="space-y-4">
            {saints.map((saint) => (
              <Dialog key={saint.id}>
                <DialogTrigger asChild>
                  <div className="cursor-pointer hover:bg-accent p-3 rounded-lg transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg leading-tight">
                          {saint.name}
                          {saint.isBrazilian && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              🇧🇷 Brasil
                            </Badge>
                          )}
                        </h3>
                        {saint.title && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {saint.title}
                          </p>
                        )}
                        {saint.patronOf && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            <span>Padroeiro(a) de: {saint.patronOf}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {rankLabels[saint.rank]}
                      </Badge>
                    </div>

                    {saint.biography && (
                      <p className="text-sm mt-3 line-clamp-2 text-muted-foreground">
                        {saint.biography}
                      </p>
                    )}

                    {saint.quotes && saint.quotes.length > 0 && (
                      <blockquote className="mt-3 pl-3 border-l-2 border-primary text-sm italic text-muted-foreground">
                        "{saint.quotes[0]}"
                      </blockquote>
                    )}
                  </div>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                      {saint.name}
                      {saint.isBrazilian && (
                        <Badge variant="outline" className="text-xs">
                          🇧🇷 Santo Brasileiro
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(`2024-${saint.feastDay}`).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <Badge variant="secondary">{rankLabels[saint.rank]}</Badge>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 mt-4">
                    {saint.title && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                          Título
                        </h4>
                        <p>{saint.title}</p>
                      </div>
                    )}

                    {saint.patronOf && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          Padroeiro(a) de
                        </h4>
                        <p>{saint.patronOf}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Biografia
                      </h4>
                      <p className="text-sm leading-relaxed">{saint.biography}</p>
                    </div>

                    {saint.collectPrayer && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          Oração Coleta
                        </h4>
                        <p className="text-sm italic leading-relaxed">
                          {saint.collectPrayer}
                        </p>
                      </div>
                    )}

                    {saint.quotes && saint.quotes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                          Citações
                        </h4>
                        <div className="space-y-2">
                          {saint.quotes.map((quote, idx) => (
                            <blockquote
                              key={idx}
                              className="pl-4 border-l-2 border-primary text-sm italic"
                            >
                              "{quote}"
                            </blockquote>
                          ))}
                        </div>
                      </div>
                    )}

                    {saint.attributes && saint.attributes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                          Atributos e Símbolos
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {saint.attributes.map((attr, idx) => (
                            <Badge key={idx} variant="outline">
                              {attr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(saint.firstReading || saint.gospel) && (
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          Leituras Litúrgicas
                        </h4>
                        <div className="space-y-2 text-sm">
                          {saint.firstReading && (
                            <p>
                              <span className="font-medium">1ª Leitura:</span>{' '}
                              {saint.firstReading.reference}
                            </p>
                          )}
                          {saint.responsorialPsalm && (
                            <p>
                              <span className="font-medium">Salmo:</span>{' '}
                              {saint.responsorialPsalm.reference}
                              {saint.responsorialPsalm.response && (
                                <span className="italic block ml-4">
                                  "{saint.responsorialPsalm.response}"
                                </span>
                              )}
                            </p>
                          )}
                          {saint.gospel && (
                            <p>
                              <span className="font-medium">Evangelho:</span>{' '}
                              {saint.gospel.reference}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
