import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X, Plus, Save } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Minister {
  id: string;
  name: string;
}

interface ScheduleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  time: string;
  initialMinisters: Minister[];
  onSave: () => void;
}

export function ScheduleEditDialog({ 
  open, 
  onOpenChange, 
  date, 
  time, 
  initialMinisters,
  onSave 
}: ScheduleEditDialogProps) {
  const [ministers, setMinisters] = useState<Minister[]>(initialMinisters);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedMinisterId, setSelectedMinisterId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Buscar lista de todos os ministros disponíveis
  const { data: allMinisters } = useQuery({
    queryKey: ['/api/ministers'],
    enabled: open
  });

  useEffect(() => {
    setMinisters(initialMinisters);
  }, [initialMinisters, open]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newMinisters = [...ministers];
    const draggedItem = newMinisters[draggedIndex];
    newMinisters.splice(draggedIndex, 1);
    newMinisters.splice(index, 0, draggedItem);
    setMinisters(newMinisters);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleRemoveMinister = (index: number) => {
    setMinisters(ministers.filter((_, i) => i !== index));
  };

  const handleAddMinister = () => {
    if (!selectedMinisterId || !allMinisters) return;
    
    const ministersList = Array.isArray(allMinisters) ? allMinisters : [];
    const minister = ministersList.find((m: any) => m.id === selectedMinisterId);
    if (!minister) return;

    // Verificar se já está na lista
    if (ministers.some(m => m.id === minister.id)) {
      toast({
        title: "Ministro já escalado",
        description: "Este ministro já está nesta escala.",
        variant: "destructive"
      });
      return;
    }

    setMinisters([...ministers, { id: minister.id, name: minister.name }]);
    setSelectedMinisterId('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Atualizar escala usando o endpoint batch-update
      await apiRequest('PATCH', '/api/schedules/batch-update', {
        date,
        time,
        ministers: ministers.map(m => m.id)
      });

      toast({
        title: "Escala atualizada!",
        description: "As alterações foram salvas com sucesso."
      });

      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Escala</DialogTitle>
          <DialogDescription>
            {date} às {time} - Arraste para reordenar os ministros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de ministros com drag and drop */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Ministros Escalados ({ministers.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ministers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum ministro escalado. Adicione ministros abaixo.
                </p>
              ) : (
                ministers.map((minister, index) => (
                  <div
                    key={`${minister.id}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center justify-between p-3 rounded-md border bg-card
                      cursor-move hover:bg-accent transition-colors
                      ${draggedIndex === index ? 'opacity-50' : ''}
                    `}
                    data-testid={`minister-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="w-8 justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{minister.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMinister(index)}
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adicionar ministro */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Adicionar Ministro</h4>
            <div className="flex gap-2">
              <Select value={selectedMinisterId} onValueChange={setSelectedMinisterId}>
                <SelectTrigger className="flex-1" data-testid="select-minister">
                  <SelectValue placeholder="Selecione um ministro" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(allMinisters) && allMinisters.map((minister: any) => (
                    <SelectItem key={minister.id} value={minister.id}>
                      {minister.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMinister}
                disabled={!selectedMinisterId}
                data-testid="button-add-minister"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-schedule">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
