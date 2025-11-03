import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookOpen, Calendar as CalendarIcon, Home, ExternalLink, Book, Cross } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CNBBLiturgyResponse {
  success: boolean;
  data: {
    date: string;
    readings: string[];
    source: string;
  };
}

interface PaulusLiturgyData {
  id: string;
  name: string;
  feastDay: string;
  rank: string;
  liturgicalColor: string;
  title: string;
  firstReading?: { reference: string; text?: string };
  secondReading?: { reference: string; text?: string };
  responsorialPsalm?: { reference: string; response?: string; text?: string };
  gospel?: { reference: string; text?: string };
  collectPrayer?: string;
}

interface PaulusLiturgyResponse {
  success: boolean;
  data: {
    date: string;
    feastDay: string;
    saints: PaulusLiturgyData[];
    source: string;
  };
}

const colorStyles: Record<string, string> = {
  white: 'bg-white dark:bg-gray-100 text-gray-900',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100',
  rose: 'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100',
  black: 'bg-gray-800 text-white',
};

const rankLabels: Record<string, string> = {
  SOLEMNITY: 'Solenidade',
  FEAST: 'Festa',
  MEMORIAL: 'Memória',
  OPTIONAL_MEMORIAL: 'Memória Facultativa',
  FERIAL: 'Feria do Tempo Comum',
};

export default function LiturgyImproved() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'cnbb' | 'paulus'>('cnbb');

  // Query CNBB liturgy
  const { data: cnbbData, isLoading: cnbbLoading } = useQuery<CNBBLiturgyResponse>({
    queryKey: ['/api/cnbb-liturgy'],
    enabled: activeTab === 'cnbb',
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Query Paulus liturgy
  const { data: paulusData, isLoading: paulusLoading } = useQuery<PaulusLiturgyResponse>({
    queryKey: ['/api/saints/today'],
    enabled: activeTab === 'paulus',
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const isLoading = activeTab === 'cnbb' ? cnbbLoading : paulusLoading;

  const renderCNBBContent = () => {
    if (!cnbbData?.success || !cnbbData.data.readings) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Não foi possível carregar a liturgia da CNBB.</p>
        </div>
      );
    }

    const readings = cnbbData.data.readings;

    return (
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-6 pr-4" data-testid="cnbb-readings-container">
          {readings.map((reading, index) => (
            <div key={index} className="space-y-2">
              <div className="bg-muted p-6 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reading}</p>
              </div>
              {index < readings.length - 1 && <div className="border-t my-4" />}
            </div>
          ))}

          <div className="pt-6 border-t mt-8">
            <p className="text-xs text-center text-muted-foreground">
              Conteúdo litúrgico extraído de{' '}
              <a
                href="https://liturgiadiaria.cnbb.org.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
                data-testid="link-cnbb-source"
              >
                CNBB - Conferência Nacional dos Bispos do Brasil
              </a>
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderPaulusContent = () => {
    if (!paulusData?.success || !paulusData.data.saints?.[0]) {
      return (
        <div className="text-center py-12">
          <Cross className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Não foi possível carregar a liturgia da Paulus.</p>
        </div>
      );
    }

    const liturgy = paulusData.data.saints[0];

    return (
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-6 pr-4" data-testid="paulus-readings-container">
          {/* Celebration Info */}
          <div className="text-center pb-4 border-b">
            <h2 className="text-2xl font-bold mb-2">{liturgy.name}</h2>
            <Badge variant="secondary" className="mb-2">
              {rankLabels[liturgy.rank] || liturgy.title}
            </Badge>
            {liturgy.liturgicalColor && (
              <div className="mt-3">
                <Badge className={cn('text-sm', colorStyles[liturgy.liturgicalColor])}>
                  Cor Litúrgica: {liturgy.liturgicalColor === 'white' ? 'Branco' : 
                    liturgy.liturgicalColor === 'red' ? 'Vermelho' :
                    liturgy.liturgicalColor === 'green' ? 'Verde' :
                    liturgy.liturgicalColor === 'purple' ? 'Roxo' :
                    liturgy.liturgicalColor === 'rose' ? 'Rosa' : 'Preto'}
                </Badge>
              </div>
            )}
          </div>

          {/* First Reading */}
          {liturgy.firstReading && (
            <div data-testid="section-first-reading">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-primary mb-2">
                📖 Primeira Leitura
              </h3>
              <p className="font-medium text-muted-foreground text-sm mb-3">
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

          {/* Responsorial Psalm */}
          {liturgy.responsorialPsalm && (
            <div data-testid="section-psalm">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-primary mb-2">
                🎵 Salmo Responsorial
              </h3>
              <p className="font-medium text-muted-foreground text-sm mb-3">
                {liturgy.responsorialPsalm.reference}
              </p>
              {liturgy.responsorialPsalm.response && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded mb-3">
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

          {/* Second Reading */}
          {liturgy.secondReading && (
            <div data-testid="section-second-reading">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-primary mb-2">
                📖 Segunda Leitura
              </h3>
              <p className="font-medium text-muted-foreground text-sm mb-3">
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

          {/* Gospel */}
          {liturgy.gospel && (
            <div data-testid="section-gospel">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-primary mb-2">
                ✝️ Evangelho
              </h3>
              <p className="font-medium text-muted-foreground text-sm mb-3">
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

          {/* Meditation */}
          {liturgy.collectPrayer && (
            <div data-testid="section-meditation">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-primary mb-2">
                💬 Oração do Dia
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {liturgy.collectPrayer}
                </p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t mt-8">
            <p className="text-xs text-center text-muted-foreground">
              Conteúdo litúrgico extraído de{' '}
              <a
                href="https://www.paulus.com.br/portal/liturgia-diaria/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
                data-testid="link-paulus-source"
              >
                Paulus - Editora Católica
              </a>
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setLocation('/dashboard')} data-testid="button-back">
            <Home className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Liturgia Diária
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-date-picker">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(selectedDate, 'dd/MM/yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              data-testid="calendar-date-picker"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Leituras do Dia</span>
            <div className="flex gap-2">
              {activeTab === 'cnbb' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://liturgiadiaria.cnbb.org.br/', '_blank')}
                  data-testid="button-cnbb-external"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  CNBB
                </Button>
              )}
              {activeTab === 'paulus' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.paulus.com.br/portal/liturgia-diaria/', '_blank')}
                  data-testid="button-paulus-external"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Paulus
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Escolha entre as leituras da CNBB ou da Paulus
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cnbb' | 'paulus')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="cnbb" data-testid="tab-cnbb">
                <Book className="h-4 w-4 mr-2" />
                CNBB
              </TabsTrigger>
              <TabsTrigger value="paulus" data-testid="tab-paulus">
                <Cross className="h-4 w-4 mr-2" />
                Paulus
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cnbb" className="mt-0">
              {cnbbLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                renderCNBBContent()
              )}
            </TabsContent>

            <TabsContent value="paulus" className="mt-0">
              {paulusLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                renderPaulusContent()
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
