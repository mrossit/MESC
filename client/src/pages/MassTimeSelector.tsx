import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Clock, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'wouter';
import { getMassTimesForDate } from '@shared/constants';
import { cn } from '@/lib/utils';

interface MassTimeSelectorProps {
  date?: string;
}

export default function MassTimeSelector({ date }: MassTimeSelectorProps) {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [massTimes, setMassTimes] = useState<string[]>([]);

  useEffect(() => {
    if (date) {
      const parsedDate = new Date(date);
      setSelectedDate(parsedDate);
      const times = getMassTimesForDate(parsedDate);
      setMassTimes(times);
    }
  }, [date]);

  const handleMassTimeSelect = (time: string) => {
    if (!date) return;
    // Navegar para a tela de edição com data e horário específicos
    setLocation(`/schedule-editor?date=${date}&time=${time}`);
  };

  const handleBack = () => {
    setLocation('/schedule-editor');
  };

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const getMassTypeLabel = (time: string, date: Date) => {
    const dayOfWeek = date.getDay();

    // Domingo
    if (dayOfWeek === 0) {
      if (time === '08:00:00') return 'Missa da Manhã';
      if (time === '10:00:00') return 'Missa das Crianças';
      if (time === '19:00:00') return 'Missa da Noite';
    }

    // Dias de semana
    if (time === '06:30:00') return 'Missa da Manhã';
    if (time === '19:00:00') return 'Missa da Noite';
    if (time === '19:30:00') return 'Missa de Cura e Libertação';
    if (time === '16:00:00') return 'Novena de Nossa Senhora';

    return 'Missa';
  };

  if (!selectedDate || massTimes.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Erro ao Carregar</CardTitle>
              <CardDescription>
                Data inválida ou sem missas programadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Se houver apenas uma missa, redirecionar automaticamente
  if (massTimes.length === 1) {
    handleMassTimeSelect(massTimes[0]);
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Editor
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Selecione o Horário da Missa</h1>
          </div>

          <p className="text-muted-foreground">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Mass Times Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários Disponíveis
            </CardTitle>
            <CardDescription>
              Esta data possui {massTimes.length} missas programadas. Selecione qual deseja editar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {massTimes.map((time) => (
                <Card
                  key={time}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:border-primary",
                    "border-2 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                  onClick={() => handleMassTimeSelect(time)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <span className="text-2xl font-bold">
                            {formatTimeDisplay(time)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getMassTypeLabel(time, selectedDate)}
                        </p>
                      </div>
                      <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Edição por Horário
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Ao selecionar um horário, você verá apenas as escalas específicas dessa missa,
                    tornando a edição mais organizada e menos confusa.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total de missas neste dia:</span>
              <Badge variant="secondary" className="text-base">
                {massTimes.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
