import React from 'react';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Clock, User, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LITURGICAL_POSITIONS } from '@shared/constants';

interface Minister {
  id: string;
  name: string;
  profilePhoto?: string;
  position: number;
  confirmed: boolean;
  familyId?: string | null;
}

interface ScheduleCardProps {
  date: Date;
  massTime: string;
  ministers: Minister[];
  isCoordinator?: boolean;
  onAssignMinister?: (date: Date, massTime: string) => void;
}

export function ScheduleCard({ date, massTime, ministers, isCoordinator, onAssignMinister }: ScheduleCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPositionColor = (position: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800'
    ];
    return colors[(position - 1) % colors.length];
  };

  // Detect family members serving together
  const familyGroups = React.useMemo(() => {
    const groups = new Map<string, Minister[]>();
    ministers.forEach(minister => {
      if (minister.familyId) {
        if (!groups.has(minister.familyId)) {
          groups.set(minister.familyId, []);
        }
        groups.get(minister.familyId)!.push(minister);
      }
    });
    // Only keep families with 2+ members
    return new Map(Array.from(groups.entries()).filter(([_, members]) => members.length >= 2));
  }, [ministers]);

  const hasFamilies = familyGroups.size > 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{massTime}</span>
          </div>
        </div>

        {ministers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum ministro escalado</p>
            {isCoordinator && (
              <button
                onClick={() => onAssignMinister?.(date, massTime)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Escalar ministros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ministers.map((minister) => {
              const isInFamily = minister.familyId && familyGroups.has(minister.familyId);
              return (
                <div
                  key={`${minister.id}-${minister.position}`}
                  className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                    minister.confirmed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  } ${isInFamily ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={minister.profilePhoto} alt={minister.name} />
                      <AvatarFallback className="text-sm">
                        {getInitials(minister.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{minister.name}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0 ${getPositionColor(minister.position)}`}
                        >
                          #{minister.position}
                        </Badge>
                        {minister.confirmed && (
                          <Badge variant="default" className="text-xs px-2 py-0 bg-green-600">
                            ✓
                          </Badge>
                        )}
                        {isInFamily && (
                          <Badge variant="secondary" className="text-xs px-2 py-0 bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Família
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {LITURGICAL_POSITIONS[minister.position as keyof typeof LITURGICAL_POSITIONS] || `Posição ${minister.position}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {ministers.length > 0 && (
          <>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-muted-foreground">
              <span>{ministers.length} ministros escalados</span>
              <span>
                {ministers.filter(m => m.confirmed).length} confirmados
              </span>
            </div>
            {hasFamilies && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <Users className="h-4 w-4" />
                <span>
                  {familyGroups.size} {familyGroups.size === 1 ? 'família servindo' : 'famílias servindo'} junta
                  {familyGroups.size > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}