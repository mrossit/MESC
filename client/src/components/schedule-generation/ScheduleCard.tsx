import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Minister } from '@/types/schedule';

interface ScheduleCardProps {
  date: string;
  time: string;
  confidence: number;
  qualityScore: string;
  ministers: Minister[];
  backupMinisters: Minister[];
  onEdit: () => void;
  index: number;
}

function getConfidenceBadgeVariant(confidence: number) {
  if (confidence >= 0.8) return 'default';
  if (confidence >= 0.6) return 'secondary';
  return 'destructive';
}

export function ScheduleCard({
  date,
  time,
  confidence,
  qualityScore,
  ministers,
  backupMinisters,
  onEdit,
  index
}: ScheduleCardProps) {
  const borderColor = confidence >= 0.8 ? '#22c55e' : confidence >= 0.6 ? '#f59e0b' : '#ef4444';

  return (
    <Card className="border-l-4" style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="font-semibold">
                {format(new Date(date + 'T00:00:00'), 'EEEE', { locale: ptBR })} - {format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy')}
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {time}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              data-testid={`button-edit-${index}`}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Badge
              variant={getConfidenceBadgeVariant(confidence)}
              data-testid={`badge-quality-${index}`}
            >
              {qualityScore}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium">Ministros:</span>
            {ministers.map((minister) => (
              <Badge key={minister.id} variant="outline" className="text-xs">
                {minister.position && `${minister.position}. `}{minister.name}
                <span className="ml-1 text-muted-foreground">
                  ({minister.totalServices}x)
                </span>
              </Badge>
            ))}
          </div>

          {backupMinisters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Backup:</span>
              {backupMinisters.map((minister) => (
                <Badge key={minister.id} variant="secondary" className="text-xs">
                  {minister.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
