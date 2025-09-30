import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GripVertical, X, Plus, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Minister {
  id: string | null; // null = VACANTE
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
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newMinisters = [...ministers];
    [newMinisters[index - 1], newMinisters[index]] = [newMinisters[index], newMinisters[index - 1]];
    setMinisters(newMinisters);
  };

  const handleMoveDown = (index: number) => {
    if (index === ministers.length - 1) return;
    const newMinisters = [...ministers];
    [newMinisters[index], newMinisters[index + 1]] = [newMinisters[index + 1], newMinisters[index]];
    setMinisters(newMinisters);
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
    setSearchQuery('');
  };

  // Filtrar ministros baseado na busca
  const filteredMinisters = Array.isArray(allMinisters) 
    ? allMinisters.filter((m: any) => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

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
            {date} às {time} - Use os botões ↑↓ para reordenar os ministros
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
                      <GripVertical className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      <Badge variant="outline" className="w-8 justify-center">
                        {index + 1}
                      </Badge>
                      {minister.id === null ? (
                        <span className="font-medium text-muted-foreground italic">VACANTE</span>
                      ) : (
                        <span className="font-medium">{minister.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Botões de reordenação para mobile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        data-testid={`button-move-up-${index}`}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === ministers.length - 1}
                        data-testid={`button-move-down-${index}`}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMinister(index)}
                        data-testid={`button-remove-${index}`}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adicionar ministro */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Adicionar Ministro</h4>
            <div className="space-y-2">
              <Input
                placeholder="Digite para buscar ministro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-minister"
              />
              
              <div className="relative rounded-md border backdrop-blur-xl bg-background/80 shadow-lg h-48 overflow-y-auto">
                <div className="p-2">
                  {filteredMinisters.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum ministro encontrado.
                    </p>
                  ) : (
                    filteredMinisters.map((minister: any) => (
                      <button
                        key={minister.id}
                        onClick={() => {
                          setSelectedMinisterId(minister.id);
                          setSearchQuery(minister.name);
                        }}
                        className={`
                          w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors
                          ${selectedMinisterId === minister.id ? 'bg-accent' : ''}
                        `}
                        data-testid={`option-minister-${minister.id}`}
                      >
                        {minister.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddMinister}
                  disabled={!selectedMinisterId}
                  data-testid="button-add-minister"
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ministro
                </Button>
                <Button
                  onClick={() => {
                    setMinisters([...ministers, { id: null, name: 'VACANTE' }]);
                  }}
                  variant="outline"
                  data-testid="button-add-vacant"
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Vaga VACANTE
                </Button>
              </div>
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
