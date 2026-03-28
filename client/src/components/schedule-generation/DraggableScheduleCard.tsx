import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
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

// --- Componente de Ministro Arrastável ---

function SortableMinisterBadge({
  minister,
  isBackup,
}: {
  minister: Minister;
  isBackup: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${isBackup ? 'backup' : 'active'}-${minister.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isVacant =
    !minister.id ||
    minister.id === 'VACANT' ||
    minister.name === 'VACANT' ||
    minister.name === 'VACANTE';

  if (isVacant) {
    return (
      <Badge variant="destructive" className="text-xs italic">
        {minister.position && `${minister.position}. `}VACANTE
      </Badge>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'inline-flex items-center gap-1 cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-40'
      )}
    >
      <Badge
        variant={isBackup ? 'secondary' : 'outline'}
        className={cn(
          'text-xs select-none transition-all',
          'hover:shadow-md hover:scale-105',
          isDragging && 'ring-2 ring-primary shadow-lg'
        )}
      >
        <GripVertical className="h-3 w-3 mr-1 text-muted-foreground" />
        {minister.position && !isBackup && `${minister.position}. `}
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

// --- Drop Zone ---

function DroppableZone({
  id,
  children,
  label,
  icon: Icon,
  isEmpty,
}: {
  id: string;
  children: React.ReactNode;
  label: string;
  icon: React.ElementType;
  isEmpty: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg p-2 transition-colors min-h-[48px]',
        isOver && 'bg-primary/10 ring-2 ring-primary/30',
        !isOver && 'bg-transparent'
      )}
    >
      <div className="flex items-center gap-1 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        {isEmpty && (
          <span className="text-xs text-muted-foreground italic py-1">
            Arraste ministros para cá
          </span>
        )}
      </div>
    </div>
  );
}

// --- Componente Principal ---

function getConfidenceBadgeVariant(confidence: number) {
  if (confidence >= 0.8) return 'default' as const;
  if (confidence >= 0.6) return 'secondary' as const;
  return 'destructive' as const;
}

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
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const borderColor =
    confidence >= 0.8 ? '#22c55e' : confidence >= 0.6 ? '#f59e0b' : '#ef4444';

  // Filtrar vacantes (não são arrastáveis)
  const activeMinistersFiltered = ministers.filter(
    (m) => m.id && m.id !== 'VACANT' && m.name !== 'VACANT' && m.name !== 'VACANTE'
  );
  const vacantMinisters = ministers.filter(
    (m) => !m.id || m.id === 'VACANT' || m.name === 'VACANT' || m.name === 'VACANTE'
  );

  const activeIds = activeMinistersFiltered.map((m) => `active-${m.id}`);
  const backupIds = backupMinisters.map((m) => `backup-${m.id}`);
  const allIds = [...activeIds, ...backupIds];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const isActiveFromBackup = activeIdStr.startsWith('backup-');
    const isActiveFromActive = activeIdStr.startsWith('active-');
    const activeMinisterId = activeIdStr.replace(/^(backup|active)-/, '');

    // Determinar destino
    let targetIsBackup: boolean;
    if (overIdStr === 'zone-backups') {
      targetIsBackup = true;
    } else if (overIdStr === 'zone-escalados') {
      targetIsBackup = false;
    } else if (overIdStr.startsWith('backup-')) {
      targetIsBackup = true;
    } else if (overIdStr.startsWith('active-')) {
      targetIsBackup = false;
    } else {
      return;
    }

    // Se está movendo para a mesma zona → reordenar
    if (
      (isActiveFromBackup && targetIsBackup) ||
      (isActiveFromActive && !targetIsBackup)
    ) {
      if (isActiveFromActive && !targetIsBackup && overIdStr.startsWith('active-')) {
        // Reordenar dentro dos escalados
        const oldIndex = activeMinistersFiltered.findIndex((m) => `active-${m.id}` === activeIdStr);
        const newIndex = activeMinistersFiltered.findIndex((m) => `active-${m.id}` === overIdStr);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(activeMinistersFiltered, oldIndex, newIndex).map((m, i) => ({
            ...m,
            position: i + 1,
          }));
          onMinistersChange([...reordered, ...vacantMinisters], backupMinisters);
        }
      }
      if (isActiveFromBackup && targetIsBackup && overIdStr.startsWith('backup-')) {
        // Reordenar dentro dos backups
        const oldIndex = backupMinisters.findIndex((m) => `backup-${m.id}` === activeIdStr);
        const newIndex = backupMinisters.findIndex((m) => `backup-${m.id}` === overIdStr);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(backupMinisters, oldIndex, newIndex);
          onMinistersChange([...activeMinistersFiltered, ...vacantMinisters], reordered);
        }
      }
      return;
    }

    // Mover entre zonas
    if (isActiveFromBackup && !targetIsBackup) {
      // Backup → Escalado
      const minister = backupMinisters.find((m) => m.id === activeMinisterId);
      if (!minister) return;

      const newBackups = backupMinisters.filter((m) => m.id !== activeMinisterId);
      const newActives = [
        ...activeMinistersFiltered,
        { ...minister, position: activeMinistersFiltered.length + 1 },
      ].map((m, i) => ({ ...m, position: i + 1 }));

      // Remover um vacante se existir (backup está substituindo)
      const updatedVacants = vacantMinisters.length > 0 ? vacantMinisters.slice(1) : vacantMinisters;

      onMinistersChange([...newActives, ...updatedVacants], newBackups);
    } else if (isActiveFromActive && targetIsBackup) {
      // Escalado → Backup
      const minister = activeMinistersFiltered.find((m) => m.id === activeMinisterId);
      if (!minister) return;

      const newActives = activeMinistersFiltered
        .filter((m) => m.id !== activeMinisterId)
        .map((m, i) => ({ ...m, position: i + 1 }));
      const newBackups = [...backupMinisters, minister];

      onMinistersChange([...newActives, ...vacantMinisters], newBackups);
    }
  };

  // Encontrar ministro ativo para overlay
  const draggedMinister = activeId
    ? [...activeMinistersFiltered, ...backupMinisters].find(
        (m) => `active-${m.id}` === activeId || `backup-${m.id}` === activeId
      )
    : null;
  const isDraggedBackup = activeId?.startsWith('backup-') ?? false;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            {/* Zona Escalados */}
            <DroppableZone
              id="zone-escalados"
              label="Ministros"
              icon={Users}
              isEmpty={activeMinistersFiltered.length === 0}
            >
              <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
                {activeMinistersFiltered.map((minister) => (
                  <SortableMinisterBadge
                    key={`active-${minister.id}`}
                    minister={minister}
                    isBackup={false}
                  />
                ))}
              </SortableContext>
              {vacantMinisters.map((minister, i) => (
                <Badge key={`vacant-${i}`} variant="destructive" className="text-xs italic">
                  {minister.position && `${minister.position}. `}VACANTE
                </Badge>
              ))}
            </DroppableZone>

            {/* Zona Backups */}
            {(backupMinisters.length > 0 || activeId) && (
              <DroppableZone
                id="zone-backups"
                label="Backup"
                icon={UserMinus}
                isEmpty={backupMinisters.length === 0}
              >
                <SortableContext items={backupIds} strategy={verticalListSortingStrategy}>
                  {backupMinisters.map((minister) => (
                    <SortableMinisterBadge
                      key={`backup-${minister.id}`}
                      minister={minister}
                      isBackup={true}
                    />
                  ))}
                </SortableContext>
              </DroppableZone>
            )}
          </div>

          {/* Overlay do item sendo arrastado */}
          <DragOverlay>
            {draggedMinister && (
              <Badge
                variant={isDraggedBackup ? 'secondary' : 'outline'}
                className="text-xs shadow-lg ring-2 ring-primary cursor-grabbing"
              >
                <GripVertical className="h-3 w-3 mr-1" />
                {draggedMinister.name}
              </Badge>
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
