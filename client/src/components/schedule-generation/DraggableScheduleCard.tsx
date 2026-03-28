import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit, GripVertical, Users, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Minister } from '@/types/schedule';

// --- Tipos ---

interface DraggableScheduleCardProps {
  date: string;
  time: string;
  confidence: number;
  qualityScore: string;
  ministers: Minister[];
  backupMinisters: Minister[];
  onMinistersChange: (ministers: Minister[], backups: Minister[]) => void;
  onEdit: () => void;
  index: number;
}

// Wrapper para itens sortáveis — cada ministro é um item arrastável
function SortableMinisterItem({
  minister,
  isBackup,
}: {
  minister: Minister;
  isBackup: boolean;
}) {
  const sortableId = `${isBackup ? 'b' : 'a'}_${minister.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'inline-flex items-center cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30 z-50'
      )}
      {...attributes}
      {...listeners}
    >
      <Badge
        variant={isBackup ? 'secondary' : 'outline'}
        className={cn(
          'text-xs select-none transition-shadow gap-1',
          'hover:shadow-md',
          isDragging && 'ring-2 ring-primary shadow-lg'
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        {minister.position && !isBackup ? `${minister.position}. ` : ''}
        {minister.name}
        {!isBackup && minister.totalServices !== undefined && (
          <span className="ml-1 text-muted-foreground">
            ({minister.totalServices}x)
          </span>
        )}
      </Badge>
    </div>
  );
}

// --- Helpers ---

function getConfidenceBadgeVariant(confidence: number) {
  if (confidence >= 0.8) return 'default' as const;
  if (confidence >= 0.6) return 'secondary' as const;
  return 'destructive' as const;
}

function isVacant(m: Minister) {
  return !m.id || m.id === 'VACANT' || m.name === 'VACANT' || m.name === 'VACANTE';
}

// --- Componente Principal ---

export function DraggableScheduleCard({
  date,
  time,
  confidence,
  qualityScore,
  ministers,
  backupMinisters,
  onMinistersChange,
  onEdit,
  index,
}: DraggableScheduleCardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const borderColor =
    confidence >= 0.8 ? '#22c55e' : confidence >= 0.6 ? '#f59e0b' : '#ef4444';

  // Separar vacantes (não arrastáveis) dos ministros reais
  const realMinisters = ministers.filter((m) => !isVacant(m));
  const vacantMinisters = ministers.filter((m) => isVacant(m));

  // IDs para SortableContext — todos numa lista só, com prefixo pra saber a zona
  const activeIds = realMinisters.map((m) => `a_${m.id}`);
  const backupIds = backupMinisters.map((m) => `b_${m.id}`);

  // Separador invisível entre as duas zonas
  const separatorId = '__separator__';
  const allSortableIds = [...activeIds, separatorId, ...backupIds];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const isFromBackup = activeIdStr.startsWith('b_');
    const isFromActive = activeIdStr.startsWith('a_');
    const draggedMinisterId = activeIdStr.substring(2);

    const isOverBackup = overIdStr.startsWith('b_') || overIdStr === separatorId;
    const isOverActive = overIdStr.startsWith('a_');

    // Mover de Escalados → Backup
    if (isFromActive && isOverBackup) {
      const minister = realMinisters.find((m) => m.id === draggedMinisterId);
      if (!minister) return;

      const newActives = realMinisters
        .filter((m) => m.id !== draggedMinisterId)
        .map((m, i) => ({ ...m, position: i + 1 }));
      const newBackups = [...backupMinisters, minister];

      onMinistersChange([...newActives, ...vacantMinisters], newBackups);
      return;
    }

    // Mover de Backup → Escalados
    if (isFromBackup && isOverActive) {
      const minister = backupMinisters.find((m) => m.id === draggedMinisterId);
      if (!minister) return;

      const newBackups = backupMinisters.filter((m) => m.id !== draggedMinisterId);
      const newActives = [
        ...realMinisters,
        { ...minister, position: realMinisters.length + 1 },
      ].map((m, i) => ({ ...m, position: i + 1 }));

      // Remover um vacante se existir
      const newVacants = vacantMinisters.length > 0 ? vacantMinisters.slice(1) : vacantMinisters;

      onMinistersChange([...newActives, ...newVacants], newBackups);
      return;
    }

    // Reordenar dentro dos Escalados
    if (isFromActive && isOverActive) {
      const overMinisterId = overIdStr.substring(2);
      const oldIndex = realMinisters.findIndex((m) => m.id === draggedMinisterId);
      const newIndex = realMinisters.findIndex((m) => m.id === overMinisterId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...realMinisters];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      const updated = reordered.map((m, i) => ({ ...m, position: i + 1 }));

      onMinistersChange([...updated, ...vacantMinisters], backupMinisters);
      return;
    }

    // Reordenar dentro dos Backups
    if (isFromBackup && isOverBackup && overIdStr !== separatorId) {
      const overMinisterId = overIdStr.substring(2);
      const oldIndex = backupMinisters.findIndex((m) => m.id === draggedMinisterId);
      const newIndex = backupMinisters.findIndex((m) => m.id === overMinisterId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...backupMinisters];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      onMinistersChange([...realMinisters, ...vacantMinisters], reordered);
    }
  };

  // Ministro sendo arrastado (para overlay)
  const draggedMinister = useMemo(() => {
    if (!activeId) return null;
    const ministerId = activeId.substring(2);
    return (
      realMinisters.find((m) => m.id === ministerId) ||
      backupMinisters.find((m) => m.id === ministerId) ||
      null
    );
  }, [activeId, realMinisters, backupMinisters]);

  const isDraggedBackup = activeId?.startsWith('b_') ?? false;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold">
              {format(new Date(date + 'T00:00:00'), 'EEEE', { locale: ptBR })} -{' '}
              {format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy')}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {time}
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

        {/* DnD Area */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {/* Zona Escalados */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Ministros:</span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[32px] p-1.5 rounded-md border border-dashed border-transparent hover:border-muted-foreground/20 transition-colors">
                  {realMinisters.map((minister) => (
                    <SortableMinisterItem
                      key={`a_${minister.id}`}
                      minister={minister}
                      isBackup={false}
                    />
                  ))}
                  {vacantMinisters.map((m, i) => (
                    <Badge key={`vacant-${i}`} variant="destructive" className="text-xs italic">
                      {m.position && `${m.position}. `}VACANTE
                    </Badge>
                  ))}
                  {realMinisters.length === 0 && vacantMinisters.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      Arraste backups para cá
                    </span>
                  )}
                </div>
              </div>

              {/* Separador invisível (drop target entre as zonas) */}
              <SeparatorDropTarget id={separatorId} />

              {/* Zona Backups */}
              {(backupMinisters.length > 0 || activeId) && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <UserMinus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Backup:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[32px] p-1.5 rounded-md border border-dashed border-transparent hover:border-muted-foreground/20 transition-colors">
                    {backupMinisters.map((minister) => (
                      <SortableMinisterItem
                        key={`b_${minister.id}`}
                        minister={minister}
                        isBackup={true}
                      />
                    ))}
                    {backupMinisters.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        Arraste escalados para cá
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SortableContext>

          {/* Overlay */}
          <DragOverlay>
            {draggedMinister && (
              <Badge
                variant={isDraggedBackup ? 'secondary' : 'outline'}
                className="text-xs shadow-xl ring-2 ring-primary cursor-grabbing gap-1"
              >
                <GripVertical className="h-3 w-3" />
                {draggedMinister.name}
              </Badge>
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}

// Separador que serve como drop target entre as zonas
function SeparatorDropTarget({ id }: { id: string }) {
  const { setNodeRef, isOver } = useSortable({ id, disabled: true });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-1 rounded-full transition-all mx-2',
        isOver ? 'bg-primary/40 h-2' : 'bg-muted/30'
      )}
    />
  );
}
