import React, { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { GripVertical, X, UserPlus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScheduleAssignment {
  id: string;
  scheduleId?: string;
  ministerId: string;
  ministerName: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  ministerEmail?: string;
  ministerPhoto?: string;
}

export interface Minister {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  preferredPosition?: number;
}

interface MassTimeSlot {
  time: string;
  date: string;
  assignments: ScheduleAssignment[];
  maxMinisters: number;
}

interface SortableMinisterCardProps {
  assignment: ScheduleAssignment;
  onRemove: (id: string) => void;
}

// Card de ministro arrastável
function SortableMinisterCard({ assignment, onRemove }: SortableMinisterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const initials = assignment.ministerName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage src={assignment.ministerPhoto} alt={assignment.ministerName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Nome e posição */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{assignment.ministerName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Posição {assignment.position + 1}</span>
          {assignment.confirmed && (
            <Badge variant="success" className="text-xs px-1.5 py-0">
              Confirmado
            </Badge>
          )}
        </div>
      </div>

      {/* Botão remover */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(assignment.id)}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface DropZoneProps {
  slot: MassTimeSlot;
  onAdd: (slot: MassTimeSlot) => void;
}

// Zona para adicionar novo ministro
function DropZone({ slot, onAdd }: DropZoneProps) {
  const isEmpty = slot.assignments.length === 0;
  const isFull = slot.assignments.length >= slot.maxMinisters;

  return (
    <Button
      variant="outline"
      className={cn(
        'w-full h-20 border-2 border-dashed transition-colors',
        isEmpty && 'border-muted-foreground/25 hover:border-primary/50',
        !isEmpty && !isFull && 'border-muted-foreground/10 hover:border-primary/30'
      )}
      onClick={() => onAdd(slot)}
      disabled={isFull}
    >
      <div className="flex flex-col items-center gap-1">
        <UserPlus className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {isEmpty ? 'Adicionar primeiro ministro' : 'Adicionar ministro'}
        </span>
      </div>
    </Button>
  );
}

interface MassTimeColumnProps {
  slot: MassTimeSlot;
  onReorder: (slot: MassTimeSlot, newOrder: ScheduleAssignment[]) => void;
  onRemove: (assignmentId: string) => void;
  onAdd: (slot: MassTimeSlot) => void;
}

// Coluna de horário de missa com drag & drop
function MassTimeColumn({ slot, onReorder, onRemove, onAdd }: MassTimeColumnProps) {
  const sortedAssignments = [...slot.assignments].sort((a, b) => a.position - b.position);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{slot.time}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {slot.assignments.length}/{slot.maxMinisters}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <SortableContext
          items={sortedAssignments.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedAssignments.map((assignment) => (
            <SortableMinisterCard
              key={assignment.id}
              assignment={assignment}
              onRemove={onRemove}
            />
          ))}
        </SortableContext>

        {slot.assignments.length < slot.maxMinisters && (
          <DropZone slot={slot} onAdd={onAdd} />
        )}
      </CardContent>
    </Card>
  );
}

export interface DraggableScheduleEditorProps {
  slots: MassTimeSlot[];
  onAssignmentsChange: (assignments: ScheduleAssignment[]) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onAddMinister: (slot: MassTimeSlot) => void;
}

export function DraggableScheduleEditor({
  slots,
  onAssignmentsChange,
  onRemoveAssignment,
  onAddMinister,
}: DraggableScheduleEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de ativar o drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Encontrar qual slot contém o item sendo arrastado
    const activeSlot = slots.find((slot) =>
      slot.assignments.some((a) => a.id === active.id)
    );

    // Encontrar qual slot é o destino
    const overSlot = slots.find((slot) =>
      slot.assignments.some((a) => a.id === over.id)
    );

    if (!activeSlot) {
      setActiveId(null);
      return;
    }

    // Mesmo slot - reordenar
    if (activeSlot === overSlot) {
      const oldIndex = activeSlot.assignments.findIndex((a) => a.id === active.id);
      const newIndex = activeSlot.assignments.findIndex((a) => a.id === over.id);

      const newAssignments = [...activeSlot.assignments];
      const [movedItem] = newAssignments.splice(oldIndex, 1);
      newAssignments.splice(newIndex, 0, movedItem);

      // Atualizar positions
      const updatedAssignments = newAssignments.map((a, index) => ({
        ...a,
        position: index,
      }));

      // Atualizar todos os assignments
      const allAssignments = slots.flatMap((s) =>
        s === activeSlot ? updatedAssignments : s.assignments
      );

      onAssignmentsChange(allAssignments);
    }
    // Slots diferentes - mover entre horários
    else if (overSlot) {
      const movedAssignment = activeSlot.assignments.find((a) => a.id === active.id);
      if (!movedAssignment) {
        setActiveId(null);
        return;
      }

      // Remover do slot original
      const updatedActiveSlot = activeSlot.assignments
        .filter((a) => a.id !== active.id)
        .map((a, index) => ({ ...a, position: index }));

      // Adicionar ao novo slot
      const overIndex = overSlot.assignments.findIndex((a) => a.id === over.id);
      const updatedOverSlot = [...overSlot.assignments];
      updatedOverSlot.splice(overIndex, 0, {
        ...movedAssignment,
        massTime: overSlot.time,
        date: overSlot.date,
      });

      // Atualizar positions
      const reindexedOverSlot = updatedOverSlot.map((a, index) => ({
        ...a,
        position: index,
      }));

      // Atualizar todos os assignments
      const allAssignments = slots.flatMap((s) => {
        if (s === activeSlot) return updatedActiveSlot;
        if (s === overSlot) return reindexedOverSlot;
        return s.assignments;
      });

      onAssignmentsChange(allAssignments);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Encontrar assignment sendo arrastado para o overlay
  const activeAssignment = slots
    .flatMap((s) => s.assignments)
    .find((a) => a.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {slots.map((slot) => (
          <MassTimeColumn
            key={`${slot.date}-${slot.time}`}
            slot={slot}
            onReorder={(s, newOrder) => {
              const allAssignments = slots.flatMap((otherSlot) =>
                otherSlot === s ? newOrder : otherSlot.assignments
              );
              onAssignmentsChange(allAssignments);
            }}
            onRemove={onRemoveAssignment}
            onAdd={onAddMinister}
          />
        ))}
      </div>

      {/* Overlay do item sendo arrastado */}
      <DragOverlay>
        {activeAssignment && (
          <div className="bg-white border rounded-lg shadow-2xl p-3 w-64 opacity-90">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={activeAssignment.ministerPhoto}
                  alt={activeAssignment.ministerName}
                />
                <AvatarFallback>
                  {activeAssignment.ministerName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{activeAssignment.ministerName}</p>
                <p className="text-xs text-muted-foreground">
                  Posição {activeAssignment.position + 1}
                </p>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export type { MassTimeSlot };
