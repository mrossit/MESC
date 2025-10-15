import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, Users, CheckCircle2 } from 'lucide-react';

interface QualityMetrics {
  uniqueMinistersUsed: number;
  averageMinistersPerMass: number;
  highConfidenceSchedules: number;
  lowConfidenceSchedules: number;
  balanceScore: number;
}

interface GenerationMetricsProps {
  totalSchedules: number;
  uniqueMinistersUsed: number;
  averageConfidence: number;
  balanceScore: number;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function GenerationMetrics({
  totalSchedules,
  uniqueMinistersUsed,
  averageConfidence,
  balanceScore
}: GenerationMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Missas</p>
              <p className="text-2xl font-bold">{totalSchedules}</p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ministros Únicos</p>
              <p className="text-2xl font-bold">{uniqueMinistersUsed}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Confiança Média</p>
              <p className={`text-2xl font-bold ${getConfidenceColor(averageConfidence)}`}>
                {Math.round(averageConfidence * 100)}%
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Balanceamento</p>
              <p className="text-2xl font-bold">{Math.round(balanceScore * 100)}%</p>
            </div>
            <div className="h-8 w-8">
              <Progress value={balanceScore * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
