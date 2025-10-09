import { Star, UserX, UserCheck, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBSTITUTION_COLORS } from '../constants/massTypes';
import { Schedule } from '../types';

interface ScheduleLegendProps {
  schedule: Schedule;
}

export function ScheduleLegend({ schedule }: ScheduleLegendProps) {
  if (!schedule) return null;

  const isPublished = schedule.status === 'published';

  return (
    <Card className="mt-6 border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-primary" />
          </div>
          <span>Legenda do Calendário</span>
        </CardTitle>
        <CardDescription>
          Entenda os indicadores visuais da escala de ministros
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isPublished && (
            <>
              <LegendItem
                icon={Star}
                color={SUBSTITUTION_COLORS.SCHEDULED.color}
                title="Você está escalado"
                description="Dia com sua participação confirmada"
              />
              <LegendItem
                icon={UserX}
                color={SUBSTITUTION_COLORS.PENDING.color}
                title="Substituição solicitada"
                description="Aguardando confirmação de substituto"
              />
              <LegendItem
                icon={UserCheck}
                color={SUBSTITUTION_COLORS.APPROVED.color}
                title="Substituto confirmado"
                description="Substituição já foi aprovada"
                textColorOverride="text-slate-800"
              />
              <LegendItem
                icon={Users}
                color="#91AEC4"
                title="Ministros escalados"
                description="Quantidade de ministros confirmados"
              />
              <LegendItem
                icon={AlertCircle}
                color={SUBSTITUTION_COLORS.VACANT.color}
                title="Vagas disponíveis"
                description="Posições ainda não preenchidas"
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LegendItemProps {
  icon: React.ComponentType<any>;
  color: string;
  title: string;
  description: string;
  textColorOverride?: string;
}

function LegendItem({ icon: Icon, color, title, description, textColorOverride }: LegendItemProps) {
  return (
    <div
      className="group flex items-center gap-3 p-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-slate-900"
      style={{ borderColor: color }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-all border-2"
        style={{ backgroundColor: color, borderColor: color }}
      >
        <Icon className={cn('h-5 w-5', textColorOverride || 'text-white')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight" style={{ color }}>
          {title}
        </p>
        <p className="text-xs mt-1 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// Import cn helper
import { cn } from '@/lib/utils';
