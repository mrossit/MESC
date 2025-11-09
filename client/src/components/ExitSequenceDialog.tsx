import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Users, User } from "lucide-react";
import { LITURGICAL_POSITIONS } from "@shared/constants";
import { formatMinisterName } from "@/lib/utils";

interface ScheduleAssignment {
  id: string;
  position: number;
  ministerName?: string;
  scheduleDisplayName?: string;
}

interface ExitSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalMinisters: number;
  assignedPositions: number[];
  assignments: ScheduleAssignment[];
}

// Sequências de saída predefinidas baseadas no número de ministros
const EXIT_SEQUENCES = {
  15: [13, 14, 15, 3, 4, 2, 5, 1, 6, 8, 7, 9, 12, 11, 10],
  20: [13, 14, 15, 3, 19, 4, 2, 20, 5, 1, 21, 6, 8, 7, 9, 12, 11, 10, 16, 17, 18],
  28: [13, 14, 15, 27, 28, 3, 19, 4, 2, 24, 20, 5, 21, 1, 6, 25, 8, 7, 22, 9, 26, 23, 12, 11, 10, 16, 17, 18],
};

// Função para determinar a sequência de saída mais apropriada
const getExitSequence = (totalMinisters: number, assignedPositions: number[]): number[] => {
  // Se temos 28 ou mais ministros, usar sequência de 28
  if (totalMinisters >= 25) {
    return EXIT_SEQUENCES[28];
  }
  // Se temos entre 18-24 ministros, usar sequência de 20
  if (totalMinisters >= 18) {
    return EXIT_SEQUENCES[20];
  }
  // Se temos entre 10-17 ministros, usar sequência de 15
  if (totalMinisters >= 10) {
    return EXIT_SEQUENCES[15];
  }

  // Para menos de 10 ministros, usar as posições ordenadas numericamente
  return assignedPositions.sort((a, b) => a - b);
};

export function ExitSequenceDialog({ open, onOpenChange, totalMinisters, assignedPositions, assignments }: ExitSequenceDialogProps) {
  const exitSequence = getExitSequence(totalMinisters, assignedPositions);

  // Filtrar apenas as posições que estão realmente escaladas
  const activeSequence = exitSequence.filter(pos => assignedPositions.includes(pos));

  // Identificar posições do mezanino (sempre começam a saída)
  const mezaninoPositions = activeSequence.filter(pos => pos >= 13 && pos <= 15 || pos === 27 || pos === 28);
  const otherPositions = activeSequence.filter(pos => !(pos >= 13 && pos <= 15 || pos === 27 || pos === 28));

  // Criar mapa de position -> minister name
  const positionToMinister = new Map<number, string>();
  assignments.forEach(assignment => {
    const displayName = assignment.scheduleDisplayName || assignment.ministerName || "Ministro não identificado";
    positionToMinister.set(assignment.position, formatMinisterName(displayName));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:w-full mx-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sequência de Saída da Capela
          </DialogTitle>
          <DialogDescription className="text-sm">
            Ordem correta para a saída da Capela
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Alerta importante */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">
                  Lembrete Importante
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Antes de iniciar a saída, confirme com todos os ministros se irão comungar na Capela.
                  Apenas os que comungarem na Capela devem seguir esta ordem de saída.
                </p>
              </div>
            </div>

            {/* Informações sobre a missa */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Ministros</p>
                <p className="text-2xl font-bold">{totalMinisters}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Posições Escaladas</p>
                <p className="text-2xl font-bold">{assignedPositions.length}</p>
              </div>
            </div>

            {/* Sequência do Mezanino */}
            {mezaninoPositions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="text-white" style={{ backgroundColor: '#a788ab' }}>
                    MEZANINO - COMEÇAM A SAÍDA APÓS O PAI NOSSO...
                  </Badge>
                  {totalMinisters >= 25 && (
                    <span className="text-xs text-muted-foreground">(Atenção: +2 ministros saem com o mezanino!)</span>
                  )}
                </div>
                <div className="grid gap-2">
                  {mezaninoPositions.map((position, index) => {
                    const ministerName = positionToMinister.get(position);
                    
                    // Posições 27 e 28 são da área externa (missa por cura) - roxo diferente
                    const isAreaExterna = position === 27 || position === 28;
                    
                    // Cores para Mezanino (13-15): #a788ab | #dfcae1 | #f5eef6
                    // Cores para Área Externa (27-28): #967284 | #fff0ff
                    const bgColor = isAreaExterna ? '#fff0ff' : '#dfcae1';
                    const borderColor = isAreaExterna ? '#967284' : '#a788ab';
                    const badgeBorderColor = isAreaExterna ? '#967284' : '#a788ab';
                    const badgeBgColor = isAreaExterna ? '#fff0ff' : '#f5eef6';
                    const iconColor = isAreaExterna ? '#967284' : '#a788ab';
                    const textColor = isAreaExterna ? '#7a5a8f' : '#8a6b8d';
                    const numberBg = isAreaExterna ? '#967284' : '#a788ab';

                    return (
                      <div
                        key={position}
                        className="flex items-center gap-3 p-3 border-2 rounded-lg"
                        style={{ backgroundColor: bgColor, borderColor: borderColor }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge
                              variant="outline"
                              className="font-medium text-sm px-2.5 py-0.5"
                              style={{ borderColor: badgeBorderColor, color: badgeBorderColor, backgroundColor: badgeBgColor }}
                            >
                              {index + 1}º
                            </Badge>
                            <span className="text-sm font-medium text-[#5c3075] bg-[transparent]">
                              {LITURGICAL_POSITIONS[position]}
                            </span>
                            {isAreaExterna && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                Área Externa
                              </Badge>
                            )}
                          </div>
                          {ministerName && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <User className="h-3.5 w-3.5" style={{ color: iconColor }} />
                              <span className="text-sm font-bold" style={{ color: textColor }}>
                                {ministerName}
                              </span>
                            </div>
                          )}
                        </div>
                        <div
                          className="w-auto min-w-[3rem] h-12 px-3 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: numberBg }}
                        >
                          <span className="text-xs font-bold text-white whitespace-nowrap">Posição {position}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sequência Principal */}
            <div className="space-y-3">
              <Badge className="text-white" style={{ backgroundColor: '#576994' }}>
                SEQUÊNCIA DE SAÍDA APÓS O CORDEIRO...
              </Badge>
              <div className="grid gap-2">
                {otherPositions.map((position, index) => {
                  // Destacar posições 1 e 2 (Auxiliares)
                  const isAuxiliar = position === 1 || position === 2;
                  const ministerName = positionToMinister.get(position);

                  // Cores para Auxiliares: #bf9780 | #ecd6c0
                  // Cores para Demais: #b3c5d7 | #576994 | #1f254a
                  const bgColor = isAuxiliar ? '#ecd6c0' : '#b3c5d7';
                  const borderColor = isAuxiliar ? '#bf9780' : '#576994';
                  const numberBg = isAuxiliar ? '#bf9780' : '#1f254a';
                  const badgeBg = isAuxiliar ? '#f8ede4' : '#dce4ee';
                  const textColor = isAuxiliar ? '#9d7b66' : '#1f254a';

                  return (
                    <div
                      key={position}
                      className="flex items-center gap-3 p-3 border-2 rounded-lg bg-[#d1daed] text-[#0a1440]"
                      style={{ backgroundColor: bgColor, borderColor: borderColor }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="outline"
                            className="font-semibold text-sm px-2.5 py-0.5"
                            style={{ borderColor: borderColor, color: borderColor, backgroundColor: badgeBg }}
                          >
                            {index + 1}º
                          </Badge>
                          <span className={`text-sm ${isAuxiliar ? "font-bold" : "font-medium"}`}>
                            {LITURGICAL_POSITIONS[position]}
                          </span>
                        </div>
                        {ministerName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <User className="h-3.5 w-3.5" style={{ color: borderColor }} />
                            <span className="text-sm font-bold" style={{ color: textColor }}>
                              {ministerName}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className="w-auto min-w-[3rem] h-12 px-3 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: numberBg }}
                      >
                        <span className="text-xs font-bold text-white whitespace-nowrap">
                          Posição {position}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dicas finais */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                💡 Dicas Importantes
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>A ordem respeita o número e posição de cada ministro para saída organizada.</li>
                <li>Fique atento à sua posição para evitar atropelos e grandes distâncias.</li>
                <li>Revise sempre a ordem antes de sair, pois pode variar conforme o número de ministros.</li>
                <li>Esta organização mostra respeito e beleza da missa, tudo de forma discreta.</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
